"use client";

import { Pencil, Trash2, X, Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { downloadDatasetCsv } from "@/lib/export-csv";
import type { ChallengeDataset, TranslationSegment } from "@/lib/types";

interface SegmentEditorProps {
  dataset: ChallengeDataset;
  onClose: () => void;
  onSave: (dataset: ChallengeDataset) => void;
}

export function SegmentEditor({ dataset, onClose, onSave }: SegmentEditorProps) {
  const [segments, setSegments] = useState<TranslationSegment[]>(dataset.segments);
  const [name, setName] = useState(dataset.name);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState("");
  const [editTarget, setEditTarget] = useState("");

  function startEdit(seg: TranslationSegment) {
    setEditingId(seg.id);
    setEditSource(seg.source);
    setEditTarget(seg.target);
  }

  function saveEdit() {
    if (!editingId) return;
    setSegments((prev) =>
      prev.map((s) =>
        s.id === editingId
          ? { ...s, source: editSource.trim(), target: editTarget.trim() }
          : s,
      ),
    );
    setEditingId(null);
  }

  function deleteSegment(id: string) {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function handleSave() {
    onSave({
      ...dataset,
      name: name.trim() || dataset.name,
      segments,
      segmentCount: segments.length,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Dataset title"
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-lg font-semibold text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <p className="px-1 text-sm text-slate-500">
              {segments.length} segments · {dataset.randomBaseCount ?? 0} random
              base · {dataset.duplicateCount ?? 0} duplicates
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => downloadDatasetCsv({ ...dataset, name, segments })}
              className="rounded-lg p-2 text-slate-500 hover:bg-teal-50 hover:text-teal-700"
              aria-label="Download CSV"
              title="Download as CSV"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 w-8">#</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Target</th>
                <th className="px-4 py-2 w-24">Flags</th>
                <th className="px-4 py-2 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {segments.map((seg, idx) => {
                const isEditing = editingId === seg.id;
                return (
                  <tr key={seg.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 tabular-nums text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <textarea
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value)}
                          rows={2}
                          className="w-full rounded border border-teal-200 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
                        />
                      ) : (
                        <span className="text-slate-800">{seg.source}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <textarea
                          value={editTarget}
                          onChange={(e) => setEditTarget(e.target.value)}
                          rows={2}
                          className="w-full rounded border border-coral-200 px-2 py-1 text-sm focus:border-coral-500 focus:outline-none"
                        />
                      ) : (
                        <span className="text-slate-600">{seg.target}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {seg.isDuplicate && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-coral-50 px-1.5 py-0.5 text-[10px] font-medium text-coral-700">
                            <Copy className="h-2.5 w-2.5" />
                            dup
                          </span>
                        )}
                        {seg.isRandomBase && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            random
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="rounded p-1 text-teal-600 hover:bg-teal-50"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(seg)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteSegment(seg.id)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {segments.length === 0 && (
            <p className="py-12 text-center text-sm text-slate-500">
              No segments remaining.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
