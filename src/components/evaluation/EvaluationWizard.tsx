"use client";

import { useMemo, useState } from "react";
import { Upload, FileText, X, Sparkles, Cpu } from "lucide-react";
import {
  DatasetFilters,
  EMPTY_FILTERS,
  type DatasetFilterState,
} from "@/components/dataset/DatasetFilters";
import { isProviderNew } from "@/lib/constants/mt-providers";
import { parseBilingualCsv } from "@/lib/parsers/csv-bilingual";
import { parseTmx } from "@/lib/parsers/tmx";
import { parseBilingualXlsx } from "@/lib/parsers/xlsx-bilingual";
import {
  getJuryModels,
  getQeModels,
  getTranslationModels,
  hasEnoughJuryModels,
} from "@/lib/settings";
import { loadDatasets } from "@/lib/storage/datasets";
import type {
  ChallengeDataset,
  DatasetSizeRange,
  EvaluationConfig,
  EvaluationMetricId,
} from "@/lib/types";
import {
  EVALUATION_SIZE_MAX,
  EVALUATION_SIZE_MIN,
  EVALUATION_SIZE_STEP,
  METRIC_LABELS,
  isGenAiMetric,
} from "@/lib/types";

interface EvaluationWizardProps {
  onLaunch: (config: EvaluationConfig, uploadedSegments?: { source: string; target: string }[]) => void;
  onClose: () => void;
}

type WizardStep = "dataset" | "upload" | "providers" | "metrics" | "review";

const METRIC_OPTIONS: { id: EvaluationMetricId; label: string; description: string }[] = [
  { id: "bleu", label: METRIC_LABELS.bleu, description: "N-gram overlap with reference" },
  { id: "wer", label: METRIC_LABELS.wer, description: "Word error rate vs reference" },
  { id: "chrf", label: METRIC_LABELS.chrf, description: "Character n-gram F-score" },
  { id: "qe", label: METRIC_LABELS.qe, description: "Quality estimation via LLM prompt" },
  { id: "llm-jury", label: METRIC_LABELS["llm-jury"], description: "Majority vote from 3 LLMs" },
];

export function EvaluationWizard({ onLaunch, onClose }: EvaluationWizardProps) {
  const datasets = useMemo(() => loadDatasets(), []);
  const qeModels = useMemo(() => getQeModels(), []);
  const juryModels = useMemo(() => getJuryModels(), []);
  const juryAvailable = hasEnoughJuryModels();
  const connectedProviders = useMemo(() => getTranslationModels(), []);

  const [step, setStep] = useState<WizardStep>("dataset");
  const [title, setTitle] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [filters, setFilters] = useState<DatasetFilterState>(EMPTY_FILTERS);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [finalSize, setFinalSize] = useState<number>(600);
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<EvaluationMetricId[]>([]);
  const [qeProvider, setQeProvider] = useState<string>("");
  const qeLabel = useMemo(
    () => qeModels.find((m) => m.id === qeProvider)?.name ?? qeProvider,
    [qeModels, qeProvider],
  );
  const [juryModelIds, setJuryModelIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const filterMeta = useMemo(() => {
    const domains = new Set<string>();
    const tags = new Set<string>();
    const languagePairs = new Set<string>();
    const sizeRanges = new Set<DatasetSizeRange>();
    for (const d of datasets) {
      if (d.domain) domains.add(d.domain);
      d.tags?.forEach((t) => tags.add(t));
      if (d.sourceLanguage && d.targetLanguage) {
        languagePairs.add(`${d.sourceLanguage}→${d.targetLanguage}`);
      }
      if (d.sizeRange) sizeRanges.add(d.sizeRange);
    }
    return {
      domains: Array.from(domains).sort(),
      tags: Array.from(tags).sort(),
      languagePairs: Array.from(languagePairs).sort(),
      sizeRanges: Array.from(sizeRanges).sort(),
    };
  }, [datasets]);

  const filteredDatasets = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return datasets.filter((d) => {
      if (q) {
        const haystack = [d.name, d.domain, ...(d.tags ?? [])].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.domain && d.domain !== filters.domain) return false;
      if (filters.tag && !(d.tags ?? []).includes(filters.tag)) return false;
      if (filters.language && `${d.sourceLanguage}→${d.targetLanguage}` !== filters.language) {
        return false;
      }
      if (filters.sizeRange && d.sizeRange !== filters.sizeRange) return false;
      return true;
    });
  }, [datasets, filters]);

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  function toggleProvider(id: string) {
    setProviderIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function toggleMetric(id: EvaluationMetricId) {
    setMetrics((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      if (!next.includes("qe")) setQeProvider("");
      if (!next.includes("llm-jury")) {
        setJuryModelIds([]);
      } else if (juryModels.length === 3) {
        setJuryModelIds(juryModels.map((m) => m.id));
      }
      return next;
    });
  }

  function toggleJuryModel(id: string) {
    setJuryModelIds((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function parseUpload(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "tmx") {
      return parseTmx(await file.text(), file.name).segments;
    }
    if (ext === "xlsx" || ext === "xls") {
      return parseBilingualXlsx(await file.arrayBuffer(), file.name).segments;
    }
    if (ext === "csv") {
      return parseBilingualCsv(await file.text(), file.name).segments;
    }
    throw new Error("Unsupported file type. Use TMX, XLSX, or CSV.");
  }

  async function handleLaunch() {
    setError(null);
    if (!selectedDataset) {
      setError("Select a challenge dataset.");
      return;
    }
    if (providerIds.length < 2) {
      setError("Select at least two MT providers.");
      return;
    }
    if (metrics.length === 0) {
      setError("Select at least one evaluation method.");
      return;
    }
    if (metrics.includes("qe") && !qeProvider) {
      setError("Select a QE provider.");
      return;
    }
    if (metrics.includes("llm-jury") && juryModelIds.length !== 3) {
      setError("Select exactly three LLMs for the jury.");
      return;
    }

    let uploadedSegments: { source: string; target: string }[] | undefined;
    if (uploadFile) {
      try {
        uploadedSegments = await parseUpload(uploadFile);
        if (uploadedSegments.length === 0) {
          throw new Error("No translation pairs found in uploaded file.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse upload.");
        return;
      }
    }

    const config: EvaluationConfig = {
      challengeDatasetId: selectedDataset.id,
      title: title.trim() || `${selectedDataset.name} Evaluation`,
      uploadedFileNames: uploadFile ? [uploadFile.name] : [],
      finalSize,
      providerIds,
      metrics,
      qeProvider: metrics.includes("qe") ? qeProvider : undefined,
      juryModelIds: metrics.includes("llm-jury") ? juryModelIds : undefined,
    };

    onLaunch(config, uploadedSegments);
  }

  const steps: { id: WizardStep; label: string }[] = [
    { id: "dataset", label: "Dataset" },
    { id: "upload", label: "Upload" },
    { id: "providers", label: "Providers" },
    { id: "metrics", label: "Metrics" },
    { id: "review", label: "Launch" },
  ];

  function canProceedDataset() {
    return !!selectedDatasetId;
  }

  function canProceedProviders() {
    return providerIds.length >= 2;
  }

  function canProceedMetrics() {
    if (metrics.length === 0) return false;
    if (metrics.includes("qe") && !qeProvider) return false;
    if (metrics.includes("llm-jury") && juryModelIds.length !== 3) return false;
    return true;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Run evaluation</h2>
            <div className="mt-2 flex flex-wrap gap-2">
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
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === "dataset" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Evaluation title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Optional — defaults to dataset name"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {datasets.length > 0 && (
                <DatasetFilters
                  filters={filters}
                  onChange={setFilters}
                  domains={filterMeta.domains}
                  tags={filterMeta.tags}
                  languagePairs={filterMeta.languagePairs}
                  sizeRanges={filterMeta.sizeRanges}
                />
              )}

              <div className="space-y-2">
                {filteredDatasets.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                    No saved challenge datasets match your filters.
                  </p>
                ) : (
                  filteredDatasets.map((dataset) => (
                    <DatasetOption
                      key={dataset.id}
                      dataset={dataset}
                      selected={selectedDatasetId === dataset.id}
                      onSelect={() => setSelectedDatasetId(dataset.id)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-5">
              <p className="text-sm text-slate-600">
                Optionally upload a new dataset (TMX, XLSX, or CSV). When uploaded, the evaluation
                dataset keeps 70% from the challenge set and fills 30% from the new file up to your
                chosen size.
              </p>

              <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/30 px-6 py-6 hover:border-teal-400">
                <Upload className="h-7 w-7 text-teal-500" />
                <span className="mt-2 text-sm font-medium text-teal-700">
                  {uploadFile ? "Replace uploaded file" : "Upload optional dataset"}
                </span>
                <span className="mt-1 text-xs text-slate-500">.tmx, .xlsx, .xls, .csv</span>
                <input
                  type="file"
                  accept=".tmx,.xlsx,.xls,.csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>

              {uploadFile && (
                <div className="flex items-center justify-between rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {uploadFile.name}
                  </span>
                  <button type="button" onClick={() => setUploadFile(null)} className="text-xs text-coral-600">
                    Remove
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-baseline justify-between">
                  <label className="block text-sm font-medium text-slate-700">
                    Final evaluation dataset size
                  </label>
                  <span className="text-lg font-semibold tabular-nums text-teal-700">
                    {finalSize}
                  </span>
                </div>
                <input
                  type="range"
                  min={EVALUATION_SIZE_MIN}
                  max={EVALUATION_SIZE_MAX}
                  step={EVALUATION_SIZE_STEP}
                  value={finalSize}
                  onChange={(e) => setFinalSize(Number(e.target.value))}
                  className="mt-3 w-full accent-teal-600"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>{EVALUATION_SIZE_MIN}</span>
                  <span>{EVALUATION_SIZE_MAX}</span>
                </div>
              </div>
            </div>
          )}

          {step === "providers" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Select at least two translation models to compare. They are powered by the Vercel
                AI Gateway — enable or disable models under Settings → Models to test. Models added
                in the last month are marked as New.
              </p>
              {connectedProviders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No models enabled. Enable models under Settings → Models to test.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {connectedProviders.map((provider) => {
                    const selected = providerIds.includes(provider.id);
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => toggleProvider(provider.id)}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                          selected
                            ? "border-teal-500 bg-teal-50 text-teal-800"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Cpu className="h-4 w-4 text-teal-500" />
                          {provider.name}
                        </span>
                        {isProviderNew(provider) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2 py-0.5 text-xs font-semibold text-coral-700">
                            <Sparkles className="h-3 w-3" />
                            New
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-slate-500">{providerIds.length} selected (minimum 2)</p>
            </div>
          )}

          {step === "metrics" && (
            <div className="space-y-5">
              <div className="grid gap-2">
                {METRIC_OPTIONS.map((option) => {
                  const disabled =
                    option.id === "llm-jury" && !juryAvailable;
                  const selected = metrics.includes(option.id);
                  return (
                    <div key={option.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleMetric(option.id)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                          disabled
                            ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-50"
                            : selected
                              ? "border-teal-500 bg-teal-50"
                              : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                          {option.label}
                          {isGenAiMetric(option.id) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                              <Sparkles className="h-3 w-3" />
                              GenAI
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{option.description}</p>
                        {disabled && (
                          <p className="mt-1 text-xs text-coral-600">
                            Enable at least 3 jury LLMs in Settings.
                          </p>
                        )}
                      </button>

                      {option.id === "qe" && selected && (
                        <div className="mt-2 ml-2 space-y-2 border-l-2 border-teal-100 pl-4">
                          <p className="text-xs font-medium text-slate-600">
                            Select one QE model (uses prompt from Settings):
                          </p>
                          {qeModels.length === 0 ? (
                            <p className="text-xs text-coral-600">
                              Enable at least one QE-capable model in Settings → Jury LLMs.
                            </p>
                          ) : (
                            qeModels.map((model) => (
                              <label key={model.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name="qe-provider"
                                  checked={qeProvider === model.id}
                                  onChange={() => setQeProvider(model.id)}
                                />
                                {model.name}
                              </label>
                            ))
                          )}
                        </div>
                      )}

                      {option.id === "llm-jury" && selected && juryAvailable && (
                        <div className="mt-2 ml-2 space-y-2 border-l-2 border-teal-100 pl-4">
                          <p className="text-xs font-medium text-slate-600">
                            Select exactly 3 LLMs ({juryModelIds.length}/3):
                          </p>
                          {juryModels.map((model) => (
                            <label key={model.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={juryModelIds.includes(model.id)}
                                disabled={
                                  !juryModelIds.includes(model.id) && juryModelIds.length >= 3
                                }
                                onChange={() => toggleJuryModel(model.id)}
                              />
                              {model.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === "review" && selectedDataset && (
            <div className="space-y-4 text-sm text-slate-700">
              <ReviewRow label="Title" value={title.trim() || `${selectedDataset.name} Evaluation`} />
              <ReviewRow label="Challenge dataset" value={selectedDataset.name} />
              <ReviewRow
                label="Upload"
                value={uploadFile ? uploadFile.name : "None (challenge only)"}
              />
              <ReviewRow label="Final size" value={String(finalSize)} />
              <ReviewRow
                label="Providers"
                value={providerIds
                  .map((id) => connectedProviders.find((p) => p.id === id)?.name ?? id)
                  .join(", ")}
              />
              <ReviewRow
                label="Metrics"
                value={metrics.map((m) => METRIC_LABELS[m]).join(", ")}
              />
              {metrics.includes("qe") && qeProvider && (
                <ReviewRow label="QE model" value={qeLabel} />
              )}
              {metrics.includes("llm-jury") && (
                <ReviewRow
                  label="Jury models"
                  value={juryModelIds
                    .map((id) => juryModels.find((m) => m.id === id)?.name ?? id)
                    .join(", ")}
                />
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <div className="flex gap-2">
            {step !== "dataset" && (
              <button
                type="button"
                onClick={() => {
                  const order: WizardStep[] = ["dataset", "upload", "providers", "metrics", "review"];
                  const idx = order.indexOf(step);
                  if (idx > 0) setStep(order[idx - 1]);
                }}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Back
              </button>
            )}
            {step === "dataset" && (
              <button
                type="button"
                disabled={!canProceedDataset()}
                onClick={() => setStep("upload")}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
              >
                Continue
              </button>
            )}
            {step === "upload" && (
              <button
                type="button"
                onClick={() => setStep("providers")}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Continue
              </button>
            )}
            {step === "providers" && (
              <button
                type="button"
                disabled={!canProceedProviders()}
                onClick={() => setStep("metrics")}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
              >
                Continue
              </button>
            )}
            {step === "metrics" && (
              <button
                type="button"
                disabled={!canProceedMetrics()}
                onClick={() => setStep("review")}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
              >
                Continue
              </button>
            )}
            {step === "review" && (
              <button
                type="button"
                onClick={handleLaunch}
                className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-coral-600"
              >
                Launch evaluation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DatasetOption({
  dataset,
  selected,
  onSelect,
}: {
  dataset: ChallengeDataset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
        selected ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <p className="font-medium text-slate-900">{dataset.name}</p>
      <p className="mt-1 text-xs text-slate-500">
        {dataset.domain} · {dataset.sourceLanguage}→{dataset.targetLanguage} ·{" "}
        {dataset.segmentCount} segments
      </p>
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-slate-100 pb-2">
      <span className="w-36 shrink-0 font-medium text-slate-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
