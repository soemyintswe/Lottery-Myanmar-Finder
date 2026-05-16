const MM_DIGITS = "၀၁၂၃၄၅၆၇၈၉";
const EN_DIGITS = "0123456789";

/** Convert English digits to Myanmar numerals */
export function toMM(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => MM_DIGITS[+d]);
}

/** Convert Myanmar numeral characters to English digits */
export function toEN(input: string): string {
  return input.replace(/[၀-၉]/g, (c) => String(EN_DIGITS.indexOf(c) === -1 ? c : EN_DIGITS[MM_DIGITS.indexOf(c)]));
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
