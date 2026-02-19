"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types/chat";
import MessageBubble from "./MessageBubble";
import MarkdownContent from "./MarkdownContent";

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isLoading: boolean;
  isBuildingComponent: boolean;
}

export default function MessageList({
  messages,
  streamingContent,
  isLoading,
  isBuildingComponent,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, isLoading, isBuildingComponent]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-zinc-800 text-zinc-100">
            <MarkdownContent content={streamingContent} />
            <span className="inline-block w-1.5 h-4 bg-zinc-400 animate-pulse ml-0.5 align-middle" />
          </div>
        </div>
      )}
      {isBuildingComponent && (
        <div className="flex justify-start">
          <div className="rounded-2xl px-4 py-2.5 bg-zinc-800 text-zinc-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Building component...
          </div>
        </div>
      )}
      {!streamingContent && !isBuildingComponent && isLoading && (
        <div className="flex justify-start">
          <div className="rounded-2xl px-4 py-2.5 bg-zinc-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-[bounce_1.4s_ease-in-out_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
