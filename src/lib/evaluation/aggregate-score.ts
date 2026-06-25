import type { EvaluationMetricId, ProviderResult } from "@/lib/types";

/**
 * Per-metric weights used to combine individual metric scores into a single
 * aggregated quality score (0-100). GenAI metrics (QE, LLM-as-a-Jury) are
 * weighted highest because they capture meaning and fluency; surface-overlap
 * metrics (BLEU, ChrF++, WER) are weighted lower. See AGGREGATED_SCORE_README.md.
 */
export const METRIC_WEIGHTS: Record<EvaluationMetricId, number> = {
  "llm-jury": 0.3,
  qe: 0.25,
  chrf: 0.2,
  bleu: 0.15,
  wer: 0.1,
};

/** Share of the aggregated score removed for fully inconsistent duplicates. */
export const CONSISTENCY_PENALTY_WEIGHT = 0.15;

/** Converts a raw metric value to a 0-100 "higher is better" contribution. */
export function normalizeMetric(
  metric: EvaluationMetricId,
  value: number,
): number {
  if (metric === "wer") {
    return Math.max(0, Math.min(100, 100 - value));
  }
  return Math.max(0, Math.min(100, value));
}

export function computeAggregatedScore(
  aggregateScores: Partial<Record<EvaluationMetricId, number>>,
  consistencyScore: number | undefined,
  consistencyAvailable: boolean,
): number {
  let weightedSum = 0;
  let weightTotal = 0;

  (Object.keys(aggregateScores) as EvaluationMetricId[]).forEach((metric) => {
    const value = aggregateScores[metric];
    if (value === undefined) return;
    const weight = METRIC_WEIGHTS[metric] ?? 0;
    weightedSum += normalizeMetric(metric, value) * weight;
    weightTotal += weight;
  });

  let base = weightTotal > 0 ? weightedSum / weightTotal : 0;

  if (consistencyAvailable && consistencyScore !== undefined) {
    const penalty = ((100 - consistencyScore) / 100) * CONSISTENCY_PENALTY_WEIGHT;
    base = base * (1 - penalty);
  }

  return Math.round(base * 10) / 10;
}

export function rankByAggregatedScore(
  results: ProviderResult[],
): ProviderResult[] {
  const sorted = [...results].sort(
    (a, b) => (b.aggregatedScore ?? 0) - (a.aggregatedScore ?? 0),
  );
  return sorted.map((result, index) => ({ ...result, rank: index + 1 }));
}
