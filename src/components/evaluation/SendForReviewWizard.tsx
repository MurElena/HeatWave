"use client";

import { useMemo, useState } from "react";
import { X, UserCheck, EyeOff } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { loadProfile } from "@/lib/settings";
import { assignableUsersForPair } from "@/lib/users";
import { saveReview } from "@/lib/storage/reviews";
import { languageLabel } from "@/lib/types";
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
  const candidates = useMemo(
    () => assignableUsersForPair(run.sourceLanguage, run.targetLanguage),
    [run.sourceLanguage, run.targetLanguage],
  );
  const [assignee, setAssignee] = useState(candidates[0]?.name ?? "");
  const [blind, setBlind] = useState(false);

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

  function placeholderLabel(index: number): string {
    let n = index;
    let label = "";
    do {
      label = String.fromCharCode(65 + (n % 26)) + label;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return `Model ${label}`;
  }

  function buildDisplayNames(): Record<string, string> {
    const ids = selectedProviderIds.slice();
    // Fisher–Yates shuffle so placeholder ↔ model mapping is randomised.
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const names: Record<string, string> = {};
    ids.forEach((id, i) => {
      names[id] = placeholderLabel(i);
    });
    return names;
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
      assignedTo: assignee.trim() || profile.name || "Myself",
      assignedBy: profile.name || "Myself",
      status: "pending",
      metrics: selectedMetrics,
      providerIds: selectedProviderIds,
      providerNames,
      blind,
      displayNames: blind ? buildDisplayNames() : undefined,
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
              <p className="mt-0.5 text-xs text-slate-500">
                Reviewers who work {languageLabel(run.sourceLanguage)} →{" "}
                {languageLabel(run.targetLanguage)}.
              </p>
              {candidates.length === 0 ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  No reviewers are configured for this language pair. Add the pair to your
                  work languages in Account, or to a user&apos;s profile.
                </div>
              ) : (
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  {candidates.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.isSelf ? `${c.name} (myself)` : c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:border-teal-300">
              <input
                type="checkbox"
                checked={blind}
                onChange={(e) => setBlind(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <EyeOff className="h-4 w-4 text-teal-600" />
                  Blind review
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Model names are hidden behind randomised placeholders (Model A, B, …) so the
                  reviewer can&apos;t tell which provider produced each translation. Real names
                  are still used in the results.
                </span>
              </span>
            </label>

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
                candidates.length === 0 ||
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
