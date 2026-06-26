// Quality Estimation runs on a gateway model chosen in the evaluation wizard.
// The stored value is already the AI Gateway model slug.

export function qeModelFor(provider: string): string {
  return provider || "openai/gpt-5.4";
}
