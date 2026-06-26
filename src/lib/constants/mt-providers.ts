import { loadModels, MODEL_CATALOG, type LlmModel } from "@/lib/settings";

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** A model is "New" when it was added within the last month. */
export function isProviderNew(model: { addedAt?: string }, now = Date.now()): boolean {
  if (!model.addedAt) return false;
  return now - new Date(model.addedAt).getTime() < ONE_MONTH_MS;
}

/**
 * Look up a model by its gateway slug. Falls back to the static catalog so
 * lookups work even before the user's settings have been persisted.
 */
export function getProviderById(id: string): LlmModel | undefined {
  return (
    loadModels().find((m) => m.id === id) ??
    MODEL_CATALOG.find((m) => m.id === id)
  );
}
