import { loadProfile } from "@/lib/settings";
import { saveReview, REVIEWS_CHANGED_EVENT } from "@/lib/storage/reviews";
import type { Review, ReviewProviderSegment, ReviewSegment } from "@/lib/types";

const REVIEWS_KEY = "trans-eval-reviews";
const DEMO_REVIEW_IDS = ["demo-review-blind", "demo-review-done"];

const PROVIDERS = [
  { id: "openai/gpt-5.4", name: "GPT-5.4" },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6" },
  { id: "google/gemini-3-flash", name: "Gemini 3 Flash" },
];

function pp(
  providerId: string,
  hypothesis: string,
  bleu: number,
  chrf: number,
  qe: number,
  jury: number,
): ReviewProviderSegment {
  return {
    providerId,
    hypothesis,
    scores: { bleu, chrf, qe, "llm-jury": jury },
    juryRating: jury >= 80 ? "Good" : jury >= 60 ? "Neutral" : "Bad",
  };
}

// Three hypotheses per segment, one for each provider in PROVIDERS order.
function segment(
  id: string,
  source: string,
  reference: string,
  hyps: [string, string, string],
  scores: [number, number, number],
  opts: Partial<ReviewSegment> = {},
): ReviewSegment {
  return {
    segmentId: id,
    source,
    reference,
    fromChallenge: false,
    perProvider: [
      pp(PROVIDERS[0].id, hyps[0], scores[0], scores[0] + 8, scores[0] + 10, scores[0] + 6),
      pp(PROVIDERS[1].id, hyps[1], scores[1], scores[1] + 8, scores[1] + 10, scores[1] + 6),
      pp(PROVIDERS[2].id, hyps[2], scores[2], scores[2] + 8, scores[2] + 10, scores[2] + 6),
    ],
    ...opts,
  };
}

function buildSegments(): ReviewSegment[] {
  return [
    // From the challenge dataset
    segment(
      "seg-ch-1",
      "Add to cart",
      "In den Warenkorb",
      ["In den Warenkorb", "Zum Warenkorb hinzufügen", "In den Warenkorb legen"],
      [88, 74, 70],
      { fromChallenge: true, challengeSegmentId: "ch-seg-1" },
    ),
    segment(
      "seg-ch-2",
      "Out of stock",
      "Nicht auf Lager",
      ["Nicht auf Lager", "Ausverkauft", "Nicht vorrätig"],
      [90, 68, 72],
      { fromChallenge: true, challengeSegmentId: "ch-seg-2" },
    ),
    // New (uploaded) segment
    segment(
      "seg-new-1",
      "Free shipping on orders over 50€",
      "Kostenloser Versand ab 50 €",
      [
        "Kostenloser Versand ab 50 €",
        "Gratisversand für Bestellungen über 50 €",
        "Versandkostenfrei ab 50 €",
      ],
      [82, 76, 79],
    ),
    // Duplicate pair #1 — INCONSISTENT (GPT translates the twin differently)
    segment(
      "seg-dup-1a",
      "Order now",
      "Jetzt bestellen",
      ["Jetzt bestellen", "Jetzt bestellen", "Jetzt bestellen"],
      [85, 85, 85],
      {
        fromChallenge: true,
        challengeSegmentId: "ch-seg-3",
        isDuplicate: true,
        duplicateOfId: "seg-dup-1b",
        twinReference: "Jetzt bestellen",
      },
    ),
    segment(
      "seg-dup-1b",
      "Order now",
      "Jetzt bestellen",
      ["Jetzt kaufen", "Jetzt bestellen", "Jetzt bestellen"],
      [70, 85, 85],
      {
        isDuplicate: true,
        duplicateOfId: "seg-dup-1a",
        twinReference: "Jetzt bestellen",
      },
    ),
    // Duplicate pair #2 — CONSISTENT (all providers translate both twins identically)
    segment(
      "seg-dup-2a",
      "Sign in",
      "Anmelden",
      ["Anmelden", "Anmelden", "Einloggen"],
      [92, 92, 75],
      {
        isDuplicate: true,
        duplicateOfId: "seg-dup-2b",
        twinReference: "Anmelden",
      },
    ),
    segment(
      "seg-dup-2b",
      "Sign in",
      "Anmelden",
      ["Anmelden", "Anmelden", "Einloggen"],
      [92, 92, 75],
      {
        isDuplicate: true,
        duplicateOfId: "seg-dup-2a",
        twinReference: "Anmelden",
      },
    ),
  ];
}

function realNames(): Record<string, string> {
  return Object.fromEntries(PROVIDERS.map((p) => [p.id, p.name]));
}

function randomisedDisplayNames(): Record<string, string> {
  const ids = PROVIDERS.map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const names: Record<string, string> = {};
  ids.forEach((id, i) => {
    names[id] = `Model ${String.fromCharCode(65 + i)}`;
  });
  return names;
}

/** Seeds the demo reviews once (assigned to the current user) if not present. */
export function ensureDemoReviews(): void {
  if (typeof window === "undefined") return;
  if (hasDemoReviews()) return;
  seedDemoReviews();
}

export function seedDemoReviews(): number {
  const me = (typeof window !== "undefined" && loadProfile().name) || "Myself";
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const blind: Review = {
    id: "demo-review-blind",
    evaluationId: "demo-run-0",
    title: "E-commerce launch QA (blind)",
    domain: "E-commerce",
    sourceLanguage: "EN",
    targetLanguage: "DE",
    assignedTo: me,
    assignedBy: "Marie Dubois",
    status: "pending",
    metrics: ["bleu", "chrf", "qe", "llm-jury"],
    providerIds: PROVIDERS.map((p) => p.id),
    providerNames: realNames(),
    blind: true,
    displayNames: randomisedDisplayNames(),
    segments: buildSegments(),
    createdAt: new Date(now - 1 * day).toISOString(),
  };

  const completed: Review = {
    id: "demo-review-done",
    evaluationId: "demo-run-1",
    title: "Legal contracts review",
    domain: "Legal",
    sourceLanguage: "EN",
    targetLanguage: "FR",
    assignedTo: me,
    assignedBy: "Hans Müller",
    status: "done",
    metrics: ["bleu", "chrf", "qe", "llm-jury"],
    providerIds: PROVIDERS.map((p) => p.id),
    providerNames: realNames(),
    segments: buildSegments(),
    createdAt: new Date(now - 6 * day).toISOString(),
    completedAt: new Date(now - 5 * day).toISOString(),
  };

  // saveReview unshifts (newest first); save completed first so blind ends up on top.
  saveReview(completed);
  saveReview(blind);
  return 2;
}

export function hasDemoReviews(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    if (!raw) return false;
    const reviews = JSON.parse(raw) as { id: string }[];
    return reviews.some((r) => DEMO_REVIEW_IDS.includes(r.id));
  } catch {
    return false;
  }
}

export function clearDemoReviews(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    if (!raw) return;
    const reviews = (JSON.parse(raw) as { id: string }[]).filter(
      (r) => !DEMO_REVIEW_IDS.includes(r.id),
    );
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
    window.dispatchEvent(new Event(REVIEWS_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}
