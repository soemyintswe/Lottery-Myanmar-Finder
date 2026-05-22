const MM_ZERO = "၀".charCodeAt(0); // U+1040
const MM_NINE = "၉".charCodeAt(0); // U+1049
const EN_ZERO = "0".charCodeAt(0);

/** Convert English digits to Myanmar numerals */
export function toMM(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => {
    const code = d.charCodeAt(0);
    const offset = code - EN_ZERO;
    return String.fromCharCode(MM_ZERO + offset);
  });
}

/** Convert Myanmar numeral characters to English digits */
export function toEN(input: string): string {
  return input.replace(/[၀-၉]/g, (c) => {
    const code = c.charCodeAt(0);
    if (code < MM_ZERO || code > MM_NINE) return c;
    const offset = code - MM_ZERO;
    return String.fromCharCode(EN_ZERO + offset);
  });
}

/** Normalize input that may contain Myanmar OR English digits → English only */
export function normalizeDigits(input: string): string {
  return toEN(input).replace(/[^0-9]/g, "");
}

/** Format a date string with Myanmar numerals e.g. "2026-05-01" → "၂၀၂၆-၀၅-၀၁" */
export function toMMDate(date: string): string {
  return toMM(date);
}

/** Format a draw number with Myanmar numeral ordinal e.g. 86 → "၈၆" */
export function toMMDraw(n: number): string {
  return toMM(n);
}
