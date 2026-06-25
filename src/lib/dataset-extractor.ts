import { annotateSegments } from "@/lib/segment-analysis";
import type {
  DatasetSizeRange,
  SegmentCategory,
  TranslationSegment,
} from "@/lib/types";
import {
  ALL_SEGMENT_CATEGORIES,
  CRITERIA_SHARE,
  RANDOM_BASE_SHARE,
  SIZE_RANGE_TARGETS,
} from "@/lib/types";

export interface ExtractionInput {
  rawSegments: { source: string; target: string }[];
  sizeRange: DatasetSizeRange;
  priorities: SegmentCategory[];
  enabledCriteria: SegmentCategory[];
  glossaryTerms: string[];
  hasGlossary: boolean;
  onProgress?: (percent: number, message: string) => void;
}

export interface ExtractionResult {
  segments: TranslationSegment[];
  targetSize: number;
  categoryBreakdown: Record<SegmentCategory, number>;
  randomBaseCount: number;
  duplicateCount: number;
}

function emptyBreakdown(): Record<SegmentCategory, number> {
  return Object.fromEntries(
    ALL_SEGMENT_CATEGORIES.map((c) => [c, 0]),
  ) as Record<SegmentCategory, number>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeWeightedQuotas(
  activePriorities: SegmentCategory[],
  total: number,
): Map<SegmentCategory, number> {
  const quotas = new Map<SegmentCategory, number>();
  const n = activePriorities.length;
  if (n === 0) return quotas;

  const weights = activePriorities.map((_, i) => n - i);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let assigned = 0;
  activePriorities.forEach((cat, i) => {
    const q =
      i === n - 1
        ? total - assigned
        : Math.round((total * weights[i]) / totalWeight);
    quotas.set(cat, q);
    assigned += q;
  });

  return quotas;
}

function cloneSegment(
  seg: TranslationSegment,
  opts: Partial<TranslationSegment>,
): TranslationSegment {
  return {
    ...seg,
    id: crypto.randomUUID(),
    categories: [...seg.categories, ...(opts.categories ?? [])],
    ...opts,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function extractDataset(
  input: ExtractionInput,
): Promise<ExtractionResult> {
  const { onProgress } = input;
  const targetSize = SIZE_RANGE_TARGETS[input.sizeRange];
  const criteriaTarget = Math.round(targetSize * CRITERIA_SHARE);
  const randomTarget = targetSize - criteriaTarget;

  onProgress?.(5, "Analyzing source segments…");
  await delay(60);

  const annotated = annotateSegments(input.rawSegments, input.glossaryTerms);
  onProgress?.(20, "Classifying segment types…");
  await delay(60);

  const activePriorities = input.priorities.filter(
    (p) =>
      input.enabledCriteria.includes(p) &&
      (p !== "glossary" || input.hasGlossary),
  );

  const quotas = computeWeightedQuotas(activePriorities, criteriaTarget);
  const selected: TranslationSegment[] = [];
  const usedIds = new Set<string>();
  const breakdown = emptyBreakdown();
  let duplicateCount = 0;

  onProgress?.(35, "Extracting by priority…");
  await delay(60);

  const totalActive = activePriorities.length;

  for (let i = 0; i < activePriorities.length; i++) {
    const category = activePriorities[i];
    let quota = quotas.get(category) ?? 0;

    if (category === "consistency") {
      const positionFactor = (totalActive - i) / totalActive;
      quota = Math.max(2, Math.round(quota * (0.5 + positionFactor * 0.5)));

      const pool =
        selected.length > 0
          ? selected.filter((s) => !s.isDuplicate)
          : annotated;
      const shuffled = shuffle(pool);
      let added = 0;
      let poolIdx = 0;

      while (added < quota && poolIdx < shuffled.length) {
        const original = shuffled[poolIdx++];
        const origEntry = cloneSegment(original, {
          categories: ["consistency"],
          isDuplicate: false,
        });
        selected.push(origEntry);
        breakdown.consistency++;
        added++;

        if (added < quota) {
          const dupe = cloneSegment(original, {
            categories: ["consistency"],
            isDuplicate: true,
            duplicateOfId: origEntry.id,
          });
          selected.push(dupe);
          breakdown.consistency++;
          duplicateCount++;
          added++;
        }
      }
    } else {
      const matching = annotated.filter(
        (seg) => seg.categories.includes(category) && !usedIds.has(seg.id),
      );

      const toTake = Math.min(quota, matching.length);
      for (let j = 0; j < toTake; j++) {
        const seg = matching[j];
        selected.push({ ...seg, id: crypto.randomUUID() });
        usedIds.add(seg.id);
        breakdown[category]++;
      }
    }

    const pct = 35 + Math.round(((i + 1) / totalActive) * 45);
    onProgress?.(pct, `Extracting: ${category}…`);
    await delay(40);
  }

  onProgress?.(85, "Adding random base segments (30%)…");
  await delay(60);

  const unused = annotated.filter((seg) => !usedIds.has(seg.id));
  const randomPool = shuffle(unused);
  let randomAdded = 0;

  for (let i = 0; i < randomPool.length && randomAdded < randomTarget; i++) {
    const seg = randomPool[i];
    selected.push(
      cloneSegment(seg, {
        isRandomBase: true,
        categories: [...seg.categories],
      }),
    );
    usedIds.add(seg.id);
    randomAdded++;
  }

  if (randomAdded < randomTarget) {
    const filler = shuffle(annotated.filter((s) => !usedIds.has(s.id)));
    for (const seg of filler) {
      if (randomAdded >= randomTarget) break;
      selected.push(
        cloneSegment(seg, { isRandomBase: true, categories: [...seg.categories] }),
      );
      randomAdded++;
    }
  }

  onProgress?.(100, "Dataset ready");
  await delay(40);

  const finalSegments = selected.slice(0, targetSize);

  return {
    segments: finalSegments,
    targetSize,
    categoryBreakdown: breakdown,
    randomBaseCount: finalSegments.filter((s) => s.isRandomBase).length,
    duplicateCount: finalSegments.filter((s) => s.isDuplicate).length,
  };
}
