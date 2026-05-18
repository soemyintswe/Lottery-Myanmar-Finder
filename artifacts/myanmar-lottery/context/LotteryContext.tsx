import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LotteryResult } from "@/types/lottery";
import { LOCAL_SEED, getAllResults } from "@/services/lotteryService";

interface LotteryContextType {
  results: LotteryResult[];
  loading: boolean;
  error: string | null;
  firestoreConnected: boolean;
  refresh: () => Promise<void>;
  selectedDraw: number | null;
  setSelectedDraw: (draw: number | null) => void;
  adminUnlocked: boolean;
  setAdminUnlocked: (v: boolean) => void;
  pendingEditResultId: string | null;
  requestEditResult: (id: string | null) => void;
  clearPendingEdit: () => void;
}

const LotteryContext = createContext<LotteryContextType | null>(null);

const INITIAL_RESULTS: LotteryResult[] = [{ id: `local-${LOCAL_SEED.drawNumber}`, ...LOCAL_SEED }];
const ADMIN_SESSION_KEY = "mm_lottery_admin_unlocked";

export function LotteryProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<LotteryResult[]>(INITIAL_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [selectedDraw, setSelectedDraw] = useState<number | null>(LOCAL_SEED.drawNumber);
  const [adminUnlocked, setAdminUnlockedState] = useState(false);
  const [pendingEditResultId, setPendingEditResultId] = useState<string | null>(null);

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
    setError(null);
    try {
      const { data, fromFirestore } = await getAllResults();
      setResults(data);
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
    } finally {
      setLoading(false);
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

  return (
    <LotteryContext.Provider
      value={{
        results,
        loading,
        error,
        firestoreConnected,
        refresh,
        selectedDraw,
        setSelectedDraw,
        adminUnlocked,
        setAdminUnlocked,
        pendingEditResultId,
        requestEditResult: setPendingEditResultId,
        clearPendingEdit: () => setPendingEditResultId(null),
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
