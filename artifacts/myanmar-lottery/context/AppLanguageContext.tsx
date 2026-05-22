import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "mm" | "en";

type AppLanguageContextType = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

const STORAGE_KEY = "myanmar-lottery-language";

const AppLanguageContext = createContext<AppLanguageContextType | null>(null);

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("mm");

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!mounted) return;
        if (saved === "mm" || saved === "en") {
          setLanguageState(saved);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = (next: AppLanguage) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  };

  const value = useMemo(() => ({ language, setLanguage }), [language]);
  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function useAppLanguage() {
  const ctx = useContext(AppLanguageContext);
  if (!ctx) throw new Error("useAppLanguage must be used inside AppLanguageProvider");
  return ctx;
}
