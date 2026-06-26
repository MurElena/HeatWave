"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Search, X } from "lucide-react";
import { HistoryCard } from "@/components/history/HistoryCard";
import { loadHistory } from "@/lib/storage/history";
import type { HistoryEntry } from "@/lib/types";
import { languageLabel } from "@/lib/types";

const selectClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

export function HistoryModule() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    setMounted(true);
    setEntries(loadHistory());
  }, []);

  const domains = useMemo(
    () => Array.from(new Set(entries.map((e) => e.domain).filter(Boolean))).sort(),
    [entries],
  );

  const languagePairs = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => `${e.sourceLanguage}→${e.targetLanguage}`)),
      ).sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (domain && e.domain !== domain) return false;
      if (language && `${e.sourceLanguage}→${e.targetLanguage}` !== language) return false;
      if (q) {
        const haystack = [
          e.title,
          e.domain,
          e.winnerProviderName,
          languageLabel(e.sourceLanguage),
          languageLabel(e.targetLanguage),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries, search, domain, language]);

  const hasActiveFilters = Boolean(search || domain || language);

  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">History</h1>
        <p className="mt-1 text-slate-600">
          Past evaluations with date, domain, language pairs, and winning provider.
        </p>
      </div>

      {entries.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, domain or winner…"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
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
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
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

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDomain("");
                  setLanguage("");
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-coral-600 hover:bg-coral-50"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        {entries.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center">
            <History className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">No evaluations yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Completed evaluations will appear here as cards.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center">
            <Search className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">No matches</h3>
            <p className="mt-1 text-sm text-slate-500">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((entry) => (
              <HistoryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
