import { postJsonRetry, type UsageTotals } from "@/lib/evaluation/fetch-json";
import type { JuryRating } from "@/lib/types";

export const JURY_PROMPT =
  "You are a translation quality assessment expert. Evaluate the translation considering accuracy, fluency, terminology consistency, and cultural appropriateness for the target locale. Use the following criteria: Good: The translation is accurate, fluent, and is culturally suitable for the target locale. Any issues are negligible and do not affect meaning or usability. - Neutral: should only be used when issues are present but clearly minor and acceptable for the use case. - Bad: The translation contains major errors such as mistranslations, omissions, incorrect terminology, poor fluency, or cultural inappropriateness that affect comprehension or correctness. Respond with exactly one rating: Good, Neutral, or Bad.";

const JURY_BATCH = 15;
const THROTTLE_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface JuryItem {
  source: string;
  reference: string;
  hypothesis: string;
}

export interface JurySegmentResult {
  votes: JuryRating[];
  rating: JuryRating;
}

export type { UsageTotals };

/**
 * Runs the LLM-as-a-jury over a batch of segments using the selected models via
 * the AI Gateway, returning per-segment votes and the majority rating.
 */
export async function juryForBatch(
  items: JuryItem[],
  modelIds: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ results: JurySegmentResult[]; usageByModel: Record<string, UsageTotals> }> {
  const out: JurySegmentResult[] = [];
  const usageByModel: Record<string, UsageTotals> = {};

  for (let i = 0; i < items.length; i += JURY_BATCH) {
    if (i > 0) await sleep(THROTTLE_MS);
    const chunk = items.slice(i, i + JURY_BATCH);
    const { votes, usageByModel: batchUsage } = await postJsonRetry<{
      votes: JuryRating[][];
      usageByModel?: Record<string, UsageTotals>;
    }>(
      "/api/jury",
      {
        models: modelIds,
        items: chunk,
      },
      { label: "LLM jury" },
    );
    for (const segVotes of votes) {
      out.push({ votes: segVotes, rating: majorityJuryRating(segVotes) });
    }
    for (const [model, u] of Object.entries(batchUsage ?? {})) {
      const cur = usageByModel[model] ?? { inputTokens: 0, outputTokens: 0 };
      cur.inputTokens += u.inputTokens;
      cur.outputTokens += u.outputTokens;
      usageByModel[model] = cur;
    }
    onProgress?.(out.length, items.length);
  }
  return { results: out, usageByModel };
}

export function majorityJuryRating(votes: JuryRating[]): JuryRating {
  const counts: Record<JuryRating, number> = {
    Good: 0,
    Neutral: 0,
    Bad: 0,
  };
  for (const vote of votes) counts[vote]++;

  const sorted = (Object.entries(counts) as [JuryRating, number][]).sort(
    (a, b) => b[1] - a[1],
  );

  const topCount = sorted[0][1];
  const tied = sorted.filter(([, count]) => count === topCount).map(([r]) => r);

  if (tied.length === 1) return tied[0];

  if (tied.includes("Neutral")) return "Neutral";
  if (tied.includes("Good") && tied.includes("Bad")) return "Neutral";
  return tied[0];
}

export function juryScoreFromRating(rating: JuryRating): number {
  if (rating === "Good") return 100;
  if (rating === "Neutral") return 50;
  return 0;
}

export function corpusJury(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
