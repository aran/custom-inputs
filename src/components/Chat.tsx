"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Message, CustomInputComponent, ContentBlock } from "@/types/chat";
import {
  createUserMessage,
  createAssistantMessage,
  createCustomInputMessage,
  extractToolCalls,
} from "@/types/chat";
import { DEFAULT_CHAT_MODEL } from "@/lib/claude";
import type { ModelKey } from "@/lib/claude";
import MessageList from "./MessageList";
import TextInput from "./TextInput";
import CustomInputPanel from "./CustomInputPanel";
import ModelSelector from "./ModelSelector";
import ApiKeySettings from "./ApiKeySettings";
import ErrorBoundary from "./ErrorBoundary";
import { clientLog } from "@/lib/client-logger";
import type Anthropic from "@anthropic-ai/sdk";

const MODEL_STORAGE_KEY = "custom-inputs-chat-model";

function loadModelPreference(): ModelKey {
  if (typeof window === "undefined") return DEFAULT_CHAT_MODEL;
  const stored = window.localStorage.getItem(MODEL_STORAGE_KEY);
  if (stored === "sonnet-4.6" || stored === "opus-4.6") return stored;
  return DEFAULT_CHAT_MODEL;
}

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
  const [chatModel, setChatModel] = useState<ModelKey>(DEFAULT_CHAT_MODEL);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeComponent, setActiveComponent] =
    useState<CustomInputComponent | null>(null);
  const [isBuildingComponent, setIsBuildingComponent] = useState(false);

  // Animation state
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  const conversationLog = useRef<ConversationEntry[]>([]);

  // Load persisted model preference on mount
  useEffect(() => {
    setChatModel(loadModelPreference());
  }, []);

  // Animation: mount/unmount with transition
  useEffect(() => {
    if (activeComponent) {
      setPanelMounted(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setPanelVisible(true))
      );
    } else {
      setPanelVisible(false);
      const timer = setTimeout(() => setPanelMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [activeComponent]);

  const handleKeyChange = useCallback((key: string | null) => {
    setApiKey(key);
  }, []);

  function handleModelChange(model: ModelKey) {
    setChatModel(model);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODEL_STORAGE_KEY, model);
    }
  }

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
          model: chatModel,
        }),
      });

      clientLog("info", "Chat", "API response", { status: res.status });
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
                event.type === "content_block_start" &&
                event.content_block?.type === "tool_use"
              ) {
                clientLog("info", "Chat", "Tool use block started", { name: event.content_block.name });
                setIsBuildingComponent(true);
              } else if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta"
              ) {
                fullText += event.delta.text;
                setStreamingContent(fullText);
              } else if (event.type === "component_created") {
                clientLog("info", "Chat", "Component created by Opus", {
                  title: event.component.title,
                  codeLength: event.component.code.length,
                  persistent: event.component.persistent,
                });
                setIsBuildingComponent(false);
                setActiveComponent(event.component);
              } else if (event.type === "component_error") {
                clientLog("error", "Chat", "Component generation failed", {
                  error: event.error,
                });
                setIsBuildingComponent(false);
              } else if (event.type === "message_complete") {
                finalMessage = event.message;
                clientLog("info", "Chat", "Message complete", {
                  contentTypes: event.message.content.map((b: ContentBlock) => b.type),
                });
              } else if (event.type === "error") {
                throw new Error(event.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) {
                clientLog("warn", "Chat", "SSE JSON parse error", { dataLength: data.length });
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
          if (call.name === "request_input_component") {
            // Component was generated by Opus (handled via component_created SSE event)
            // Auto-add the tool result to conversation log
            conversationLog.current.push({
              type: "tool_result",
              toolCallId: call.id,
              content: "Component generated and displayed to user.",
            });
          } else if (call.name === "clear_input_component") {
            clientLog("info", "Chat", "Tool call: clear_input_component");
            setActiveComponent(null);

            conversationLog.current.push({
              type: "tool_result",
              toolCallId: call.id,
              content: "Component removed.",
            });
          }
        }
      }
    } catch (err) {
      clientLog("error", "Chat", "Request failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      setMessages((prev) => [
        ...prev,
        createAssistantMessage(
          `Error: ${err instanceof Error ? err.message : "Something went wrong"}`
        ),
      ]);
    } finally {
      setIsLoading(false);
      setIsBuildingComponent(false);
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

    if (!activeComponent.persistent) {
      setActiveComponent(null); // auto-dismiss self-closing components
    }

    sendToApi(activeComponent);
  }

  function handleComponentClose() {
    setActiveComponent(null);
    conversationLog.current.push({
      type: "user_text",
      content: "[System: User dismissed the custom input component]",
    });
  }

  return (
    <div className="flex flex-col h-dvh bg-zinc-950">
      <header className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-zinc-100 shrink-0">
            Custom Inputs
          </h1>
          <div className="flex items-center gap-3 shrink-0">
            <ModelSelector
              model={chatModel}
              onChange={handleModelChange}
              disabled={isLoading}
            />
            <div className="w-64">
              <ApiKeySettings onKeyChange={handleKeyChange} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-0">
        <MessageList messages={messages} streamingContent={streamingContent} isLoading={isLoading} isBuildingComponent={isBuildingComponent} />

        {!apiKey && messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm px-4 text-center">
            Enter your API key above to start chatting
          </div>
        )}

        {panelMounted && activeComponent && (
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
              onClose={handleComponentClose}
              isVisible={panelVisible}
            />
          </ErrorBoundary>
        )}

        <TextInput onSend={handleSendText} disabled={isLoading || !apiKey} />
      </div>
    </div>
  );
}
