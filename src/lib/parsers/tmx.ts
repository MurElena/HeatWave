import type { ParsedFile } from "@/lib/types";

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractSegContent(tuvBlock: string): string {
  const segMatch = tuvBlock.match(/<seg[^>]*>([\s\S]*?)<\/seg>/i);
  if (!segMatch) return "";
  return decodeXmlEntities(segMatch[1].replace(/<[^>]+>/g, "").trim());
}

function extractLang(tuvBlock: string): string {
  const langMatch = tuvBlock.match(/xml:lang="([^"]+)"/i);
  return langMatch ? langMatch[1].toLowerCase() : "";
}

export function parseTmx(content: string, fileName: string): ParsedFile {
  const segments: ParsedFile["segments"] = [];
  const tuRegex = /<tu[\s>][\s\S]*?<\/tu>/gi;
  const tuvRegex = /<tuv[\s\S]*?<\/tuv>/gi;

  let tuMatch: RegExpExecArray | null;
  while ((tuMatch = tuRegex.exec(content)) !== null) {
    const tuBlock = tuMatch[0];
    const tuvBlocks = tuBlock.match(tuvRegex) ?? [];

    if (tuvBlocks.length < 2) continue;

    const tuvData = tuvBlocks.map((block) => ({
      lang: extractLang(block),
      text: extractSegContent(block),
    }));

    const withText = tuvData.filter((t) => t.text.length > 0);
    if (withText.length < 2) continue;

    segments.push({
      source: withText[0].text,
      target: withText[1].text,
    });
  }

  return { fileName, segments };
}
