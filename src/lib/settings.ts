export interface UserProfile {
  name: string;
  email: string;
  photo?: string;
  /** Language pairs the user works on, e.g. "EN→DE". */
  workLanguagePairs?: string[];
}

export interface LlmModel {
  id: string;
  name: string;
  provider: string;
  /**
   * Optional bring-your-own-key. Not required: by default all models are
   * served through the Vercel AI Gateway using the server-side gateway key.
   */
  apiKey: string;
  /** On/off as a translation model (the "Models to test" tab). */
  enabled: boolean;
  /**
   * On/off as a judge for QE and LLM-as-a-jury (the "Jury LLMs" tab). Kept
   * separate from `enabled` so toggling a model off for translation does not
   * also remove it from the jury. Defaults to on when undefined (legacy data).
   */
  enabledJury?: boolean;
  /** Can be used as a translation model (appears under "Models to test"). */
  translation?: boolean;
  /** Can be used as the QE scorer. */
  qe?: boolean;
  /** Can sit on the LLM-as-a-jury panel. */
  jury?: boolean;
  /** ISO date the model was added; recent ones are flagged "New". */
  addedAt?: string;
}

export interface QePrompt {
  id: string;
  name: string;
  scoring: string;
  extraInstructions: string;
}

export const QE_PROMPT_INTRO =
  "You are a translation quality assessment expert. Please analyze the following translation and provide a score from 0-100 based on these criteria:";

export const DEFAULT_SCORING = `90-100: Excellent. Accurate, natural, and culturally appropriate translation. No errors.
80-89: Good. Minor errors that do not significantly impact understanding. Acceptable.
70-79: Fair. Some errors that may cause minor confusion. Requires some improvements.
60-69: Below Average. Several errors impacting understanding. Requires significant revision.
0-59: Poor. Many errors and/or inaccurate translation. Unacceptable.`;

export const DEFAULT_PROMPT_ID = "default";

const PROFILE_KEY = "trans-eval-profile";
const MODELS_KEY = "trans-eval-models";
const PROMPTS_KEY = "trans-eval-prompts";
const SELECTED_PROMPT_KEY = "trans-eval-selected-prompt";

const DEFAULT_PROFILE: UserProfile = {
  name: "Jane Doe",
  email: "jane.doe@example.com",
  workLanguagePairs: ["EN→DE", "EN→FR"],
};

// The single source of truth for available models. The id IS the AI Gateway
// model slug. No API key needed; requests are routed through the gateway with
// the server-side key. Every model below is usable on Vercel's free tier.
// Capabilities decide where the model shows up:
//   translation -> Settings → Models to test (and the wizard provider step)
//   qe          -> the QE scorer picker
//   jury        -> the LLM-as-a-jury panel
export const MODEL_CATALOG: LlmModel[] = [
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", apiKey: "", enabled: true, enabledJury: true, translation: true, qe: true },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", apiKey: "", enabled: true, enabledJury: true, translation: true, qe: true, jury: true },
  { id: "google/gemini-2.5", name: "Gemini 2.5", provider: "Google", apiKey: "", enabled: true, enabledJury: true, translation: true, qe: true, jury: true },
  { id: "openai/gpt-5.4-nano", name: "GPT-5.4 Nano", provider: "OpenAI", apiKey: "", enabled: true, enabledJury: true, translation: true, qe: true },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", provider: "DeepSeek", apiKey: "", enabled: true, translation: true },
  { id: "google/gemma-4-26b-a4b-it", name: "Gemma 4 26B", provider: "Google", apiKey: "", enabled: true, translation: true },
  { id: "xai/grok-4.1-fast-non-reasoning", name: "Grok 4.1 Fast", provider: "xAI", apiKey: "", enabled: true, translation: true },
  { id: "mistral/ministral-3b", name: "Ministral 3B", provider: "Mistral", apiKey: "", enabled: true, translation: true },
  { id: "meta/llama-3.3-70b", name: "Llama 3.3 70B", provider: "Meta", apiKey: "", enabled: true, translation: true },
  { id: "perplexity/sonar", name: "Sonar", provider: "Perplexity", apiKey: "", enabled: true, translation: true },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", provider: "Anthropic", apiKey: "", enabled: true, enabledJury: true, translation: true, qe: true, jury: true },
];

const DEFAULT_MODELS: LlmModel[] = MODEL_CATALOG;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadProfile(): UserProfile {
  return read(PROFILE_KEY, DEFAULT_PROFILE);
}

export function saveProfile(profile: UserProfile): void {
  write(PROFILE_KEY, profile);
}

export function loadModels(): LlmModel[] {
  const stored = read<LlmModel[] | null>(MODELS_KEY, null);
  if (!stored || stored.length === 0) return DEFAULT_MODELS;
  // Migrate legacy data saved before models carried capability flags.
  const hasCapabilities = stored.some((m) => m.translation || m.qe || m.jury);
  if (!hasCapabilities) {
    write(MODELS_KEY, DEFAULT_MODELS);
    return DEFAULT_MODELS;
  }
  return stored;
}

export function saveModels(models: LlmModel[]): void {
  write(MODELS_KEY, models);
}

export function loadPrompts(): QePrompt[] {
  return read(PROMPTS_KEY, []);
}

export function savePrompts(prompts: QePrompt[]): void {
  write(PROMPTS_KEY, prompts);
}

export function loadSelectedPromptId(): string {
  return read(SELECTED_PROMPT_KEY, DEFAULT_PROMPT_ID);
}

export function saveSelectedPromptId(id: string): void {
  write(SELECTED_PROMPT_KEY, id);
}

/** Enabled models that can produce translations (the wizard providers). */
export function getTranslationModels(): LlmModel[] {
  return loadModels().filter((m) => m.enabled && m.translation);
}

/** Models enabled as judges that can act as the QE scorer. */
export function getQeModels(): LlmModel[] {
  return loadModels().filter((m) => m.qe && (m.enabledJury ?? true));
}

/** Models enabled as judges that can sit on the LLM-as-a-jury panel. */
export function getJuryModels(): LlmModel[] {
  return loadModels().filter((m) => m.jury && (m.enabledJury ?? true));
}

export function hasEnoughJuryModels(): boolean {
  return getJuryModels().length >= 3;
}
