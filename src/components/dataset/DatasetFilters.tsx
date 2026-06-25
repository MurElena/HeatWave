"use client";

import { Search, X } from "lucide-react";
import type { DatasetSizeRange } from "@/lib/types";
import { languageLabel } from "@/lib/types";

export interface DatasetFilterState {
  search: string;
  domain: string;
  tag: string;
  language: string;
  sizeRange: string;
}

export const EMPTY_FILTERS: DatasetFilterState = {
  search: "",
  domain: "",
  tag: "",
  language: "",
  sizeRange: "",
};

interface DatasetFiltersProps {
  filters: DatasetFilterState;
  onChange: (filters: DatasetFilterState) => void;
  domains: string[];
  tags: string[];
  languagePairs: string[];
  sizeRanges: DatasetSizeRange[];
}

const selectClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

export function DatasetFilters({
  filters,
  onChange,
  domains,
  tags,
  languagePairs,
  sizeRanges,
}: DatasetFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.domain ||
    filters.tag ||
    filters.language ||
    filters.sizeRange;

  function set<K extends keyof DatasetFilterState>(
    key: K,
    value: DatasetFilterState[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Search by name, domain or tag…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <select
          value={filters.domain}
          onChange={(e) => set("domain", e.target.value)}
          className={selectClass}
          aria-label="Filter by domain"
        >
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={filters.tag}
          onChange={(e) => set("tag", e.target.value)}
          className={selectClass}
          aria-label="Filter by tag"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filters.language}
          onChange={(e) => set("language", e.target.value)}
          className={selectClass}
          aria-label="Filter by languages"
        >
          <option value="">All languages</option>
          {languagePairs.map((pair) => {
            const [src, tgt] = pair.split("→");
            return (
              <option key={pair} value={pair}>
                {languageLabel(src)} → {languageLabel(tgt)}
              </option>
            );
          })}
        </select>

        <select
          value={filters.sizeRange}
          onChange={(e) => set("sizeRange", e.target.value)}
          className={selectClass}
          aria-label="Filter by length range"
        >
          <option value="">All sizes</option>
          {sizeRanges.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-coral-600 hover:bg-coral-50"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
