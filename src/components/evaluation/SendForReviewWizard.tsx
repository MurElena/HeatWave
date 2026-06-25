"use client";

import { useMemo, useState } from "react";
import { X, UserCheck } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { loadProfile } from "@/lib/settings";
import { saveReview } from "@/lib/storage/reviews";
import type {
  EvaluationMetricId,
  EvaluationRun,
  Review,
  ReviewSegment,
} from "@/lib/types";
import { METRIC_LABELS } from "@/lib/types";

interface SendForReviewWizardProps {
  run: EvaluationRun;
  selectedProviderIds: string[];
  selectedMetrics: EvaluationMetricId[];
  onClose: () => void;
  onSent: () => void;
}

export function SendForReviewWizard({
  run,
  selectedProviderIds,
  selectedMetrics,
  onClose,
  onSent,
}: SendForReviewWizardProps) {
  const profile = useMemo(() => loadProfile(), []);
  const [assignee, setAssignee] = useState(profile.name || "Myself");

  const providers = run.providerResults.filter((r) =>
    selectedProviderIds.includes(r.providerId),
  );

  function buildSegments(): ReviewSegment[] {
    const base = providers[0]?.segmentScores ?? [];
    const byId = new Map(base.map((s) => [s.segmentId, s]));

    return base.map((seg, i) => {
      const twin = seg.duplicateOfId ? byId.get(seg.duplicateOfId) : undefined;
      return {
        segmentId: seg.segmentId,
        source: seg.source,
        reference: seg.reference,
        isDuplicate: seg.isDuplicate,
        duplicateOfId: seg.duplicateOfId,
        twinReference: twin?.reference,
        fromChallenge: !!seg.challengeSegmentId,
        challengeSegmentId: seg.challengeSegmentId,
        perProvider: providers.map((pr) => {
          const ps = pr.segmentScores[i];
          const scores: Partial<Record<EvaluationMetricId, number>> = {};
          for (const metric of selectedMetrics) {
            if (ps?.scores[metric] !== undefined) scores[metric] = ps.scores[metric]!;
          }
          return {
            providerId: pr.providerId,
            hypothesis: ps?.hypothesis ?? "",
            scores,
            juryRating: ps?.juryRating,
          };
        }),
      };
    });
  }

  function handleSend() {
    const providerNames: Record<string, string> = {};
    providers.forEach((p) => {
      providerNames[p.providerId] = p.providerName;
    });

    const review: Review = {
      id: crypto.randomUUID(),
      evaluationId: run.id,
      title: run.title,
      domain: run.domain,
      sourceLanguage: run.sourceLanguage,
      targetLanguage: run.targetLanguage,
      assignedTo: assignee.trim() || "Myself",
      assignedBy: profile.name || "Myself",
      status: "pending",
      metrics: selectedMetrics,
      providerIds: selectedProviderIds,
      providerNames,
      segments: buildSegments(),
      createdAt: new Date().toISOString(),
    };

    saveReview(review);
    onSent();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <UserCheck className="h-5 w-5 text-teal-600" />
              Send for human review
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">Assign to</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value={profile.name || "Myself"}>
                  {profile.name ? `${profile.name} (myself)` : "Myself"}
                </option>
                <option value="__other__">Someone else…</option>
              </select>
              {assignee === "__other__" && (
                <input
                  type="text"
                  autoFocus
                  placeholder="Reviewer name"
                  onChange={(e) => setAssignee(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              )}
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p>
                <strong>{selectedProviderIds.length}</strong> model(s) ×{" "}
                <strong>{selectedMetrics.length}</strong> metric(s)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Metrics: {selectedMetrics.map((m) => METRIC_LABELS[m]).join(", ") || "none"}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                selectedProviderIds.length === 0 ||
                selectedMetrics.length === 0 ||
                assignee === "__other__" ||
                !assignee.trim()
              }
              onClick={handleSend}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
            >
              Send for review
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
