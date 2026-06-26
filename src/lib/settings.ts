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
  enabled: boolean;
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

// Default jury LLMs — the same gateway models available to run in the demo.
// The id IS the AI Gateway model slug. No API key needed; requests are routed
// through the gateway with the server-side key.
const DEFAULT_MODELS: LlmModel[] = [
  { id: "openai/gpt-5.4", name: "GPT-5.4", provider: "OpenAI", apiKey: "", enabled: true },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6", provider: "Anthropic", apiKey: "", enabled: true },
  { id: "google/gemini-3-flash", name: "Gemini 3 Flash", provider: "Google", apiKey: "", enabled: true },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", provider: "DeepSeek", apiKey: "", enabled: false },
  { id: "mistral/mistral-large-3", name: "Mistral Large 3", provider: "Mistral", apiKey: "", enabled: false },
  { id: "meta/llama-4-maverick", name: "Llama 4 Maverick", provider: "Meta", apiKey: "", enabled: false },
  { id: "xai/grok-4.3", name: "Grok 4.3", provider: "xAI", apiKey: "", enabled: false },
  { id: "alibaba/qwen3-max", name: "Qwen3 Max", provider: "Alibaba", apiKey: "", enabled: false },
];

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
  return read(MODELS_KEY, DEFAULT_MODELS);
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

export function getEnabledModels(): LlmModel[] {
  return loadModels().filter((m) => m.enabled);
}

export function hasEnoughJuryModels(): boolean {
  return getEnabledModels().length >= 3;
}

// Which MT providers are enabled for testing. Models are powered by the Vercel
// AI Gateway, so no per-provider key is needed — this is just an on/off map.
export type MtProviderConfig = Record<string, boolean>;

const MT_CONFIG_KEY = "trans-eval-mt-enabled";

export function loadMtConfig(): MtProviderConfig {
  return read(MT_CONFIG_KEY, {});
}

export function saveMtConfig(config: MtProviderConfig): void {
  write(MT_CONFIG_KEY, config);
}

export function isMtProviderEnabled(id: string, config?: MtProviderConfig): boolean {
  const c = config ?? loadMtConfig();
  // Default to enabled when not explicitly disabled.
  return c[id] !== false;
}
