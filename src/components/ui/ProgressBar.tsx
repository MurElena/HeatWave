"use client";

interface ProgressBarProps {
  percent: number;
  message?: string;
}

export function ProgressBar({ percent, message }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">
          {message ?? "Processing…"}
        </span>
        <span className="tabular-nums text-teal-700">{clamped}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
