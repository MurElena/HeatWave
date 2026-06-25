"use client";

import { GripVertical } from "lucide-react";
import { useMemo, useState } from "react";
import { CompositionPreview } from "@/components/dataset/CompositionPreview";
import { computeComposition } from "@/lib/composition";
import type { CriterionState, PriorityCard, SegmentCategory } from "@/lib/types";

interface PrioritySortListProps {
  cards: PriorityCard[];
  criteria: CriterionState[];
  hasGlossary: boolean;
  onChange: (criteria: CriterionState[]) => void;
}

export function PrioritySortList({
  cards,
  criteria,
  hasGlossary,
  onChange,
}: PrioritySortListProps) {
  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const slices = useMemo(
    () => computeComposition(criteria, cards, hasGlossary),
    [criteria, cards, hasGlossary],
  );

  function toggle(id: SegmentCategory) {
    onChange(
      criteria.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
    );
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...criteria];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Drag a tab up or down to set its priority in your context — the closer
        to the top, the larger its share of the challenge dataset.
      </p>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {criteria.map((item, index) => {
          const card = cardMap[item.id];
          const locked = card.requiresGlossary && !hasGlossary;
          const active = item.enabled && !locked;
          const isDragging = dragIndex === index;
          const isOver = overIndex === index && dragIndex !== index;

          return (
            <div
              key={item.id}
              draggable={!locked}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDragLeave={() => setOverIndex(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) reorder(dragIndex, index);
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={`flex items-start gap-2 rounded-lg border px-2 py-2 transition-all ${
                isDragging ? "opacity-40" : ""
              } ${isOver ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white"} ${
                active ? "" : "opacity-60"
              } ${locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`}
            >
              <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                style={{ backgroundColor: active ? card.color : "#cbd5e1" }}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {card.name}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  {card.description}
                </p>
                {locked && (
                  <p className="mt-0.5 text-[11px] text-coral-600">
                    Upload a glossary to enable
                  </p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                disabled={locked}
                onClick={() => !locked && toggle(item.id)}
                className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
                  active ? "bg-teal-500" : "bg-slate-200"
                } ${locked ? "cursor-not-allowed" : ""}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    active ? "left-4" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
        <CompositionPreview slices={slices} />
      </div>
    </div>
  );
}
