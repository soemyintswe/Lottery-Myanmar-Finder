export interface PrizeEntry {
  amount: string;
  numbers: string[];
}

export interface LotteryRuleEntry {
  id: string;
  prizeCategory: string;
  alpha: string;
  pattern: string;
  matchLength: number;
  winners?: string;
  note?: string;
  rank?: number;
}

export interface LotteryResult {
  id?: string;
  drawNumber: number;
  drawDate: string;
  prizes: PrizeEntry[];
  entries?: LotteryRuleEntry[];
  sourceName?: string;
  sourceUrl?: string;
  verifiedAt?: string;
  publishStatus?: "draft" | "published";
  publishedAt?: string;
  waiWaiSarSar?: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface SearchResult {
  matched: boolean;
  inputNumber: string;
  inputAlpha?: string | null;
  drawNumber: number;
  matches?: LotteryRuleEntry[];
  nearMatchesWithoutAlpha?: LotteryRuleEntry[];
}

export const MYANMAR_ALPHABETS = [
  "က", "ခ", "ဂ", "ဃ", "င",
  "စ", "ဆ", "ဇ", "ဈ", "ည",
  "ဋ", "ဌ", "ဍ", "ဎ",
];

export const PRIZE_LABELS: Record<string, string> = {
  "3000": "၃၀၀၀ သိန်း",
  "2000": "၂၀၀၀ သိန်း",
  "1000": "၁၀၀၀ သိန်း",
  "500":  "၅၀၀ သိန်း",
  "300":  "၃၀၀ သိန်း",
  "200":  "၂၀၀ သိန်း",
  "100":  "၁၀၀ သိန်း",
  "50":   "၅၀ သိန်း",
  "wai":  "ဝဲဝဲဆာဆာ",
};
