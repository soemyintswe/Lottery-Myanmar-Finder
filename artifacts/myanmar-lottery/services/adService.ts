import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { AppAd } from "@/types/ad";

const COLLECTION = "app_ads";
const REMOTE_TIMEOUT_MS = 12000;

// Legacy keys from earlier local-cache implementations.
const LEGACY_LOCAL_ADS_KEY = "mm_lottery_ads_v1";
const LEGACY_LOCAL_ADS_TOMBSTONES_KEY = "mm_lottery_ads_tombstones_v1";
const LEGACY_SAMPLE_SEEDED_KEY = "mm_lottery_ads_sample_seeded_v1";

function withTimeout<T>(promise: Promise<T>, timeoutMs = REMOTE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Firestore request timeout.")), timeoutMs);
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

export function clearLegacyAdsLocalCache(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(LEGACY_LOCAL_ADS_KEY);
    window.localStorage.removeItem(LEGACY_LOCAL_ADS_TOMBSTONES_KEY);
    window.localStorage.removeItem(LEGACY_SAMPLE_SEEDED_KEY);
  } catch {
    // ignore
  }
}

export async function getAllAds(): Promise<{ data: AppAd[]; fromFirestore: boolean }> {
  // Ads are Firestore-only to guarantee that all browsers/devices show identical data.
  const q = query(collection(db, COLLECTION), orderBy("order", "asc"));
  const snapshot = await withTimeout(getDocs(q));
  const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AppAd));
  return { data: docs, fromFirestore: true };
}

export async function upsertAd(
  ad: Omit<AppAd, "id" | "createdAt" | "updatedAt">,
  id?: string,
): Promise<string> {
  if (id) {
    const ref = doc(db, COLLECTION, id);
    await withTimeout(updateDoc(ref, { ...ad, updatedAt: Date.now() }));
    return id;
  }
  const ref = await withTimeout(
    addDoc(collection(db, COLLECTION), {
      ...ad,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  return ref.id;
}

export async function deleteAdById(id: string): Promise<void> {
  if (!id) return;
  await withTimeout(deleteDoc(doc(db, COLLECTION, id)));
}

export async function deleteAllAds(): Promise<number> {
  const snapshot = await withTimeout(getDocs(collection(db, COLLECTION)));
  const ids = snapshot.docs.map((d) => d.id);
  if (ids.length === 0) return 0;

  // Batch deletes (limit is 500 per batch).
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + 450)) {
      batch.delete(doc(db, COLLECTION, id));
    }
    await withTimeout(batch.commit());
    deleted += Math.min(450, ids.length - i);
  }
  return deleted;
}

export async function trackAdClick(ad: AppAd): Promise<void> {
  const id = ad.id;
  if (!id) return;
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      clickCount: increment(1),
      lastClickedAt: new Date().toISOString(),
      updatedAt: Date.now(),
    });
  } catch {
    // Click tracking should never block UX.
  }
}

