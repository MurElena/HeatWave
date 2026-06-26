"use client";

import { useRef, useState } from "react";
import { X, Upload, User as UserIcon, Trash2, Plus, Languages } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { loadProfile, saveProfile, type UserProfile } from "@/lib/settings";
import { LANGUAGES, languageLabel } from "@/lib/types";

interface AccountModalProps {
  onClose: () => void;
  onSaved?: (profile: UserProfile) => void;
}

export function AccountModal({ onClose, onSaved }: AccountModalProps) {
  const initial = loadProfile();
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [photo, setPhoto] = useState<string | undefined>(initial.photo);
  const [pairs, setPairs] = useState<string[]>(initial.workLanguagePairs ?? []);
  const [pairSource, setPairSource] = useState("EN");
  const [pairTarget, setPairTarget] = useState("DE");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function addPair() {
    if (pairSource === pairTarget) return;
    const pair = `${pairSource}→${pairTarget}`;
    if (pairs.includes(pair)) return;
    setPairs((prev) => [...prev, pair]);
  }

  function removePair(pair: string) {
    setPairs((prev) => prev.filter((p) => p !== pair));
  }

  function handlePhoto(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    const profile: UserProfile = {
      name: name.trim(),
      email: email.trim(),
      photo,
      workLanguagePairs: pairs,
    };
    saveProfile(profile);
    onSaved?.(profile);
    onClose();
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Account</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-50">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-9 w-9 text-teal-500" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" />
                Upload photo
              </button>
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto(undefined)}
                  className="inline-flex items-center gap-2 text-xs font-medium text-coral-600 hover:text-coral-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              User name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Languages className="h-4 w-4 text-teal-500" />
              Work language pairs
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Reviews are only assignable to users who work the evaluation&apos;s language pair.
            </p>

            {pairs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {pairs.map((pair) => {
                  const [src, tgt] = pair.split("→");
                  return (
                    <span
                      key={pair}
                      className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700"
                    >
                      {languageLabel(src)} → {languageLabel(tgt)}
                      <button
                        type="button"
                        onClick={() => removePair(pair)}
                        className="text-teal-500 hover:text-coral-600"
                        aria-label="Remove pair"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <select
                value={pairSource}
                onChange={(e) => setPairSource(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
              <span className="text-slate-400">→</span>
              <select
                value={pairTarget}
                onChange={(e) => setPairTarget(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addPair}
                disabled={pairSource === pairTarget}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-700">Password</p>
            <p className="mt-0.5 text-xs text-slate-500">
              We&apos;ll email a secure link to reset your password.
            </p>
            <button
              type="button"
              onClick={() =>
                setResetMessage(`Password reset link sent to ${email || "your email"}.`)
              }
              className="mt-2 rounded-lg bg-coral-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-coral-600"
            >
              Send reset link
            </button>
            {resetMessage && (
              <p className="mt-2 text-xs font-medium text-teal-600">
                {resetMessage}
              </p>
            )}
          </div>
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
            Save
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
