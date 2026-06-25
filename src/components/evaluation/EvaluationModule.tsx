"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Play, BarChart3 } from "lucide-react";
import { EvaluationProgressPanel } from "@/components/evaluation/EvaluationProgressPanel";
import { EvaluationWizard } from "@/components/evaluation/EvaluationWizard";
import { runEvaluation } from "@/lib/evaluation/runner";
import { loadDatasets } from "@/lib/storage/datasets";
import { saveEvaluationRun } from "@/lib/storage/evaluations";
import { saveHistoryFromEvaluation } from "@/lib/storage/history";
import type { EvaluationConfig, EvaluationProgress } from "@/lib/types";

type ViewState = "idle" | "wizard" | "running";

export function EvaluationModule() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>("idle");
  const [progress, setProgress] = useState<EvaluationProgress | null>(null);
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());
  const [activeMetrics, setActiveMetrics] = useState<EvaluationConfig["metrics"]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleLaunch = useCallback(
    async (
      config: EvaluationConfig,
      uploadedSegments?: { source: string; target: string }[],
    ) => {
      setView("running");
      setError(null);
      setActiveMetrics(config.metrics);
      setCompletedPhases(new Set());

      const challengeDataset = loadDatasets().find(
        (d) => d.id === config.challengeDatasetId,
      );
      if (!challengeDataset) {
        setError("Challenge dataset not found.");
        setView("idle");
        return;
      }

      let lastPhase = "";

      try {
        const run = await runEvaluation(
          { config, challengeDataset, uploadedSegments },
          (p) => {
            setProgress(p);
            if (lastPhase && lastPhase !== p.phase) {
              setCompletedPhases((prev) => new Set([...prev, lastPhase]));
            }
            lastPhase = p.phase;
          },
        );

        setCompletedPhases((prev) => new Set([...prev, "ranking", "complete"]));
        saveEvaluationRun(run);
        saveHistoryFromEvaluation(run);
        router.push(`/evaluation/results/${run.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Evaluation failed.");
        setView("idle");
      }
    },
    [router],
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Evaluation</h1>
          <p className="mt-1 text-slate-600">
            Compare MT providers on a challenge dataset with automatic metrics, QE, and LLM jury.
          </p>
        </div>
        {view === "idle" && (
          <button
            type="button"
            onClick={() => setView("wizard")}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
          >
            <Play className="h-4 w-4" />
            New evaluation
          </button>
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {view === "idle" && (
        <div className="mt-12 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-700">No evaluation running</h3>
          <p className="mt-1 text-sm text-slate-500">
            Start a new evaluation to compare translation providers and metrics.
          </p>
          <button
            type="button"
            onClick={() => setView("wizard")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-coral-600"
          >
            <Play className="h-4 w-4" />
            New evaluation
          </button>
        </div>
      )}

      {view === "running" && progress && (
        <div className="mt-8">
          <EvaluationProgressPanel
            progress={progress}
            activeMetrics={activeMetrics}
            completedPhases={completedPhases}
          />
        </div>
      )}

      {view === "wizard" && (
        <EvaluationWizard
          onLaunch={handleLaunch}
          onClose={() => setView("idle")}
        />
      )}
    </div>
  );
}
