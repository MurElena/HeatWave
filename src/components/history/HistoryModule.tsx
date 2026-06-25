"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { HistoryCard } from "@/components/history/HistoryCard";
import { loadHistory } from "@/lib/storage/history";
import type { HistoryEntry } from "@/lib/types";

export function HistoryModule() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEntries(loadHistory());
  }, []);

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

      <div className="mt-6">
        {entries.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center">
            <History className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">No evaluations yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              Completed evaluations will appear here as cards.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <HistoryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
