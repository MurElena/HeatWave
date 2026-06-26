const TRANSLATE_BATCH = 50;
// Small pause between gateway calls to stay under free-tier rate limits.
const THROTTLE_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request to ${url} failed (${res.status}).`;
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

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
}

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
    const res = await postJson<{ translations: string[]; usage?: UsageTotals }>(
      "/api/translate",
      {
        model,
        sourceLanguage,
        targetLanguage,
        segments: chunk.map((s) => s.source),
      },
    );
    results.push(...res.translations);
    usage.inputTokens += res.usage?.inputTokens ?? 0;
    usage.outputTokens += res.usage?.outputTokens ?? 0;
    onProgress?.(results.length, segments.length);
  }
  return { translations: results, usage };
}
