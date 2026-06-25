"use client";

import { useEffect, useState } from "react";
import { Check, Lock, Star, Trash2 } from "lucide-react";
import {
  DEFAULT_PROMPT_ID,
  DEFAULT_SCORING,
  QE_PROMPT_INTRO,
  loadPrompts,
  loadSelectedPromptId,
  savePrompts,
  saveSelectedPromptId,
  type QePrompt,
} from "@/lib/settings";

export function QePromptsTab() {
  const [prompts, setPrompts] = useState<QePrompt[]>([]);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_PROMPT_ID);
  const [scoring, setScoring] = useState(DEFAULT_SCORING);
  const [extra, setExtra] = useState("");
  const [showNameWizard, setShowNameWizard] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const stored = loadPrompts();
    const sel = loadSelectedPromptId();
    setPrompts(stored);
    selectPrompt(sel, stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectPrompt(id: string, list: QePrompt[] = prompts) {
    setSelectedId(id);
    saveSelectedPromptId(id);
    if (id === DEFAULT_PROMPT_ID) {
      setScoring(DEFAULT_SCORING);
      setExtra("");
    } else {
      const p = list.find((x) => x.id === id);
      if (p) {
        setScoring(p.scoring);
        setExtra(p.extraInstructions);
      }
    }
  }

  function handleSaveCheckbox(checked: boolean) {
    if (checked) {
      setNewName("");
      setShowNameWizard(true);
    }
  }

  function confirmSave() {
    const name = newName.trim();
    if (!name) return;
    const prompt: QePrompt = {
      id: crypto.randomUUID(),
      name,
      scoring,
      extraInstructions: extra,
    };
    const next = [...prompts, prompt];
    setPrompts(next);
    savePrompts(next);
    setSelectedId(prompt.id);
    saveSelectedPromptId(prompt.id);
    setShowNameWizard(false);
  }

  function deletePrompt(id: string) {
    const next = prompts.filter((p) => p.id !== id);
    setPrompts(next);
    savePrompts(next);
    if (selectedId === id) selectPrompt(DEFAULT_PROMPT_ID, next);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        These prompts are sent to your enabled LLMs during evaluation.
      </p>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Prompt intro (fixed)
        </label>
        <div className="mt-1 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{QE_PROMPT_INTRO}</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Scoring criteria (editable)
        </label>
        <textarea
          value={scoring}
          onChange={(e) => setScoring(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs leading-relaxed focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Additional instructions (optional)
        </label>
        <textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          rows={3}
          placeholder="e.g. Pay special attention to terminology consistency and placeholder integrity."
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={showNameWizard}
          onChange={(e) => handleSaveCheckbox(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
        />
        Save this prompt
      </label>

      {showNameWizard && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
          <label className="block text-sm font-medium text-slate-700">
            Name this prompt
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmSave()}
              placeholder="e.g. Strict terminology QE"
              autoFocus
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <button
              type="button"
              onClick={confirmSave}
              disabled={!newName.trim()}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowNameWizard(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Saved prompts
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectPrompt(DEFAULT_PROMPT_ID)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedId === DEFAULT_PROMPT_ID
                ? "border-teal-500 bg-teal-600 text-white"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Star className="h-3.5 w-3.5" />
            Default prompt
            {selectedId === DEFAULT_PROMPT_ID && <Check className="h-3.5 w-3.5" />}
          </button>

          {prompts.map((p) => {
            const active = selectedId === p.id;
            return (
              <span
                key={p.id}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-teal-500 bg-teal-600 text-white"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectPrompt(p.id)}
                  className="inline-flex items-center gap-1.5"
                >
                  {p.name}
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => deletePrompt(p.id)}
                  className={`-mr-1 rounded p-0.5 ${
                    active ? "hover:bg-teal-700" : "hover:bg-slate-200"
                  }`}
                  aria-label={`Delete ${p.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          The highlighted prompt is the one used during evaluation. &ldquo;Default
          prompt&rdquo; uses the intro and scoring with no extra instructions.
        </p>
      </div>
    </div>
  );
}
