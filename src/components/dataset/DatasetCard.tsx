"use client";

import { ChevronDown, ChevronUp, Trash2, Pencil, Download } from "lucide-react";
import { useState } from "react";
import type { ChallengeDataset } from "@/lib/types";
import { languageLabel } from "@/lib/types";
import { PRIORITY_CARDS } from "@/lib/constants/priority-cards";
import { downloadDatasetCsv } from "@/lib/export-csv";
import { SegmentEditor } from "./SegmentEditor";

interface DatasetCardProps {
  dataset: ChallengeDataset;
  onDelete: (id: string) => void;
  onUpdate: (dataset: ChallengeDataset) => void;
}

const cardLabels = Object.fromEntries(
  PRIORITY_CARDS.map((c) => [c.id, c.name]),
);

export function DatasetCard({ dataset, onDelete, onUpdate }: DatasetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const activeCategories = Object.entries(dataset.categoryBreakdown ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const enabledList =
    dataset.enabledCriteria ??
    dataset.priorities.filter(
      (p) => (dataset.categoryBreakdown?.[p] ?? 0) > 0 || p === "consistency",
    );

  return (
    <>
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <button
              type="button"
              onClick={() => setShowEditor(true)}
              className="min-w-0 flex-1 text-left transition-colors hover:opacity-80"
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {dataset.name}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                  {dataset.domain}
                </span>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-white">
                  {dataset.sourceLanguage ?? "?"} → {dataset.targetLanguage ?? "?"}
                </span>
                {dataset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
                <span className="rounded-full bg-coral-50 px-2.5 py-0.5 text-xs font-medium text-coral-700">
                  {dataset.segmentCount} segments
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                  {dataset.sizeRange}
                </span>
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setShowEditor(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700"
                aria-label="Edit segments"
                title="View & edit segments"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => downloadDatasetCsv(dataset)}
                className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700"
                aria-label="Download CSV"
                title="Download as CSV"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(dataset.id)}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete dataset"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Created {new Date(dataset.createdAt).toLocaleDateString()}
            </p>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={expanded ? "Collapse details" : "Expand details"}
            >
              {expanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-700">
                  Source files
                </h4>
                <ul className="mt-1 space-y-1 text-sm text-slate-600">
                  {dataset.sourceFileNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                {dataset.glossaryFileName && (
                  <p className="mt-2 text-sm text-slate-600">
                    Glossary: {dataset.glossaryFileName}
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-600">
                  Languages: {languageLabel(dataset.sourceLanguage)} →{" "}
                  {languageLabel(dataset.targetLanguage)}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700">
                  Active criteria (ordered)
                </h4>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-sm text-slate-600">
                  {enabledList.map((p) => (
                    <li key={p}>{cardLabels[p] ?? p}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
              <span>
                Criteria: ~
                {dataset.segmentCount - (dataset.randomBaseCount ?? 0)} (~70%)
              </span>
              <span>Random base: {dataset.randomBaseCount ?? 0} (~30%)</span>
              <span>Duplicates: {dataset.duplicateCount ?? 0}</span>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-700">
                Category breakdown
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeCategories.map(([cat, count]) => (
                  <span
                    key={cat}
                    className="rounded-md border border-teal-100 bg-white px-2 py-1 text-xs text-slate-700"
                  >
                    {cardLabels[cat as keyof typeof cardLabels] ?? cat}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </article>

      {showEditor && (
        <SegmentEditor
          dataset={dataset}
          onClose={() => setShowEditor(false)}
          onSave={onUpdate}
        />
      )}
    </>
  );
}
