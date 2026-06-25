import type { CriterionState, PriorityCard, SegmentCategory } from "@/lib/types";
import { CRITERIA_SHARE, RANDOM_BASE_COLOR, RANDOM_BASE_SHARE } from "@/lib/types";

export interface CompositionSlice {
  id: SegmentCategory | "random-base";
  name: string;
  color: string;
  pct: number;
}

/**
 * Mirrors the weighting used by the extractor: enabled criteria are weighted by
 * their position (top = highest), scaled to 70% of the dataset, with a fixed
 * 30% random base slice.
 */
export function computeComposition(
  criteria: CriterionState[],
  cards: PriorityCard[],
  hasGlossary: boolean,
): CompositionSlice[] {
  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]));

  const active = criteria.filter((c) => {
    const card = cardMap[c.id];
    const locked = card?.requiresGlossary && !hasGlossary;
    return c.enabled && !locked;
  });

  const slices: CompositionSlice[] = [];

  if (active.length > 0) {
    const n = active.length;
    const weights = active.map((_, i) => n - i);
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    active.forEach((c, i) => {
      const card = cardMap[c.id];
      slices.push({
        id: c.id,
        name: card.name,
        color: card.color,
        pct: (weights[i] / totalWeight) * CRITERIA_SHARE * 100,
      });
    });
  }

  slices.push({
    id: "random-base",
    name: "Random base",
    color: RANDOM_BASE_COLOR,
    pct: active.length > 0 ? RANDOM_BASE_SHARE * 100 : 100,
  });

  return slices;
}
