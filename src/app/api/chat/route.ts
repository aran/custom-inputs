import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { TOOL_DEFINITIONS } from "@/lib/claude";
import type { CustomInputComponent } from "@/types/chat";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, apiKey, activeComponent } = body as {
    messages: Anthropic.MessageParam[];
    apiKey: string;
    activeComponent: CustomInputComponent | null;
  };

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey });

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: buildSystemPrompt(activeComponent),
    tools: TOOL_DEFINITIONS,
    messages,
  });

  // Stream SSE events to the client
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        }
        // Send the final message object
        const finalMessage = await stream.finalMessage();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "message_complete", message: finalMessage })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
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
}
