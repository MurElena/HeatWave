import type { QeProviderId } from "@/lib/types";
import { qeModelFor } from "@/lib/ai/models";
import {
  DEFAULT_SCORING,
  QE_PROMPT_INTRO,
  loadPrompts,
  loadSelectedPromptId,
  type QePrompt,
} from "@/lib/settings";

const QE_BATCH = 15;

function getActivePrompt(): QePrompt {
  const prompts = loadPrompts();
  const selectedId = loadSelectedPromptId();
  return (
    prompts.find((p) => p.id === selectedId) ?? {
      id: "default",
      name: "Default",
      scoring: DEFAULT_SCORING,
      extraInstructions: "",
    }
  );
}

interface QeItem {
  source: string;
  reference: string;
  hypothesis: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `QE request failed (${res.status}).`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/**
 * Scores a batch of segments with the selected QE model via the AI Gateway,
 * using the QE prompt configured in user settings.
 */
export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
}

export async function scoreQeBatch(
  items: QeItem[],
  provider: QeProviderId,
  onProgress?: (done: number, total: number) => void,
): Promise<{ scores: number[]; usage: UsageTotals; model: string }> {
  const prompt = getActivePrompt();
  const model = qeModelFor(provider);
  const scores: number[] = [];
  const usage: UsageTotals = { inputTokens: 0, outputTokens: 0 };

  for (let i = 0; i < items.length; i += QE_BATCH) {
    const chunk = items.slice(i, i + QE_BATCH);
    const res = await postJson<{ scores: number[]; usage?: UsageTotals }>("/api/qe", {
      model,
      intro: QE_PROMPT_INTRO,
      scoring: prompt.scoring,
      extraInstructions: prompt.extraInstructions,
      items: chunk,
    });
    scores.push(...res.scores);
    usage.inputTokens += res.usage?.inputTokens ?? 0;
    usage.outputTokens += res.usage?.outputTokens ?? 0;
    onProgress?.(scores.length, items.length);
  }
  return { scores, usage, model };
}

export function corpusQe(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
