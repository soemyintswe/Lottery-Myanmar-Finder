import { LotteryResult } from "@/types/lottery";
import { normalizeDigits } from "@/utils/myanmar";

export interface FrequencyItem {
  value: string;
  count: number;
  share: number;
}

export interface DigitPositionPrediction {
  position: number;
  digit: string;
  confidence: number;
}

export interface LotteryPredictionInsight {
  drawsAnalyzed: number;
  ticketsAnalyzed: number;
  sixDigitTicketsAnalyzed: number;
  analyzedDrawRange: { latest: number; oldest: number } | null;
  topAlphas: FrequencyItem[];
  topExactNumbers: FrequencyItem[];
  topRepeatedNumbers: FrequencyItem[];
  topDigits: FrequencyItem[];
  topPrefixes2: FrequencyItem[];
  topSuffixes2: FrequencyItem[];
  predictedAlpha: string | null;
  predictedNumber: string | null;
  predictedNumberConfidence: number;
  positionPredictions: DigitPositionPrediction[];
}

interface ParsedTicket {
  drawNumber: number;
  alpha: string;
  number: string;
}

function parsePrizeTicket(raw: string): { alpha: string; number: string } | null {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const m = text.match(/^([^\-–—:]+)[\-–—:]\s*([0-9၀-၉]+)$/u);
  if (!m) return null;
  const alpha = (m[1] ?? "").trim().slice(0, 1);
  const number = normalizeDigits(m[2] ?? "");
  if (!alpha || !number) return null;
  return { alpha, number };
}

function toFrequencyItems(
  map: Map<string, number>,
  denominator: number,
  topN: number,
  minCount = 1,
): FrequencyItem[] {
  if (denominator <= 0) return [];
  return Array.from(map.entries())
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], "my");
    })
    .slice(0, topN)
    .map(([value, count]) => ({
      value,
      count,
      share: count / denominator,
    }));
}

function incrementCount(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function incrementWeighted(map: Map<string, number>, key: string, weight: number) {
  map.set(key, (map.get(key) ?? 0) + weight);
}

export function calculateLotteryPrediction(
  sourceResults: LotteryResult[],
  topN = 6,
): LotteryPredictionInsight {
  const sortedResults = [...sourceResults].sort((a, b) => b.drawNumber - a.drawNumber);
  const drawRange =
    sortedResults.length > 0
      ? { latest: sortedResults[0].drawNumber, oldest: sortedResults[sortedResults.length - 1].drawNumber }
      : null;

  const alphaCounts = new Map<string, number>();
  const exactNumberCounts = new Map<string, number>();
  const digitCounts = new Map<string, number>();
  const prefix2Counts = new Map<string, number>();
  const suffix2Counts = new Map<string, number>();
  const positionWeightedCounts: Array<Map<string, number>> = Array.from({ length: 6 }, () => new Map<string, number>());
  const positionTotalWeights = Array.from({ length: 6 }, () => 0);
  const parsedTickets: ParsedTicket[] = [];
  const latestDraw = drawRange?.latest ?? 0;

  sortedResults.forEach((result) => {
    const perDrawSeen = new Set<string>();

    (result.prizes ?? []).forEach((prize) => {
      (prize.numbers ?? []).forEach((rawTicket) => {
        const parsed = parsePrizeTicket(rawTicket);
        if (!parsed) return;
        const key = `${parsed.alpha}-${parsed.number}`;
        if (perDrawSeen.has(key)) return;
        perDrawSeen.add(key);
        parsedTickets.push({ drawNumber: result.drawNumber, alpha: parsed.alpha, number: parsed.number });
      });
    });

    if (perDrawSeen.size === 0) {
      (result.entries ?? []).forEach((entry) => {
        const alpha = (entry.alpha ?? "").trim().slice(0, 1);
        const number = normalizeDigits(entry.pattern ?? "");
        if (!alpha || !number) return;
        const key = `${alpha}-${number}`;
        if (perDrawSeen.has(key)) return;
        perDrawSeen.add(key);
        parsedTickets.push({ drawNumber: result.drawNumber, alpha, number });
      });
    }
  });

  let sixDigitTickets = 0;

  parsedTickets.forEach((ticket) => {
    incrementCount(alphaCounts, ticket.alpha);
    incrementCount(exactNumberCounts, ticket.number);

    ticket.number.split("").forEach((digit) => incrementCount(digitCounts, digit));

    if (ticket.number.length >= 2) {
      incrementCount(prefix2Counts, ticket.number.slice(0, 2));
      incrementCount(suffix2Counts, ticket.number.slice(-2));
    }

    if (ticket.number.length === 6) {
      sixDigitTickets += 1;
      const diff = Math.max(0, latestDraw - ticket.drawNumber);
      const weight = 1 / (1 + diff * 0.35);
      ticket.number.split("").forEach((digit, idx) => {
        incrementWeighted(positionWeightedCounts[idx], digit, weight);
        positionTotalWeights[idx] += weight;
      });
    }
  });

  const positionPredictions: DigitPositionPrediction[] = positionWeightedCounts.map((map, idx) => {
    const ranked = Array.from(map.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], "en");
    });
    const top = ranked[0];
    if (!top) {
      return { position: idx + 1, digit: "0", confidence: 0 };
    }
    const total = positionTotalWeights[idx] || 1;
    return {
      position: idx + 1,
      digit: top[0],
      confidence: top[1] / total,
    };
  });

  const predictedNumber =
    sixDigitTickets > 0 && positionPredictions.every((p) => p.confidence > 0)
      ? positionPredictions.map((p) => p.digit).join("")
      : null;
  const predictedNumberConfidence =
    predictedNumber && positionPredictions.length > 0
      ? positionPredictions.reduce((sum, p) => sum + p.confidence, 0) / positionPredictions.length
      : 0;

  const topAlphas = toFrequencyItems(alphaCounts, parsedTickets.length || 1, topN);
  const topExactNumbers = toFrequencyItems(exactNumberCounts, parsedTickets.length || 1, topN);
  const topRepeatedNumbers = toFrequencyItems(exactNumberCounts, parsedTickets.length || 1, topN, 2);
  const topDigits = toFrequencyItems(digitCounts, Array.from(digitCounts.values()).reduce((s, n) => s + n, 0) || 1, 10);
  const topPrefixes2 = toFrequencyItems(prefix2Counts, parsedTickets.length || 1, topN);
  const topSuffixes2 = toFrequencyItems(suffix2Counts, parsedTickets.length || 1, topN);

  return {
    drawsAnalyzed: sortedResults.length,
    ticketsAnalyzed: parsedTickets.length,
    sixDigitTicketsAnalyzed: sixDigitTickets,
    analyzedDrawRange: drawRange,
    topAlphas,
    topExactNumbers,
    topRepeatedNumbers,
    topDigits,
    topPrefixes2,
    topSuffixes2,
    predictedAlpha: topAlphas[0]?.value ?? null,
    predictedNumber,
    predictedNumberConfidence,
    positionPredictions,
  };
}
