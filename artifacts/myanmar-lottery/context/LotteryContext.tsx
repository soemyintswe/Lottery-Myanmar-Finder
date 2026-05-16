import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LotteryResult } from "@/types/lottery";
import { LOCAL_SEED, ensureSeeded, getAllResults } from "@/services/lotteryService";

interface LotteryContextType {
  results: LotteryResult[];
  loading: boolean;
  error: string | null;
  firestoreConnected: boolean;
  refresh: () => Promise<void>;
  selectedDraw: number | null;
  setSelectedDraw: (draw: number | null) => void;
}

const LotteryContext = createContext<LotteryContextType | null>(null);

const INITIAL_RESULTS: LotteryResult[] = [{ id: `local-${LOCAL_SEED.drawNumber}`, ...LOCAL_SEED }];

export function LotteryProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<LotteryResult[]>(INITIAL_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [selectedDraw, setSelectedDraw] = useState<number | null>(LOCAL_SEED.drawNumber);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Write seed data — this confirms write permission and creates the doc
      const seeded = await ensureSeeded();

      // 2. Read back from Firestore
      const { data, fromFirestore } = await getAllResults();
      setResults(data);
      setFirestoreConnected(fromFirestore);

      if (!fromFirestore && !seeded) {
        setError("Firebase ကို မချိတ်ဆက်နိုင်ပါ။ Firestore Rules စစ်ဆေးပါ။");
      }

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
    refresh();
  }, []);

  return (
    <LotteryContext.Provider
      value={{ results, loading, error, firestoreConnected, refresh, selectedDraw, setSelectedDraw }}
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
