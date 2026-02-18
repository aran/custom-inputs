"use client";

import { useState, useEffect } from "react";
import { getApiKey, setApiKey, clearApiKey, isValidApiKeyFormat } from "@/lib/storage";

interface ApiKeySettingsProps {
  onKeyChange: (key: string | null) => void;
}

export default function ApiKeySettings({ onKeyChange }: ApiKeySettingsProps) {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getApiKey();
    if (stored) {
      setSaved(true);
      onKeyChange(stored);
    }
  }, [onKeyChange]);

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
      <label className="block text-sm text-zinc-300 mb-2">
        Enter your Anthropic API key to get started
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
