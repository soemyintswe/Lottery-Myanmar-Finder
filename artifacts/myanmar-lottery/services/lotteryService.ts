import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { LotteryResult, SearchResult } from "@/types/lottery";

const COLLECTION = "lottery_results";

const DEFAULT_DATA: LotteryResult[] = [
  {
    id: "local-86",
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
  },
];

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

export async function getAllResults(): Promise<LotteryResult[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy("drawNumber", "desc"));
    const snapshot = await withTimeout(getDocs(q), 8000);
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LotteryResult));
    return docs.length > 0 ? docs : DEFAULT_DATA;
  } catch (e) {
    console.warn("Firestore read failed, using local data:", e);
    return DEFAULT_DATA;
  }
}

export async function addResult(data: Omit<LotteryResult, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateResult(id: string, data: Partial<LotteryResult>): Promise<void> {
  if (id.startsWith("local-")) throw new Error("Cannot update local data. Configure Firestore first.");
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { ...data, updatedAt: Date.now() });
}

export async function deleteResult(id: string): Promise<void> {
  if (id.startsWith("local-")) throw new Error("Cannot delete local data. Configure Firestore first.");
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function seedDefaultData(): Promise<void> {
  try {
    const q = query(collection(db, COLLECTION), orderBy("drawNumber", "desc"));
    const snapshot = await withTimeout(getDocs(q), 5000);
    if (snapshot.docs.length > 0) return;
    await addDoc(collection(db, COLLECTION), {
      ...DEFAULT_DATA[0],
      id: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn("Seed skipped (Firestore not reachable):", e);
  }
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
