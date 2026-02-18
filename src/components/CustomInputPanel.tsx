"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { CustomInputComponent } from "@/types/chat";
import { createRenderMessage, isSandboxMessage } from "@/lib/sandbox";
import { clientLog } from "@/lib/client-logger";

const MAX_IFRAME_HEIGHT = 500;
const MIN_IFRAME_HEIGHT = 100;

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

  // Use a stable key derived from code content to force iframe remount on change
  const iframeKey = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < component.code.length; i++) {
      hash = ((hash << 5) - hash + component.code.charCodeAt(i)) | 0;
    }
    return hash;
  }, [component.code]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!isSandboxMessage(event.data)) return;
      if (event.data.type === "submit") {
        clientLog("info", "CustomInputPanel", "Submit received", { dataType: typeof event.data.data });
        onSubmit(event.data.data);
      } else if (event.data.type === "resize") {
        const reportedHeight = event.data.height;
        const capped = Math.max(MIN_IFRAME_HEIGHT, Math.min(MAX_IFRAME_HEIGHT, reportedHeight + 16));
        if (reportedHeight > MAX_IFRAME_HEIGHT) {
          clientLog("debug", "CustomInputPanel", "Content exceeds max height, scrolling enabled", {
            reportedHeight,
            maxHeight: MAX_IFRAME_HEIGHT,
          });
        }
        setHeight(capped);
      }
    },
    [onSubmit]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Send code when iframe loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function sendCode() {
      try {
        clientLog("info", "CustomInputPanel", "Rendering component", { title: component.title, codeLength: component.code.length });
        iframe!.contentWindow?.postMessage(
          createRenderMessage(component.code),
          "*"
        );
        setError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to render component";
        clientLog("error", "CustomInputPanel", "Render error", { error: msg });
        setError(msg);
      }
    }

    iframe.addEventListener("load", sendCode, { once: true });
    return () => iframe.removeEventListener("load", sendCode);
  }, [component.code, component.title, iframeKey]);

  return (
    <div className="mx-3 mb-2 border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900 flex flex-col shrink-0" style={{ maxHeight: `${MAX_IFRAME_HEIGHT + 40}px` }}>
      <div className="px-3 py-1.5 bg-zinc-800 text-xs text-zinc-400 flex items-center justify-between shrink-0">
        <span>{component.title}</span>
        <span className="text-zinc-600">{component.description}</span>
      </div>
      {error ? (
        <div className="p-3 text-sm text-red-400">{error}</div>
      ) : (
        <iframe
          key={iframeKey}
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
