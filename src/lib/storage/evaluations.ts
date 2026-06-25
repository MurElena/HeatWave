import type { EvaluationRun } from "@/lib/types";

const STORAGE_KEY = "trans-eval-runs";

export function loadEvaluationRuns(): EvaluationRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EvaluationRun[]) : [];
  } catch {
    return [];
  }
}

function persist(runs: EvaluationRun[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

export function saveEvaluationRun(run: EvaluationRun): void {
  const existing = loadEvaluationRuns();
  existing.unshift(run);
  persist(existing);
}

export function getEvaluationRun(id: string): EvaluationRun | undefined {
  return loadEvaluationRuns().find((run) => run.id === id);
}

export function updateEvaluationRun(updated: EvaluationRun): void {
  persist(loadEvaluationRuns().map((run) => (run.id === updated.id ? updated : run)));
}
