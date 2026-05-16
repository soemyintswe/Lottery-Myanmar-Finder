import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LotteryResult } from "@/types/lottery";
import { getAllResults, seedDefaultData } from "@/services/lotteryService";

const DEFAULT_RESULTS: LotteryResult[] = [
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

interface LotteryContextType {
  results: LotteryResult[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  selectedDraw: number | null;
  setSelectedDraw: (draw: number | null) => void;
  firestoreConnected: boolean;
}

const LotteryContext = createContext<LotteryContextType | null>(null);

export function LotteryProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<LotteryResult[]>(DEFAULT_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDraw, setSelectedDraw] = useState<number>(86);
  const [firestoreConnected, setFirestoreConnected] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllResults();
      if (data.length > 0) {
        setResults(data);
        setFirestoreConnected(!data[0].id?.startsWith("local-"));
        if (selectedDraw === null) {
          setSelectedDraw(data[0].drawNumber);
        }
      }
    } catch (e: any) {
      console.error("Lottery fetch error:", e);
      setError(e.message ?? "ဒေတာ ပြန်လည်ထည့်သွင်းရန် ကြိုးစားပါ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load from Firestore in background, app already has local data
    refresh();
    // Also attempt to seed
    seedDefaultData().catch(() => {});
  }, []);

  return (
    <LotteryContext.Provider value={{ results, loading, error, refresh, selectedDraw, setSelectedDraw, firestoreConnected }}>
      {children}
    </LotteryContext.Provider>
  );
}

export function useLottery() {
  const ctx = useContext(LotteryContext);
  if (!ctx) throw new Error("useLottery must be used inside LotteryProvider");
  return ctx;
}
