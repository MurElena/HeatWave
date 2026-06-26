"use client";

import { useMemo, useState } from "react";
import { X, Pencil, Trash2, GitCommitHorizontal, Check, Copy, Database, EyeOff } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { recalcResultsFromReview } from "@/lib/evaluation/human-recalc";
import { loadDatasets, updateDataset } from "@/lib/storage/datasets";
import { getEvaluationRun, updateEvaluationRun } from "@/lib/storage/evaluations";
import { updateReview } from "@/lib/storage/reviews";
import type { ChallengeDataset, EvaluationMetricId, Review, ReviewSegment } from "@/lib/types";
import { METRIC_LABELS, languageLabel } from "@/lib/types";

interface ReviewEditorProps {
  review: Review;
  onClose: () => void;
  onFinished: () => void;
}

export function ReviewEditor({ review, onClose, onFinished }: ReviewEditorProps) {
  const [segments, setSegments] = useState<ReviewSegment[]>(() =>
    review.segments.map((s) => ({
      ...s,
      perProvider: s.perProvider.map((p) => ({ ...p, scores: { ...p.scores } })),
    })),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [committed, setCommitted] = useState<Set<string>>(new Set());

  const challengeDatasetId = useMemo(
    () => getEvaluationRun(review.evaluationId)?.challengeDatasetId,
    [review.evaluationId],
  );

  const done = review.status === "done";
  const visibleSegments = segments.filter((s) => !s.deleted);
  const blind = !!(review.blind && review.displayNames);

  function nameFor(providerId: string): string {
    if (blind) return review.displayNames![providerId] ?? providerId;
    return review.providerNames[providerId] ?? providerId;
  }

  function orderedProviders(pp: ReviewSegment["perProvider"]): ReviewSegment["perProvider"] {
    if (!blind) return pp;
    return [...pp].sort((a, b) => nameFor(a.providerId).localeCompare(nameFor(b.providerId)));
  }

  const segmentsById = useMemo(() => {
    const map: Record<string, ReviewSegment> = {};
    for (const s of segments) map[s.segmentId] = s;
    return map;
  }, [segments]);

  /** The other segment that shares the same source (consistency twin). */
  function twinOf(seg: ReviewSegment): ReviewSegment | undefined {
    if (seg.duplicateOfId && segmentsById[seg.duplicateOfId]) {
      return segmentsById[seg.duplicateOfId];
    }
    // Fall back to any other segment with an identical source.
    return segments.find(
      (s) => s.segmentId !== seg.segmentId && s.source === seg.source,
    );
  }

  function setScore(
    segmentId: string,
    providerId: string,
    metric: EvaluationMetricId,
    value: number,
  ) {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.segmentId !== segmentId) return seg;
        return {
          ...seg,
          perProvider: seg.perProvider.map((p) =>
            p.providerId === providerId
              ? { ...p, scores: { ...p.scores, [metric]: value } }
              : p,
          ),
        };
      }),
    );
  }

  function getChallengeDataset(): ChallengeDataset | undefined {
    if (!challengeDatasetId) return undefined;
    return loadDatasets().find((d) => d.id === challengeDatasetId);
  }

  function handleDelete(seg: ReviewSegment) {
    setSegments((prev) =>
      prev.map((s) => (s.segmentId === seg.segmentId ? { ...s, deleted: true } : s)),
    );

    if (seg.fromChallenge && seg.challengeSegmentId) {
      const dataset = getChallengeDataset();
      if (dataset) {
        const nextSegments = dataset.segments.filter(
          (s) => s.id !== seg.challengeSegmentId,
        );
        updateDataset({
          ...dataset,
          segments: nextSegments,
          segmentCount: nextSegments.length,
        });
      }
    }
  }

  function handleCommit(seg: ReviewSegment) {
    const dataset = getChallengeDataset();
    if (!dataset) return;
    const exists = dataset.segments.some(
      (s) => s.source === seg.source && s.target === seg.reference,
    );
    if (!exists) {
      const nextSegments = [
        ...dataset.segments,
        {
          id: crypto.randomUUID(),
          source: seg.source,
          target: seg.reference,
          categories: [],
        },
      ];
      updateDataset({
        ...dataset,
        segments: nextSegments,
        segmentCount: nextSegments.length,
      });
    }
    setCommitted((prev) => new Set([...prev, seg.segmentId]));
  }

  function handleFinish() {
    const updatedReview: Review = {
      ...review,
      segments,
      status: "done",
      completedAt: new Date().toISOString(),
    };
    updateReview(updatedReview);

    const humanResults = recalcResultsFromReview(updatedReview);
    const run = getEvaluationRun(review.evaluationId);
    if (run) {
      const winner = humanResults[0];
      updateEvaluationRun({
        ...run,
        hasHumanResults: true,
        humanResults,
        humanWinnerProviderId: winner?.providerId,
        humanWinnerProviderName: winner?.providerName,
      });
    }
    onFinished();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
        <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{review.title}</h2>
                {blind && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-white">
                    <EyeOff className="h-3 w-3" />
                    Blind
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {languageLabel(review.sourceLanguage)} → {languageLabel(review.targetLanguage)} ·{" "}
                {visibleSegments.length} segments · from {review.assignedBy}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {visibleSegments.map((seg) => {
              const isEditing = editingId === seg.segmentId;
              return (
                <div
                  key={seg.segmentId}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{seg.source}</p>
                        {seg.fromChallenge && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700"
                            title="This segment comes from the challenge dataset"
                          >
                            <Database className="h-3 w-3" />
                            Challenge
                          </span>
                        )}
                        {seg.isDuplicate && (() => {
                          const twin = twinOf(seg);
                          return (
                            <span className="group relative inline-flex">
                              <span className="inline-flex cursor-help items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                                <Copy className="h-3 w-3" />
                                Duplicate
                              </span>
                              <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-96 max-w-[80vw] rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xl group-hover:block">
                                <p className="text-xs font-semibold text-slate-700">
                                  Same source — twin segment results
                                </p>
                                {twin ? (
                                  <>
                                    <p className="mt-1 text-xs italic text-slate-500">
                                      “{twin.source}”
                                    </p>
                                    <table className="mt-2 w-full text-xs">
                                      <thead>
                                        <tr className="text-slate-400">
                                          <th className="py-1 pr-2 text-left font-medium">Model</th>
                                          <th className="py-1 text-left font-medium">Translation</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {orderedProviders(twin.perProvider).map((pp) => (
                                          <tr
                                            key={pp.providerId}
                                            className="border-t border-slate-100 align-top"
                                          >
                                            <td className="py-1 pr-2 font-medium text-slate-700">
                                              {nameFor(pp.providerId)}
                                            </td>
                                            <td className="py-1 text-slate-600">{pp.hypothesis}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </>
                                ) : (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {seg.twinReference ?? "No twin segment found."}
                                  </p>
                                )}
                              </div>
                            </span>
                          );
                        })()}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{seg.reference}</p>
                    </div>

                    {!done && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(isEditing ? null : seg.segmentId)}
                          className={`rounded-lg p-2 ${
                            isEditing
                              ? "bg-teal-100 text-teal-700"
                              : "text-slate-400 hover:bg-teal-50 hover:text-teal-700"
                          }`}
                          title="Edit scores"
                        >
                          {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(seg)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete segment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {(() => {
                          const isCommitted = committed.has(seg.segmentId);
                          const locked = isCommitted || seg.fromChallenge;
                          return (
                            <button
                              type="button"
                              onClick={() => handleCommit(seg)}
                              disabled={locked}
                              className={`rounded-lg p-2 ${
                                locked
                                  ? "cursor-not-allowed text-slate-300"
                                  : "text-slate-400 hover:bg-teal-50 hover:text-teal-700"
                              }`}
                              title={
                                seg.fromChallenge
                                  ? "Already in the challenge dataset"
                                  : isCommitted
                                    ? "Saved to the challenge dataset"
                                    : "Commit to challenge dataset"
                              }
                            >
                              {isCommitted ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <GitCommitHorizontal className="h-4 w-4" />
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="px-2 py-1 text-left font-medium">Model</th>
                          <th className="px-2 py-1 text-left font-medium">Translation</th>
                          {review.metrics.map((metric) => (
                            <th key={metric} className="px-2 py-1 text-left font-medium">
                              {METRIC_LABELS[metric]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orderedProviders(seg.perProvider).map((pp) => (
                          <tr key={pp.providerId} className="border-t border-slate-100">
                            <td className="px-2 py-1 font-medium text-slate-700">
                              {nameFor(pp.providerId)}
                            </td>
                            <td className="px-2 py-1 text-slate-600">{pp.hypothesis}</td>
                            {review.metrics.map((metric) => (
                              <td key={metric} className="px-2 py-1 tabular-nums text-slate-700">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={pp.scores[metric] ?? ""}
                                    onChange={(e) =>
                                      setScore(
                                        seg.segmentId,
                                        pp.providerId,
                                        metric,
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-16 rounded border border-slate-200 px-1.5 py-0.5"
                                  />
                                ) : (
                                  pp.scores[metric]?.toFixed(1) ?? "—"
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">
              Edit scores, delete or commit segments, then finish to recalculate human results.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              {!done && (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Finish
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
