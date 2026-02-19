"use client";

import type { ModelKey } from "@/lib/claude";

const MODEL_LABELS: Record<ModelKey, string> = {
  "sonnet-4.6": "Sonnet 4.6",
  "opus-4.6": "Opus 4.6",
};

const MODEL_KEYS: ModelKey[] = ["sonnet-4.6", "opus-4.6"];

interface ModelSelectorProps {
  model: ModelKey;
  onChange: (model: ModelKey) => void;
  disabled?: boolean;
}

export default function ModelSelector({
  model,
  onChange,
  disabled,
}: ModelSelectorProps) {
  function toggle() {
    if (disabled) return;
    const currentIndex = MODEL_KEYS.indexOf(model);
    const nextIndex = (currentIndex + 1) % MODEL_KEYS.length;
    onChange(MODEL_KEYS[nextIndex]);
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      className="px-2.5 py-1 text-xs font-medium rounded-full border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {MODEL_LABELS[model]} ▾
    </button>
  );
}
