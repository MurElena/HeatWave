"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import type { HistoryEntry } from "@/lib/types";
import { languageLabel } from "@/lib/types";

interface HistoryCardProps {
  entry: HistoryEntry;
}

export function HistoryCard({ entry }: HistoryCardProps) {
  return (
    <Link
      href={`/evaluation/results/${entry.evaluationId}`}
      className="block overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-300"
    >
      <h3 className="text-lg font-semibold text-slate-900">{entry.title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
          {entry.domain}
        </span>
        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-white">
          {languageLabel(entry.sourceLanguage)} → {languageLabel(entry.targetLanguage)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-coral-50 px-2.5 py-0.5 text-xs font-medium text-coral-700">
          <Trophy className="h-3 w-3" />
          {entry.winnerProviderName}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {new Date(entry.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </Link>
  );
}
