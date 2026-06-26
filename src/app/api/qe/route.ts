import { generateText, Output } from "ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const CALL_TIMEOUT_MS = 55_000;

const RequestSchema = z.object({
  model: z.string().min(1),
  intro: z.string().min(1),
  scoring: z.string().default(""),
  extraInstructions: z.string().default(""),
  items: z
    .array(
      z.object({
        source: z.string(),
        reference: z.string(),
        hypothesis: z.string(),
      }),
    )
    .min(1)
    .max(25),
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

  const { model, intro, scoring, extraInstructions, items } = parsed.data;

  const blocks = items
    .map(
      (it, i) =>
        `### Segment ${i + 1}\nSource: ${it.source}\nReference: ${it.reference}\nTranslation: ${it.hypothesis}`,
    )
    .join("\n\n");

  const system = [intro, scoring, extraInstructions]
    .filter((s) => s && s.trim().length > 0)
    .join("\n\n");

  try {
    const { output, usage } = await generateText({
      model,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
      system,
      prompt:
        `Score the quality of each translation below from 0 to 100 based on the ` +
        `criteria. Return one numeric score per segment, in order.\n\n${blocks}`,
      output: Output.object({
        schema: z.object({
          scores: z
            .array(z.number().min(0).max(100))
            .describe("Quality score 0-100 for each segment, in order."),
        }),
      }),
      providerOptions: {
        gateway: { tags: ["feature:mt-eval", "phase:qe"] },
      },
    });

    let scores = (output?.scores ?? []).map((n) =>
      Math.max(0, Math.min(100, Math.round(n))),
    );
    if (scores.length < items.length) {
      scores = [...scores, ...Array(items.length - scores.length).fill(0)];
    } else if (scores.length > items.length) {
      scores = scores.slice(0, items.length);
    }

    return Response.json({
      scores,
      usage: {
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "QE scoring failed.";
    return Response.json({ error: `${model}: ${detail}` }, { status: 502 });
  }
}
