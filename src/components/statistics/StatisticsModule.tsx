"use client";

import { useEffect, useState } from "react";
import { BarChart3, Coins, Layers, Wallet } from "lucide-react";
import {
  computeExpenseReport,
  formatUsd,
  type ExpenseReport,
} from "@/lib/stats/expenses";

const PALETTE = [
  "#0d9488",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
  "#eab308",
  "#ec4899",
  "#22c55e",
];

export function StatisticsModule() {
  const [report, setReport] = useState<ExpenseReport | null>(null);

  useEffect(() => {
    setReport(computeExpenseReport());
  }, []);

  if (!report) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-slate-500">Loading statistics…</p>
      </div>
    );
  }

  const { byModel, total, totalSegments, evaluationCount, hasMeasuredUsage } = report;
  const maxCost = Math.max(...byModel.map((m) => m.cost), 0);

  // Build the donut conic-gradient from cost shares.
  let cursor = 0;
  const stops: string[] = [];
  byModel.forEach((m, i) => {
    const share = total > 0 ? (m.cost / total) * 100 : 0;
    const color = PALETTE[i % PALETTE.length];
    stops.push(`${color} ${cursor}% ${cursor + share}%`);
    cursor += share;
  });
  if (stops.length === 0) stops.push("#e2e8f0 0% 100%");
  const donut = `conic-gradient(${stops.join(", ")})`;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-teal-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Statistics</h1>
          <p className="text-sm text-slate-600">
            Estimated model spend across your evaluations.
          </p>
        </div>
      </div>

      {byModel.length === 0 ? (
        <div className="mt-12 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center">
          <Wallet className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-700">No spend yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Run an evaluation to start tracking estimated expenses by model.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Coins className="h-5 w-5 text-teal-600" />}
              label="Total estimated spend"
              value={formatUsd(total)}
            />
            <StatCard
              icon={<BarChart3 className="h-5 w-5 text-coral-500" />}
              label="Evaluations"
              value={String(evaluationCount)}
            />
            <StatCard
              icon={<Layers className="h-5 w-5 text-indigo-500" />}
              label="Segments processed"
              value={totalSegments.toLocaleString()}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div
                className="relative h-44 w-44 rounded-full"
                style={{ background: donut }}
              >
                <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                  <span className="text-xs text-slate-400">Total</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatUsd(total)}
                  </span>
                </div>
              </div>
              <div className="mt-4 w-full space-y-1.5">
                {byModel.map((m, i) => (
                  <div key={m.modelId} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="flex-1 truncate text-slate-600">{m.modelName}</span>
                    <span className="font-medium text-slate-500">
                      {total > 0 ? Math.round((m.cost / total) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Expenses by model</h2>
              <div className="mt-4 space-y-3">
                {byModel.map((m, i) => (
                  <div key={m.modelId}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-slate-700">{m.modelName}</span>
                      <span className="tabular-nums text-slate-600">{formatUsd(m.cost)}</span>
                    </div>
                    <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxCost > 0 ? (m.cost / maxCost) * 100 : 0}%`,
                          backgroundColor: PALETTE[i % PALETTE.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 text-right font-medium">Input tokens</th>
                  <th className="px-4 py-3 text-right font-medium">Output tokens</th>
                  <th className="px-4 py-3 text-right font-medium">Segments</th>
                  <th className="px-4 py-3 text-right font-medium">Est. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byModel.map((m) => (
                  <tr key={m.modelId}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{m.modelName}</span>
                      <span className="ml-2 font-mono text-xs text-slate-400">{m.modelId}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {m.inputTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {m.outputTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {m.segments.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                      {formatUsd(m.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-800" colSpan={4}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-teal-700">
                    {formatUsd(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            {hasMeasuredUsage
              ? "Token counts are measured from model responses; costs apply approximate AI Gateway list prices."
              : "Costs are estimated from segment text length and approximate AI Gateway list prices."}{" "}
            Authoritative billing is shown in your Vercel AI Gateway dashboard.
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
