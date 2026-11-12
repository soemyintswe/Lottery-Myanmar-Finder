import { MYANMAR_ALPHABETS } from "@/types/lottery";
import { FrequencyItem, LotteryPredictionInsight } from "@/services/predictionService";
import { parseDisplayDate } from "@/utils/date";

export interface LuckyTicket {
  alpha: string;
  number: string;
  prefix2: string;
  suffix2: string;
}

export interface BirthdayLuckySuggestion {
  weekdayIndex: number;
  weekdayMm: string;
  weekdayEn: string;
  luckyDigits: string[];
  luckyLetters: string[];
  tickets: LuckyTicket[];
}

const WEEKDAY_MM = ["တနင်္ဂနွေ", "တနင်္လာ", "အင်္ဂါ", "ဗုဒ္ဓဟူး", "ကြာသပတေး", "သောကြာ", "စနေ"];
const WEEKDAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const WEEKDAY_DIGITS: Record<number, string[]> = {
  0: ["1", "4", "7"],
  1: ["2", "5", "8"],
  2: ["3", "6", "9"],
  3: ["0", "4", "8"],
  4: ["1", "5", "9"],
  5: ["2", "6", "0"],
  6: ["3", "7", "1"],
};

const WEEKDAY_ALPHA_INDEXES: Record<number, number[]> = {
  0: [0, 3, 6, 9],
  1: [1, 4, 7, 10],
  2: [2, 5, 8, 11],
  3: [3, 6, 9, 12],
  4: [4, 7, 10, 13],
  5: [5, 8, 11, 0],
  6: [6, 9, 12, 1],
};

function weightedPick(items: FrequencyItem[], fallback: string[]): string {
  const pool = items.length > 0 ? items : fallback.map((value) => ({ value, count: 1, share: 1 / fallback.length }));
  const total = pool.reduce((sum, item) => sum + Math.max(item.count, 1), 0);
  if (total <= 0) return fallback[Math.floor(Math.random() * fallback.length)] ?? "0";
  let cursor = Math.random() * total;
  for (const item of pool) {
    cursor -= Math.max(item.count, 1);
    if (cursor <= 0) return item.value;
  }
  return pool[pool.length - 1]?.value ?? fallback[0] ?? "0";
}

function randomDigitFromPool(basePool: FrequencyItem[], preferredDigits?: string[]): string {
  const preferredSet = new Set(preferredDigits ?? []);
  const preferred = basePool.filter((item) => preferredSet.has(item.value));
  if (preferred.length > 0 && Math.random() < 0.72) {
    return weightedPick(preferred, preferredDigits ?? []);
  }
  return weightedPick(basePool, preferredDigits && preferredDigits.length > 0 ? preferredDigits : ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
}

function buildLuckyTicket(
  insight: LotteryPredictionInsight,
  preferredDigits?: string[],
  preferredAlphas?: string[],
): LuckyTicket {
  const alphaPool = insight.topAlphas.length > 0 ? insight.topAlphas : MYANMAR_ALPHABETS.map((value) => ({ value, count: 1, share: 1 / MYANMAR_ALPHABETS.length }));
  const alphaPreferred = (preferredAlphas ?? []).filter((v) => !!v);
  const alpha =
    alphaPreferred.length > 0 && Math.random() < 0.7
      ? alphaPreferred[Math.floor(Math.random() * alphaPreferred.length)]
      : weightedPick(alphaPool, MYANMAR_ALPHABETS);

  const prefix = insight.topPrefixes2.length > 0 && Math.random() < 0.7
    ? weightedPick(insight.topPrefixes2, ["12", "34", "56", "78", "90"])
    : `${randomDigitFromPool(insight.topDigits, preferredDigits)}${randomDigitFromPool(insight.topDigits, preferredDigits)}`;

  const suffix = insight.topSuffixes2.length > 0 && Math.random() < 0.7
    ? weightedPick(insight.topSuffixes2, ["11", "22", "33", "44", "55"])
    : `${randomDigitFromPool(insight.topDigits, preferredDigits)}${randomDigitFromPool(insight.topDigits, preferredDigits)}`;

  const mid1 = randomDigitFromPool(insight.topDigits, preferredDigits);
  const mid2 = randomDigitFromPool(insight.topDigits, preferredDigits);
  const number = `${prefix}${mid1}${mid2}${suffix}`.slice(0, 6);
  return {
    alpha,
    number,
    prefix2: number.slice(0, 2),
    suffix2: number.slice(-2),
  };
}

export function spinWheelLuckyTicket(insight: LotteryPredictionInsight): LuckyTicket {
  return buildLuckyTicket(insight);
}

function parseBirthDate(value: string): Date | null {
  return parseDisplayDate(value);
}

export function getBirthdayLuckySuggestion(
  birthDateText: string,
  insight: LotteryPredictionInsight,
): BirthdayLuckySuggestion | null {
  const birthDate = parseBirthDate(birthDateText);
  if (!birthDate) return null;
  const weekday = birthDate.getDay();
  const luckyDigits = WEEKDAY_DIGITS[weekday] ?? ["1", "2", "3"];
  const alphaIndexes = WEEKDAY_ALPHA_INDEXES[weekday] ?? [0, 3, 6];
  const luckyLetters = alphaIndexes.map((idx) => MYANMAR_ALPHABETS[idx % MYANMAR_ALPHABETS.length]);
  const tickets = [
    buildLuckyTicket(insight, luckyDigits, luckyLetters),
    buildLuckyTicket(insight, luckyDigits, luckyLetters),
    buildLuckyTicket(insight, luckyDigits, luckyLetters),
  ];
  return {
    weekdayIndex: weekday,
    weekdayMm: WEEKDAY_MM[weekday] ?? "",
    weekdayEn: WEEKDAY_EN[weekday] ?? "",
    luckyDigits,
    luckyLetters,
    tickets,
  };
}
