import type {
  EvaluationMetricId,
  ProviderResult,
} from "@/lib/types";

const HIGHER_IS_BETTER: EvaluationMetricId[] = ["bleu", "chrf", "qe", "llm-jury"];
const LOWER_IS_BETTER: EvaluationMetricId[] = ["wer"];

function metricScore(
  result: ProviderResult,
  metric: EvaluationMetricId,
): number | undefined {
  return result.aggregateScores[metric];
}

export function rankProviders(
  results: ProviderResult[],
  metrics: EvaluationMetricId[],
): ProviderResult[] {
  if (results.length === 0) return [];

  const scored = results.map((result) => {
    let totalRankPoints = 0;
    let metricCount = 0;

    for (const metric of metrics) {
      const values = results
        .map((r) => metricScore(r, metric))
        .filter((v): v is number => typeof v === "number");

      if (values.length === 0) continue;

      const value = metricScore(result, metric);
      if (value === undefined) continue;

      const sorted = [...values].sort((a, b) =>
        LOWER_IS_BETTER.includes(metric) ? a - b : b - a,
      );
      const rank = sorted.indexOf(value) + 1;
      totalRankPoints += rank;
      metricCount++;
    }

    const avgRank =
      metricCount > 0 ? totalRankPoints / metricCount : Number.MAX_VALUE;

    return { result, avgRank };
  });

  scored.sort((a, b) => a.avgRank - b.avgRank);

  return scored.map(({ result }, index) => ({
    ...result,
    rank: index + 1,
  }));
}

export function winnerFromResults(
  ranked: ProviderResult[],
): ProviderResult | undefined {
  return ranked.find((r) => r.rank === 1) ?? ranked[0];
}

export function metricDirection(metric: EvaluationMetricId): "higher" | "lower" {
  return LOWER_IS_BETTER.includes(metric) ? "lower" : "higher";
}
