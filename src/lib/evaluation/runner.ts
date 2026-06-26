import { getProviderById } from "@/lib/constants/mt-providers";
import { cleanSegments, type RawSegment } from "@/lib/evaluation/dataset-cleaner";
import {
  mergeEvaluationDataset,
  sampleChallengeDataset,
  type PreparedSegment,
} from "@/lib/evaluation/dataset-merge";
import { corpusBleu, sentenceBleu } from "@/lib/evaluation/metrics/bleu";
import { corpusChrf, sentenceChrf } from "@/lib/evaluation/metrics/chrf";
import { computeConsistency } from "@/lib/evaluation/metrics/consistency";
import {
  corpusJury,
  juryForBatch,
  juryScoreFromRating,
} from "@/lib/evaluation/metrics/llm-jury";
import { corpusQe, scoreQeBatch } from "@/lib/evaluation/metrics/qe";
import { corpusWer, sentenceWer } from "@/lib/evaluation/metrics/wer";
import { translateBatch } from "@/lib/evaluation/mt-translator";
import { computeAggregatedScore, rankByAggregatedScore } from "@/lib/evaluation/aggregate-score";
import type {
  ChallengeDataset,
  EvaluationConfig,
  EvaluationFailure,
  EvaluationMetricId,
  EvaluationProgress,
  EvaluationRun,
  ProviderResult,
  SegmentScore,
  UsageByModel,
} from "@/lib/types";
import { METRIC_LABELS, languageLabel } from "@/lib/types";

export interface RunEvaluationInput {
  config: EvaluationConfig;
  challengeDataset: ChallengeDataset;
  uploadedSegments?: RawSegment[];
}

export type ProgressCallback = (progress: EvaluationProgress) => void;

function phaseProgress(
  phase: EvaluationProgress["phase"],
  phaseLabel: string,
  percent: number,
  message: string,
): EvaluationProgress {
  return { phase, phaseLabel, percent, message };
}

// Dataset preparation is fully synchronous (no network I/O), so without a yield
// React never repaints between its progress updates and the phase appears to be
// skipped. A short pause lets each step render.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PHASE_LABELS: Record<EvaluationMetricId, string> = {
  bleu: "BLEU",
  wer: "WER",
  chrf: "ChrF++",
  qe: "Quality Estimation",
  "llm-jury": "LLM-as-a-Jury",
};

async function prepareDataset(
  challengeDataset: ChallengeDataset,
  uploadedSegments: RawSegment[] | undefined,
  finalSize: number,
  onProgress: ProgressCallback,
): Promise<PreparedSegment[]> {
  onProgress(
    phaseProgress("dataset-preparation", "Dataset preparation", 5, "Preparing evaluation dataset…"),
  );
  await sleep(400);

  if (uploadedSegments && uploadedSegments.length > 0) {
    onProgress(
      phaseProgress("dataset-preparation", "Dataset preparation", 15, "Cleaning uploaded dataset…"),
    );
    const { segments: cleaned } = cleanSegments(uploadedSegments);
    await sleep(500);

    onProgress(
      phaseProgress(
        "dataset-preparation",
        "Dataset preparation",
        35,
        "Merging with challenge dataset (70% / 30%)…",
      ),
    );
    const merged = mergeEvaluationDataset(challengeDataset.segments, cleaned, finalSize);
    await sleep(500);

    onProgress(
      phaseProgress(
        "dataset-preparation",
        "Dataset preparation",
        100,
        `Prepared ${merged.segments.length} segments (${merged.challengeCount} challenge + ${merged.newCount} new).`,
      ),
    );
    await sleep(400);
    return merged.segments;
  }

  onProgress(
    phaseProgress(
      "dataset-preparation",
      "Dataset preparation",
      55,
      "Sampling segments from the challenge dataset…",
    ),
  );
  const sampled = sampleChallengeDataset(challengeDataset.segments, finalSize);
  await sleep(500);

  onProgress(
    phaseProgress(
      "dataset-preparation",
      "Dataset preparation",
      100,
      `Prepared ${sampled.segments.length} segments from challenge dataset.`,
    ),
  );
  await sleep(400);
  return sampled.segments;
}

function computeAutomaticMetrics(
  hypotheses: string[],
  references: string[],
  metrics: EvaluationMetricId[],
  segmentScores: SegmentScore[],
): Partial<Record<EvaluationMetricId, number>> {
  const aggregate: Partial<Record<EvaluationMetricId, number>> = {};

  if (metrics.includes("bleu")) {
    aggregate.bleu = corpusBleu(hypotheses, references);
    hypotheses.forEach((hyp, i) => {
      segmentScores[i].scores.bleu = sentenceBleu(hyp, references[i]);
    });
  }

  if (metrics.includes("wer")) {
    aggregate.wer = corpusWer(hypotheses, references);
    hypotheses.forEach((hyp, i) => {
      segmentScores[i].scores.wer = sentenceWer(hyp, references[i]);
    });
  }

  if (metrics.includes("chrf")) {
    aggregate.chrf = corpusChrf(hypotheses, references);
    hypotheses.forEach((hyp, i) => {
      segmentScores[i].scores.chrf = sentenceChrf(hyp, references[i]);
    });
  }

  return aggregate;
}

export async function runEvaluation(
  input: RunEvaluationInput,
  onProgress: ProgressCallback,
): Promise<EvaluationRun> {
  const { config, challengeDataset, uploadedSegments } = input;
  const segments = await prepareDataset(
    challengeDataset,
    uploadedSegments,
    config.finalSize,
    onProgress,
  );

  const references = segments.map((s) => s.target);
  const sourceLang = languageLabel(challengeDataset.sourceLanguage);
  const targetLang = languageLabel(challengeDataset.targetLanguage);
  const providerResults: ProviderResult[] = [];
  const usageByModel: UsageByModel = {};
  let consistencyAvailable = false;
  const failures: EvaluationFailure[] = [];
  // Once a GenAI metric fails (usually a rate limit), stop attempting it for the
  // remaining providers and drop it from the results so the run can finish.
  const droppedMetrics = new Set<EvaluationMetricId>();

  function recordMetricFailure(metric: EvaluationMetricId, err: unknown): void {
    if (droppedMetrics.has(metric)) return;
    droppedMetrics.add(metric);
    failures.push({
      kind: "metric",
      id: metric,
      name: METRIC_LABELS[metric],
      reason: err instanceof Error ? err.message : "Metric failed.",
    });
  }

  function addUsage(model: string, input: number, output: number): void {
    const cur = usageByModel[model] ?? { inputTokens: 0, outputTokens: 0 };
    cur.inputTokens += input;
    cur.outputTokens += output;
    usageByModel[model] = cur;
  }

  for (let p = 0; p < config.providerIds.length; p++) {
    const providerId = config.providerIds[p];
    const provider = getProviderById(providerId);
    const providerName = provider?.name ?? providerId;

    onProgress(
      phaseProgress(
        "translation",
        "Translation",
        Math.round((p / config.providerIds.length) * 100),
        `Translating with ${providerName}…`,
      ),
    );

    const translateStart =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    let hypotheses: string[];
    let translateUsage: { inputTokens: number; outputTokens: number };
    try {
      ({ translations: hypotheses, usage: translateUsage } = await translateBatch(
        segments.map((s) => ({ source: s.source, target: s.target })),
        providerId,
        sourceLang,
        targetLang,
        (done, total) =>
          onProgress(
            phaseProgress(
              "translation",
              "Translation",
              Math.round((done / total) * 100),
              `Translating with ${providerName} (${done}/${total})…`,
            ),
          ),
      ));
    } catch (err) {
      failures.push({
        kind: "provider",
        id: providerId,
        name: providerName,
        reason: err instanceof Error ? err.message : "Translation failed.",
      });
      onProgress(
        phaseProgress(
          "translation",
          "Translation",
          Math.round(((p + 1) / config.providerIds.length) * 100),
          `Skipped ${providerName} (translation failed).`,
        ),
      );
      continue;
    }
    const inferenceMs =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - translateStart;
    addUsage(providerId, translateUsage.inputTokens, translateUsage.outputTokens);

    const segmentScores: SegmentScore[] = segments.map((seg, i) => ({
      segmentId: seg.id,
      source: seg.source,
      reference: references[i],
      hypothesis: hypotheses[i],
      scores: {},
      challengeSegmentId: seg.fromChallenge ? seg.challengeSegmentId : undefined,
    }));

    let aggregateScores = computeAutomaticMetrics(
      hypotheses,
      references,
      config.metrics,
      segmentScores,
    );

    // Automatic metrics (BLEU, WER, ChrF++) always complete before the GenAI
    // metrics so they appear first in the progress timeline. They compute
    // instantly, so we yield around each one to let the UI paint it as
    // running → done instead of flashing past as "pending".
    for (const metric of ["bleu", "wer", "chrf"] as const) {
      if (config.metrics.includes(metric)) {
        onProgress(
          phaseProgress(
            metric,
            PHASE_LABELS[metric],
            40,
            `Scoring ${PHASE_LABELS[metric]} for ${providerName}…`,
          ),
        );
        await sleep(250);
        onProgress(
          phaseProgress(
            metric,
            PHASE_LABELS[metric],
            100,
            `${PHASE_LABELS[metric]} complete for ${providerName}.`,
          ),
        );
        await sleep(150);
      }
    }

    if (config.metrics.includes("qe") && config.qeProvider && !droppedMetrics.has("qe")) {
      try {
        onProgress(
          phaseProgress("qe", PHASE_LABELS.qe, 10, `Running QE for ${providerName}…`),
        );
        const { scores: qeScores, usage: qeUsage, model: qeModel } = await scoreQeBatch(
          segmentScores.map((seg) => ({
            source: seg.source,
            reference: seg.reference,
            hypothesis: seg.hypothesis,
          })),
          config.qeProvider,
          (done, total) =>
            onProgress(
              phaseProgress(
                "qe",
                PHASE_LABELS.qe,
                Math.round((done / total) * 100),
                `QE ${done}/${total} for ${providerName}…`,
              ),
            ),
        );
        addUsage(qeModel, qeUsage.inputTokens, qeUsage.outputTokens);
        qeScores.forEach((score, i) => {
          segmentScores[i].scores.qe = score;
        });
        aggregateScores = { ...aggregateScores, qe: corpusQe(qeScores) };
        onProgress(phaseProgress("qe", PHASE_LABELS.qe, 100, `QE complete for ${providerName}.`));
      } catch (err) {
        recordMetricFailure("qe", err);
        onProgress(phaseProgress("qe", PHASE_LABELS.qe, 100, `QE removed (failed).`));
      }
    }

    if (
      config.metrics.includes("llm-jury") &&
      config.juryModelIds?.length === 3 &&
      !droppedMetrics.has("llm-jury")
    ) {
      try {
        onProgress(
          phaseProgress("llm-jury", PHASE_LABELS["llm-jury"], 10, `Running LLM jury for ${providerName}…`),
        );
        const { results: juryResults, usageByModel: juryUsage } = await juryForBatch(
          segmentScores.map((seg) => ({
            source: seg.source,
            reference: seg.reference,
            hypothesis: seg.hypothesis,
          })),
          config.juryModelIds,
          (done, total) =>
            onProgress(
              phaseProgress(
                "llm-jury",
                PHASE_LABELS["llm-jury"],
                Math.round((done / total) * 100),
                `Jury ${done}/${total} for ${providerName}…`,
              ),
            ),
        );
        for (const [model, u] of Object.entries(juryUsage)) {
          addUsage(model, u.inputTokens, u.outputTokens);
        }
        const juryScores: number[] = [];
        juryResults.forEach((result, i) => {
          const seg = segmentScores[i];
          seg.juryVotes = result.votes;
          seg.juryRating = result.rating;
          const score = juryScoreFromRating(result.rating);
          seg.scores["llm-jury"] = score;
          juryScores.push(score);
        });
        aggregateScores = { ...aggregateScores, "llm-jury": corpusJury(juryScores) };
        onProgress(
          phaseProgress("llm-jury", PHASE_LABELS["llm-jury"], 100, `LLM jury complete for ${providerName}.`),
        );
      } catch (err) {
        recordMetricFailure("llm-jury", err);
        onProgress(
          phaseProgress("llm-jury", PHASE_LABELS["llm-jury"], 100, `LLM jury removed (failed).`),
        );
      }
    }

    const consistency = computeConsistency(segmentScores);
    if (consistency.available) consistencyAvailable = true;

    const aggregatedScore = computeAggregatedScore(
      aggregateScores,
      consistency.consistencyScore,
      consistency.available,
    );

    providerResults.push({
      providerId,
      providerName,
      segmentScores,
      aggregateScores,
      consistencyScore: consistency.available ? consistency.consistencyScore : undefined,
      consistencyAvailable: consistency.available,
      duplicateSegmentCount: consistency.duplicateSegmentCount,
      aggregatedScore,
      inferenceMs,
      rank: 0,
    });

    onProgress(
      phaseProgress(
        "ranking",
        "Ranking",
        Math.round(((p + 1) / config.providerIds.length) * 90),
        `Completed provider ${p + 1} of ${config.providerIds.length}.`,
      ),
    );
  }

  if (providerResults.length === 0) {
    const reason = failures[0]?.reason ?? "All translation models failed.";
    throw new Error(`Evaluation failed — every model errored. ${reason}`);
  }

  // Drop any metric that failed so the ranking is consistent across providers
  // that were processed before vs. after the failure.
  if (droppedMetrics.size > 0) {
    for (const result of providerResults) {
      for (const metric of droppedMetrics) {
        delete result.aggregateScores[metric];
        for (const seg of result.segmentScores) {
          delete seg.scores[metric];
        }
      }
      result.aggregatedScore = computeAggregatedScore(
        result.aggregateScores,
        result.consistencyScore ?? 0,
        result.consistencyAvailable ?? false,
      );
    }
  }

  onProgress(phaseProgress("ranking", "Ranking", 95, "Comparing aggregated scores and ranking providers…"));

  const ranked = rankByAggregatedScore(providerResults);
  const winner = ranked[0];

  const run: EvaluationRun = {
    id: crypto.randomUUID(),
    title: config.title,
    config,
    challengeDatasetId: challengeDataset.id,
    challengeDatasetName: challengeDataset.name,
    domain: challengeDataset.domain,
    sourceLanguage: challengeDataset.sourceLanguage,
    targetLanguage: challengeDataset.targetLanguage,
    segmentCount: segments.length,
    consistencyAvailable,
    usage: usageByModel,
    providerResults: ranked,
    winnerProviderId: winner?.providerId ?? "",
    winnerProviderName: winner?.providerName ?? "—",
    createdAt: new Date().toISOString(),
    failures: failures.length > 0 ? failures : undefined,
  };

  onProgress(
    phaseProgress("complete", "Complete", 100, `Evaluation complete. Winner: ${run.winnerProviderName}.`),
  );

  return run;
}

export { METRIC_LABELS };
