import type { ChallengeDataset } from "@/lib/types";

function escapeCsv(value: string): string {
  const needsQuotes = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "dataset";
}

export function datasetToCsv(dataset: ChallengeDataset): string {
  const header = [
    "index",
    "source",
    "target",
    "categories",
    "is_duplicate",
    "is_random_base",
  ];

  const rows = dataset.segments.map((seg, i) => [
    String(i + 1),
    seg.source,
    seg.target,
    seg.categories.join("|"),
    seg.isDuplicate ? "yes" : "",
    seg.isRandomBase ? "yes" : "",
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}

export function downloadDatasetCsv(dataset: ChallengeDataset): void {
  const csv = datasetToCsv(dataset);
  // BOM keeps Excel happy with UTF-8 (accents, €, etc.)
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(dataset.name)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
