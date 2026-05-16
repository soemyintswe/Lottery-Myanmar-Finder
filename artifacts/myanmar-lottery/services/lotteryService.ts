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

/** Try to seed the 86th draw into Firestore. Returns true if successful. */
export async function ensureSeeded(): Promise<boolean> {
  try {
    // Use a deterministic doc ID so we never duplicate
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

/** Fetch all results from Firestore. Returns { data, fromFirestore } */
export async function getAllResults(): Promise<{ data: LotteryResult[]; fromFirestore: boolean }> {
  try {
    const q = query(collection(db, COLLECTION), orderBy("drawNumber", "desc"));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LotteryResult));
    console.log(`[Firestore] Read OK — ${docs.length} document(s)`);
    if (docs.length > 0) {
      return { data: docs, fromFirestore: true };
    }
    // Collection exists but empty — seed and return local until next refresh
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
  if (id.startsWith("local-")) throw new Error("Not connected to Firebase. Check security rules.");
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { ...data, updatedAt: Date.now() });
}

export async function deleteResult(id: string): Promise<void> {
  if (id.startsWith("local-")) throw new Error("Not connected to Firebase. Check security rules.");
  await deleteDoc(doc(db, COLLECTION, id));
}

export function searchLottery(
  result: LotteryResult,
  inputNumber: string,
  alphabet?: string
): SearchResult {
  const clean = inputNumber.trim();

  for (const prize of result.prizes) {
    for (const num of prize.numbers) {
      if (num.trim() === clean) {
        return {
          matched: true,
          prizeAmount: prize.amount,
          prizeType: "major",
          inputNumber: clean,
          drawNumber: result.drawNumber,
        };
      }
    }
  }

  for (const prize of result.prizes) {
    for (const num of prize.numbers) {
      const numClean = num.trim();
      for (let len = 5; len >= 1; len--) {
        if (clean.length >= len && numClean.startsWith(clean.slice(0, len))) {
          return {
            matched: true,
            prizeAmount: prize.amount,
            prizeType: "wai",
            matchedPrefix: clean.slice(0, len),
            matchLength: len,
            inputNumber: clean,
            drawNumber: result.drawNumber,
          };
        }
      }
    }
  }

  return { matched: false, inputNumber: clean, drawNumber: result.drawNumber };
}
