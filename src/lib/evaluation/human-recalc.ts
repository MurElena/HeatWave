import { computeAggregatedScore, rankByAggregatedScore } from "@/lib/evaluation/aggregate-score";
import { computeConsistency } from "@/lib/evaluation/metrics/consistency";
import type {
  EvaluationMetricId,
  ProviderResult,
  Review,
  SegmentScore,
} from "@/lib/types";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function recalcResultsFromReview(review: Review): ProviderResult[] {
  const activeSegments = review.segments.filter((s) => !s.deleted);

  const results: ProviderResult[] = review.providerIds.map((providerId) => {
    const segmentScores: SegmentScore[] = activeSegments.map((seg) => {
      const pp = seg.perProvider.find((p) => p.providerId === providerId);
      return {
        segmentId: seg.segmentId,
        source: seg.source,
        reference: seg.reference,
        hypothesis: pp?.hypothesis ?? "",
        scores: { ...(pp?.scores ?? {}) },
        juryRating: pp?.juryRating,
        challengeSegmentId: seg.challengeSegmentId,
      };
    });

    const aggregateScores: Partial<Record<EvaluationMetricId, number>> = {};
    for (const metric of review.metrics) {
      const values = segmentScores
        .map((s) => s.scores[metric])
        .filter((v): v is number => typeof v === "number");
      if (values.length > 0) aggregateScores[metric] = average(values);
    }

    const consistency = computeConsistency(segmentScores);
    const aggregatedScore = computeAggregatedScore(
      aggregateScores,
      consistency.consistencyScore,
      consistency.available,
    );

    return {
      providerId,
      providerName: review.providerNames[providerId] ?? providerId,
      segmentScores,
      aggregateScores,
      consistencyScore: consistency.available ? consistency.consistencyScore : undefined,
      consistencyAvailable: consistency.available,
      duplicateSegmentCount: consistency.duplicateSegmentCount,
      aggregatedScore,
      rank: 0,
    };
  });

  return rankByAggregatedScore(results);
}
