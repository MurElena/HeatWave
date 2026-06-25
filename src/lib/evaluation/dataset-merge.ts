import type { TranslationSegment } from "@/lib/types";
import type { RawSegment } from "./dataset-cleaner";

export interface PreparedSegment {
  id: string;
  source: string;
  target: string;
  fromChallenge: boolean;
  challengeSegmentId?: string;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample<T>(items: T[], count: number): T[] {
  if (count >= items.length) return shuffle(items);
  return shuffle(items).slice(0, count);
}

export interface MergeResult {
  segments: PreparedSegment[];
  challengeCount: number;
  newCount: number;
}

export function mergeEvaluationDataset(
  challengeSegments: TranslationSegment[],
  newSegments: RawSegment[],
  finalSize: number,
): MergeResult {
  const challengeCount = Math.min(
    Math.round(finalSize * 0.7),
    challengeSegments.length,
  );
  const newCount = Math.min(finalSize - challengeCount, newSegments.length);

  const fromChallenge = sample(challengeSegments, challengeCount);
  const fromNew = sample(newSegments, newCount);

  const segments: PreparedSegment[] = [
    ...fromChallenge.map((s) => ({
      source: s.source,
      target: s.target,
      fromChallenge: true,
      challengeSegmentId: s.id,
    })),
    ...fromNew.map((s) => ({
      source: s.source,
      target: s.target,
      fromChallenge: false,
    })),
  ].map((seg, i) => ({ ...seg, id: `eval-seg-${i}` }));

  return { segments, challengeCount, newCount };
}

export function sampleChallengeDataset(
  challengeSegments: TranslationSegment[],
  finalSize: number,
): MergeResult {
  const count = Math.min(finalSize, challengeSegments.length);
  const segments: PreparedSegment[] = sample(challengeSegments, count).map(
    (seg, i) => ({
      id: `eval-seg-${i}`,
      source: seg.source,
      target: seg.target,
      fromChallenge: true,
      challengeSegmentId: seg.id,
    }),
  );

  return { segments, challengeCount: count, newCount: 0 };
}
