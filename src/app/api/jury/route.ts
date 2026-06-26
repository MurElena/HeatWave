import { generateText, Output } from "ai";
import { z } from "zod";
import { JURY_PROMPT } from "@/lib/evaluation/metrics/llm-jury";

export const runtime = "nodejs";
export const maxDuration = 60;

const RatingSchema = z.enum(["Good", "Neutral", "Bad"]);

const RequestSchema = z.object({
  models: z.array(z.string().min(1)).min(1).max(5),
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

  const { models, items } = parsed.data;

  const blocks = items
    .map(
      (it, i) =>
        `### Segment ${i + 1}\nSource: ${it.source}\nReference: ${it.reference}\nTranslation: ${it.hypothesis}`,
    )
    .join("\n\n");

  try {
    // Each model rates every segment. Run the models sequentially (rather than
    // in parallel) to avoid bursting the free-tier rate limit.
    const perModel: {
      model: string;
      ratings: ("Good" | "Neutral" | "Bad")[];
      usage: { inputTokens: number; outputTokens: number };
    }[] = [];

    for (const model of models) {
      let output: { ratings?: ("Good" | "Neutral" | "Bad")[] } | undefined;
      let usage: { inputTokens?: number; outputTokens?: number } | undefined;
      try {
        ({ output, usage } = await generateText({
          model,
          maxRetries: 4,
          system: JURY_PROMPT,
          prompt:
            `Rate each translation below as exactly one of Good, Neutral, or Bad, ` +
            `following the criteria. Return one rating per segment, in order.\n\n${blocks}`,
          output: Output.object({
            schema: z.object({
              ratings: z
                .array(RatingSchema)
                .describe("One rating (Good/Neutral/Bad) per segment, in order."),
            }),
          }),
          providerOptions: {
            gateway: { tags: ["feature:mt-eval", "phase:jury"] },
          },
        }));
      } catch (err) {
        const detail = err instanceof Error ? err.message : "jury model failed.";
        throw new Error(`${model}: ${detail}`);
      }
      let ratings = output?.ratings ?? [];
      if (ratings.length < items.length) {
        ratings = [...ratings, ...Array(items.length - ratings.length).fill("Neutral")];
      }
      perModel.push({
        model,
        ratings: ratings.slice(0, items.length),
        usage: {
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
        },
      });
    }

    // Transpose to per-segment votes: votes[s] = [ratingModel0, ratingModel1, ...]
    const votes = items.map((_, s) => perModel.map((mv) => mv.ratings[s]));

    const usageByModel: Record<string, { inputTokens: number; outputTokens: number }> = {};
    for (const m of perModel) {
      const cur = usageByModel[m.model] ?? { inputTokens: 0, outputTokens: 0 };
      cur.inputTokens += m.usage.inputTokens;
      cur.outputTokens += m.usage.outputTokens;
      usageByModel[m.model] = cur;
    }

    return Response.json({ votes, usageByModel });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Jury evaluation failed." },
      { status: 502 },
    );
  }
}
