import { generateText, Output } from "ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

// Abort a single gateway call before it can exhaust the function budget, so the
// client gets a clean retriable error instead of a platform 504.
const CALL_TIMEOUT_MS = 55_000;

const RequestSchema = z.object({
  model: z.string().min(1),
  sourceLanguage: z.string().min(1),
  targetLanguage: z.string().min(1),
  segments: z.array(z.string()).min(1).max(50),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request.", details: parsed.error.issues }, { status: 400 });
  }

  const { model, sourceLanguage, targetLanguage, segments } = parsed.data;

  const numbered = segments.map((s, i) => `${i + 1}. ${s}`).join("\n");

  try {
    const { output, usage } = await generateText({
      model,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      system:
        `You are a professional machine translation engine. Translate each numbered ` +
        `source segment from ${sourceLanguage} to ${targetLanguage}. Preserve meaning, ` +
        `tone, placeholders, tags and formatting. Return only the translations, in the ` +
        `same order, one per input segment. Do not add explanations.`,
      prompt: `Translate the following ${segments.length} segment(s):\n\n${numbered}`,
      output: Output.object({
        schema: z.object({
          translations: z
            .array(z.string())
            .describe("Translated segments, in the same order as the input."),
        }),
      }),
      providerOptions: {
        gateway: { tags: ["feature:mt-eval", "phase:translate"] },
      },
    });

    let translations = output?.translations ?? [];
    // Guard against length mismatches so downstream metrics stay aligned.
    if (translations.length < segments.length) {
      translations = [
        ...translations,
        ...Array(segments.length - translations.length).fill(""),
      ];
    } else if (translations.length > segments.length) {
      translations = translations.slice(0, segments.length);
    }

    return Response.json({
      translations,
      usage: {
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Translation failed.";
    return Response.json({ error: `${model}: ${detail}` }, { status: 502 });
  }
}
