import type { EvaluationRun, HistoryEntry } from "@/lib/types";

const STORAGE_KEY = "trans-eval-history";

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: HistoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function saveHistoryFromEvaluation(run: EvaluationRun): HistoryEntry {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    evaluationId: run.id,
    title: run.title,
    domain: run.domain,
    sourceLanguage: run.sourceLanguage,
    targetLanguage: run.targetLanguage,
    winnerProviderName: run.winnerProviderName,
    createdAt: run.createdAt,
  };

  const existing = loadHistory();
  existing.unshift(entry);
  persist(existing);
  return entry;
}

export function deleteHistoryEntry(id: string): void {
  persist(loadHistory().filter((entry) => entry.id !== id));
}
