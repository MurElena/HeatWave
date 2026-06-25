function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function levenshtein(a: string[], b: string[]): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[a.length][b.length];
}

export function sentenceWer(hypothesis: string, reference: string): number {
  const ref = tokenize(reference);
  const hyp = tokenize(hypothesis);
  if (ref.length === 0) return hyp.length === 0 ? 0 : 100;
  const distance = levenshtein(hyp, ref);
  return Math.round((distance / ref.length) * 1000) / 10;
}

export function corpusWer(
  hypotheses: string[],
  references: string[],
): number {
  if (hypotheses.length === 0) return 0;
  const scores = hypotheses.map((hyp, i) =>
    sentenceWer(hyp, references[i] ?? ""),
  );
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
