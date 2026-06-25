import type { SegmentScore } from "@/lib/types";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface ConsistencyResult {
  available: boolean;
  duplicateSegmentCount: number;
  consistencyScore: number;
}

/**
 * Detects duplicate segments (identical sources) and penalises a provider when
 * the translations of identical sources differ. Mutates the segment scores to
 * flag duplicates, attach the twin hypothesis and record consistency.
 */
export function computeConsistency(segmentScores: SegmentScore[]): ConsistencyResult {
  const groups = new Map<string, number[]>();
  segmentScores.forEach((seg, index) => {
    const key = normalize(seg.source);
    const list = groups.get(key);
    if (list) list.push(index);
    else groups.set(key, [index]);
  });

  let duplicateSegmentCount = 0;
  let consistentSegmentCount = 0;

  for (const indices of groups.values()) {
    if (indices.length < 2) continue;

    const hypotheses = indices.map((i) => normalize(segmentScores[i].hypothesis));
    const allIdentical = hypotheses.every((h) => h === hypotheses[0]);

    indices.forEach((segIndex, position) => {
      const seg = segmentScores[segIndex];
      seg.isDuplicate = true;
      const twinPos = position === 0 ? indices[1] : indices[0];
      seg.duplicateOfId = segmentScores[twinPos].segmentId;
      seg.twinHypothesis = segmentScores[twinPos].hypothesis;
      seg.consistencyConsistent = allIdentical;
      duplicateSegmentCount++;
      if (allIdentical) consistentSegmentCount++;
    });
  }

  const available = duplicateSegmentCount > 0;
  const consistencyScore = available
    ? Math.round((consistentSegmentCount / duplicateSegmentCount) * 1000) / 10
    : 0;

  return { available, duplicateSegmentCount, consistencyScore };
}
