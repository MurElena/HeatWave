import { qeModelFor } from "@/lib/ai/models";
import { getProviderById } from "@/lib/constants/mt-providers";
import { loadEvaluationRuns } from "@/lib/storage/evaluations";
import type { EvaluationRun } from "@/lib/types";

// Approximate AI Gateway list prices, USD per 1M tokens. These are estimates
// used to project spend until real per-call usage is captured from responses.
interface Price {
  input: number;
  output: number;
}

const PRICES: Record<string, Price> = {
  "openai/gpt-5.4": { input: 2.5, output: 15 },
  "openai/gpt-5.2": { input: 1.75, output: 12 },
  "anthropic/claude-sonnet-4.6": { input: 3, output: 15 },
  "google/gemini-3-flash": { input: 0.3, output: 2.5 },
  "deepseek/deepseek-v3.2": { input: 0.3, output: 1.2 },
  "mistral/mistral-large-3": { input: 2, output: 6 },
  "meta/llama-4-maverick": { input: 0.5, output: 1.5 },
  "xai/grok-4.3": { input: 3, output: 15 },
  "alibaba/qwen3-max": { input: 1.2, output: 6 },
};

const DEFAULT_PRICE: Price = { input: 1, output: 5 };

function priceFor(modelId: string): Price {
  return PRICES[modelId] ?? DEFAULT_PRICE;
}

function tokens(chars: number): number {
  return Math.ceil(chars / 4);
}

function prettifyModelName(modelId: string): string {
  const provider = getProviderById(modelId);
  if (provider) return provider.name;
  const tail = modelId.includes("/") ? modelId.split("/")[1] : modelId;
  return tail
    .split("-")
    .map((p) => (p.length <= 2 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))
    .join(" ");
}

export interface ModelExpense {
  modelId: string;
  modelName: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  segments: number;
}

export interface ExpenseReport {
  byModel: ModelExpense[];
  total: number;
  totalSegments: number;
  evaluationCount: number;
  /** True when at least one evaluation contributed real (measured) token usage. */
  hasMeasuredUsage: boolean;
}

interface Acc {
  inputTokens: number;
  outputTokens: number;
  segments: number;
}

// Per-call prompt scaffolding overhead, in tokens.
const TRANSLATE_OVERHEAD = 60;
const JUDGE_OVERHEAD = 120;

function ensure(acc: Map<string, Acc>, modelId: string): Acc {
  const cur = acc.get(modelId) ?? { inputTokens: 0, outputTokens: 0, segments: 0 };
  acc.set(modelId, cur);
  return cur;
}

/**
 * Estimates per-model token usage and segment counts for a run from segment
 * text length. Used as a fallback when real usage was not measured.
 */
function estimateRun(run: EvaluationRun): Map<string, Acc> {
  const local = new Map<string, Acc>();
  const metrics = run.config.metrics ?? [];
  const usesQe = metrics.includes("qe") && !!run.config.qeProvider;
  const usesJury = metrics.includes("llm-jury") && (run.config.juryModelIds?.length ?? 0) > 0;
  const qeModel = run.config.qeProvider ? qeModelFor(run.config.qeProvider) : null;
  const juryModels = run.config.juryModelIds ?? [];

  for (const provider of run.providerResults) {
    const segs = provider.segmentScores;

    const tr = ensure(local, provider.providerId);
    for (const s of segs) {
      tr.inputTokens += tokens(s.source.length) + TRANSLATE_OVERHEAD;
      tr.outputTokens += tokens(s.hypothesis.length);
    }
    tr.segments += segs.length;

    const judgeInput = segs.reduce(
      (sum, s) =>
        sum + tokens(s.source.length + s.reference.length + s.hypothesis.length) + JUDGE_OVERHEAD,
      0,
    );

    if (usesQe && qeModel) {
      const a = ensure(local, qeModel);
      a.inputTokens += judgeInput;
      a.outputTokens += segs.length * 5;
      a.segments += segs.length;
    }

    if (usesJury) {
      for (const jm of juryModels) {
        const a = ensure(local, jm);
        a.inputTokens += judgeInput;
        a.outputTokens += segs.length * 3;
        a.segments += segs.length;
      }
    }
  }

  return local;
}

/** Segment counts attributed per model for a run (used with real usage). */
function segmentsByModel(run: EvaluationRun): Map<string, number> {
  const map = new Map<string, number>();
  for (const [model, acc] of estimateRun(run)) {
    map.set(model, acc.segments);
  }
  return map;
}

function accumulateRun(run: EvaluationRun, acc: Map<string, Acc>): { segments: number; measured: boolean } {
  const runSegments = run.segmentCount ?? 0;
  const hasUsage = run.usage && Object.keys(run.usage).length > 0;

  if (hasUsage) {
    const segMap = segmentsByModel(run);
    const models = new Set<string>([
      ...Object.keys(run.usage!),
      ...segMap.keys(),
    ]);
    for (const model of models) {
      const u = run.usage![model];
      const cur = ensure(acc, model);
      cur.inputTokens += u?.inputTokens ?? 0;
      cur.outputTokens += u?.outputTokens ?? 0;
      cur.segments += segMap.get(model) ?? 0;
    }
    return { segments: runSegments, measured: true };
  }

  for (const [model, v] of estimateRun(run)) {
    const cur = ensure(acc, model);
    cur.inputTokens += v.inputTokens;
    cur.outputTokens += v.outputTokens;
    cur.segments += v.segments;
  }
  return { segments: runSegments, measured: false };
}

export function computeExpenseReport(runs: EvaluationRun[] = loadEvaluationRuns()): ExpenseReport {
  const acc = new Map<string, Acc>();
  let totalSegments = 0;
  let hasMeasuredUsage = false;

  for (const run of runs) {
    const { segments, measured } = accumulateRun(run, acc);
    totalSegments += segments;
    if (measured) hasMeasuredUsage = true;
  }

  const byModel: ModelExpense[] = Array.from(acc.entries())
    .map(([modelId, v]) => {
      const price = priceFor(modelId);
      const cost =
        (v.inputTokens / 1e6) * price.input + (v.outputTokens / 1e6) * price.output;
      return {
        modelId,
        modelName: prettifyModelName(modelId),
        cost,
        inputTokens: v.inputTokens,
        outputTokens: v.outputTokens,
        segments: v.segments,
      };
    })
    .sort((a, b) => b.cost - a.cost);

  const total = byModel.reduce((sum, m) => sum + m.cost, 0);

  return { byModel, total, totalSegments, evaluationCount: runs.length, hasMeasuredUsage };
}

export function formatUsd(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}
