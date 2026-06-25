import type { QeProviderId } from "@/lib/types";

// Maps the QE provider option to a real AI Gateway model slug + display label.
export const QE_MODELS: Record<QeProviderId, { model: string; label: string }> = {
  "claude-4-6": { model: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  "gpt-5-2": { model: "openai/gpt-5.2", label: "GPT-5.2" },
  comet: { model: "google/gemini-3-flash", label: "Gemini 3 Flash" },
};

export function qeModelFor(provider: QeProviderId): string {
  return QE_MODELS[provider]?.model ?? "openai/gpt-5.4";
}

export function qeLabelFor(provider: QeProviderId): string {
  return QE_MODELS[provider]?.label ?? provider;
}
