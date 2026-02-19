import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildComponentGenerationPrompt } from "@/lib/system-prompt";
import { CHAT_TOOL_DEFINITIONS, GENERATION_TOOL_DEFINITIONS, MODELS, DEFAULT_CHAT_MODEL } from "@/lib/claude";
import type { ModelKey } from "@/lib/claude";
import { log } from "@/lib/logger";
import type { CustomInputComponent } from "@/types/chat";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const body = await req.json();
  const { messages, apiKey, activeComponent, model: modelKey } = body as {
    messages: Anthropic.MessageParam[];
    apiKey: string;
    activeComponent: CustomInputComponent | null;
    model?: ModelKey;
  };

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const chatModel = MODELS[modelKey || DEFAULT_CHAT_MODEL];

  log("info", "chat.request.start", {
    messageCount: messages.length,
    hasActiveComponent: !!activeComponent,
    chatModel,
  });

  const client = new Anthropic({ apiKey });

  try {
    const stream = await client.messages.stream({
      model: chatModel,
      max_tokens: 4096,
      system: buildSystemPrompt(activeComponent),
      tools: CHAT_TOOL_DEFINITIONS,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }

          const finalMessage = await stream.finalMessage();

          // Stage 2: Check for request_input_component and invoke Opus for code generation
          const requestToolUse = finalMessage.content.find(
            (b): b is Anthropic.ToolUseBlock =>
              b.type === "tool_use" && b.name === "request_input_component"
          );

          if (requestToolUse) {
            const { title, description, requirements, persistent } =
              requestToolUse.input as {
                title: string;
                description: string;
                requirements: string;
                persistent?: boolean;
              };

            log("info", "chat.component_generation.start", {
              title,
              persistent: !!persistent,
            });

            const genStartTime = Date.now();

            try {
              const generationResponse = await client.messages.create({
                model: MODELS["opus-4.6"],
                max_tokens: 16384,
                system: buildComponentGenerationPrompt({
                  title,
                  description,
                  requirements,
                  persistent: !!persistent,
                }),
                tools: GENERATION_TOOL_DEFINITIONS,
                tool_choice: { type: "tool", name: "create_input_component" },
                messages,
              });

              const codeToolUse = generationResponse.content.find(
                (b): b is Anthropic.ToolUseBlock =>
                  b.type === "tool_use" && b.name === "create_input_component"
              );

              if (codeToolUse) {
                const { code } = codeToolUse.input as { code: string };

                log("info", "chat.component_generation.complete", {
                  durationMs: Date.now() - genStartTime,
                  codeLength: code.length,
                  inputTokens: generationResponse.usage.input_tokens,
                  outputTokens: generationResponse.usage.output_tokens,
                });

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "component_created",
                      component: {
                        title,
                        description,
                        code,
                        persistent: !!persistent,
                      },
                      toolCallId: requestToolUse.id,
                    })}\n\n`
                  )
                );
              } else {
                throw new Error("Opus did not return create_input_component tool call");
              }
            } catch (genErr) {
              const errorMessage =
                genErr instanceof Error ? genErr.message : "Component generation failed";

              log("error", "chat.component_generation.error", {
                durationMs: Date.now() - genStartTime,
                errorMessage,
              });

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "component_error",
                    error: errorMessage,
                    toolCallId: requestToolUse.id,
                  })}\n\n`
                )
              );
            }
          }

          // Send the final message (containing the chat model's response)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "message_complete", message: finalMessage })}\n\n`
            )
          );

          const toolNames = finalMessage.content
            .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
            .map((b) => b.name);

          log("info", "chat.request.complete", {
            durationMs: Date.now() - startTime,
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
            stopReason: finalMessage.stop_reason,
            hasToolUse: toolNames.length > 0,
            toolNames: toolNames.length > 0 ? toolNames : undefined,
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";

          log("error", "chat.request.error", {
            durationMs: Date.now() - startTime,
            errorType: err instanceof Anthropic.APIError ? "api_error" : "stream_error",
            errorMessage,
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    log("error", "chat.request.error", {
      durationMs: Date.now() - startTime,
      errorType: err instanceof Anthropic.APIError ? "api_error" : "request_error",
      errorMessage,
    });

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: err instanceof Anthropic.APIError ? err.status : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
