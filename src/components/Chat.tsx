"use client";

import { useState, useCallback, useRef } from "react";
import type { Message, CustomInputComponent, ContentBlock } from "@/types/chat";
import {
  createUserMessage,
  createAssistantMessage,
  createCustomInputMessage,
  extractToolCalls,
} from "@/types/chat";
import MessageList from "./MessageList";
import TextInput from "./TextInput";
import CustomInputPanel from "./CustomInputPanel";
import ApiKeySettings from "./ApiKeySettings";
import ErrorBoundary from "./ErrorBoundary";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Build the full API message history from our internal messages,
 * including tool_use/tool_result pairs where they occurred.
 */
function buildApiHistory(
  conversationLog: ConversationEntry[]
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const entry of conversationLog) {
    if (entry.type === "user_text") {
      result.push({ role: "user", content: entry.content });
    } else if (entry.type === "assistant") {
      result.push({ role: "assistant", content: entry.blocks });
    } else if (entry.type === "tool_result") {
      result.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: entry.toolCallId,
            content: entry.content,
          },
        ],
      });
    }
  }

  return result;
}

type ConversationEntry =
  | { type: "user_text"; content: string }
  | { type: "assistant"; blocks: Anthropic.ContentBlock[] }
  | { type: "tool_result"; toolCallId: string; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeComponent, setActiveComponent] =
    useState<CustomInputComponent | null>(null);

  const conversationLog = useRef<ConversationEntry[]>([]);

  const handleKeyChange = useCallback((key: string | null) => {
    setApiKey(key);
  }, []);

  async function sendToApi(
    currentActiveComponent: CustomInputComponent | null
  ) {
    if (!apiKey) return;
    setIsLoading(true);
    setStreamingContent("");

    const apiMessages = buildApiHistory(conversationLog.current);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          apiKey,
          activeComponent: currentActiveComponent,
        }),
      });

      console.log(`[Chat] API response: ${res.status}`);
      if (!res.ok) {
        let errorMessage = "API request failed";
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // Response wasn't JSON
        }
        throw new Error(errorMessage);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let fullText = "";
      let finalMessage: { content: ContentBlock[] } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const parts = accumulated.split("\n\n");
        // Keep the last part as it may be incomplete
        accumulated = parts.pop() || "";

        for (const part of parts) {
          for (const line of part.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);
              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta"
              ) {
                fullText += event.delta.text;
                setStreamingContent(fullText);
              } else if (event.type === "message_complete") {
                finalMessage = event.message;
                const types = event.message.content.map((b: ContentBlock) => b.type);
                console.log("[Chat] Message complete, content types:", types);
              } else if (event.type === "error") {
                throw new Error(event.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) {
                console.warn("[Chat] SSE JSON parse error, data length:", data.length);
                continue;
              }
              throw e;
            }
          }
        }
      }

      if (finalMessage) {
        conversationLog.current.push({
          type: "assistant",
          blocks: finalMessage.content as Anthropic.ContentBlock[],
        });

        const textParts = finalMessage.content
          .filter(
            (b): b is { type: "text"; text: string } => b.type === "text"
          )
          .map((b) => b.text)
          .join("");

        if (textParts) {
          setMessages((prev) => [...prev, createAssistantMessage(textParts)]);
        }

        const toolCalls = extractToolCalls(finalMessage.content);
        for (const call of toolCalls) {
          if (call.name === "create_input_component") {
            const { title, description, code } = call.input as {
              title: string;
              description: string;
              code: string;
            };
            console.log(`[Chat] Tool call: create_input_component "${title}" (${code.length} chars)`);
            setActiveComponent({ title, description, code });

            conversationLog.current.push({
              type: "tool_result",
              toolCallId: call.id,
              content: "Component rendered successfully.",
            });
          }
        }
      }
    } catch (err) {
      console.error("[Chat] Error:", err instanceof Error ? err.message : err);
      setMessages((prev) => [
        ...prev,
        createAssistantMessage(
          `Error: ${err instanceof Error ? err.message : "Something went wrong"}`
        ),
      ]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  }

  function handleSendText(text: string) {
    setMessages((prev) => [...prev, createUserMessage(text)]);
    conversationLog.current.push({ type: "user_text", content: text });
    sendToApi(activeComponent);
  }

  function handleCustomInputSubmit(data: unknown) {
    if (!activeComponent) return;
    const msg = createCustomInputMessage(activeComponent.title, data);
    setMessages((prev) => [...prev, msg]);
    conversationLog.current.push({ type: "user_text", content: msg.content });
    sendToApi(activeComponent);
  }

  return (
    <div className="flex flex-col h-dvh bg-zinc-950">
      <header className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-zinc-100 shrink-0">
            Custom Inputs
          </h1>
          <div className="w-64 shrink-0">
            <ApiKeySettings onKeyChange={handleKeyChange} />
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-0">
        <MessageList messages={messages} streamingContent={streamingContent} isLoading={isLoading} />

        {!apiKey && messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm px-4 text-center">
            Enter your API key above to start chatting
          </div>
        )}

        {activeComponent && (
          <ErrorBoundary
            fallback={
              <div className="mx-3 mb-2 p-3 text-sm text-red-400 bg-red-950/20 rounded-lg border border-red-900">
                Failed to render custom input component
              </div>
            }
          >
            <CustomInputPanel
              component={activeComponent}
              onSubmit={handleCustomInputSubmit}
            />
          </ErrorBoundary>
        )}

        <TextInput onSend={handleSendText} disabled={isLoading || !apiKey} />
      </div>
    </div>
  );
}
