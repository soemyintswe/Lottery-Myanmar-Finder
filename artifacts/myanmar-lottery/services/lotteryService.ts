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
import draw86Data from "@/assets/data/draw-86.json";

const COLLECTION = "lottery_results";

export const LOCAL_SEED: LotteryResult = draw86Data as LotteryResult;

/** Write the latest known draw to Firestore with a deterministic ID. */
export async function ensureSeeded(): Promise<boolean> {
  try {
    const ref = doc(db, COLLECTION, `draw-${LOCAL_SEED.drawNumber}`);
    await setDoc(ref, {
      ...LOCAL_SEED,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }, { merge: true });
    console.log(`[Firestore] Seed OK — draw-${LOCAL_SEED.drawNumber} written`);
    return true;
  } catch (e: any) {
    console.warn("[Firestore] Seed failed:", e?.code ?? e?.message ?? e);
    return false;
  }
}

export async function getAllResults(): Promise<{ data: LotteryResult[]; fromFirestore: boolean }> {
  // Excel-imported local dataset is the authoritative source.
  const localData: LotteryResult[] = [{ id: `local-${LOCAL_SEED.drawNumber}`, ...LOCAL_SEED }];
  try {
    const q = query(collection(db, COLLECTION), orderBy("drawNumber", "desc"));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as LotteryResult))
      .filter((d) => typeof d.drawNumber === "number" && Array.isArray(d.prizes));
    console.log(`[Firestore] Read OK — ${docs.length} document(s)`);
    const merged = [localData[0], ...docs.filter((d) => d.drawNumber !== LOCAL_SEED.drawNumber)];
    return { data: merged, fromFirestore: docs.length > 0 };
  } catch (e: any) {
    console.warn("[Firestore] Read failed:", e?.code ?? e?.message ?? e);
    return { data: localData, fromFirestore: false };
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
  selectedAlpha?: string | null,
): SearchResult {
  const clean = normalizeDigits(rawInput);
  const alpha = selectedAlpha?.trim() || "";

  if (clean.length === 0) {
    return {
      matched: false,
      inputNumber: rawInput,
      inputAlpha: alpha || null,
      drawNumber: result.drawNumber,
    };
  }

  const entries = result.entries ?? [];
  const numberMatches = entries.filter(
    (e) => clean.length >= e.matchLength && clean.startsWith(e.pattern),
  );

  if (entries.length === 0) {
    return { matched: false, inputNumber: clean, inputAlpha: alpha || null, drawNumber: result.drawNumber };
  }

  const alphaMatches = alpha
    ? numberMatches.filter((e) => e.alpha === alpha)
    : numberMatches;

  const sortByPriority = (a: any, b: any) => {
    if (b.matchLength !== a.matchLength) return b.matchLength - a.matchLength;
    return (a.rank ?? 0) - (b.rank ?? 0);
  };

  const sortedAlphaMatches = [...alphaMatches].sort(sortByPriority);
  const sortedNear = alpha
    ? [...numberMatches.filter((e) => e.alpha !== alpha)].sort(sortByPriority)
    : [];

  if (sortedAlphaMatches.length > 0) {
    return {
      matched: true,
      inputNumber: clean,
      inputAlpha: alpha || null,
      drawNumber: result.drawNumber,
      matches: sortedAlphaMatches,
    };
  }

  return {
    matched: false,
    inputNumber: clean,
    inputAlpha: alpha || null,
    drawNumber: result.drawNumber,
    nearMatchesWithoutAlpha: sortedNear,
  };
}
