import type { Review } from "@/lib/types";

const STORAGE_KEY = "trans-eval-reviews";
export const REVIEWS_CHANGED_EVENT = "trans-eval-reviews-changed";

function emitChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REVIEWS_CHANGED_EVENT));
  }
}

export function loadReviews(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
}

function persist(reviews: Review[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  emitChange();
}

export function saveReview(review: Review): void {
  const existing = loadReviews();
  existing.unshift(review);
  persist(existing);
}

export function updateReview(updated: Review): void {
  persist(loadReviews().map((r) => (r.id === updated.id ? updated : r)));
}

export function getReview(id: string): Review | undefined {
  return loadReviews().find((r) => r.id === id);
}

export function deleteReview(id: string): void {
  persist(loadReviews().filter((r) => r.id !== id));
}

export function countPendingReviews(): number {
  return loadReviews().filter((r) => r.status === "pending").length;
}
