import * as XLSX from "xlsx";
import type { ParsedFile } from "@/lib/types";

const SOURCE_HEADERS = ["source", "src", "original", "source text", "source_text"];
const TARGET_HEADERS = ["target", "tgt", "translation", "target text", "target_text"];

function findColumnIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => String(h ?? "").trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseBilingualXlsx(buffer: ArrayBuffer, fileName: string): ParsedFile {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
  });

  if (rows.length === 0) {
    return { fileName, segments: [] };
  }

  const headerRow = rows[0].map((cell) => String(cell ?? ""));
  let sourceCol = findColumnIndex(headerRow, SOURCE_HEADERS);
  let targetCol = findColumnIndex(headerRow, TARGET_HEADERS);
  let startRow = 1;

  if (sourceCol < 0 || targetCol < 0) {
    sourceCol = 0;
    targetCol = 1;
    startRow = 0;
  }

  const segments: ParsedFile["segments"] = [];

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    const source = String(row[sourceCol] ?? "").trim();
    const target = String(row[targetCol] ?? "").trim();
    if (source && target) {
      segments.push({ source, target });
    }
  }

  return { fileName, segments };
}
