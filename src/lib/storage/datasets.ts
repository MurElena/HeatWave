import type { ChallengeDataset } from "@/lib/types";

const STORAGE_KEY = "trans-eval-datasets";

export function loadDatasets(): ChallengeDataset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChallengeDataset[];
  } catch {
    return [];
  }
}

function persist(datasets: ChallengeDataset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets));
}

export function saveDataset(dataset: ChallengeDataset): void {
  const existing = loadDatasets();
  existing.unshift(dataset);
  persist(existing);
}

export function updateDataset(updated: ChallengeDataset): void {
  const datasets = loadDatasets().map((d) =>
    d.id === updated.id ? updated : d,
  );
  persist(datasets);
}

export function deleteDataset(id: string): void {
  persist(loadDatasets().filter((d) => d.id !== id));
}
