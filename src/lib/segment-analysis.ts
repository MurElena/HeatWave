import type { SegmentCategory, TranslationSegment } from "@/lib/types";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function classifySegment(
  source: string,
  glossaryTerms: string[] = [],
): SegmentCategory[] {
  const categories: SegmentCategory[] = [];
  const words = wordCount(source);

  if (words >= 50) categories.push("long");
  if (words <= 5 && words > 0) categories.push("short");

  if (/\{[^}]+\}|%\w|\{\{[^}]+\}\}/.test(source)) {
    categories.push("placeholders");
  }

  if (/<[a-z][^>]*>|&[a-z]+;|&#\d+;/i.test(source)) {
    categories.push("markup");
  }

  if (/\d/.test(source)) {
    categories.push("numbers");
  }

  if (glossaryTerms.length > 0) {
    const lower = source.toLowerCase();
    const hasTerm = glossaryTerms.some((term) =>
      lower.includes(term.toLowerCase()),
    );
    if (hasTerm) categories.push("glossary");
  }

  const hasHtml = /<[^>]+>/.test(source);
  const hasNonAscii = /[^\x00-\x7F\u00A0-\u024F\u1E00-\u1EFF]/.test(source);
  if (hasHtml || hasNonAscii) {
    categories.push("html-non-utf8");
  }

  return categories;
}

export function annotateSegments(
  raw: { source: string; target: string }[],
  glossaryTerms: string[] = [],
): TranslationSegment[] {
  return raw.map((seg, index) => ({
    id: `seg-${index}`,
    source: seg.source,
    target: seg.target,
    categories: classifySegment(seg.source, glossaryTerms),
  }));
}
