import type { ParsedFile } from "@/lib/types";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semiCount = (headerLine.match(/;/g) ?? []).length;
  const tabCount = (headerLine.match(/\t/g) ?? []).length;
  if (tabCount >= commaCount && tabCount >= semiCount) return "\t";
  if (semiCount > commaCount) return ";";
  return ",";
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseBilingualCsv(content: string, fileName: string): ParsedFile {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { fileName, segments: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const splitLine = (line: string) =>
    delimiter === ","
      ? parseCsvLine(line)
      : line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));

  const headers = splitLine(lines[0]);
  let sourceIdx = findColumnIndex(headers, ["source", "src", "sourcetext", "original"]);
  let targetIdx = findColumnIndex(headers, ["target", "tgt", "targettext", "translation"]);

  const dataStart = sourceIdx >= 0 && targetIdx >= 0 ? 1 : 0;
  if (sourceIdx < 0) sourceIdx = 0;
  if (targetIdx < 0) targetIdx = 1;

  const segments: ParsedFile["segments"] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const source = cells[sourceIdx]?.trim() ?? "";
    const target = cells[targetIdx]?.trim() ?? "";
    if (source && target) {
      segments.push({ source, target });
    }
  }

  return { fileName, segments };
}
