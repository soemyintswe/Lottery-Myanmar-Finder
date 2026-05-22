import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { AppAd } from "@/types/ad";

const COLLECTION = "app_ads";
const LOCAL_ADS_KEY = "mm_lottery_ads_v1";
const REMOTE_TIMEOUT_MS = 4500;

const SAMPLE_ADS: Array<Omit<AppAd, "id" | "createdAt" | "updatedAt">> = [
  {
    titleMm: "နမူနာ - ရန်ကုန် ရွှေကံကောင်း ထီဆိုင်",
    titleEn: "Sample - Yangon Shwe Kan Kaung Lottery Shop",
    imageUrl: "https://dummyimage.com/600x320/f8e7d7/8a3b12&text=Sample+Lottery+Shop+Yangon",
    targetUrl: "https://example.com/yangon-lottery-shop",
    placement: "home",
    isActive: true,
    order: 1,
    clickCount: 0,
  },
  {
    titleMm: "နမူနာ - မန္တလေး မဟာကံထူး ထီဆိုင်",
    titleEn: "Sample - Mandalay Maha Kan Htoo Lottery Shop",
    imageUrl: "https://dummyimage.com/600x320/e8f3ff/0f4a7a&text=Sample+Lottery+Shop+Mandalay",
    targetUrl: "https://example.com/mandalay-lottery-shop",
    placement: "search",
    isActive: true,
    order: 2,
    clickCount: 0,
  },
  {
    titleMm: "နမူနာ - MKS Partner ထီဆိုင်များ",
    titleEn: "Sample - MKS Partner Lottery Shops",
    imageUrl: "https://dummyimage.com/600x320/e9f7ef/166534&text=MKS+Partner+Lottery+Shops",
    targetUrl: "https://example.com/mks-partner-lottery",
    placement: "both",
    isActive: true,
    order: 3,
    clickCount: 0,
  },
];

function getLocalAds(): AppAd[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppAd[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalAds(ads: AppAd[]) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(LOCAL_ADS_KEY, JSON.stringify(ads));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = REMOTE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("ads-timeout")), timeoutMs);
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

export function ensureSampleAdsLocal(): AppAd[] {
  const local = getLocalAds();
  if (local.length > 0) return local.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const seeded: AppAd[] = SAMPLE_ADS.map((ad, idx) => ({
    id: `local-ad-seed-${idx + 1}`,
    ...ad,
    updatedAt: Date.now(),
  }));
  setLocalAds(seeded);
  return seeded;
}

export async function getAllAds(): Promise<{ data: AppAd[]; fromFirestore: boolean }> {
  const local = getLocalAds().sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  try {
    const q = query(collection(db, COLLECTION), orderBy("order", "asc"));
    const snapshot = await withTimeout(getDocs(q));
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AppAd));
    setLocalAds(docs);
    return { data: docs, fromFirestore: docs.length > 0 };
  } catch (e: any) {
    console.warn("[Ads] Read failed:", e?.code ?? e?.message ?? e);
    return { data: local, fromFirestore: false };
  }
}

export function saveLocalAd(ad: Omit<AppAd, "id" | "createdAt" | "updatedAt">, id?: string): string {
  const local = getLocalAds();
  const nextId = id || `local-ad-${Date.now()}`;
  const next: AppAd = {
    id: nextId,
    ...ad,
    updatedAt: Date.now(),
  };
  const merged = [...local.filter((x) => x.id !== nextId), next].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  );
  setLocalAds(merged);
  return nextId;
}

export function removeLocalAd(id: string) {
  const local = getLocalAds();
  setLocalAds(local.filter((x) => x.id !== id));
}

export async function upsertAd(
  ad: Omit<AppAd, "id" | "createdAt" | "updatedAt">,
  id?: string,
): Promise<string> {
  if (id && !id.startsWith("local-ad-")) {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, { ...ad, updatedAt: Date.now() });
    return id;
  }
  if (id && id.startsWith("local-ad-")) {
    const ref = await addDoc(collection(db, COLLECTION), {
      ...ad,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return ref.id;
  }
  const ref = await addDoc(collection(db, COLLECTION), {
    ...ad,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function deleteAdById(id: string): Promise<void> {
  if (id.startsWith("local-ad-")) return;
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function trackAdClick(ad: AppAd): Promise<void> {
  const id = ad.id;
  if (!id) return;
  const local = getLocalAds();
  const merged = local.map((item) =>
    item.id === id
      ? {
          ...item,
          clickCount: (item.clickCount ?? 0) + 1,
          lastClickedAt: new Date().toISOString(),
          updatedAt: Date.now(),
        }
      : item,
  );
  setLocalAds(merged);

  if (id.startsWith("local-ad-")) return;
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      clickCount: increment(1),
      lastClickedAt: new Date().toISOString(),
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn("trackAdClick remote failed", e);
  }
}

export async function seedSampleAdsIfEmpty(): Promise<void> {
  const local = ensureSampleAdsLocal();
  if (local.length > 0 && !local.every((a) => (a.id || "").startsWith("local-ad-seed-"))) return;

  for (const ad of SAMPLE_ADS) {
    const localId = saveLocalAd(ad);
    try {
      const newId = await withTimeout(upsertAd(ad));
      removeLocalAd(localId);
      saveLocalAd(ad, newId);
    } catch (e) {
      console.warn("seed sample ad remote failed", e);
    }
  }
}

export async function publishLocalAdsToFirestore(): Promise<void> {
  const local = getLocalAds();
  for (const ad of local) {
    if (!ad.id) continue;
    if (ad.id.startsWith("local-ad-")) {
      await addDoc(collection(db, COLLECTION), {
        ...ad,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      continue;
    }
    await setDoc(
      doc(db, COLLECTION, ad.id),
      { ...ad, updatedAt: Date.now() },
      { merge: true },
    );
  }
}
