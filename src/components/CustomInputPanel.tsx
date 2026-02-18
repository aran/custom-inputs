"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { CustomInputComponent } from "@/types/chat";
import { createRenderMessage, isSandboxMessage } from "@/lib/sandbox";

interface CustomInputPanelProps {
  component: CustomInputComponent;
  onSubmit: (data: unknown) => void;
}

export default function CustomInputPanel({
  component,
  onSubmit,
}: CustomInputPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);
  const [error, setError] = useState<string | null>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!isSandboxMessage(event.data)) return;
      if (event.data.type === "submit") {
        onSubmit(event.data.data);
      } else if (event.data.type === "resize") {
        setHeight(Math.max(100, Math.min(600, event.data.height + 16)));
      }
    },
    [onSubmit]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function sendCode() {
      try {
        iframe!.contentWindow?.postMessage(
          createRenderMessage(component.code),
          "*"
        );
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to render component");
      }
    }

    // If iframe is already loaded, send immediately; otherwise wait
    if (iframe.contentDocument?.readyState === "complete") {
      sendCode();
    } else {
      iframe.addEventListener("load", sendCode, { once: true });
    }
  }, [component.code]);

  return (
    <div className="mx-3 mb-2 border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900">
      <div className="px-3 py-1.5 bg-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
        <span>{component.title}</span>
        <span className="text-zinc-600">{component.description}</span>
      </div>
      {error ? (
        <div className="p-3 text-sm text-red-400">{error}</div>
      ) : (
        <iframe
          ref={iframeRef}
          src="/sandbox.html"
          sandbox="allow-scripts"
          style={{ height: `${height}px` }}
          className="w-full border-0 bg-white"
          title={component.title}
        />
      )}
    </div>
  );
}
