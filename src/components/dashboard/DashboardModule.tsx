"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LineChart as LineChartIcon, Trophy, Filter, Sparkles, Trash2 } from "lucide-react";
import {
  LineChart,
  type LineChartAxisItem,
  type LineChartSeries,
} from "@/components/charts/LineChart";
import { clearDemoData, hasDemoData, seedDemoData } from "@/lib/demo/seed";
import { loadEvaluationRuns } from "@/lib/storage/evaluations";
import type { EvaluationRun } from "@/lib/types";
import { languageLabel } from "@/lib/types";

const PALETTE = [
  "#0d9488",
  "#f97316",
  "#6366f1",
  "#db2777",
  "#16a34a",
  "#0891b2",
  "#ca8a04",
  "#9333ea",
];

const selectClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DashboardModule() {
  const router = useRouter();
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [mounted, setMounted] = useState(false);

  const [modelFilter, setModelFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [demoLoaded, setDemoLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRuns(loadEvaluationRuns());
    setDemoLoaded(hasDemoData());
  }, []);

  function handleLoadDemo() {
    seedDemoData();
    setRuns(loadEvaluationRuns());
    setDemoLoaded(true);
  }

  function handleClearDemo() {
    clearDemoData();
    setRuns(loadEvaluationRuns());
    setDemoLoaded(false);
  }

  const models = useMemo(() => {
    const map = new Map<string, string>();
    runs.forEach((r) => r.providerResults.forEach((p) => map.set(p.providerId, p.providerName)));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [runs]);

  const colorFor = useMemo(() => {
    const map: Record<string, string> = {};
    models.forEach((m, i) => {
      map[m.id] = PALETTE[i % PALETTE.length];
    });
    return map;
  }, [models]);

  const domains = useMemo(
    () => Array.from(new Set(runs.map((r) => r.domain).filter(Boolean))).sort(),
    [runs],
  );

  const languagePairs = useMemo(
    () => Array.from(new Set(runs.map((r) => `${r.sourceLanguage}→${r.targetLanguage}`))).sort(),
    [runs],
  );

  const filteredRuns = useMemo(() => {
    return runs
      .filter((r) => !domainFilter || r.domain === domainFilter)
      .filter((r) => !languageFilter || `${r.sourceLanguage}→${r.targetLanguage}` === languageFilter)
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [runs, domainFilter, languageFilter]);

  const xAxis: LineChartAxisItem[] = useMemo(
    () => filteredRuns.map((r) => ({ runId: r.id, label: shortDate(r.createdAt) })),
    [filteredRuns],
  );

  const activeModels = useMemo(
    () => (modelFilter ? models.filter((m) => m.id === modelFilter) : models),
    [models, modelFilter],
  );

  function buildSeries(metric: (run: EvaluationRun, providerId: string) => number | undefined): LineChartSeries[] {
    return activeModels
      .map((m) => {
        const points = filteredRuns
          .map((run) => {
            const y = metric(run, m.id);
            return y === undefined ? null : { runId: run.id, y };
          })
          .filter((p): p is { runId: string; y: number } => p !== null);
        return { id: m.id, name: m.name, color: colorFor[m.id], points };
      })
      .filter((s) => s.points.length > 0);
  }

  const aggregatedSeries = useMemo(
    () =>
      buildSeries((run, pid) => run.providerResults.find((p) => p.providerId === pid)?.aggregatedScore),
    [activeModels, filteredRuns, colorFor],
  );

  const consistencySeries = useMemo(
    () =>
      buildSeries((run, pid) => {
        const pr = run.providerResults.find((p) => p.providerId === pid);
        return pr?.consistencyAvailable ? pr.consistencyScore : undefined;
      }),
    [activeModels, filteredRuns, colorFor],
  );

  const inferenceSeries = useMemo(
    () =>
      buildSeries((run, pid) => {
        const pr = run.providerResults.find((p) => p.providerId === pid);
        if (pr?.inferenceMs === undefined || run.segmentCount === 0) return undefined;
        return pr.inferenceMs / 1000 / run.segmentCount;
      }),
    [activeModels, filteredRuns, colorFor],
  );

  const overallWinner = useMemo(() => {
    const wins = new Map<string, { name: string; count: number }>();
    filteredRuns.forEach((run) => {
      if (modelFilter && run.winnerProviderId !== modelFilter) return;
      const id = run.winnerProviderId;
      if (!id) return;
      const cur = wins.get(id) ?? { name: run.winnerProviderName, count: 0 };
      cur.count += 1;
      wins.set(id, cur);
    });
    const sorted = Array.from(wins.entries()).sort((a, b) => b[1].count - a[1].count);
    return sorted[0] ? { id: sorted[0][0], ...sorted[0][1] } : null;
  }, [filteredRuns, modelFilter]);

  function handlePointClick(runId: string) {
    if (window.confirm("Open the detailed results for this evaluation?")) {
      router.push(`/evaluation/results/${runId}`);
    }
  }

  function toggleModel(id: string) {
    setModelFilter((prev) => (prev === id ? "" : id));
  }

  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  const hasData = filteredRuns.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-600">
            Track winners and model performance trends across all evaluations.
          </p>
        </div>
        <div className="flex gap-2">
          {demoLoaded ? (
            <button
              type="button"
              onClick={handleClearDemo}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear demo data
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLoadDemo}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Sparkles className="h-4 w-4" />
              Load demo data
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-500">
            <Filter className="h-4 w-4" />
            Filters
          </span>
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className={selectClass}
            aria-label="Filter by model"
          >
            <option value="">All models</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className={selectClass}
            aria-label="Filter by language pair"
          >
            <option value="">All language pairs</option>
            {languagePairs.map((pair) => {
              const [src, tgt] = pair.split("→");
              return (
                <option key={pair} value={pair}>
                  {languageLabel(src)} → {languageLabel(tgt)}
                </option>
              );
            })}
          </select>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className={selectClass}
            aria-label="Filter by domain"
          >
            <option value="">All domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!hasData ? (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center">
          <LineChartIcon className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-700">No evaluations to chart</h3>
          <p className="mt-1 text-sm text-slate-500">
            Run evaluations to populate the dashboard trends, or load demo data to explore.
          </p>
          <button
            type="button"
            onClick={handleLoadDemo}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Sparkles className="h-4 w-4" />
            Load demo data
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-coral-100 bg-gradient-to-br from-coral-50 to-white p-5">
              <div className="flex items-center gap-2 text-coral-600">
                <Trophy className="h-5 w-5" />
                <span className="text-sm font-medium">Overall winner</span>
              </div>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {overallWinner?.name ?? "—"}
              </p>
              <p className="text-xs text-slate-500">
                {overallWinner ? `${overallWinner.count} win(s)` : "No winners yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-teal-100 bg-white p-5">
              <span className="text-sm font-medium text-slate-500">Evaluations</span>
              <p className="mt-2 text-xl font-bold text-slate-900">{filteredRuns.length}</p>
              <p className="text-xs text-slate-500">in current view</p>
            </div>
            <div className="rounded-2xl border border-teal-100 bg-white p-5">
              <span className="text-sm font-medium text-slate-500">Models tracked</span>
              <p className="mt-2 text-xl font-bold text-slate-900">{activeModels.length}</p>
              <p className="text-xs text-slate-500">
                {modelFilter ? "filtered to 1 model" : "across evaluations"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {models.map((m) => {
              const active = !modelFilter || modelFilter === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleModel(m.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-slate-200 bg-white text-slate-700"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colorFor[m.id] }}
                  />
                  {m.name}
                </button>
              );
            })}
          </div>

          <ChartCard title="Aggregated score over time">
            <LineChart
              xAxis={xAxis}
              series={aggregatedSeries}
              yFormat={(v) => v.toFixed(0)}
              onPointClick={handlePointClick}
            />
          </ChartCard>

          <ChartCard title="Consistency over time (%)">
            <LineChart
              xAxis={xAxis}
              series={consistencySeries}
              yMax={100}
              yFormat={(v) => `${v.toFixed(0)}%`}
              onPointClick={handlePointClick}
            />
          </ChartCard>

          <ChartCard title="Inference time over time (s/segment)">
            <LineChart
              xAxis={xAxis}
              series={inferenceSeries}
              yFormat={(v) => `${v.toFixed(2)}s`}
              onPointClick={handlePointClick}
            />
          </ChartCard>

          <p className="mt-4 text-xs text-slate-400">
            Click a model chip to filter to that model. Click a data point to open its detailed
            results.
          </p>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
