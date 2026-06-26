export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRIABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function looksRetriable(message: string): boolean {
  return /rate.?limit|timeout|timed out|temporar|overloaded|too many requests|429|50[234]/i.test(
    message,
  );
}

/**
 * POSTs JSON to an internal API route and retries transient failures (rate
 * limits, gateway timeouts, network blips) with exponential backoff. Retrying
 * happens on the client, which is not bound by the serverless function's time
 * limit, so a model that is briefly rate-limited recovers instead of failing
 * the whole evaluation.
 */
export async function postJsonRetry<T>(
  url: string,
  body: unknown,
  opts?: { attempts?: number; baseDelayMs?: number; label?: string },
): Promise<T> {
  const attempts = opts?.attempts ?? 5;
  const base = opts?.baseDelayMs ?? 2000;
  const label = opts?.label ?? `Request to ${url}`;
  let lastError = new Error(`${label} failed.`);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      // Network-level failure — always worth retrying.
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === attempts) throw lastError;
      await sleep(base * 2 ** (attempt - 1) + Math.random() * 750);
      continue;
    }

    if (res.ok) return (await res.json()) as T;

    let message = `${label} failed (${res.status}).`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    lastError = new Error(message);

    const retriable = RETRIABLE_STATUS.has(res.status) || looksRetriable(message);
    if (!retriable || attempt === attempts) throw lastError;
    await sleep(base * 2 ** (attempt - 1) + Math.random() * 750);
  }

  throw lastError;
}
