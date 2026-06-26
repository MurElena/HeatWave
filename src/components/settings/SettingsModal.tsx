"use client";

import { useState } from "react";
import { X, KeyRound, MessageSquareText, Cpu } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { ApiKeysTab } from "@/components/settings/ApiKeysTab";
import { ModelsToTestTab } from "@/components/settings/ModelsToTestTab";
import { QePromptsTab } from "@/components/settings/QePromptsTab";
import { loadModels, saveModels, type LlmModel } from "@/lib/settings";

interface SettingsModalProps {
  onClose: () => void;
}

type Tab = "models-to-test" | "api-keys" | "prompts";

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>("models-to-test");
  const [models, setModels] = useState<LlmModel[]>(() => loadModels());

  function handleClose() {
    saveModels(models);
    onClose();
  }

  const tabs: { id: Tab; label: string; icon: typeof KeyRound }[] = [
    { id: "models-to-test", label: "Models to test", icon: Cpu },
    { id: "api-keys", label: "Jury LLMs", icon: KeyRound },
    { id: "prompts", label: "QE Prompts", icon: MessageSquareText },
  ];

  return (
    <Portal>
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-4">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-teal-500 text-teal-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "models-to-test" && (
            <ModelsToTestTab models={models} onChange={setModels} />
          )}
          {tab === "api-keys" && <ApiKeysTab models={models} onChange={setModels} />}
          {tab === "prompts" && <QePromptsTab />}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
