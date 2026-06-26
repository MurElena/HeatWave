export type DatasetSizeRange = "200-400" | "400-800" | "800-1000";

export type SegmentCategory =
  | "long"
  | "short"
  | "placeholders"
  | "markup"
  | "numbers"
  | "glossary"
  | "html-non-utf8"
  | "consistency";

export interface TranslationSegment {
  id: string;
  source: string;
  target: string;
  categories: SegmentCategory[];
  isDuplicate?: boolean;
  duplicateOfId?: string;
  isRandomBase?: boolean;
}

export interface PriorityCard {
  id: SegmentCategory;
  name: string;
  description: string;
  color: string;
  requiresGlossary?: boolean;
}

export const RANDOM_BASE_COLOR = "#94a3b8";

export interface CriterionState {
  id: SegmentCategory;
  enabled: boolean;
}

export interface ChallengeDataset {
  id: string;
  name: string;
  domain: string;
  tags: string[];
  sourceLanguage: string;
  targetLanguage: string;
  sizeRange: DatasetSizeRange;
  targetSize: number;
  segmentCount: number;
  sourceFileNames: string[];
  glossaryFileName?: string;
  priorities: SegmentCategory[];
  enabledCriteria: SegmentCategory[];
  segments: TranslationSegment[];
  categoryBreakdown: Record<SegmentCategory, number>;
  randomBaseCount: number;
  duplicateCount: number;
  createdAt: string;
}

export interface ParsedFile {
  fileName: string;
  segments: Omit<TranslationSegment, "id" | "categories">[];
}

export const SIZE_RANGE_TARGETS: Record<DatasetSizeRange, number> = {
  "200-400": 300,
  "400-800": 600,
  "800-1000": 900,
};

export const CRITERIA_SHARE = 0.7;
export const RANDOM_BASE_SHARE = 0.3;

export const PRESET_DOMAINS = [
  "Legal",
  "Medical",
  "Technical",
  "Marketing",
  "Financial",
  "General",
] as const;

export interface Language {
  code: string;
  name: string;
}

export const LANGUAGES: Language[] = [
  { code: "EN", name: "English" },
  { code: "DE", name: "German" },
  { code: "FR", name: "French" },
  { code: "ES", name: "Spanish" },
  { code: "IT", name: "Italian" },
  { code: "PT", name: "Portuguese" },
  { code: "NL", name: "Dutch" },
  { code: "PL", name: "Polish" },
  { code: "RU", name: "Russian" },
  { code: "ZH", name: "Chinese" },
  { code: "JA", name: "Japanese" },
  { code: "KO", name: "Korean" },
  { code: "AR", name: "Arabic" },
];

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export const ALL_SEGMENT_CATEGORIES: SegmentCategory[] = [
  "long",
  "short",
  "placeholders",
  "markup",
  "numbers",
  "glossary",
  "html-non-utf8",
  "consistency",
];

// --- Module 2: Evaluation ---

export type EvaluationMetricId =
  | "bleu"
  | "wer"
  | "chrf"
  | "qe"
  | "llm-jury";

export type JuryRating = "Good" | "Neutral" | "Bad";

export interface MtProvider {
  id: string;
  name: string;
  addedAt: string;
}

export interface EvaluationConfig {
  challengeDatasetId: string;
  title: string;
  uploadedFileNames: string[];
  finalSize: number;
  providerIds: string[];
  metrics: EvaluationMetricId[];
  /** AI Gateway model slug used for Quality Estimation. */
  qeProvider?: string;
  juryModelIds?: string[];
}

export interface SegmentScore {
  segmentId: string;
  source: string;
  reference: string;
  hypothesis: string;
  scores: Partial<Record<EvaluationMetricId, number>>;
  juryVotes?: JuryRating[];
  juryRating?: JuryRating;
  isDuplicate?: boolean;
  duplicateOfId?: string;
  twinHypothesis?: string;
  consistencyConsistent?: boolean;
  challengeSegmentId?: string;
}

export interface ProviderResult {
  providerId: string;
  providerName: string;
  segmentScores: SegmentScore[];
  aggregateScores: Partial<Record<EvaluationMetricId, number>>;
  consistencyScore?: number;
  consistencyAvailable?: boolean;
  duplicateSegmentCount?: number;
  aggregatedScore?: number;
  /** Total wall-clock time spent translating this model's segments, in ms. */
  inferenceMs?: number;
  rank: number;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
}

export type UsageByModel = Record<string, ModelUsage>;

export interface EvaluationRun {
  id: string;
  title: string;
  config: EvaluationConfig;
  usage?: UsageByModel;
  challengeDatasetId: string;
  challengeDatasetName: string;
  domain: string;
  sourceLanguage: string;
  targetLanguage: string;
  segmentCount: number;
  consistencyAvailable: boolean;
  providerResults: ProviderResult[];
  winnerProviderId: string;
  winnerProviderName: string;
  createdAt: string;
  hasHumanResults?: boolean;
  humanResults?: ProviderResult[];
  humanWinnerProviderId?: string;
  humanWinnerProviderName?: string;
}

export interface HistoryEntry {
  id: string;
  evaluationId: string;
  title: string;
  domain: string;
  sourceLanguage: string;
  targetLanguage: string;
  winnerProviderName: string;
  createdAt: string;
}

export type ReviewStatus = "pending" | "done";

export interface ReviewProviderSegment {
  providerId: string;
  hypothesis: string;
  scores: Partial<Record<EvaluationMetricId, number>>;
  juryRating?: JuryRating;
}

export interface ReviewSegment {
  segmentId: string;
  source: string;
  reference: string;
  isDuplicate?: boolean;
  duplicateOfId?: string;
  twinReference?: string;
  fromChallenge: boolean;
  challengeSegmentId?: string;
  perProvider: ReviewProviderSegment[];
  deleted?: boolean;
}

export interface Review {
  id: string;
  evaluationId: string;
  title: string;
  domain: string;
  sourceLanguage: string;
  targetLanguage: string;
  assignedTo: string;
  assignedBy: string;
  status: ReviewStatus;
  metrics: EvaluationMetricId[];
  providerIds: string[];
  providerNames: Record<string, string>;
  segments: ReviewSegment[];
  createdAt: string;
  completedAt?: string;
  /** When true, the reviewer sees randomised placeholder model names. */
  blind?: boolean;
  /** providerId → randomised placeholder label (e.g. "Model A"), only when blind. */
  displayNames?: Record<string, string>;
}

export type EvaluationProgressPhase =
  | "dataset-preparation"
  | EvaluationMetricId
  | "ranking"
  | "complete";

export interface EvaluationProgress {
  phase: EvaluationProgressPhase;
  phaseLabel: string;
  percent: number;
  message: string;
}

export const EVALUATION_SIZE_MIN = 200;
export const EVALUATION_SIZE_MAX = 2000;
export const EVALUATION_SIZE_STEP = 100;

export const METRIC_LABELS: Record<EvaluationMetricId, string> = {
  bleu: "BLEU",
  wer: "WER",
  chrf: "ChrF++",
  qe: "QE",
  "llm-jury": "LLM-as-a-Jury",
};

export const GENAI_METRICS: EvaluationMetricId[] = ["qe", "llm-jury"];

export function isGenAiMetric(metric: EvaluationMetricId): boolean {
  return GENAI_METRICS.includes(metric);
}
