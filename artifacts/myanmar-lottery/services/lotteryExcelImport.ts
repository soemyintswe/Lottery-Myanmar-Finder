import * as XLSX from "xlsx";
import { LotteryResult, LotteryRuleEntry, PrizeEntry } from "@/types/lottery";
import { normalizeDigits } from "@/utils/myanmar";

export type LotteryExcelImportOptions = {
  drawNumber: number;
  drawDate: string;
};

export type LotteryExcelImportResult = {
  result: LotteryResult;
  entriesCount: number;
  prizeCount: number;
};

function readCell(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function toAsciiDigits(value: unknown): string {
  return normalizeDigits(String(value ?? ""));
}

function parseMatchLength(note: string, fallback: number): number {
  if (!note) return fallback;
  const candidates = [note, normalizeDigits(note)];

  const matchers = [
    /ရှေ့(?:ဂဏန်း)?\((\d+)\)လုံး/u,
    /ရှေ့\s*(\d+)\s*လုံး/u,
    /(\d+)\s*လုံး/u,
  ];

  for (const candidate of candidates) {
    for (const matcher of matchers) {
      const match = candidate.match(matcher);
      if (!match) continue;
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }

  return fallback;
}

function buildEntries(rows: Record<string, unknown>[]): LotteryRuleEntry[] {
  const entries: LotteryRuleEntry[] = [];

  rows.forEach((row, index) => {
    const prizeCategory = readCell(row, ["ဆုအမျိုးအစား", "Prize Category", "category"]);
    const alpha = readCell(row, ["အက္ခရာ", "Alpha", "Letter"]);
    const rawNumber = row["ထီနံပါတ်"] ?? row["ထီ နံပါတ်"] ?? row["Number"] ?? row["No"];
    const winners = readCell(row, ["ကံထူးရှင်အရေအတွက်", "Winners", "ဝင်းနား", "ဝင်နာ"]);
    const note = readCell(row, ["မှတ်ချက်", "Note", "Remarks"]);

    if (!prizeCategory || !alpha || rawNumber === undefined || rawNumber === null || rawNumber === "") {
      return;
    }

    const compact = toAsciiDigits(rawNumber);
    if (!compact) return;

    const guessedLength = compact.length;
    const matchLength = parseMatchLength(note, guessedLength);
    const pattern = compact.padStart(matchLength, "0");

    entries.push({
      id: `r${index + 2}`,
      prizeCategory,
      alpha,
      pattern,
      matchLength,
      winners,
      note,
      rank: index,
    });
  });

  return entries;
}

function buildPrizes(entries: LotteryRuleEntry[]): PrizeEntry[] {
  const byCategory = new Map<string, string[]>();

  entries.forEach((entry) => {
    if (!byCategory.has(entry.prizeCategory)) {
      byCategory.set(entry.prizeCategory, []);
    }
    byCategory.get(entry.prizeCategory)!.push(`${entry.alpha}-${entry.pattern}`);
  });

  return Array.from(byCategory.entries()).map(([amount, numbers]) => ({
    amount,
    numbers,
  }));
}

export async function parseLotteryExcelFile(
  file: File,
  options: LotteryExcelImportOptions,
): Promise<LotteryExcelImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Excel sheet not found.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const entries = buildEntries(rows);

  if (entries.length === 0) {
    throw new Error("Excel file ထဲမှာ data မတွေ့ပါ။ header columns ကိုစစ်ပါ။");
  }

  const result: LotteryResult = {
    drawNumber: options.drawNumber,
    drawDate: options.drawDate,
    sourceName: `Myanmar Lottery ${options.drawNumber} (Excel)`,
    sourceUrl: `assets/${file.name}`,
    verifiedAt: new Date().toISOString(),
    prizes: buildPrizes(entries),
    entries,
    publishStatus: "published",
    publishedAt: new Date().toISOString(),
  };

  return {
    result,
    entriesCount: entries.length,
    prizeCount: result.prizes.length,
  };
}
