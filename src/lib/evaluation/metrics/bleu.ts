function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function ngrams(tokens: string[], n: number): string[] {
  if (tokens.length < n) return [];
  const result: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    result.push(tokens.slice(i, i + n).join(" "));
  }
  return result;
}

function clippedCount(
  hypothesis: string[],
  reference: string[],
): number {
  const refCounts = new Map<string, number>();
  for (const gram of reference) {
    refCounts.set(gram, (refCounts.get(gram) ?? 0) + 1);
  }

  let count = 0;
  for (const gram of hypothesis) {
    const available = refCounts.get(gram) ?? 0;
    if (available > 0) {
      count++;
      refCounts.set(gram, available - 1);
    }
  }
  return count;
}

export function sentenceBleu(hypothesis: string, reference: string): number {
  const hypTokens = tokenize(hypothesis);
  const refTokens = tokenize(reference);
  if (hypTokens.length === 0) return 0;

  let logPrecisionSum = 0;
  let validOrders = 0;

  for (let n = 1; n <= 4; n++) {
    const hypNgrams = ngrams(hypTokens, n);
    const refNgrams = ngrams(refTokens, n);
    if (hypNgrams.length === 0) continue;

    const clipped = clippedCount(hypNgrams, refNgrams);
    const precision = (clipped + 1) / (hypNgrams.length + 1);
    logPrecisionSum += Math.log(precision);
    validOrders++;
  }

  if (validOrders === 0) return 0;

  const geoMean = Math.exp(logPrecisionSum / validOrders);
  const bp =
    hypTokens.length >= refTokens.length
      ? 1
      : Math.exp(1 - refTokens.length / hypTokens.length);

  return Math.min(100, Math.round(bp * geoMean * 1000) / 10);
}

export function corpusBleu(
  hypotheses: string[],
  references: string[],
): number {
  if (hypotheses.length === 0) return 0;
  const scores = hypotheses.map((hyp, i) =>
    sentenceBleu(hyp, references[i] ?? ""),
  );
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
