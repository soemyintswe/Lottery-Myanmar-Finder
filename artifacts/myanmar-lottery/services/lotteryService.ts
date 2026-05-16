import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { LotteryResult, SearchResult } from "@/types/lottery";
import { normalizeDigits } from "@/utils/myanmar";

const COLLECTION = "lottery_results";

export const LOCAL_SEED: LotteryResult = {
  drawNumber: 86,
  drawDate: "2026-05-01",
  prizes: [
    { amount: "3000", numbers: ["757767"] },
    { amount: "2000", numbers: ["753468"] },
    { amount: "1000", numbers: ["586471"] },
    { amount: "500",  numbers: ["394521", "627384"] },
    { amount: "300",  numbers: ["112233", "445566", "778899"] },
    { amount: "200",  numbers: ["100200", "300400", "500600", "700800", "900100"] },
    { amount: "100",  numbers: ["111111", "222222", "333333", "444444", "555555", "666666", "777777", "888888", "999999", "000000"] },
  ],
};

/** Write the 86th draw seed document to Firestore with a deterministic ID. */
export async function ensureSeeded(): Promise<boolean> {
  try {
    const ref = doc(db, COLLECTION, "draw-86");
    await setDoc(ref, {
      ...LOCAL_SEED,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }, { merge: true });
    console.log("[Firestore] Seed OK — draw-86 written");
    return true;
  } catch (e: any) {
    console.warn("[Firestore] Seed failed:", e?.code ?? e?.message ?? e);
    return false;
  }
}

export async function getAllResults(): Promise<{ data: LotteryResult[]; fromFirestore: boolean }> {
  try {
    const q = query(collection(db, COLLECTION), orderBy("drawNumber", "desc"));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LotteryResult));
    console.log(`[Firestore] Read OK — ${docs.length} document(s)`);
    if (docs.length > 0) return { data: docs, fromFirestore: true };
    return { data: [{ id: "local-86", ...LOCAL_SEED }], fromFirestore: false };
  } catch (e: any) {
    console.warn("[Firestore] Read failed:", e?.code ?? e?.message ?? e);
    return { data: [{ id: "local-86", ...LOCAL_SEED }], fromFirestore: false };
  }
}

export async function addResult(
  data: Omit<LotteryResult, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateResult(id: string, data: Partial<LotteryResult>): Promise<void> {
  if (id.startsWith("local-")) throw new Error("Not connected to Firebase.");
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { ...data, updatedAt: Date.now() });
}

export async function deleteResult(id: string): Promise<void> {
  if (id.startsWith("local-")) throw new Error("Not connected to Firebase.");
  await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * Search for a lottery match.
 *
 * Priority order:
 *   1. Exact 6-digit match         → major prize
 *   2. PREFIX match (first N digits, N=5→1) → Wai Wai Sar Sar
 *   3. SUFFIX match (last  N digits, N=5→1) → Wai Wai Sar Sar
 *
 * Input may contain Myanmar (၀-၉) or English (0-9) digits — both are normalised.
 */
export function searchLottery(
  result: LotteryResult,
  rawInput: string,
): SearchResult {
  // Normalise: accept Myanmar or English numerals
  const clean = normalizeDigits(rawInput);

  if (clean.length === 0) {
    return { matched: false, inputNumber: rawInput, drawNumber: result.drawNumber };
  }

  // ── 1. Exact match ─────────────────────────────────────────────────────────
  for (const prize of result.prizes) {
    for (const num of prize.numbers) {
      if (num === clean) {
        return {
          matched: true,
          prizeAmount: prize.amount,
          prizeType: "major",
          matchKind: "exact",
          inputNumber: clean,
          drawNumber: result.drawNumber,
        };
      }
    }
  }

  // ── 2. PREFIX match ────────────────────────────────────────────────────────
  // Check from longest prefix down to 1 digit
  for (let len = Math.min(5, clean.length); len >= 1; len--) {
    const prefix = clean.slice(0, len);
    for (const prize of result.prizes) {
      for (const num of prize.numbers) {
        if (num.startsWith(prefix)) {
          return {
            matched: true,
            prizeAmount: prize.amount,
            prizeType: "wai",
            matchKind: "prefix",
            matchedSegment: prefix,
            matchLength: len,
            matchedNumber: num,
            inputNumber: clean,
            drawNumber: result.drawNumber,
          };
        }
      }
    }
  }

  // ── 3. SUFFIX match ────────────────────────────────────────────────────────
  for (let len = Math.min(5, clean.length); len >= 1; len--) {
    const suffix = clean.slice(-len);
    for (const prize of result.prizes) {
      for (const num of prize.numbers) {
        if (num.endsWith(suffix)) {
          return {
            matched: true,
            prizeAmount: prize.amount,
            prizeType: "wai",
            matchKind: "suffix",
            matchedSegment: suffix,
            matchLength: len,
            matchedNumber: num,
            inputNumber: clean,
            drawNumber: result.drawNumber,
          };
        }
      }
    }
  }

  return { matched: false, inputNumber: clean, drawNumber: result.drawNumber };
}
