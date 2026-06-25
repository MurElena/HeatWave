import type { TranslationSegment } from "@/lib/types";

export interface RawSegment {
  source: string;
  target: string;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isNumbersOnly(text: string): boolean {
  return /^[\d\s.,+\-/%€$£¥]+$/.test(text.trim());
}

function isMarkupOnly(text: string): boolean {
  const stripped = text.replace(/<[^>]+>|&[a-z]+;|&#\d+;/gi, "").trim();
  return stripped.length === 0 && /<[^>]+>|&[a-z]+;|&#\d+;/i.test(text);
}

function isUnbalanced(source: string, target: string): boolean {
  const srcWords = wordCount(source);
  const tgtWords = wordCount(target);
  if (srcWords === 0 || tgtWords === 0) return true;
  const ratio = Math.min(srcWords, tgtWords) / Math.max(srcWords, tgtWords);
  return ratio < 0.7;
}

function segmentKey(source: string, target: string): string {
  return `${source.trim().toLowerCase()}|||${target.trim().toLowerCase()}`;
}

export interface CleanStats {
  inputCount: number;
  outputCount: number;
  removedDuplicates: number;
  removedNumbersOnly: number;
  removedOneWord: number;
  removedUnbalanced: number;
  removedMarkupOnly: number;
  removedTooLong: number;
}

export function cleanSegments(raw: RawSegment[]): {
  segments: RawSegment[];
  stats: CleanStats;
} {
  const stats: CleanStats = {
    inputCount: raw.length,
    outputCount: 0,
    removedDuplicates: 0,
    removedNumbersOnly: 0,
    removedOneWord: 0,
    removedUnbalanced: 0,
    removedMarkupOnly: 0,
    removedTooLong: 0,
  };

  const seen = new Set<string>();
  const cleaned: RawSegment[] = [];

  for (const seg of raw) {
    const source = seg.source.trim();
    const target = seg.target.trim();
    if (!source || !target) continue;

    const key = segmentKey(source, target);
    if (seen.has(key)) {
      stats.removedDuplicates++;
      continue;
    }

    if (isNumbersOnly(source) && isNumbersOnly(target)) {
      stats.removedNumbersOnly++;
      continue;
    }

    if (wordCount(source) <= 1 || wordCount(target) <= 1) {
      stats.removedOneWord++;
      continue;
    }

    if (isUnbalanced(source, target)) {
      stats.removedUnbalanced++;
      continue;
    }

    if (isMarkupOnly(source) || isMarkupOnly(target)) {
      stats.removedMarkupOnly++;
      continue;
    }

    if (wordCount(source) >= 101 || wordCount(target) >= 101) {
      stats.removedTooLong++;
      continue;
    }

    seen.add(key);
    cleaned.push({ source, target });
  }

  stats.outputCount = cleaned.length;
  return { segments: cleaned, stats };
}

export function toTranslationSegments(raw: RawSegment[]): TranslationSegment[] {
  return raw.map((seg, index) => ({
    id: `eval-seg-${index}`,
    source: seg.source,
    target: seg.target,
    categories: [],
  }));
}
