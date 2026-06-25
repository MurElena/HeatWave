import type { MtProvider } from "@/lib/types";

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// Each MT "provider" is a real model served through the Vercel AI Gateway.
// The provider id IS the gateway model slug (provider/model), so it can be
// passed straight to the AI SDK on the server.
export const MT_PROVIDERS: MtProvider[] = [
  { id: "openai/gpt-5.4", name: "GPT-5.4", addedAt: "2026-03-05T00:00:00.000Z" },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6", addedAt: "2026-02-20T00:00:00.000Z" },
  { id: "google/gemini-3-flash", name: "Gemini 3 Flash", addedAt: "2026-01-15T00:00:00.000Z" },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", addedAt: "2026-04-10T00:00:00.000Z" },
  { id: "mistral/mistral-large-3", name: "Mistral Large 3", addedAt: "2025-11-01T00:00:00.000Z" },
  { id: "meta/llama-4-maverick", name: "Llama 4 Maverick", addedAt: "2025-09-01T00:00:00.000Z" },
  { id: "xai/grok-4.3", name: "Grok 4.3", addedAt: "2026-06-12T00:00:00.000Z" },
  { id: "alibaba/qwen3-max", name: "Qwen3 Max", addedAt: "2026-06-18T00:00:00.000Z" },
];

export function isProviderNew(provider: MtProvider, now = Date.now()): boolean {
  return now - new Date(provider.addedAt).getTime() < ONE_MONTH_MS;
}

export function getProviderById(id: string): MtProvider | undefined {
  return MT_PROVIDERS.find((p) => p.id === id);
}
