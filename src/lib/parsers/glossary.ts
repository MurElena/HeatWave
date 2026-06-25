import * as XLSX from "xlsx";

export async function parseGlossaryFile(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    const text = new TextDecoder().decode(buffer);
    return extractTermsFromCsv(text);
  }

  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
  });

  const terms = new Set<string>();
  for (const row of rows) {
    for (const cell of row) {
      const value = String(cell ?? "").trim();
      if (value.length > 1) {
        terms.add(value);
      }
    }
  }

  return Array.from(terms);
}

function extractTermsFromCsv(text: string): string[] {
  const terms = new Set<string>();
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const cells = line.split(/[,;\t]/);
    for (const cell of cells) {
      const value = cell.trim().replace(/^"|"$/g, "");
      if (value.length > 1) {
        terms.add(value);
      }
    }
  }

  return Array.from(terms);
}
