import { postJsonRetry, type UsageTotals } from "@/lib/evaluation/fetch-json";

// Keep batches small enough that a single request finishes well within the
// serverless function limit (avoids 504s), while client-side retries absorb
// transient rate limits.
const TRANSLATE_BATCH = 25;
// Small pause between gateway calls to stay under free-tier rate limits.
const THROTTLE_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type { UsageTotals };

export async function translateBatch(
  segments: { source: string; target: string }[],
  model: string,
  sourceLanguage: string,
  targetLanguage: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ translations: string[]; usage: UsageTotals }> {
  const results: string[] = [];
  const usage: UsageTotals = { inputTokens: 0, outputTokens: 0 };
  for (let i = 0; i < segments.length; i += TRANSLATE_BATCH) {
    if (i > 0) await sleep(THROTTLE_MS);
    const chunk = segments.slice(i, i + TRANSLATE_BATCH);
    const res = await postJsonRetry<{ translations: string[]; usage?: UsageTotals }>(
      "/api/translate",
      {
        model,
        sourceLanguage,
        targetLanguage,
        segments: chunk.map((s) => s.source),
      },
      { label: `Translation (${model})` },
    );
    results.push(...res.translations);
    usage.inputTokens += res.usage?.inputTokens ?? 0;
    usage.outputTokens += res.usage?.outputTokens ?? 0;
    onProgress?.(results.length, segments.length);
  }
  return { translations: results, usage };
}
