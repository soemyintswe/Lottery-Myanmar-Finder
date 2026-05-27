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
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { LotteryResult, SearchResult } from "@/types/lottery";
import { normalizeDigits } from "@/utils/myanmar";
import draw85Data from "@/assets/data/draw-85.json";
import draw86Data from "@/assets/data/draw-86.json";

const COLLECTION = "lottery_results";
const LOCAL_OVERRIDE_KEY = "mm_lottery_overrides_v2_mks";
// First-load Firestore can be slow on some browsers/networks (notably on a fresh Edge profile),
// and a too-short timeout causes false "offline" fallback to local seeds, leading to
// cross-browser data divergence. Use a safer timeout.
const REMOTE_TIMEOUT_MS = 15000;

const LOCAL_SEEDS: LotteryResult[] = [
  draw86Data as LotteryResult,
  draw85Data as LotteryResult,
].sort((a, b) => b.drawNumber - a.drawNumber);

export const LOCAL_SEED: LotteryResult = LOCAL_SEEDS[0];

function shouldUseLocalOverrides(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function mergeRemoteWithLocalSeeds(docs: LotteryResult[]): LotteryResult[] {
  const mergedMap = new Map<number, LotteryResult>();
  docs.forEach((d) => mergedMap.set(d.drawNumber, d));
  LOCAL_SEEDS.forEach((seed) => {
    const local = { id: `local-${seed.drawNumber}`, ...seed } as LotteryResult;
    if (!mergedMap.has(local.drawNumber)) mergedMap.set(local.drawNumber, local);
  });
  return Array.from(mergedMap.values()).sort((a, b) => b.drawNumber - a.drawNumber);
}

function applyLocalOverrides(base: LotteryResult[]): LotteryResult[] {
  if (!shouldUseLocalOverrides()) return base;
  const overrides = Object.values(getLocalOverrides());
  if (overrides.length === 0) return base;
  const map = new Map<number, LotteryResult>();
  base.forEach((r) => map.set(r.drawNumber, r));
  overrides.forEach((r) => map.set(r.drawNumber, r));
  return Array.from(map.values()).sort((a, b) => b.drawNumber - a.drawNumber);
}

function fromSnapshot(snapshot: QuerySnapshot<DocumentData, DocumentData>): LotteryResult[] {
  const docs = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as LotteryResult))
    .filter((d) => typeof d.drawNumber === "number" && Array.isArray(d.prizes));
  return applyLocalOverrides(mergeRemoteWithLocalSeeds(docs));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = REMOTE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("lottery-timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function getLocalOverrides(): Record<string, LotteryResult> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LotteryResult>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function setLocalOverrides(data: Record<string, LotteryResult>) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(LOCAL_OVERRIDE_KEY, JSON.stringify(data));
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  // Firestore rejects `undefined` field values. We intentionally omit them.
  const out: any = {};
  Object.keys(obj).forEach((k) => {
    const v = (obj as any)[k];
    if (v !== undefined) out[k] = v;
  });
  return out as T;
}

export function isResultPublished(result: LotteryResult): boolean {
  return result.publishStatus !== "draft";
}

export function saveLocalOverride(data: Omit<LotteryResult, "id" | "createdAt" | "updatedAt">) {
  if (!shouldUseLocalOverrides()) return;
  const key = String(data.drawNumber);
  const overrides = getLocalOverrides();
  overrides[key] = {
    id: `local-override-${data.drawNumber}`,
    ...data,
    updatedAt: Date.now(),
  };
  setLocalOverrides(overrides);
}

export function saveLocalOverridesBulk(items: Array<Omit<LotteryResult, "id" | "createdAt" | "updatedAt">>) {
  if (!shouldUseLocalOverrides()) return;
  const overrides = getLocalOverrides();
  items.forEach((item) => {
    const key = String(item.drawNumber);
    overrides[key] = {
      id: `local-override-${item.drawNumber}`,
      ...item,
      updatedAt: Date.now(),
    };
  });
  setLocalOverrides(overrides);
}

export function exportLocalOverrides(): LotteryResult[] {
  if (!shouldUseLocalOverrides()) return [];
  return Object.values(getLocalOverrides()).sort((a, b) => b.drawNumber - a.drawNumber);
}

export function removeLocalOverride(drawNumber: number) {
  if (!shouldUseLocalOverrides()) return;
  const key = String(drawNumber);
  const overrides = getLocalOverrides();
  if (!(key in overrides)) return;
  delete overrides[key];
  setLocalOverrides(overrides);
}

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
  const localData: LotteryResult[] = mergeRemoteWithLocalSeeds([]);
  try {
    const q = query(collection(db, COLLECTION), orderBy("drawNumber", "desc"));
    const snapshot = await withTimeout(getDocs(q));
    const docs = snapshot.docs.filter((d) => typeof d.data()?.drawNumber === "number");
    console.log(`[Firestore] Read OK — ${docs.length} document(s)`);
    const merged = fromSnapshot(snapshot);
    return { data: merged, fromFirestore: docs.length > 0 };
  } catch (e: any) {
    console.warn("[Firestore] Read failed:", e?.code ?? e?.message ?? e);
    return { data: localData, fromFirestore: false };
  }
}

export function subscribeResults(
  onData: (results: LotteryResult[], fromFirestore: boolean) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(collection(db, COLLECTION), orderBy("drawNumber", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const docsCount = snapshot.docs.filter((d) => typeof d.data()?.drawNumber === "number").length;
      onData(fromSnapshot(snapshot), docsCount > 0);
    },
    (error) => {
      console.warn("[Firestore] subscribe failed:", error);
      if (onError) onError(error as Error);
    },
  );
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

export async function upsertResultByDrawNumber(
  data: Omit<LotteryResult, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const id = `draw-${data.drawNumber}`;
  const ref = doc(db, COLLECTION, id);
  await setDoc(
    ref,
    stripUndefined({
      ...data,
      updatedAt: Date.now(),
    }),
    { merge: true }
  );
  return id;
}

export async function updateResult(id: string, data: Partial<LotteryResult>): Promise<void> {
  if (id.startsWith("local-")) throw new Error("Not connected to Firebase.");
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, stripUndefined({ ...data, updatedAt: Date.now() }));
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
