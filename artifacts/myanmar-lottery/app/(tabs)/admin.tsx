import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Feather from "@expo/vector-icons/Feather";
import { useColors } from "@/hooks/useColors";
import { useLottery } from "@/context/LotteryContext";
import {
  updateResult,
  deleteResult,
  upsertResultByDrawNumber,
  saveLocalOverride,
  removeLocalOverride,
} from "@/services/lotteryService";
import { LotteryResult, PrizeEntry, LotteryRuleEntry, MYANMAR_ALPHABETS } from "@/types/lottery";
import PrizeBadge from "@/components/PrizeBadge";
import { normalizeDigits, toMM } from "@/utils/myanmar";

const ADMIN_PIN = "1234";

const ALPHA_BASE_OPTIONS = [...MYANMAR_ALPHABETS];

const PRIZE_CATEGORY_OPTIONS = [
  "အထူးဆုကြီး ကျပ်သိန်း (၅၀၀၀) ဆု",
  "အထူးဆုကြီး ကျပ်သိန်း (၃၀၀၀) ဆု",
  "အထူးဆုကြီး ကျပ်သိန်း (၂၀၀၀) ဆု",
  "အထူးဆုကြီး ကျပ်သိန်း (၁၀၀၀) ဆု",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၅၀၀) ဆုများ",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၂၀၀) ဆုများ",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၁၀၀) ဆုများ",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၅၀) ဆုများ",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၂၀) ဆုများ",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၁၀) ဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ်(၃)သိန်းဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ်(၂)သိန်းဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ်(၁)သိန်းဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ်(၅)သောင်းဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ်(၁)သောင်းဆုများ",
  "ဘဏ္ဍာသိမ်းရငွေမှ ပြန်လည်ချီးမြှင့်သောဆုမဲများ",
  "ကျပ်သိန်း (၅၀၀၀) ဆု",
  "ကျပ်သိန်း (၃၀၀၀) ဆု",
  "ကျပ်သိန်း (၂၀၀၀) ဆု",
  "ကျပ်သိန်း (၁၀၀၀) ဆု",
  "ကျပ်သိန်း (၅၀၀) ဆုများ",
  "ကျပ်သိန်း (၂၀၀) ဆုများ",
  "ကျပ်သိန်း (၁၀၀) ဆုများ",
  "ကျပ်သိန်း (၅၀) ဆုများ",
  "ကျပ်သိန်း (၂၀) ဆုများ",
  "ကျပ် (၁၀) သိန်းဆုများ",
  "ဘဏ္ဍာသိမ်းရငွေမှ ကျပ် (၁၀) သိန်းဆု",
  "ဝေဝေဆာဆာပဒေသာ ကျပ် (၃) သိန်းဆုများ",
  "ဘဏ္ဍာသိမ်းရငွေမှ ဝေဝေဆာဆာပဒေသာ ကျပ် (၃) သိန်းဆု",
  "ဝေဝေဆာဆာပဒေသာ ကျပ် (၂) သိန်းဆုများ",
  "ဘဏ္ဍာသိမ်းရငွေမှ ဝေဝေဆာဆာပဒေသာ ကျပ် (၂) သိန်းဆု",
  "ဝေဝေဆာဆာပဒေသာ ကျပ် (၁) သိန်းဆုများ",
  "ဘဏ္ဍာသိမ်းရငွေမှ ဝေဝေဆာဆာပဒေသာ ကျပ် (၁) သိန်းဆု",
  "ဝေဝေဆာဆာပဒေသာ ကျပ် (၅) သောင်းဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ် (၁) သောင်းဆု",
];

const LEGACY_AMOUNT_TO_CATEGORY: Record<string, string> = {
  "5000": "ကျပ်သိန်း (၅၀၀၀) ဆု",
  "3000": "ကျပ်သိန်း (၃၀၀၀) ဆု",
  "2000": "ကျပ်သိန်း (၂၀၀၀) ဆု",
  "1000": "ကျပ်သိန်း (၁၀၀၀) ဆု",
  "500": "ကျပ်သိန်း (၅၀၀) ဆုများ",
  "300": "ကျပ်သိန်း (၃၀၀) ဆုများ",
  "200": "ကျပ်သိန်း (၂၀၀) ဆုများ",
  "100": "ကျပ်သိန်း (၁၀၀) ဆုများ",
  "50": "ကျပ်သိန်း (၅၀) ဆုများ",
  "20": "ကျပ်သိန်း (၂၀) ဆုများ",
};

function normalizeCategoryValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return LEGACY_AMOUNT_TO_CATEGORY[trimmed] ?? trimmed;
}

function normalizeSearchText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function matchesCategoryFilter(option: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const optionText = normalizeSearchText(option);
  const queryText = normalizeSearchText(q);
  if (optionText.includes(queryText)) return true;
  const qDigits = normalizeDigits(q);
  if (!qDigits) return false;
  return normalizeDigits(option).includes(qDigits);
}

type EntryTemplate = {
  matchLength: number;
  winners: string;
  note: string;
};

function winnerTextByMatchLength(matchLength: number): string {
  const perEntryWinners = Math.pow(10, Math.max(0, 6 - matchLength));
  return `${toMM(perEntryWinners)} ဦး`;
}

function inferEntryTemplate(categoryRaw: string): EntryTemplate | null {
  const category = normalizeCategoryValue(categoryRaw);
  if (!category) return null;

  const hasPadesa = category.includes("ဝေဝေဆာဆာပဒေသာ");
  const isReAward = category.includes("ပြန်လည်ချီးမြှင့်");
  const isSpecial = category.includes("အထူးဆုကြီး");
  const isSinglePrize = category.includes("ဆုတစ်ဆုခြင်း");

  if (hasPadesa) {
    let matchLength = 0;
    if (category.includes("(၃)") || category.includes("၃)")) matchLength = 5;
    else if (category.includes("(၂)") || category.includes("၂)")) matchLength = 4;
    else if (category.includes("(၁)") || category.includes("၁)")) {
      if (category.includes("သိန်း")) matchLength = 3;
      else if (category.includes("သောင်း")) matchLength = 1;
    } else if (category.includes("(၅)") || category.includes("၅)")) {
      if (category.includes("သောင်း")) matchLength = 2;
    }
    if (!matchLength) {
      const digits = normalizeDigits(category);
      if (digits === "3") matchLength = 5;
      else if (digits === "2") matchLength = 4;
      else if (digits === "1" && category.includes("သိန်း")) matchLength = 3;
      else if (digits === "5" && category.includes("သောင်း")) matchLength = 2;
      else if (digits === "1" && category.includes("သောင်း")) matchLength = 1;
    }
    if (!matchLength) matchLength = 3;

    return {
      matchLength,
      winners: winnerTextByMatchLength(matchLength),
      note: `အက္ခရာနှင့် ရှေ့ဂဏန်း(${toMM(matchLength)})လုံးအစဉ်လိုက်တူ`,
    };
  }

  if (isSpecial) {
    return {
      matchLength: 6,
      winners: "၁ ဦး",
      note: "အထူးဆုကြီး",
    };
  }

  if (isSinglePrize) {
    return {
      matchLength: 6,
      winners: "၁ ဦး",
      note: "ဆုတစ်ဆုခြင်း",
    };
  }

  if (isReAward || category.includes("ဘဏ္ဍာသိမ်း")) {
    return {
      matchLength: 6,
      winners: "၁ ဦး",
      note: "ပြန်လည်ချီးမြှင့်သောဆုမဲ",
    };
  }

  return {
    matchLength: 6,
    winners: "၁ ဦး",
    note: "",
  };
}

function cleanEntryDraft(entry: LotteryRuleEntry, index: number): LotteryRuleEntry | null {
  const prizeCategory = normalizeCategoryValue(String(entry.prizeCategory ?? ""));
  const alpha = String(entry.alpha ?? "").trim();
  const pattern = normalizeDigits(String(entry.pattern ?? "")).slice(0, 6);
  if (!prizeCategory || !alpha || !pattern) return null;
  const parsedLen = parseInt(String(entry.matchLength ?? ""), 10);
  const matchLength = Number.isFinite(parsedLen)
    ? Math.max(1, Math.min(6, parsedLen))
    : Math.max(1, Math.min(6, pattern.length));
  const rankRaw = String(entry.rank ?? "").trim();
  const parsedRank = parseInt(normalizeDigits(rankRaw), 10);
  const rank = Number.isFinite(parsedRank) ? parsedRank : index + 1;
  return {
    id: String(entry.id ?? "").trim() || `e${Date.now()}-${index}`,
    prizeCategory,
    alpha,
    pattern: pattern.slice(0, matchLength),
    matchLength,
    winners: String(entry.winners ?? "").trim(),
    note: String(entry.note ?? "").trim(),
    rank,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
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

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    results,
    refresh,
    adminUnlocked,
    setAdminUnlocked,
    pendingEditResultId,
    clearPendingEdit,
  } = useLottery();

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResult, setEditingResult] = useState<LotteryResult | null>(null);

  const [drawNumber, setDrawNumber] = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [prizes, setPrizes] = useState<PrizeEntry[]>([{ amount: "ကျပ်သိန်း (၃၀၀၀) ဆု", numbers: [""] }]);
  const [entries, setEntries] = useState<LotteryRuleEntry[]>([]);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [verifiedAt, setVerifiedAt] = useState("");
  const [openCategoryPickerIndex, setOpenCategoryPickerIndex] = useState<number | null>(null);
  const [prizeCategoryQuery, setPrizeCategoryQuery] = useState("");
  const [openPrizeAlphaPickerIndex, setOpenPrizeAlphaPickerIndex] = useState<number | null>(null);
  const [prizeAlphaQuery, setPrizeAlphaQuery] = useState("");
  const [prizeAlphaDrafts, setPrizeAlphaDrafts] = useState<string[]>([]);
  const [prizeNumberDrafts, setPrizeNumberDrafts] = useState<string[]>([]);
  const [showAdvancedEntries, setShowAdvancedEntries] = useState(false);
  const [openEntryCategoryPickerIndex, setOpenEntryCategoryPickerIndex] = useState<number | null>(null);
  const [entryCategoryQuery, setEntryCategoryQuery] = useState("");
  const [openAlphaPickerIndex, setOpenAlphaPickerIndex] = useState<number | null>(null);
  const [alphaQuery, setAlphaQuery] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>(PRIZE_CATEGORY_OPTIONS);
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState("");

  const topPadding = Platform.OS === "web" ? 26 : insets.top + 8;
  const contentWidth = Math.min(width - 24, 1120);

  const handlePinSubmit = () => {
    if (pin === ADMIN_PIN) {
      setAdminUnlocked(true);
      setPinError(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setPinError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPin("");
    }
  };

  const openAdd = () => {
    setDrawNumber("");
    setDrawDate(new Date().toISOString().slice(0, 10));
    setPrizes([{ amount: "ကျပ်သိန်း (၃၀၀၀) ဆု", numbers: [""] }]);
    setEntries([]);
    setSourceName("");
    setSourceUrl("");
    setVerifiedAt("");
    setOpenCategoryPickerIndex(null);
    setOpenPrizeAlphaPickerIndex(null);
    setOpenEntryCategoryPickerIndex(null);
    setOpenAlphaPickerIndex(null);
    setPrizeCategoryQuery("");
    setPrizeAlphaQuery("");
    setPrizeAlphaDrafts(["က"]);
    setPrizeNumberDrafts([""]);
    setEntryCategoryQuery("");
    setAlphaQuery("");
    setSaveInfo("");
    setShowAdvancedEntries(false);
    setEditingResult(null);
    setShowAddModal(true);
  };

  const openEdit = (r: LotteryResult) => {
    setDrawNumber(String(r.drawNumber));
    setDrawDate(r.drawDate);
    setPrizes(
      r.prizes.map((p) => ({
        ...p,
        amount: normalizeCategoryValue(String(p.amount ?? "")),
        numbers: [...p.numbers],
      })),
    );
    setEntries(
      (r.entries ?? []).map((e, i) => ({
        id: e.id || `e${i + 1}`,
        prizeCategory: normalizeCategoryValue(String(e.prizeCategory ?? "")),
        alpha: String(e.alpha ?? ""),
        pattern: String(e.pattern ?? ""),
        matchLength: Number(e.matchLength ?? 0) || 1,
        winners: String(e.winners ?? ""),
        note: String(e.note ?? ""),
        rank: Number(e.rank ?? i + 1),
      })),
    );
    setSourceName(String(r.sourceName ?? ""));
    setSourceUrl(String(r.sourceUrl ?? ""));
    setVerifiedAt(
      r.verifiedAt ? new Date(r.verifiedAt).toISOString().slice(0, 16) : "",
    );
    setOpenCategoryPickerIndex(null);
    setOpenPrizeAlphaPickerIndex(null);
    setOpenEntryCategoryPickerIndex(null);
    setOpenAlphaPickerIndex(null);
    setPrizeCategoryQuery("");
    setPrizeAlphaQuery("");
    setPrizeAlphaDrafts(r.prizes.map(() => "က"));
    setPrizeNumberDrafts(r.prizes.map(() => ""));
    setEntryCategoryQuery("");
    setAlphaQuery("");
    setSaveInfo("");
    setShowAdvancedEntries((r.entries ?? []).length > 0);
    setEditingResult(r);
    setShowAddModal(true);
  };

  const addPrizeRow = () => {
    setPrizes((prev) => [...prev, { amount: "ကျပ်သိန်း (၁၀၀) ဆုများ", numbers: [""] }]);
    setPrizeAlphaDrafts((prev) => [...prev, "က"]);
    setPrizeNumberDrafts((prev) => [...prev, ""]);
  };

  const removePrizeRow = (idx: number) => {
    setPrizes((prev) => prev.filter((_, i) => i !== idx));
    setPrizeAlphaDrafts((prev) => prev.filter((_, i) => i !== idx));
    setPrizeNumberDrafts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePrizeAmount = (idx: number, amount: string) => {
    setPrizes((prev) => prev.map((p, i) => (i === idx ? { ...p, amount } : p)));
  };

  const updatePrizeNumbers = (idx: number, numbersStr: string) => {
    setPrizes((prev) => prev.map((p, i) => (i === idx ? { ...p, numbers: numbersStr ? numbersStr.split(",").map(n => n.trim()) : [""] } : p)));
  };

  const updatePrizeAlphaDraft = (idx: number, alpha: string) => {
    setPrizeAlphaDrafts((prev) => prev.map((v, i) => (i === idx ? alpha : v)));
  };

  const updatePrizeNumberDraft = (idx: number, pattern: string) => {
    setPrizeNumberDrafts((prev) => prev.map((v, i) => (i === idx ? normalizeDigits(pattern).slice(0, 6) : v)));
  };

  const appendPrizeTicket = (idx: number) => {
    const alpha = String(prizeAlphaDrafts[idx] ?? "").trim();
    const pattern = normalizeDigits(String(prizeNumberDrafts[idx] ?? ""));
    if (!alpha || !pattern) return;
    const ticket = `${alpha}-${pattern}`;
    setPrizes((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const existing = p.numbers.filter((n) => n.trim().length > 0);
        if (existing.includes(ticket)) return p;
        return { ...p, numbers: [...existing, ticket] };
      }),
    );
    updatePrizeNumberDraft(idx, "");
  };

  const addCategoryOption = (rawValue: string) => {
    const value = normalizeCategoryValue(rawValue);
    if (!value) return;
    setCategoryOptions((prev) => (prev.includes(value) ? prev : [...prev, value]));
  };

  const filteredPrizeCategories = useMemo(
    () => categoryOptions.filter((option) => matchesCategoryFilter(option, prizeCategoryQuery)),
    [categoryOptions, prizeCategoryQuery],
  );

  const filteredEntryCategories = useMemo(
    () => categoryOptions.filter((option) => matchesCategoryFilter(option, entryCategoryQuery)),
    [categoryOptions, entryCategoryQuery],
  );

  const filteredPrizeAlphaOptions = useMemo(() => {
    const q = prizeAlphaQuery.trim();
    const base = [...ALPHA_BASE_OPTIONS];
    if (!q) return base;
    return base.filter((opt) => opt.includes(q));
  }, [prizeAlphaQuery]);

  const alphaOptionsByCategory = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const add = (categoryRaw: string, alphaRaw: string) => {
      const category = normalizeCategoryValue(String(categoryRaw ?? ""));
      const alpha = String(alphaRaw ?? "").trim();
      if (!category || !alpha) return;
      if (!map.has(category)) map.set(category, new Set<string>());
      map.get(category)!.add(alpha);
    };
    results.forEach((r) => (r.entries ?? []).forEach((e) => add(e.prizeCategory, e.alpha)));
    entries.forEach((e) => add(e.prizeCategory, e.alpha));
    return map;
  }, [results, entries]);

  const filteredAlphaOptions = useMemo(() => {
    if (openAlphaPickerIndex === null) return [];
    const currentCategory = normalizeCategoryValue(entries[openAlphaPickerIndex]?.prizeCategory ?? "");
    const base = new Set(ALPHA_BASE_OPTIONS);
    const categorySpecific = alphaOptionsByCategory.get(currentCategory);
    categorySpecific?.forEach((a) => base.add(a));
    const options = Array.from(base).sort();
    const q = alphaQuery.trim();
    if (!q) return options;
    return options.filter((opt) => opt.includes(q));
  }, [openAlphaPickerIndex, entries, alphaOptionsByCategory, alphaQuery]);

  const addEntryRow = () => {
    const nextRank = entries.length + 1;
    setEntries((prev) => [
      ...prev,
      {
        id: `e${Date.now()}-${nextRank}`,
        prizeCategory: "ကျပ်သိန်း (၃၀၀၀) ဆု",
        alpha: MYANMAR_ALPHABETS[0],
        pattern: "",
        matchLength: 6,
        winners: "",
        note: "",
        rank: nextRank,
      },
    ]);
  };

  const removeEntryRow = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateEntry = <K extends keyof LotteryRuleEntry>(idx: number, key: K, value: LotteryRuleEntry[K]) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)));
  };

  const applyTemplateToEntry = (idx: number, categoryRaw: string, force = false) => {
    const template = inferEntryTemplate(categoryRaw);
    if (!template) return;
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== idx) return e;
        const next = { ...e, prizeCategory: normalizeCategoryValue(categoryRaw) };
        if (force || !e.matchLength || e.matchLength <= 0) next.matchLength = template.matchLength;
        if (force || !String(e.winners ?? "").trim()) next.winners = template.winners;
        if (force || !String(e.note ?? "").trim()) next.note = template.note;
        return next;
      }),
    );
  };

  const handleSave = async () => {
    const drawNum = parseInt(drawNumber, 10);
    if (isNaN(drawNum) || drawNum <= 0) {
      Alert.alert("အမှား", "ထီပွဲနံပါတ် မှန်ကန်စွာ ထည့်ပါ");
      return;
    }
    if (!drawDate) {
      Alert.alert("အမှား", "ရက်စွဲ ထည့်ပါ");
      return;
    }
    setSaving(true);
    setSaveInfo("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const cleanPrizes: PrizeEntry[] = prizes.map((p) => ({
        amount: normalizeCategoryValue(String(p.amount ?? "")),
        numbers: p.numbers.filter((n) => n.trim().length > 0),
      })).filter((p) => p.amount && p.numbers.length > 0);

      const cleanEntries = entries
        .map((e, idx) => cleanEntryDraft(e, idx))
        .filter((e): e is LotteryRuleEntry => !!e);

      if (cleanPrizes.length === 0) {
        Alert.alert("အမှား", "ဆုအမျိုးအစားနှင့် နံပါတ်များ အနည်းဆုံး ၁ ခု ထည့်ပါ");
        return;
      }

      let verifiedAtIso: string | undefined = undefined;
      if (verifiedAt.trim()) {
        const parsedVerifiedAt = new Date(verifiedAt);
        if (Number.isNaN(parsedVerifiedAt.getTime())) {
          Alert.alert("အမှား", "Verified At format မှန်ကန်စွာ ထည့်ပါ");
          return;
        }
        verifiedAtIso = parsedVerifiedAt.toISOString();
      }

      const payload: Omit<LotteryResult, "id" | "createdAt" | "updatedAt"> = {
        drawNumber: drawNum,
        drawDate,
        prizes: cleanPrizes,
        entries: cleanEntries,
      };
      if (sourceName.trim()) payload.sourceName = sourceName.trim();
      if (sourceUrl.trim()) payload.sourceUrl = sourceUrl.trim();
      if (verifiedAtIso) payload.verifiedAt = verifiedAtIso;

      // Always save local override so Result page updates immediately on this browser.
      saveLocalOverride(payload);

      let remoteError = "";
      try {
        if (editingResult?.id && !editingResult.id.startsWith("local-")) {
          await withTimeout(
            updateResult(editingResult.id, payload),
            20000,
            "သိမ်းဆည်းချိန် များနေပါသည်။ နောက်တစ်ကြိမ် ထပ်စမ်းပါ။",
          );
        } else {
          await withTimeout(
            upsertResultByDrawNumber(payload),
            20000,
            "သိမ်းဆည်းချိန် များနေပါသည်။ နောက်တစ်ကြိမ် ထပ်စမ်းပါ။",
          );
        }
      } catch (err: any) {
        remoteError = err?.message ?? "remote save failed";
        console.warn("Remote save failed, local override saved:", remoteError);
      }

      setShowAddModal(false);
      setSaving(false);
      setSaveInfo(
        remoteError
          ? "Local တွင် သိမ်းပြီးပါပြီ။ Firebase sync မပြီးသေးပါ။"
          : "သိမ်းဆည်းပြီးပါပြီ",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Do not block UI closing on refresh; keep it in background with timeout.
      withTimeout(refresh(), 15000, "refresh timeout")
        .catch((err) => {
          console.warn("Background refresh failed:", err?.message ?? err);
        });
      return;
    } catch (e: any) {
      const message = e?.message ?? "သိမ်းဆည်း၍မရပါ";
      setSaveInfo(message);
      Alert.alert("မအောင်မြင်ပါ", message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (r: LotteryResult) => {
    Alert.alert(
      "ဖျက်မည်",
      `${r.drawNumber} ကြိမ်မြောက် ထီ ဒေတာ ဖျက်မည်လား?`,
      [
        { text: "မဖျက်ပါ", style: "cancel" },
        {
          text: "ဖျက်မည်",
          style: "destructive",
          onPress: async () => {
            if (!r.id) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await deleteResult(r.id);
            removeLocalOverride(r.drawNumber);
            await refresh();
          },
        },
      ]
    );
  };

  useEffect(() => {
    const fromResults = results.flatMap((r) => [
      ...r.prizes.map((p) => normalizeCategoryValue(String(p.amount ?? ""))),
      ...(r.entries ?? []).map((e) => normalizeCategoryValue(String(e.prizeCategory ?? ""))),
    ]);
    const fromDraft = [
      ...prizes.map((p) => normalizeCategoryValue(String(p.amount ?? ""))),
      ...entries.map((e) => normalizeCategoryValue(String(e.prizeCategory ?? ""))),
    ];
    const merged = Array.from(
      new Set([...PRIZE_CATEGORY_OPTIONS, ...fromResults, ...fromDraft].filter(Boolean)),
    );
    setCategoryOptions(merged);
  }, [results, prizes, entries]);

  useEffect(() => {
    if (!adminUnlocked || !pendingEditResultId) return;
    const target = results.find((r) => r.id === pendingEditResultId);
    if (target) openEdit(target);
    clearPendingEdit();
  }, [adminUnlocked, pendingEditResultId, results, clearPendingEdit]);

  if (!adminUnlocked) {
    return (
      <View style={[styles.lockScreen, { backgroundColor: colors.background, paddingTop: topPadding }]}>
        <View style={[styles.lockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.lockIcon, { backgroundColor: colors.muted }]}>
            <Feather name="lock" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.lockTitle, { color: colors.foreground }]}>အက်မင် လော့ဂ်အင်</Text>
          <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>PIN နံပါတ် ထည့်ပါ</Text>
          <TextInput
            style={[
              styles.pinInput,
              {
                backgroundColor: colors.background,
                borderColor: pinError ? colors.destructive : colors.border,
                color: colors.foreground,
                fontFamily: "Inter_600SemiBold",
              },
            ]}
            value={pin}
            onChangeText={(t) => { setPin(t.replace(/[^0-9]/g, "").slice(0, 6)); setPinError(false); }}
            placeholder="••••"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handlePinSubmit}
          />
          {pinError && (
            <Text style={[styles.pinError, { color: colors.destructive }]}>PIN မှားသည်</Text>
          )}
          <TouchableOpacity
            style={[styles.pinBtn, { backgroundColor: colors.primary }]}
            onPress={handlePinSubmit}
            activeOpacity={0.8}
          >
            <Text style={[styles.pinBtnText, { color: colors.primaryForeground }]}>ဝင်ရောက်မည်</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.page, { width: contentWidth }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>အက်မင် ပန်နယ်</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Admin Panel</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setAdminUnlocked(false)}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            activeOpacity={0.7}
          >
            <Feather name="lock" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openAdd}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
            <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>ထည့်မည်</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {results.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="database" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>ဒေတာ မရှိသေးပါ</Text>
          </View>
        ) : (
          results.map((r) => (
            <View key={r.id} style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.resultCardHeader}>
                <View>
                  <Text style={[styles.resultDrawNum, { color: colors.foreground }]}>
                    {r.drawNumber} ကြိမ်မြောက်
                  </Text>
                  <Text style={[styles.resultDate, { color: colors.mutedForeground }]}>{r.drawDate}</Text>
                </View>
                <View style={styles.resultActions}>
                  <TouchableOpacity
                    onPress={() => openEdit(r)}
                    style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(r)}
                    style={[styles.actionBtn, { backgroundColor: "#FDECEA" }]}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.prizeSummary}>
                {r.prizes.slice(0, 3).map((p, i) => (
                  <View key={i} style={styles.prizeRow}>
                    <PrizeBadge amount={p.amount} compact />
                    <Text style={[styles.prizeNums, { color: colors.mutedForeground }]}>
                      {p.numbers.slice(0, 2).join(", ")}{p.numbers.length > 2 ? ` +${p.numbers.length - 2}` : ""}
                    </Text>
                  </View>
                ))}
                {r.prizes.length > 3 && (
                  <Text style={[styles.morePrizes, { color: colors.mutedForeground }]}>
                    + {r.prizes.length - 3} ဆုတန်းများ
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
      </View>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingResult ? "ပြင်ဆင်မည်" : "ထီ ဒေတာ ထည့်မည်"}
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)} activeOpacity={0.7}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ထီပွဲနံပါတ်</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={drawNumber}
              onChangeText={setDrawNumber}
              placeholder="86"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ရက်စွဲ</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={drawDate}
              onChangeText={setDrawDate}
              placeholder="2026-05-01"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Source Name</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={sourceName}
              onChangeText={setSourceName}
              placeholder="Pools Myanmar Lottery"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Source URL</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={sourceUrl}
              onChangeText={setSourceUrl}
              placeholder="https://example.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Verified At (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={verifiedAt}
              onChangeText={setVerifiedAt}
              placeholder="2026-05-18T10:30"
              placeholderTextColor={colors.mutedForeground}
            />

            <View style={styles.prizesHeader}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 0 }]}>ဆုနံပါတ်များ</Text>
              <TouchableOpacity onPress={addPrizeRow} activeOpacity={0.7}>
                <Feather name="plus-circle" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
              Result page ပေါ်မှာပြမည့် ဆုနံပါတ်များကို ဒီအပိုင်းမှာထည့်ပါ။ အက္ခရာ + နံပါတ် ကို builder နဲ့ထည့်နိုင်ပါတယ်။
            </Text>

            {prizes.map((prize, idx) => (
              <View key={idx} style={[styles.prizeInputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.prizeInputHeader}>
                  <Text style={[styles.subFieldLabel, { color: colors.mutedForeground }]}>ဆုကြေး အမျိုးအစား</Text>
                  {prizes.length > 1 && (
                    <TouchableOpacity onPress={() => removePrizeRow(idx)} activeOpacity={0.7}>
                      <Feather name="trash-2" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.inlineRow}>
                  <TextInput
                    style={[styles.fieldInput, styles.inlineGrow, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                    value={prize.amount}
                    onFocus={() => {
                      setOpenCategoryPickerIndex(idx);
                      setPrizeCategoryQuery("");
                    }}
                    onChangeText={(t) => {
                      updatePrizeAmount(idx, t);
                      setPrizeCategoryQuery(t);
                      setOpenCategoryPickerIndex(idx);
                    }}
                    placeholder="ဥပမာ - ကျပ်သိန်း (၅၀၀၀) ဆု"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="default"
                  />
                  <TouchableOpacity
                    style={[styles.listBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    onPress={() => {
                      setOpenCategoryPickerIndex((prev) => (prev === idx ? null : idx));
                      setPrizeCategoryQuery("");
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="list" size={14} color={colors.foreground} />
                    <Text style={[styles.listBtnText, { color: colors.foreground }]}>စာရင်း</Text>
                  </TouchableOpacity>
                </View>
                {openCategoryPickerIndex === idx && (
                  <View style={[styles.dropdownPanel, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                      {filteredPrizeCategories.map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            updatePrizeAmount(idx, option);
                            setPrizeCategoryQuery(option);
                            setOpenCategoryPickerIndex(null);
                          }}
                          style={styles.dropdownItem}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {!!prizeCategoryQuery.trim() &&
                      !categoryOptions.includes(normalizeCategoryValue(prizeCategoryQuery)) && (
                        <TouchableOpacity
                          onPress={() => {
                            const newValue = normalizeCategoryValue(prizeCategoryQuery);
                            addCategoryOption(newValue);
                            updatePrizeAmount(idx, newValue);
                            setOpenCategoryPickerIndex(null);
                          }}
                          style={[styles.dropdownAddBtn, { borderTopColor: colors.border }]}
                          activeOpacity={0.8}
                        >
                          <Feather name="plus" size={14} color={colors.primary} />
                          <Text style={[styles.dropdownAddText, { color: colors.primary }]}>
                            Add New: {normalizeCategoryValue(prizeCategoryQuery)}
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                )}
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>အက္ခရာ + နံပါတ် ထည့်ရန်</Text>
                <View style={styles.row3}>
                  <View style={styles.rowInput}>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={prizeAlphaDrafts[idx] ?? ""}
                      onFocus={() => {
                        setOpenPrizeAlphaPickerIndex(idx);
                        setPrizeAlphaQuery("");
                      }}
                      onChangeText={(t) => {
                        const v = t.trim();
                        updatePrizeAlphaDraft(idx, v);
                        setPrizeAlphaQuery(v);
                        setOpenPrizeAlphaPickerIndex(idx);
                      }}
                      placeholder="အက္ခရာ"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    {openPrizeAlphaPickerIndex === idx && (
                      <View style={[styles.dropdownPanel, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                          {filteredPrizeAlphaOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              onPress={() => {
                                updatePrizeAlphaDraft(idx, option);
                                setPrizeAlphaQuery(option);
                                setOpenPrizeAlphaPickerIndex(null);
                              }}
                              style={styles.dropdownItem}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{option}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        {!!prizeAlphaQuery.trim() &&
                          !filteredPrizeAlphaOptions.includes(prizeAlphaQuery.trim()) && (
                            <TouchableOpacity
                              onPress={() => {
                                const next = prizeAlphaQuery.trim();
                                updatePrizeAlphaDraft(idx, next);
                                setOpenPrizeAlphaPickerIndex(null);
                              }}
                              style={[styles.dropdownAddBtn, { borderTopColor: colors.border }]}
                              activeOpacity={0.8}
                            >
                              <Feather name="plus" size={14} color={colors.primary} />
                              <Text style={[styles.dropdownAddText, { color: colors.primary }]}>Add New: {prizeAlphaQuery.trim()}</Text>
                            </TouchableOpacity>
                          )}
                      </View>
                    )}
                  </View>
                  <View style={styles.rowInput}>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={prizeNumberDrafts[idx] ?? ""}
                      onChangeText={(t) => updatePrizeNumberDraft(idx, t)}
                      placeholder="နံပါတ် (digits)"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.addTicketBtn, { backgroundColor: colors.primary }]}
                    onPress={() => appendPrizeTicket(idx)}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={16} color={colors.primaryForeground} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>ထည့်ပြီးသော စာရင်း</Text>
                <TextInput
                  style={[styles.fieldInput, styles.multilineInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                  value={prize.numbers.join(", ")}
                  onChangeText={(t) => updatePrizeNumbers(idx, t)}
                  placeholder="ဥပမာ - က-757767, ခ-123456 (ကော်မာနှင့် ခွဲပါ)"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="default"
                  multiline
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.advancedToggle, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => setShowAdvancedEntries((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={[styles.advancedToggleText, { color: colors.foreground }]}>
                Advanced: Entries / Note / Winners / Rank {showAdvancedEntries ? "ဖျောက်မည်" : "ဖွင့်မည်"}
              </Text>
              <Feather
                name={showAdvancedEntries ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>

            {showAdvancedEntries && (
              <>
                <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
                  Search logic / Winner count / Rule note အတွက်အသုံးပြုသော advanced data ဖြစ်သည်။ Category ရွေးပြီး `Template` ကိုနှိပ်လျှင် Match Length / Winners / Note ကို auto-fill ပေးသည်။
                </Text>
                <View style={styles.prizesHeader}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 0 }]}>
                    Entries / Note / Winners / Rank
                  </Text>
                  <TouchableOpacity onPress={addEntryRow} activeOpacity={0.7}>
                    <Feather name="plus-circle" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {entries.map((entry, idx) => (
              <View key={entry.id || `entry-${idx}`} style={[styles.prizeInputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.prizeInputHeader}>
                  <Text style={[styles.subFieldLabel, { color: colors.mutedForeground }]}>Entry #{idx + 1}</Text>
                  <View style={styles.entryActionRow}>
                    <TouchableOpacity
                      onPress={() => applyTemplateToEntry(idx, entry.prizeCategory, true)}
                      style={[styles.templateBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                      activeOpacity={0.8}
                    >
                      <Feather name="zap" size={13} color={colors.foreground} />
                      <Text style={[styles.templateBtnText, { color: colors.foreground }]}>Template</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeEntryRow(idx)} activeOpacity={0.7}>
                      <Feather name="trash-2" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>ဆုအမျိုးအစား (Category)</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                  value={entry.prizeCategory}
                  onFocus={() => {
                    setOpenEntryCategoryPickerIndex(idx);
                    setEntryCategoryQuery("");
                  }}
                  onChangeText={(t) => {
                    applyTemplateToEntry(idx, t, false);
                    setEntryCategoryQuery(t);
                    setOpenEntryCategoryPickerIndex(idx);
                  }}
                  placeholder="Entry ဆုအမျိုးအစား"
                  placeholderTextColor={colors.mutedForeground}
                />
                {openEntryCategoryPickerIndex === idx && (
                  <View style={[styles.dropdownPanel, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                      {filteredEntryCategories.map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            applyTemplateToEntry(idx, option, false);
                            setEntryCategoryQuery(option);
                            setOpenEntryCategoryPickerIndex(null);
                          }}
                          style={styles.dropdownItem}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {!!entryCategoryQuery.trim() &&
                      !categoryOptions.includes(normalizeCategoryValue(entryCategoryQuery)) && (
                        <TouchableOpacity
                          onPress={() => {
                            const newValue = normalizeCategoryValue(entryCategoryQuery);
                            addCategoryOption(newValue);
                            applyTemplateToEntry(idx, newValue, false);
                            setOpenEntryCategoryPickerIndex(null);
                          }}
                          style={[styles.dropdownAddBtn, { borderTopColor: colors.border }]}
                          activeOpacity={0.8}
                        >
                          <Feather name="plus" size={14} color={colors.primary} />
                          <Text style={[styles.dropdownAddText, { color: colors.primary }]}>
                            Add New: {normalizeCategoryValue(entryCategoryQuery)}
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                )}

                <View style={styles.row2}>
                  <View style={styles.rowInput}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>အက္ခရာ (Alpha)</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={entry.alpha}
                      onFocus={() => {
                        setOpenAlphaPickerIndex(idx);
                        setAlphaQuery("");
                      }}
                      onChangeText={(t) => {
                        const value = t.trim();
                        updateEntry(idx, "alpha", value);
                        setAlphaQuery(value);
                        setOpenAlphaPickerIndex(idx);
                      }}
                      placeholder="အက္ခရာ"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    {openAlphaPickerIndex === idx && (
                      <View style={[styles.dropdownPanel, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                          {filteredAlphaOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              onPress={() => {
                                updateEntry(idx, "alpha", option);
                                setAlphaQuery(option);
                                setOpenAlphaPickerIndex(null);
                              }}
                              style={styles.dropdownItem}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{option}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        {!!alphaQuery.trim() &&
                          !filteredAlphaOptions.includes(alphaQuery.trim()) && (
                            <TouchableOpacity
                              onPress={() => {
                                const next = alphaQuery.trim();
                                updateEntry(idx, "alpha", next);
                                setOpenAlphaPickerIndex(null);
                              }}
                              style={[styles.dropdownAddBtn, { borderTopColor: colors.border }]}
                              activeOpacity={0.8}
                            >
                              <Feather name="plus" size={14} color={colors.primary} />
                              <Text style={[styles.dropdownAddText, { color: colors.primary }]}>Add New: {alphaQuery.trim()}</Text>
                            </TouchableOpacity>
                          )}
                      </View>
                    )}
                  </View>

                  <View style={styles.rowInput}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>နံပါတ် Pattern</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={entry.pattern}
                      onChangeText={(t) => updateEntry(idx, "pattern", normalizeDigits(t).slice(0, 6))}
                      placeholder="Pattern (digits)"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.row3}>
                  <View style={styles.rowInput}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Match Length</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={String(entry.matchLength ?? "")}
                      onChangeText={(t) => updateEntry(idx, "matchLength", Number(normalizeDigits(t) || "0"))}
                      placeholder="MatchLen"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.rowInput}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Rank</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={String(entry.rank ?? "")}
                      onChangeText={(t) => updateEntry(idx, "rank", Number(normalizeDigits(t) || "0"))}
                      placeholder="Rank"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.rowInput}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>ကံထူးရှင်အရေအတွက်</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={entry.winners ?? ""}
                      onChangeText={(t) => updateEntry(idx, "winners", t)}
                      placeholder="ကံထူးရှင်အရေအတွက်"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                </View>

                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>မှတ်ချက် (Note / Rule)</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    styles.multilineInput,
                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 },
                  ]}
                  value={entry.note ?? ""}
                  onChangeText={(t) => updateEntry(idx, "note", t)}
                  placeholder="မှတ်ချက် / rule note"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  textAlignVertical="top"
                />
              </View>
                ))}
              </>
            )}

            {!!saveInfo && (
              <Text style={[styles.saveInfo, { color: colors.mutedForeground }]}>
                {saveInfo}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Feather name="save" size={18} color={saving ? colors.mutedForeground : colors.primaryForeground} />
              <Text style={[styles.saveBtnText, { color: saving ? colors.mutedForeground : colors.primaryForeground }]}>
                {saving ? "သိမ်းနေသည်..." : "သိမ်းမည်"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { alignSelf: "center", flex: 1, paddingHorizontal: 12 },
  lockScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  lockCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    gap: 10,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  lockTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  lockSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  pinInput: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    marginTop: 8,
  },
  pinError: { fontSize: 13, fontFamily: "Inter_400Regular" },
  pinBtn: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  pinBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  resultCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  resultCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  resultDrawNum: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  resultDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  resultActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  prizeSummary: { marginTop: 10, gap: 6 },
  prizeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  prizeNums: { fontSize: 13, fontFamily: "Inter_400Regular" },
  morePrizes: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalScroll: { padding: 20, gap: 8 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 12 },
  helpText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
  inlineRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  inlineGrow: { flex: 1 },
  listBtn: {
    marginTop: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  listBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  addTicketBtn: {
    marginTop: 8,
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  advancedToggle: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  advancedToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fieldInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  multilineInput: {
    minHeight: 86,
    height: 86,
    paddingTop: 10,
    paddingBottom: 10,
  },
  prizesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  prizeInputCard: { borderRadius: 12, padding: 12, borderWidth: 1, marginTop: 8 },
  prizeInputHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  entryActionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  templateBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  templateBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  subFieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 8 },
  dropdownPanel: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownItemText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  dropdownAddBtn: {
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dropdownAddText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  row2: { flexDirection: "row", gap: 8 },
  row3: { flexDirection: "row", gap: 8 },
  rowInput: { flex: 1 },
  amtChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  amtChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  saveInfo: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 10 },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
