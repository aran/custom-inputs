"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types/chat";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isLoading: boolean;
}

export default function MessageList({
  messages,
  streamingContent,
  isLoading,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {streamingContent ? (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap bg-zinc-800 text-zinc-100">
            {streamingContent}
            <span className="inline-block w-1.5 h-4 bg-zinc-400 animate-pulse ml-0.5 align-middle" />
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex justify-start">
          <div className="rounded-2xl px-4 py-2.5 bg-zinc-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-[bounce_1.4s_ease-in-out_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
          </div>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
