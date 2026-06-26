import { MT_PROVIDERS } from "@/lib/constants/mt-providers";
import { saveEvaluationRun } from "@/lib/storage/evaluations";
import { saveHistoryFromEvaluation } from "@/lib/storage/history";
import type {
  EvaluationConfig,
  EvaluationMetricId,
  EvaluationRun,
  ProviderResult,
  SegmentScore,
} from "@/lib/types";

const DEMO_FLAG = "trans-eval-demo-seeded";

interface Scenario {
  title: string;
  domain: string;
  source: string;
  target: string;
  datasetName: string;
}

const SCENARIOS: Scenario[] = [
  { title: "E-commerce launch QA", domain: "E-commerce", source: "EN", target: "DE", datasetName: "Retail catalog DE" },
  { title: "Legal contracts review", domain: "Legal", source: "EN", target: "FR", datasetName: "Contracts FR" },
  { title: "Medical leaflets check", domain: "Medical", source: "EN", target: "ES", datasetName: "Pharma ES" },
  { title: "Support macros eval", domain: "Customer support", source: "EN", target: "IT", datasetName: "Helpdesk IT" },
  { title: "Marketing copy sprint", domain: "Marketing", source: "EN", target: "DE", datasetName: "Campaigns DE" },
  { title: "Technical manuals", domain: "Technical", source: "EN", target: "FR", datasetName: "IFU manuals FR" },
  { title: "Travel content batch", domain: "Travel", source: "EN", target: "ES", datasetName: "Guides ES" },
  { title: "Finance reports", domain: "Finance", source: "EN", target: "IT", datasetName: "Reports IT" },
];

const METRICS: EvaluationMetricId[] = ["bleu", "chrf", "qe", "llm-jury"];

// A few models per run, with a slowly drifting baseline so trends look real.
const POOL = MT_PROVIDERS.slice(0, 5);

function seeded(n: number): () => number {
  let s = n % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildProviderResult(
  providerId: string,
  providerName: string,
  rand: () => number,
  base: number,
  segmentCount: number,
): ProviderResult {
  const bleu = clamp(base + (rand() - 0.5) * 12, 20, 75);
  const chrf = clamp(base + 8 + (rand() - 0.5) * 10, 30, 85);
  const qe = clamp(base + 10 + (rand() - 0.5) * 14, 35, 95);
  const jury = clamp(base + 6 + (rand() - 0.5) * 16, 30, 98);
  const consistencyScore = clamp(80 + (rand() - 0.5) * 25, 55, 100);
  const aggregatedScore = clamp(
    bleu * 0.2 + chrf * 0.2 + qe * 0.3 + jury * 0.3,
    0,
    100,
  );
  const secondsPerSegment = clamp(0.4 + rand() * 1.8, 0.2, 3);

  const segmentScores: SegmentScore[] = Array.from({ length: 4 }, (_, i) => ({
    segmentId: `${providerId}-seg-${i}`,
    source: `Sample source segment ${i + 1}`,
    reference: `Reference translation ${i + 1}`,
    hypothesis: `Model output ${i + 1}`,
    scores: { bleu, chrf, qe, "llm-jury": jury },
  }));

  return {
    providerId,
    providerName,
    segmentScores,
    aggregateScores: { bleu, chrf, qe, "llm-jury": jury },
    consistencyScore,
    consistencyAvailable: true,
    duplicateSegmentCount: 12,
    aggregatedScore,
    inferenceMs: secondsPerSegment * 1000 * segmentCount,
    rank: 0,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function buildRun(scenario: Scenario, index: number, createdAt: string): EvaluationRun {
  const rand = seeded(index * 7919 + 13);
  const segmentCount = 400 + Math.floor(rand() * 600);

  // Pick 3-4 models for this run.
  const count = 3 + (index % 2);
  const models = POOL.slice(0, count);

  // Baseline that drifts upward over time so trends are visible.
  const drift = index * 1.4;

  const results = models.map((m, i) =>
    buildProviderResult(m.id, m.name, seeded(index * 31 + i * 17 + 5), 48 + drift + i * 2.5, segmentCount),
  );

  const ranked = [...results].sort(
    (a, b) => (b.aggregatedScore ?? 0) - (a.aggregatedScore ?? 0),
  );
  ranked.forEach((r, i) => (r.rank = i + 1));
  const winner = ranked[0];

  const config: EvaluationConfig = {
    challengeDatasetId: `demo-ds-${index}`,
    title: scenario.title,
    uploadedFileNames: [],
    finalSize: segmentCount,
    providerIds: models.map((m) => m.id),
    metrics: METRICS,
    qeProvider: "openai/gpt-5.4",
    juryModelIds: [
      "openai/gpt-5.4",
      "anthropic/claude-sonnet-4.6",
      "google/gemini-3-flash",
    ],
  };

  return {
    id: `demo-run-${index}`,
    title: scenario.title,
    config,
    challengeDatasetId: config.challengeDatasetId,
    challengeDatasetName: scenario.datasetName,
    domain: scenario.domain,
    sourceLanguage: scenario.source,
    targetLanguage: scenario.target,
    segmentCount,
    consistencyAvailable: true,
    providerResults: ranked,
    winnerProviderId: winner.providerId,
    winnerProviderName: winner.providerName,
    createdAt,
  };
}

/** Generates demo evaluation runs + history spread over the past weeks. */
export function seedDemoData(): number {
  const now = Date.now();
  const runs = SCENARIOS.map((scenario, i) => {
    // Space runs ~5 days apart, oldest first.
    const daysAgo = (SCENARIOS.length - i) * 5;
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    return buildRun(scenario, i, createdAt);
  });

  // Save oldest first so unshift-based stores keep newest on top.
  for (const run of runs) {
    saveEvaluationRun(run);
    saveHistoryFromEvaluation(run);
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_FLAG, "1");
  }
  return runs.length;
}

export function hasDemoData(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_FLAG) === "1";
}

/** Removes only the demo-seeded runs and their history entries. */
export function clearDemoData(): void {
  if (typeof window === "undefined") return;
  try {
    const runsRaw = localStorage.getItem("trans-eval-runs");
    if (runsRaw) {
      const runs = (JSON.parse(runsRaw) as EvaluationRun[]).filter(
        (r) => !r.id.startsWith("demo-run-"),
      );
      localStorage.setItem("trans-eval-runs", JSON.stringify(runs));
    }
    const histRaw = localStorage.getItem("trans-eval-history");
    if (histRaw) {
      const hist = (JSON.parse(histRaw) as { evaluationId: string }[]).filter(
        (h) => !h.evaluationId.startsWith("demo-run-"),
      );
      localStorage.setItem("trans-eval-history", JSON.stringify(hist));
    }
  } catch {
    /* ignore */
  }
  localStorage.removeItem(DEMO_FLAG);
}
