import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LotteryResult } from "@/types/lottery";
import { LOCAL_SEED, getAllResults, subscribeResults } from "@/services/lotteryService";
import { AppAd } from "@/types/ad";
import { ensureSampleAdsLocal, getAllAds, seedSampleAdsIfEmpty } from "@/services/adService";

interface LotteryContextType {
  results: LotteryResult[];
  ads: AppAd[];
  loading: boolean;
  adsLoading: boolean;
  error: string | null;
  firestoreConnected: boolean;
  refresh: () => Promise<void>;
  selectedDraw: number | null;
  setSelectedDraw: (draw: number | null) => void;
  adminUnlocked: boolean;
  setAdminUnlocked: (v: boolean) => void;
  pendingEditResultId: string | null;
  pendingEditCategory: string | null;
  requestEditResult: (id: string | null, category?: string | null) => void;
  clearPendingEdit: () => void;
}

const LotteryContext = createContext<LotteryContextType | null>(null);

const INITIAL_RESULTS: LotteryResult[] = [{ id: `local-${LOCAL_SEED.drawNumber}`, ...LOCAL_SEED }];
const ADMIN_SESSION_KEY = "mm_lottery_admin_unlocked";

export function LotteryProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<LotteryResult[]>(INITIAL_RESULTS);
  const [ads, setAds] = useState<AppAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [adsLoading, setAdsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [selectedDraw, setSelectedDraw] = useState<number | null>(LOCAL_SEED.drawNumber);
  const [adminUnlocked, setAdminUnlockedState] = useState(false);
  const [pendingEditResultId, setPendingEditResultId] = useState<string | null>(null);
  const [pendingEditCategory, setPendingEditCategory] = useState<string | null>(null);

  const setAdminUnlocked = (value: boolean) => {
    setAdminUnlockedState(value);
    if (typeof window !== "undefined" && window.sessionStorage) {
      if (value) {
        window.sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      } else {
        window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
      }
    }
  };

  const refresh = async () => {
    setLoading(true);
    setAdsLoading(true);
    setError(null);
    try {
      const resultResp = await getAllResults();
      const { data, fromFirestore } = resultResp;
      setResults(data);
      // Show local sample ads immediately so UI never looks empty while remote loads.
      setAds(ensureSampleAdsLocal());
      // Fetch ads in background; do not block main loading state.
      void (async () => {
        try {
          const adResp = await getAllAds();
          if (adResp.data.length === 0) {
            await seedSampleAdsIfEmpty();
            const seeded = await getAllAds();
            setAds(seeded.data.length > 0 ? seeded.data : ensureSampleAdsLocal());
          } else {
            setAds(adResp.data);
          }
        } catch (seedErr) {
          console.warn("Ads refresh failed:", seedErr);
          setAds(ensureSampleAdsLocal());
        } finally {
          setAdsLoading(false);
        }
      })();
      setFirestoreConnected(fromFirestore);

      if (data.length > 0) {
        const nums = data.map((r) => r.drawNumber);
        if (selectedDraw === null || !nums.includes(selectedDraw)) {
          setSelectedDraw(data[0].drawNumber);
        }
      }
    } catch (e: any) {
      console.error("Refresh error:", e);
      setError(e.message ?? "ဒေတာ ရယူ၍မရပါ");
      setAdsLoading(false);
    } finally {
      setLoading(false);
      // adsLoading will be set in the background ads fetch path
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const saved = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (saved === "1") setAdminUnlockedState(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeResults(
      (liveResults, fromFirestore) => {
        setResults(liveResults);
        setFirestoreConnected(fromFirestore);
        if (liveResults.length > 0) {
          const nums = liveResults.map((r) => r.drawNumber);
          setSelectedDraw((prev) =>
            prev !== null && nums.includes(prev) ? prev : liveResults[0].drawNumber,
          );
        }
      },
      () => {
        // keep last rendered state, manual refresh will still work
      },
    );
    return () => unsubscribe();
  }, []);

  return (
    <LotteryContext.Provider
      value={{
        results,
        ads,
        loading,
        adsLoading,
        error,
        firestoreConnected,
        refresh,
        selectedDraw,
        setSelectedDraw,
        adminUnlocked,
        setAdminUnlocked,
        pendingEditResultId,
        pendingEditCategory,
        requestEditResult: (id, category) => {
          setPendingEditResultId(id);
          setPendingEditCategory(category ?? null);
        },
        clearPendingEdit: () => {
          setPendingEditResultId(null);
          setPendingEditCategory(null);
        },
      }}
    >
      {children}
    </LotteryContext.Provider>
  );
}

export function useLottery() {
  const ctx = useContext(LotteryContext);
  if (!ctx) throw new Error("useLottery must be used inside LotteryProvider");
  return ctx;
}
