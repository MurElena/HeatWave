"use client";

import { CheckCircle2, Clock, Layers, User } from "lucide-react";
import type { Review } from "@/lib/types";
import { METRIC_LABELS, languageLabel } from "@/lib/types";

interface ReviewCardProps {
  review: Review;
  onOpen: (review: Review) => void;
}

export function ReviewCard({ review, onOpen }: ReviewCardProps) {
  const done = review.status === "done";

  return (
    <button
      type="button"
      onClick={() => onOpen(review)}
      className={`w-full rounded-xl border p-5 text-left shadow-sm transition-colors ${
        done
          ? "border-green-200 bg-green-50 hover:border-green-300"
          : "border-amber-200 bg-amber-50 hover:border-amber-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{review.title}</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            done ? "bg-green-200 text-green-800" : "bg-amber-200 text-amber-800"
          }`}
        >
          {done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {done ? "Completed" : "Pending"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-white/70 px-2.5 py-0.5 font-medium text-slate-700">
          {review.domain}
        </span>
        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 font-medium text-white">
          {languageLabel(review.sourceLanguage)} → {languageLabel(review.targetLanguage)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-0.5 text-slate-700">
          <Layers className="h-3 w-3" />
          {review.segments.filter((s) => !s.deleted).length} segments
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-0.5 text-slate-700">
          <User className="h-3 w-3" />
          from {review.assignedBy}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Metrics: {review.metrics.map((m) => METRIC_LABELS[m]).join(", ")} ·{" "}
        {review.providerIds.length} model(s)
      </p>
    </button>
  );
}
