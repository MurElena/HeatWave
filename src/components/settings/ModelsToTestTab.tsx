"use client";

import { Cpu, Sparkles, Zap } from "lucide-react";
import { isProviderNew, MT_PROVIDERS } from "@/lib/constants/mt-providers";
import { isMtProviderEnabled, type MtProviderConfig } from "@/lib/settings";

interface ModelsToTestTabProps {
  config: MtProviderConfig;
  onChange: (config: MtProviderConfig) => void;
}

export function ModelsToTestTab({ config, onChange }: ModelsToTestTabProps) {
  function toggle(id: string, enabled: boolean) {
    onChange({ ...config, [id]: enabled });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2.5 text-sm text-teal-800">
        <Zap className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Translation models are served through the <strong>Vercel AI Gateway</strong> — no
          per-model API keys needed. Enable the models you want available in the evaluation
          wizard.
        </p>
      </div>

      <div className="space-y-2">
        {MT_PROVIDERS.map((provider) => {
          const enabled = isMtProviderEnabled(provider.id, config);
          return (
            <div
              key={provider.id}
              className={`rounded-xl border p-3 ${
                enabled ? "border-teal-200 bg-teal-50/30" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Cpu className="h-4 w-4 text-teal-500" />
                    {provider.name}
                    {isProviderNew(provider) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2 py-0.5 text-xs font-semibold text-coral-700">
                        <Sparkles className="h-3 w-3" />
                        New
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                    {provider.id}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => toggle(provider.id, !enabled)}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    enabled ? "bg-teal-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      enabled ? "left-4" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
