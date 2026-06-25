"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Trophy, Download, ArrowLeft, UserCheck, Bot, User } from "lucide-react";
import { SendForReviewWizard } from "@/components/evaluation/SendForReviewWizard";
import { downloadSelectedResults } from "@/lib/evaluation/export-excel";
import { metricDirection } from "@/lib/evaluation/ranking";
import type { EvaluationMetricId, EvaluationRun, ProviderResult } from "@/lib/types";
import { METRIC_LABELS, languageLabel } from "@/lib/types";

interface ResultsViewProps {
  run: EvaluationRun;
}

type ResultTab = "automatic" | "human";

export function ResultsView({ run }: ResultsViewProps) {
  const metrics = run.config.metrics;
  const [tab, setTab] = useState<ResultTab>("automatic");
  const [showReview, setShowReview] = useState(false);

  const activeResults: ProviderResult[] =
    tab === "human" && run.humanResults ? run.humanResults : run.providerResults;

  const [selectedProviders, setSelectedProviders] = useState<string[]>(
    run.providerResults.map((r) => r.providerId),
  );
  const [selectedMetrics, setSelectedMetrics] = useState<EvaluationMetricId[]>(metrics);

  const winnerName =
    tab === "human"
      ? run.humanWinnerProviderName ?? run.winnerProviderName
      : run.winnerProviderName;

  const maxByMetric = useMemo(() => {
    return Object.fromEntries(
      metrics.map((metric) => {
        const values = activeResults
          .map((r) => r.aggregateScores[metric])
          .filter((v): v is number => typeof v === "number");
        if (values.length === 0) return [metric, 0];
        const direction = metricDirection(metric);
        return [metric, direction === "lower" ? Math.min(...values) : Math.max(...values)];
      }),
    ) as Record<EvaluationMetricId, number>;
  }, [activeResults, metrics]);

  function toggleProvider(id: string) {
    setSelectedProviders((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function toggleMetric(id: EvaluationMetricId) {
    setSelectedMetrics((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/evaluation"
        className="inline-flex items-center gap-1 text-sm text-teal-700 hover:text-teal-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to evaluation
      </Link>

      <div className="mt-4 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-coral-100 p-3">
            <Trophy className="h-7 w-7 text-coral-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{run.title}</h1>
            <p className="mt-1 text-slate-600">
              Winner: <strong>{winnerName}</strong> · {run.segmentCount} segments ·{" "}
              {languageLabel(run.sourceLanguage)} → {languageLabel(run.targetLanguage)}
            </p>
          </div>
        </div>
      </div>

      {run.hasHumanResults && (
        <div className="mt-6 flex gap-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab("automatic")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${
              tab === "automatic"
                ? "border-teal-500 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Bot className="h-4 w-4" />
            Automatic
          </button>
          <button
            type="button"
            onClick={() => setTab("human")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${
              tab === "human"
                ? "border-teal-500 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <User className="h-4 w-4" />
            Human
          </button>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Provider ranking</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ranked by aggregated metric score. See AGGREGATED_SCORE_README.md for the formula.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Provider</th>
                {run.consistencyAvailable && (
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Consistency</th>
                )}
                <th className="px-4 py-3 text-left font-medium text-slate-600">Aggregated score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeResults.map((result) => (
                <tr key={result.providerId} className={result.rank === 1 ? "bg-teal-50/50" : ""}>
                  <td className="px-4 py-3 font-semibold text-slate-900">#{result.rank}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {result.providerName}
                    {result.rank === 1 && (
                      <span className="ml-2 rounded-full bg-coral-100 px-2 py-0.5 text-xs text-coral-700">
                        Winner
                      </span>
                    )}
                  </td>
                  {run.consistencyAvailable && (
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {result.consistencyAvailable
                        ? `${result.consistencyScore?.toFixed(1)}%`
                        : "n/a"}
                    </td>
                  )}
                  <td className="px-4 py-3 font-semibold tabular-nums text-teal-700">
                    {result.aggregatedScore?.toFixed(1) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Metric comparison</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric} className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-800">{METRIC_LABELS[metric]}</h3>
              <div className="mt-4 space-y-3">
                {activeResults.map((result) => {
                  const value = result.aggregateScores[metric];
                  if (value === undefined) return null;
                  const best = maxByMetric[metric];
                  const direction = metricDirection(metric);
                  const width =
                    direction === "lower"
                      ? value > 0
                        ? Math.max(8, (best / value) * 100)
                        : 100
                      : best > 0
                        ? Math.max(8, (value / best) * 100)
                        : 0;
                  return (
                    <div key={result.providerId}>
                      <div className="mb-1 flex justify-between text-xs text-slate-600">
                        <span>{result.providerName}</span>
                        <span className="tabular-nums">{value.toFixed(1)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            result.rank === 1 ? "bg-teal-500" : "bg-slate-300"
                          }`}
                          style={{ width: `${Math.min(100, width)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Export & review</h2>
        <p className="mt-1 text-sm text-slate-500">
          Select which models and metrics to include, then download an Excel file or send the
          selection for human review.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-600">
                  Model \ Metric
                </th>
                {metrics.map((metric) => (
                  <th
                    key={metric}
                    className="border-b border-slate-200 px-3 py-2 text-center font-medium text-slate-600"
                  >
                    <label className="flex flex-col items-center gap-1">
                      {METRIC_LABELS[metric]}
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric)}
                        onChange={() => toggleMetric(metric)}
                      />
                    </label>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {run.providerResults.map((result) => {
                const providerSelected = selectedProviders.includes(result.providerId);
                return (
                  <tr key={result.providerId}>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <label className="flex items-center gap-2 font-medium text-slate-800">
                        <input
                          type="checkbox"
                          checked={providerSelected}
                          onChange={() => toggleProvider(result.providerId)}
                        />
                        {result.providerName}
                      </label>
                    </td>
                    {metrics.map((metric) => {
                      const cellOn = providerSelected && selectedMetrics.includes(metric);
                      return (
                        <td
                          key={metric}
                          className={`border-b border-slate-100 px-3 py-2 text-center tabular-nums ${
                            cellOn ? "text-slate-800" : "text-slate-300"
                          }`}
                        >
                          {result.aggregateScores[metric]?.toFixed(1) ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={selectedProviders.length === 0 || selectedMetrics.length === 0}
            onClick={() =>
              downloadSelectedResults(run, selectedProviders, selectedMetrics, tab === "human")
            }
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Download results
          </button>
          <button
            type="button"
            disabled={selectedProviders.length === 0 || selectedMetrics.length === 0}
            onClick={() => setShowReview(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-40"
          >
            <UserCheck className="h-4 w-4" />
            Send for human review
          </button>
        </div>
      </section>

      {showReview && (
        <SendForReviewWizard
          run={run}
          selectedProviderIds={selectedProviders}
          selectedMetrics={selectedMetrics}
          onClose={() => setShowReview(false)}
          onSent={() => setShowReview(false)}
        />
      )}
    </div>
  );
}
