"use client";

import type { Message } from "@/types/chat";
import { parseCustomInputMessage } from "@/types/chat";
import MarkdownContent from "./MarkdownContent";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const parsed = isUser ? parseCustomInputMessage(message.content) : null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-blue-600 text-white whitespace-pre-wrap"
            : "bg-zinc-800 text-zinc-100"
        }`}
      >
        {parsed ? (
          <div>
            <div className="text-xs opacity-70 mb-1">{parsed.title}</div>
            <div className="font-mono text-xs bg-black/20 rounded p-2">
              {typeof parsed.data === "object"
                ? JSON.stringify(parsed.data, null, 2)
                : String(parsed.data)}
            </div>
          </div>
        ) : isUser ? (
          message.content
        ) : (
          <MarkdownContent content={message.content} />
        )}
      </div>
    </div>
  );
}
