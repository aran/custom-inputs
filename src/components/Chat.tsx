"use client";

import { useState, useCallback } from "react";
import type { Message, CustomInputComponent, ContentBlock } from "@/types/chat";
import { createUserMessage, createAssistantMessage, extractToolCalls } from "@/types/chat";
import MessageList from "./MessageList";
import TextInput from "./TextInput";
import ApiKeySettings from "./ApiKeySettings";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeComponent, setActiveComponent] =
    useState<CustomInputComponent | null>(null);

  const handleKeyChange = useCallback((key: string | null) => {
    setApiKey(key);
  }, []);

  async function sendToApi(allMessages: Message[]) {
    if (!apiKey) return;
    setIsLoading(true);
    setStreamingContent("");

    // Convert our Message[] to Anthropic MessageParam[]
    const apiMessages = allMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          apiKey,
          activeComponent,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "API request failed");
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
        const lines = accumulated.split("\n");
        accumulated = lines.pop() || "";

        for (const line of lines) {
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
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      // Process the final message
      if (finalMessage) {
        // Extract text content
        const textParts = finalMessage.content
          .filter((b): b is { type: "text"; text: string } => b.type === "text")
          .map((b) => b.text)
          .join("");

        if (textParts) {
          const assistantMsg = createAssistantMessage(textParts);
          setMessages((prev) => [...prev, assistantMsg]);
        }

        // Handle tool calls
        const toolCalls = extractToolCalls(finalMessage.content);
        for (const call of toolCalls) {
          if (call.name === "create_input_component") {
            const { title, description, code } = call.input as {
              title: string;
              description: string;
              code: string;
            };
            setActiveComponent({ title, description, code });
          }
        }
      }
    } catch (err) {
      const errorMsg = createAssistantMessage(
        `Error: ${err instanceof Error ? err.message : "Something went wrong"}`
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  }

  function handleSendText(text: string) {
    const userMsg = createUserMessage(text);
    const updated = [...messages, userMsg];
    setMessages(updated);
    sendToApi(updated);
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <header className="px-4 py-3 border-b border-zinc-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-100">Custom Inputs</h1>
          <div className="w-64">
            <ApiKeySettings onKeyChange={handleKeyChange} />
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full overflow-hidden">
        <MessageList messages={messages} streamingContent={streamingContent} />

        {!apiKey && messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
            Enter your API key above to start chatting
          </div>
        )}

        <TextInput onSend={handleSendText} disabled={isLoading || !apiKey} />
      </div>
    </div>
  );
}
