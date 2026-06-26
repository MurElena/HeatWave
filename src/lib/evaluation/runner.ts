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

  if (uploadedSegments && uploadedSegments.length > 0) {
    onProgress(
      phaseProgress("dataset-preparation", "Dataset preparation", 15, "Cleaning uploaded dataset…"),
    );
    const { segments: cleaned } = cleanSegments(uploadedSegments);

    onProgress(
      phaseProgress(
        "dataset-preparation",
        "Dataset preparation",
        35,
        "Merging with challenge dataset (70% / 30%)…",
      ),
    );

    const merged = mergeEvaluationDataset(challengeDataset.segments, cleaned, finalSize);
    onProgress(
      phaseProgress(
        "dataset-preparation",
        "Dataset preparation",
        100,
        `Prepared ${merged.segments.length} segments (${merged.challengeCount} challenge + ${merged.newCount} new).`,
      ),
    );
    return merged.segments;
  }

  const sampled = sampleChallengeDataset(challengeDataset.segments, finalSize);
  onProgress(
    phaseProgress(
      "dataset-preparation",
      "Dataset preparation",
      100,
      `Prepared ${sampled.segments.length} segments from challenge dataset.`,
    ),
  );
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
        "dataset-preparation",
        "Translation",
        Math.round((p / config.providerIds.length) * 100),
        `Translating with ${providerName}…`,
      ),
    );

    const translateStart =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const { translations: hypotheses, usage: translateUsage } = await translateBatch(
      segments.map((s) => ({ source: s.source, target: s.target })),
      providerId,
      sourceLang,
      targetLang,
    );
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

    for (const metric of config.metrics) {
      if (metric === "qe" && config.qeProvider) {
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
      }

      if (metric === "llm-jury" && config.juryModelIds?.length === 3) {
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
      }

      if (["bleu", "wer", "chrf"].includes(metric)) {
        onProgress(
          phaseProgress(
            metric as EvaluationMetricId,
            PHASE_LABELS[metric as EvaluationMetricId],
            100,
            `${PHASE_LABELS[metric as EvaluationMetricId]} complete for ${providerName}.`,
          ),
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
  };

  onProgress(
    phaseProgress("complete", "Complete", 100, `Evaluation complete. Winner: ${run.winnerProviderName}.`),
  );

  return run;
}

export { METRIC_LABELS };
