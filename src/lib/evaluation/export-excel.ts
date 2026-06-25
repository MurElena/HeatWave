import * as XLSX from "xlsx";
import type { EvaluationMetricId, EvaluationRun, ProviderResult } from "@/lib/types";
import { METRIC_LABELS } from "@/lib/types";
import { METRIC_WEIGHTS, CONSISTENCY_PENALTY_WEIGHT } from "@/lib/evaluation/aggregate-score";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "results"
  );
}

function providerSheet(
  result: ProviderResult,
  metrics: EvaluationMetricId[],
): Record<string, string | number>[] {
  return result.segmentScores.map((seg, index) => {
    const row: Record<string, string | number> = {
      Index: index + 1,
      Source: seg.source,
      Reference: seg.reference,
      Hypothesis: seg.hypothesis,
    };
    for (const metric of metrics) {
      if (seg.scores[metric] !== undefined) {
        row[METRIC_LABELS[metric]] = seg.scores[metric]!;
      }
      if (metric === "llm-jury" && seg.juryRating) {
        row["Jury Rating"] = seg.juryRating;
      }
    }
    if (seg.isDuplicate) {
      row["Duplicate"] = "yes";
      row["Consistent"] = seg.consistencyConsistent ? "yes" : "no";
    }
    return row;
  });
}

function readmeSheet(): Record<string, string>[] {
  return [
    { Section: "Ranking", Detail: "Providers are ranked by the Aggregated metric score (higher wins)." },
    { Section: "Consistency", Detail: "consistent duplicate segments / total duplicate segments x 100" },
    { Section: "Weight: LLM-as-a-Jury", Detail: String(METRIC_WEIGHTS["llm-jury"]) },
    { Section: "Weight: QE", Detail: String(METRIC_WEIGHTS.qe) },
    { Section: "Weight: ChrF++", Detail: String(METRIC_WEIGHTS.chrf) },
    { Section: "Weight: BLEU", Detail: String(METRIC_WEIGHTS.bleu) },
    { Section: "Weight: WER", Detail: `${METRIC_WEIGHTS.wer} (normalized as 100 - WER)` },
    {
      Section: "Aggregated score",
      Detail: "base = Σ(normalized metric × weight) / Σ(weights of selected metrics)",
    },
    {
      Section: "Consistency penalty",
      Detail: `aggregated = base × (1 - (100 - consistency)/100 × ${CONSISTENCY_PENALTY_WEIGHT})`,
    },
  ];
}

export function downloadSelectedResults(
  run: EvaluationRun,
  selectedProviderIds: string[],
  selectedMetrics: EvaluationMetricId[],
  useHuman = false,
): string {
  const results = useHuman && run.humanResults ? run.humanResults : run.providerResults;
  const wb = XLSX.utils.book_new();

  const summaryRows = results
    .filter((r) => selectedProviderIds.includes(r.providerId))
    .map((r) => {
      const row: Record<string, string | number> = {
        Provider: r.providerName,
        Rank: r.rank,
        "Consistency %": r.consistencyAvailable ? (r.consistencyScore ?? 0) : "n/a",
        "Aggregated score": r.aggregatedScore ?? 0,
      };
      for (const metric of selectedMetrics) {
        row[METRIC_LABELS[metric]] = r.aggregateScores[metric] ?? "";
      }
      return row;
    });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");

  results
    .filter((r) => selectedProviderIds.includes(r.providerId))
    .forEach((result) => {
      const rows = providerSheet(result, selectedMetrics);
      const sheetName = result.providerName.slice(0, 28).replace(/[\\/?*[\]:]/g, "");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName || result.providerId);
    });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(readmeSheet()), "README");

  const fileName = `${slugify(run.title)}${useHuman ? "-human" : ""}-results.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
