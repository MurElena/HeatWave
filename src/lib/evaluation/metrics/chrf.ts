function charNgrams(text: string, n: number): string[] {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.length < n) return normalized ? [normalized] : [];
  const grams: string[] = [];
  for (let i = 0; i <= normalized.length - n; i++) {
    grams.push(normalized.slice(i, i + n));
  }
  return grams;
}

function fScore(hypothesis: string[], reference: string[]): number {
  if (hypothesis.length === 0 && reference.length === 0) return 1;
  if (hypothesis.length === 0 || reference.length === 0) return 0;

  const refCounts = new Map<string, number>();
  for (const gram of reference) {
    refCounts.set(gram, (refCounts.get(gram) ?? 0) + 1);
  }

  let overlap = 0;
  for (const gram of hypothesis) {
    const available = refCounts.get(gram) ?? 0;
    if (available > 0) {
      overlap++;
      refCounts.set(gram, available - 1);
    }
  }

  const precision = overlap / hypothesis.length;
  const recall = overlap / reference.length;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export function sentenceChrf(hypothesis: string, reference: string): number {
  const orders = [1, 2, 3, 4, 5, 6];
  const beta = 2;
  const betaSq = beta * beta;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const n of orders) {
    const hypNgrams = charNgrams(hypothesis, n);
    const refNgrams = charNgrams(reference, n);
    const f = fScore(hypNgrams, refNgrams);
    weightedSum += f;
    totalWeight += 1;
  }

  if (totalWeight === 0) return 0;
  const avgF = weightedSum / totalWeight;
  const score = ((1 + betaSq) * avgF) / (betaSq + avgF);
  return Math.round(score * 1000) / 10;
}

export function corpusChrf(
  hypotheses: string[],
  references: string[],
): number {
  if (hypotheses.length === 0) return 0;
  const scores = hypotheses.map((hyp, i) =>
    sentenceChrf(hyp, references[i] ?? ""),
  );
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
