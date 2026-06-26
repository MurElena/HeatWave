"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import type { EvaluationMetricId, EvaluationProgress } from "@/lib/types";

interface EvaluationProgressPanelProps {
  progress: EvaluationProgress;
  activeMetrics: EvaluationMetricId[];
  completedPhases: Set<string>;
}

const PHASE_ORDER = [
  "dataset-preparation",
  "translation",
  "bleu",
  "wer",
  "chrf",
  "qe",
  "llm-jury",
  "ranking",
  "complete",
] as const;

const PHASE_LABELS: Record<string, string> = {
  "dataset-preparation": "Dataset preparation",
  translation: "Translation",
  bleu: "BLEU",
  wer: "WER",
  chrf: "ChrF++",
  qe: "Quality Estimation",
  "llm-jury": "LLM-as-a-jury",
  ranking: "Ranking & export",
  complete: "Complete",
};

export function EvaluationProgressPanel({
  progress,
  activeMetrics,
  completedPhases,
}: EvaluationProgressPanelProps) {
  const alwaysVisible = new Set([
    "dataset-preparation",
    "translation",
    "ranking",
    "complete",
  ]);
  const visiblePhases = PHASE_ORDER.filter((phase) => {
    if (alwaysVisible.has(phase)) return true;
    return activeMetrics.includes(phase as EvaluationMetricId);
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Running evaluation</h2>
        <p className="mt-1 text-sm text-slate-600">{progress.message}</p>
      </div>

      <ProgressBar percent={progress.percent} message={progress.phaseLabel} />

      <div className="space-y-3">
        {visiblePhases.map((phase) => {
          const isActive = progress.phase === phase;
          const isDone = completedPhases.has(phase) || progress.phase === "complete";
          return (
            <div
              key={phase}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
                isActive
                  ? "border-teal-300 bg-teal-50"
                  : isDone
                    ? "border-teal-100 bg-white text-teal-700"
                    : "border-slate-100 text-slate-400"
              }`}
            >
              <span>{PHASE_LABELS[phase] ?? phase}</span>
              <span className="text-xs font-medium">
                {isDone ? "Done" : isActive ? "Running…" : "Pending"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
