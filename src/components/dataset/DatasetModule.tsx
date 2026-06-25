"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Database } from "lucide-react";
import { CreateChallengeWizard } from "@/components/dataset/CreateChallengeWizard";
import { DatasetCard } from "@/components/dataset/DatasetCard";
import {
  DatasetFilters,
  EMPTY_FILTERS,
  type DatasetFilterState,
} from "@/components/dataset/DatasetFilters";
import { createDemoDataset } from "@/lib/example-dataset";
import {
  deleteDataset,
  loadDatasets,
  saveDataset,
  updateDataset,
} from "@/lib/storage/datasets";
import type { ChallengeDataset, DatasetSizeRange } from "@/lib/types";

const DEMO_SEED_FLAG = "trans-eval-demo-seeded";

export function DatasetModule() {
  const [datasets, setDatasets] = useState<ChallengeDataset[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<DatasetFilterState>(EMPTY_FILTERS);

  useEffect(() => {
    setMounted(true);

    if (!localStorage.getItem(DEMO_SEED_FLAG)) {
      localStorage.setItem(DEMO_SEED_FLAG, "1");
      createDemoDataset().then((demo) => {
        saveDataset(demo);
        setDatasets(loadDatasets());
      });
    } else {
      setDatasets(loadDatasets());
    }
  }, []);

  function refresh() {
    setDatasets(loadDatasets());
  }

  function handleComplete(dataset: ChallengeDataset) {
    saveDataset(dataset);
    refresh();
    setShowWizard(false);
  }

  function handleDelete(id: string) {
    deleteDataset(id);
    refresh();
  }

  function handleUpdate(dataset: ChallengeDataset) {
    updateDataset(dataset);
    refresh();
  }

  const { domains, tags, languagePairs, sizeRanges } = useMemo(() => {
    const domainSet = new Set<string>();
    const tagSet = new Set<string>();
    const langSet = new Set<string>();
    const sizeSet = new Set<DatasetSizeRange>();

    for (const d of datasets) {
      if (d.domain) domainSet.add(d.domain);
      d.tags?.forEach((t) => tagSet.add(t));
      if (d.sourceLanguage && d.targetLanguage) {
        langSet.add(`${d.sourceLanguage}→${d.targetLanguage}`);
      }
      if (d.sizeRange) sizeSet.add(d.sizeRange);
    }

    return {
      domains: Array.from(domainSet).sort(),
      tags: Array.from(tagSet).sort(),
      languagePairs: Array.from(langSet).sort(),
      sizeRanges: Array.from(sizeSet).sort(),
    };
  }, [datasets]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return datasets.filter((d) => {
      if (q) {
        const haystack = [
          d.name,
          d.domain,
          ...(d.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.domain && d.domain !== filters.domain) return false;
      if (filters.tag && !(d.tags ?? []).includes(filters.tag)) return false;
      if (
        filters.language &&
        `${d.sourceLanguage}→${d.targetLanguage}` !== filters.language
      ) {
        return false;
      }
      if (filters.sizeRange && d.sizeRange !== filters.sizeRange) return false;
      return true;
    });
  }, [datasets, filters]);

  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dataset</h1>
          <p className="mt-1 text-slate-600">
            Create challenge datasets from TMX or bilingual XLSX files, with
            priority-based segment extraction.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Create new challenge
        </button>
      </div>

      {datasets.length > 0 && (
        <div className="mt-6">
          <DatasetFilters
            filters={filters}
            onChange={setFilters}
            domains={domains}
            tags={tags}
            languagePairs={languagePairs}
            sizeRanges={sizeRanges}
          />
        </div>
      )}

      <div className="mt-6">
        {datasets.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center">
            <Database className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">
              No datasets yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create your first challenge dataset to get started.
            </p>
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-coral-600"
            >
              <Plus className="h-4 w-4" />
              Create new challenge
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center">
            <Database className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">
              No datasets match your filters
            </h3>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-4 text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((dataset) => (
              <DatasetCard
                key={dataset.id}
                dataset={dataset}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {showWizard && (
        <CreateChallengeWizard
          onComplete={handleComplete}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
