"use client";

import type { CompositionSlice } from "@/lib/composition";

interface CompositionPreviewProps {
  slices: CompositionSlice[];
}

export function CompositionPreview({ slices }: CompositionPreviewProps) {
  const visible = slices.filter((s) => s.pct > 0);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">Composition preview</p>

      <div className="flex h-6 w-full overflow-hidden rounded-md bg-slate-100">
        {visible.map((slice) => (
          <div
            key={slice.id}
            className="h-full"
            style={{ width: `${slice.pct}%`, backgroundColor: slice.color }}
            title={`${slice.name}: ${slice.pct.toFixed(0)}%`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {visible.map((slice) => (
          <span
            key={slice.id}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            {slice.name}
            <span className="text-slate-400">{slice.pct.toFixed(0)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
