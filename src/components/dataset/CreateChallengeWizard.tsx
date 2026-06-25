"use client";

import { useCallback, useRef, useState } from "react";
import { X, Upload, FileText, Plus } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PrioritySortList } from "@/components/dataset/PrioritySortList";
import { PRIORITY_CARDS } from "@/lib/constants/priority-cards";
import { extractDataset } from "@/lib/dataset-extractor";
import { parseGlossaryFile } from "@/lib/parsers/glossary";
import { parseTmx } from "@/lib/parsers/tmx";
import { parseBilingualXlsx } from "@/lib/parsers/xlsx-bilingual";
import type {
  ChallengeDataset,
  CriterionState,
  DatasetSizeRange,
  SegmentCategory,
} from "@/lib/types";
import { LANGUAGES, PRESET_DOMAINS } from "@/lib/types";

interface CreateChallengeWizardProps {
  onComplete: (dataset: ChallengeDataset) => void;
  onClose: () => void;
}

type WizardStep = "basics" | "glossary" | "priorities" | "extract";

const DEFAULT_CRITERIA: CriterionState[] = PRIORITY_CARDS.map((c) => ({
  id: c.id,
  enabled: c.id !== "glossary",
}));

export function CreateChallengeWizard({
  onComplete,
  onClose,
}: CreateChallengeWizardProps) {
  const [step, setStep] = useState<WizardStep>("basics");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("EN");
  const [targetLanguage, setTargetLanguage] = useState("DE");
  const [sizeRange, setSizeRange] = useState<DatasetSizeRange>("400-800");
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [glossaryFile, setGlossaryFile] = useState<File | null>(null);
  const [criteria, setCriteria] = useState<CriterionState[]>(DEFAULT_CRITERIA);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const glossaryInputRef = useRef<HTMLInputElement>(null);

  const effectiveDomain = domain === "custom" ? customDomain : domain;
  const priorities = criteria.map((c) => c.id);
  const enabledCriteria = criteria.filter((c) => c.enabled).map((c) => c.id);

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  }

  function addSourceFiles(files: FileList | null) {
    if (!files) return;
    setSourceFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const incoming = Array.from(files).filter((f) => !names.has(f.name));
      return [...prev, ...incoming];
    });
  }

  function removeSourceFile(name: string) {
    setSourceFiles((prev) => prev.filter((f) => f.name !== name));
    if (sourceInputRef.current) sourceInputRef.current.value = "";
  }

  function removeGlossary() {
    setGlossaryFile(null);
    if (glossaryInputRef.current) glossaryInputRef.current.value = "";
  }

  async function parseSourceFiles() {
    const allSegments: { source: string; target: string }[] = [];
    const fileNames: string[] = [];

    for (const file of sourceFiles) {
      fileNames.push(file.name);
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "tmx") {
        const text = await file.text();
        allSegments.push(...parseTmx(text, file.name).segments);
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        allSegments.push(...parseBilingualXlsx(buffer, file.name).segments);
      }
    }

    return { allSegments, fileNames };
  }

  const runExtraction = useCallback(async () => {
    setStep("extract");
    setError(null);
    setProgress(0);
    setProgressMessage("Starting extraction…");

    try {
      const { allSegments, fileNames } = await parseSourceFiles();

      if (allSegments.length === 0) {
        throw new Error(
          "No translation pairs found. Check your TMX or bilingual XLSX files.",
        );
      }

      if (enabledCriteria.length === 0) {
        throw new Error("Enable at least one extraction criterion.");
      }

      let glossaryTerms: string[] = [];
      if (glossaryFile) {
        glossaryTerms = await parseGlossaryFile(glossaryFile);
      }

      const result = await extractDataset({
        rawSegments: allSegments,
        sizeRange,
        priorities,
        enabledCriteria,
        glossaryTerms,
        hasGlossary: glossaryTerms.length > 0,
        onProgress: (pct, msg) => {
          setProgress(pct);
          setProgressMessage(msg);
        },
      });

      onComplete({
        id: crypto.randomUUID(),
        name,
        domain: effectiveDomain,
        tags,
        sourceLanguage,
        targetLanguage,
        sizeRange,
        targetSize: result.targetSize,
        segmentCount: result.segments.length,
        sourceFileNames: fileNames,
        glossaryFileName: glossaryFile?.name,
        priorities,
        enabledCriteria,
        segments: result.segments,
        categoryBreakdown: result.categoryBreakdown,
        randomBaseCount: result.randomBaseCount,
        duplicateCount: result.duplicateCount,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
      setStep("priorities");
    }
  }, [
    sourceFiles,
    glossaryFile,
    sizeRange,
    priorities,
    enabledCriteria,
    name,
    effectiveDomain,
    tags,
    sourceLanguage,
    targetLanguage,
    onComplete,
  ]);

  function canProceedBasics() {
    return (
      name.trim().length > 0 &&
      effectiveDomain.trim().length > 0 &&
      sourceFiles.length > 0
    );
  }

  const steps: { id: WizardStep; label: string }[] = [
    { id: "basics", label: "Basics" },
    { id: "glossary", label: "Glossary" },
    { id: "priorities", label: "Priorities" },
    { id: "extract", label: "Extract" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Create new challenge
            </h2>
            <div className="mt-2 flex gap-2">
              {steps.map((s, i) => (
                <span
                  key={s.id}
                  className={`text-xs font-medium ${
                    step === s.id
                      ? "text-teal-700"
                      : steps.findIndex((x) => x.id === step) > i
                        ? "text-teal-400"
                        : "text-slate-400"
                  }`}
                >
                  {i + 1}. {s.label}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === "basics" && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Dataset name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Legal EN-DE Challenge Q2"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Domain
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">Select a domain…</option>
                  {PRESET_DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value="custom">Custom domain…</option>
                </select>
                {domain === "custom" && (
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="Enter custom domain"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Source language
                  </label>
                  <select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Target language
                  </label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Tags
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addTag())
                    }
                    placeholder="Add tag and press Enter"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="rounded-lg bg-teal-50 px-3 py-2 text-teal-700 hover:bg-teal-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter((t) => t !== tag))}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Source files (TMX or bilingual XLSX)
                </label>
                <label className="mt-1 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/30 px-6 py-6 transition-colors hover:border-teal-400 hover:bg-teal-50/50">
                  <Upload className="h-7 w-7 text-teal-500" />
                  <span className="mt-2 text-sm font-medium text-teal-700">
                    Click to upload or add more files
                  </span>
                  <span className="mt-1 text-xs text-slate-500">
                    .tmx, .xlsx, .xls
                  </span>
                  <input
                    ref={sourceInputRef}
                    type="file"
                    accept=".tmx,.xlsx,.xls"
                    multiple
                    onChange={(e) => addSourceFiles(e.target.files)}
                    className="hidden"
                  />
                </label>
                {sourceFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {sourceFiles.map((f) => (
                      <li
                        key={f.name}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-600"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 shrink-0 text-teal-500" />
                          {f.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSourceFile(f.name)}
                          className="shrink-0 text-xs text-coral-600 hover:text-coral-700"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Dataset size
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["200-400", "200–400"],
                      ["400-800", "400–800"],
                      ["800-1000", "800–1,000"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSizeRange(value)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        sizeRange === value
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "glossary" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Optionally upload a glossary to enable glossary-term extraction.
              </p>
              <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-200 px-6 py-6 transition-colors hover:border-teal-300 hover:bg-teal-50/20">
                <Upload className="h-7 w-7 text-slate-400" />
                <span className="mt-2 text-sm font-medium text-slate-700">
                  {glossaryFile ? "Replace glossary file" : "Upload glossary (optional)"}
                </span>
                <span className="mt-1 text-xs text-slate-500">.xlsx, .csv</span>
                <input
                  ref={glossaryInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) =>
                    setGlossaryFile(e.target.files?.[0] ?? null)
                  }
                  className="hidden"
                />
              </label>
              {glossaryFile && (
                <div className="flex items-center justify-between rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {glossaryFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={removeGlossary}
                    className="text-xs text-coral-600 hover:text-coral-700"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "priorities" && (
            <PrioritySortList
              cards={PRIORITY_CARDS}
              criteria={criteria}
              hasGlossary={!!glossaryFile}
              onChange={setCriteria}
            />
          )}

          {step === "extract" && (
            <div className="space-y-6 py-8">
              <ProgressBar percent={progress} message={progressMessage} />
              <p className="text-center text-sm text-slate-500">
                70% from active criteria · 30% random base · consistency adds
                duplicates by priority
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            {step !== "basics" && step !== "extract" && (
              <button
                type="button"
                onClick={() => {
                  const order: WizardStep[] = [
                    "basics",
                    "glossary",
                    "priorities",
                    "extract",
                  ];
                  const idx = order.indexOf(step);
                  if (idx > 0) setStep(order[idx - 1]);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Back
              </button>
            )}

            {step === "basics" && (
              <button
                type="button"
                disabled={!canProceedBasics()}
                onClick={() => setStep("glossary")}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
              >
                Continue
              </button>
            )}

            {step === "glossary" && (
              <button
                type="button"
                onClick={() => setStep("priorities")}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Continue
              </button>
            )}

            {step === "priorities" && (
              <button
                type="button"
                onClick={runExtraction}
                className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-coral-600"
              >
                Extract dataset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
