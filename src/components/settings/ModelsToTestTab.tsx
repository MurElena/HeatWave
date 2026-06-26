"use client";

import { Cpu, Plus, Sparkles, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { isProviderNew } from "@/lib/constants/mt-providers";
import type { LlmModel } from "@/lib/settings";

interface ModelsToTestTabProps {
  models: LlmModel[];
  onChange: (models: LlmModel[]) => void;
}

export function ModelsToTestTab({ models, onChange }: ModelsToTestTabProps) {
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const translationModels = models.filter((m) => m.translation);

  function update(id: string, patch: Partial<LlmModel>) {
    onChange(models.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function remove(id: string) {
    onChange(models.filter((m) => m.id !== id));
  }

  function addModel() {
    const name = newName.trim();
    const slug = newSlug.trim();
    if (!name || !slug) return;
    if (models.some((m) => m.id === slug)) {
      // Already present — just make sure it's enabled for translation.
      update(slug, { enabled: true, translation: true });
    } else {
      onChange([
        ...models,
        {
          id: slug,
          name,
          provider: slug.split("/")[0] || "Custom",
          apiKey: "",
          enabled: true,
          translation: true,
          addedAt: new Date().toISOString(),
        },
      ]);
    }
    setNewName("");
    setNewSlug("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2.5 text-sm text-teal-800">
        <Zap className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Translation models are served through the <strong>Vercel AI Gateway</strong> — no
          per-model API keys needed. Enable the models you want available in the evaluation
          wizard, or add any gateway model below.
        </p>
      </div>

      <div className="space-y-2">
        {translationModels.map((model) => (
          <div
            key={model.id}
            className={`rounded-xl border p-3 ${
              model.enabled ? "border-teal-200 bg-teal-50/30" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Cpu className="h-4 w-4 text-teal-500" />
                  {model.name}
                  {isProviderNew(model) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2 py-0.5 text-xs font-semibold text-coral-700">
                      <Sparkles className="h-3 w-3" />
                      New
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate font-mono text-xs text-slate-400">{model.id}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={model.enabled}
                  onClick={() => update(model.id, { enabled: !model.enabled })}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    model.enabled ? "bg-teal-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      model.enabled ? "left-4" : "left-0.5"
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => remove(model.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove model"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 p-3">
        <p className="text-sm font-medium text-slate-700">Add a translation model</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Use the gateway slug, e.g. <span className="font-mono">mistral/ministral-3b</span>.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addModel()}
            placeholder="Display name (e.g. Ministral 3B)"
            className="min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
          <input
            type="text"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addModel()}
            placeholder="provider/model"
            className="w-44 rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
          <button
            type="button"
            onClick={addModel}
            disabled={!newName.trim() || !newSlug.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
