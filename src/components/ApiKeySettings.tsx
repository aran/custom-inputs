"use client";

import { useState, useEffect, useRef } from "react";
import { getApiKey, setApiKey, clearApiKey, isValidApiKeyFormat } from "@/lib/storage";

interface ApiKeySettingsProps {
  onKeyChange: (key: string | null) => void;
}

function PrivacyTooltip() {
  return (
    <span className="relative group inline-flex items-center">
      <span className="w-4 h-4 flex items-center justify-center rounded-full border border-zinc-600 text-zinc-500 text-[10px] leading-none cursor-help">
        ?
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2 bg-zinc-700 text-zinc-200 text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-10">
        Your key is stored in your browser&apos;s local storage only. It is never sent to our servers — it goes directly from your browser to the Anthropic API.
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-700" />
      </span>
    </span>
  );
}

export default function ApiKeySettings({ onKeyChange }: ApiKeySettingsProps) {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const initialized = useRef(false);

  // Read stored key on mount and notify parent
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const stored = getApiKey();
    if (stored) {
      setSaved(true);
      onKeyChange(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    setError("");
    const trimmed = key.trim();
    if (!isValidApiKeyFormat(trimmed)) {
      setError("API key must start with sk-ant-");
      return;
    }
    setApiKey(trimmed);
    setSaved(true);
    setKey("");
    onKeyChange(trimmed);
  }

  function handleClear() {
    clearApiKey();
    setSaved(false);
    setError("");
    onKeyChange(null);
  }

  if (saved) {
    return (
      <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg text-sm text-zinc-300">
        <span className="text-green-400">API key saved</span>
        <PrivacyTooltip />
        <button
          onClick={handleClear}
          className="ml-auto text-zinc-400 hover:text-zinc-200 underline text-xs"
        >
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-800 rounded-lg">
      <label className="flex items-center gap-1.5 text-sm text-zinc-300 mb-2">
        Enter your Anthropic API key to get started
        <PrivacyTooltip />
      </label>
      <div className="flex gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="sk-ant-..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
        >
          Save
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
