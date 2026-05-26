import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Modal,
  Pressable,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { useLottery } from "@/context/LotteryContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { LotteryRuleEntry, MYANMAR_ALPHABETS } from "@/types/lottery";
import DrawSelector from "@/components/DrawSelector";
import LanguageToggle from "@/components/LanguageToggle";
import AppAdBanner from "@/components/AppAdBanner";
import { normalizeDigits, toMM } from "@/utils/myanmar";
import { isResultPublished } from "@/services/lotteryService";
import { useAuth } from "@/context/AuthContext";
import UserBadge from "@/components/UserBadge";
import { useRouter } from "expo-router";

type Ticket = {
  id: string;
  alpha: string;
  number: string;
};

type TicketResult = {
  ticket: Ticket;
  matches: LotteryRuleEntry[];
  matchAmounts: number[];
  totalKyat: number;
};

type EntryTab = "single" | "sameAlphaSeq" | "sameNumberSeq";
type AlphaField = "single" | "sameAlpha" | "alphaStart" | "alphaEnd";

const EMOJI_IDLE = "🎟️";
const EMOJI_CHECKING = ["🔍", "🎯", "⏳", "🎰"];
const EMOJI_WIN = "🎉";
const EMOJI_LOSE = "🙂";

function parseMmInt(value?: string | null): number {
  if (!value) return 0;
  const d = normalizeDigits(value);
  if (!d) return 0;
  const n = Number(d);
  return Number.isFinite(n) ? n : 0;
}

function parseAwardKyat(categoryRaw: string, noteRaw?: string): number {
  const category = categoryRaw || "";
  const note = noteRaw || "";
  const full = `${category} ${note}`;
  const bracketMatches = Array.from(full.matchAll(/\(([^)]*)\)/g));
  const amountFromBrackets = bracketMatches
    .map((m) => parseMmInt(m[1]))
    .find((n) => n > 0) ?? 0;

  const inlineMatch = full.match(/[0-9၀-၉][0-9၀-၉,\s.]*/);
  const amountFromInline = inlineMatch ? parseMmInt(inlineMatch[0]) : 0;

  const amount = amountFromBrackets || amountFromInline;
  if (!amount) return 0;
  if (full.includes("သိန်း")) return amount * 100000;
  if (full.includes("သောင်း")) return amount * 10000;
  return amount;
}

function formatKyatMM(value: number): string {
  return toMM(value.toLocaleString("en-US"));
}

function ticketLabel(t: Ticket): string {
  return `${t.alpha}-${toMM(normalizeDigits(t.number))}`;
}

function sortMatches(a: LotteryRuleEntry, b: LotteryRuleEntry) {
  if (b.matchLength !== a.matchLength) return b.matchLength - a.matchLength;
  return (a.rank ?? 0) - (b.rank ?? 0);
}

function clampAlpha(value: string): string {
  return value.trim().slice(0, 1);
}

function normalizeAlpha(value: string): string {
  return value.normalize("NFKC").trim().slice(0, 1);
}

function normalizeCategoryKey(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[()（）]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { results, selectedDraw, setSelectedDraw } = useLottery();
  const { language, setLanguage } = useAppLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isMobile = width < 980;
  const publishedResults = useMemo(
    () => results.filter((r) => isResultPublished(r)),
    [results],
  );

  const [singleAlpha, setSingleAlpha] = useState("က");
  const [singleNumber, setSingleNumber] = useState("");

  const [sameAlpha, setSameAlpha] = useState("က");
  const [prefixDigits, setPrefixDigits] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const [alphaStart, setAlphaStart] = useState("က");
  const [alphaEnd, setAlphaEnd] = useState("ဃ");
  const [sameNumberForAlphaRange, setSameNumberForAlphaRange] = useState("");
  const [openAlphaMenu, setOpenAlphaMenu] = useState<AlphaField | null>(null);
  const [entryTab, setEntryTab] = useState<EntryTab>("single");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState(0);
  const [lastResults, setLastResults] = useState<TicketResult[] | null>(null);
  const [showOutcomePopup, setShowOutcomePopup] = useState(false);
  const [lastCheckWon, setLastCheckWon] = useState(false);

  const currentResult =
    publishedResults.find((r) => r.drawNumber === selectedDraw) ??
    publishedResults[0] ??
    null;

  const isDesktop = width >= 980;
  const contentWidth = Math.min(width - 24, 1120);
  const topPadding = Platform.OS === "web" ? 26 : insets.top + 8;

  const text = useMemo(
    () => ({
      mm: {
        screenTitle: "ထီ စစ်ဆေးရန်",
        screenSubtitle: "Batch Lottery Checker",
        mmBtn: "မြန်မာ",
        enBtn: "English",
        drawSelect: "ထီပေါက်စဉ်ရွေးချယ်",
        tabSingle: "တစ်စောင်ချင်းထည့်ရန်",
        tabSameAlpha: "အက္ခရာတူ နံပါတ်အစဉ်လိုက်",
        tabSameNumber: "နံပါတ်တူ အက္ခရာအစဉ်လိုက်",
        stepSingle: "၁) တစ်စောင်ချင်းထည့်ရန်",
        stepSameAlpha: "၂) အက္ခရာတူ နံပါတ်အစဉ်လိုက် (ဥပမာ က-123451 မှ က-123460)",
        stepSameNumber: "၃) နံပါတ်တူ အက္ခရာအစဉ်လိုက် (ဥပမာ က-123451 မှ ဃ-123451)",
        prefixPlaceholder: "ရှေ့ဂဏန်း (ဥပမာ 1234)",
        startPlaceholder: "အစ",
        endPlaceholder: "ဆုံး",
        numberPlaceholder: "နံပါတ် (ဥပမာ 123451)",
        ticketList: "ထီတိုက်မည့် လက်မှတ်စာရင်း",
        clear: "ရှင်းမည်",
        noTickets: "ထီလက်မှတ် မထည့်ရသေးပါ",
        runCheck: "ထီတိုက်စစ်မည်",
        resultTitle: "စစ်ဆေးမှု ရလဒ်",
        addTicketsHint: "ထည့်ထားသော လက်မှတ်များကို စစ်ဆေးပါ",
        won: "ပေါက်လက်မှတ်",
        lost: "မပေါက်လက်မှတ်",
        totalPrize: "စုစုပေါင်း ဆုကြေး",
        noWin: "ယခုထည့်ထားသော လက်မှတ်များ မပေါက်ပါ",
        ticketTotal: "လက်မှတ်စုစုပေါင်း",
        digitUnit: "လုံး",
        kyat: "ကျပ်",
        popupCongrats: "MKS ကဂုဏ်ယူပါတယ်။",
        popupTryAgain: "ထပ်မံကံစမ်းကြည့်ပါ။",
        popupBlessing: "ထပ်မံကံစမ်းကြည့်ပါ။ သိန်းဆုကြီးများပေါက်ပါစေ။",
        popupWinningListTitle: "ထီပေါက်လက်မှတ်များ",
        popupTotalLabel: "လက်မှတ်စုစုပေါင်းဆုကြေးငွေ",
        popupClose: "ကောင်းပြီ",
      },
      en: {
        screenTitle: "Lottery Checker",
        screenSubtitle: "Batch Lottery Checker",
        mmBtn: "Myanmar",
        enBtn: "English",
        drawSelect: "Select Draw",
        tabSingle: "Add Single",
        tabSameAlpha: "Same Letter Sequence",
        tabSameNumber: "Same Number Letter Sequence",
        stepSingle: "1) Add single ticket",
        stepSameAlpha: "2) Same letter number sequence (e.g. က-123451 to က-123460)",
        stepSameNumber: "3) Same number letter sequence (e.g. က-123451 to ဃ-123451)",
        prefixPlaceholder: "Prefix digits (e.g. 1234)",
        startPlaceholder: "Start",
        endPlaceholder: "End",
        numberPlaceholder: "Number (e.g. 123451)",
        ticketList: "Ticket List",
        clear: "Clear",
        noTickets: "No tickets added yet",
        runCheck: "Check Tickets",
        resultTitle: "Check Result",
        addTicketsHint: "Add tickets and run checker",
        won: "Winning tickets",
        lost: "Non-winning tickets",
        totalPrize: "Total prize",
        noWin: "No winning ticket in this batch",
        ticketTotal: "Ticket total",
        digitUnit: "digits",
        kyat: "MMK",
        popupCongrats: "MKS Congratulations!",
        popupTryAgain: "Try again.",
        popupBlessing: "Try again. May you win the big lottery prizes.",
        popupWinningListTitle: "Winning tickets",
        popupTotalLabel: "Total ticket prize",
        popupClose: "OK",
      },
    }),
    [],
  );
  const t = text[language];

  const alphaOptions = useMemo(() => {
    const found = new Set<string>(MYANMAR_ALPHABETS);
    (currentResult?.entries ?? []).forEach((e) => {
      if (e.alpha?.trim()) found.add(e.alpha.trim());
    });
    return Array.from(found);
  }, [currentResult]);

  const addTickets = (incoming: Ticket[]) => {
    if (incoming.length === 0) return;
    setTickets((prev) => {
      const map = new Map<string, Ticket>();
      prev.forEach((t) => map.set(`${t.alpha}-${normalizeDigits(t.number)}`, t));
      incoming.forEach((t) => {
        const number = normalizeDigits(t.number).slice(0, 6);
        const alpha = clampAlpha(t.alpha);
        if (!alpha || !number) return;
        const key = `${alpha}-${number}`;
        if (!map.has(key)) map.set(key, { id: `${Date.now()}-${Math.random()}`, alpha, number });
      });
      return Array.from(map.values());
    });
  };

  const addSingleTicket = () => {
    const number = normalizeDigits(singleNumber).slice(0, 6);
    const alpha = clampAlpha(singleAlpha);
    if (!alpha || !number) return;
    Haptics.selectionAsync();
    addTickets([{ id: `${Date.now()}`, alpha, number }]);
    setSingleNumber("");
  };

  const addSameAlphaRange = () => {
    const alpha = clampAlpha(sameAlpha);
    const prefix = normalizeDigits(prefixDigits);
    const start = normalizeDigits(rangeStart);
    const end = normalizeDigits(rangeEnd);
    if (!alpha || !prefix || !start || !end) return;
    if (start.length !== end.length) return;
    if (prefix.length + start.length > 6) return;

    const a = Number(start);
    const b = Number(end);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const width = start.length;
    const batch: Ticket[] = [];
    for (let n = min; n <= max; n += 1) {
      const suffix = String(n).padStart(width, "0");
      batch.push({ id: `${Date.now()}-${n}`, alpha, number: `${prefix}${suffix}`.slice(0, 6) });
    }
    Haptics.selectionAsync();
    addTickets(batch);
  };

  const addSameNumberAlphaRange = () => {
    const startAlpha = clampAlpha(alphaStart);
    const endAlpha = clampAlpha(alphaEnd);
    const number = normalizeDigits(sameNumberForAlphaRange).slice(0, 6);
    if (!startAlpha || !endAlpha || !number) return;

    const startIndex = alphaOptions.indexOf(startAlpha);
    const endIndex = alphaOptions.indexOf(endAlpha);
    if (startIndex < 0 || endIndex < 0) return;
    const min = Math.min(startIndex, endIndex);
    const max = Math.max(startIndex, endIndex);
    const batch: Ticket[] = [];
    for (let i = min; i <= max; i += 1) {
      batch.push({ id: `${Date.now()}-${i}`, alpha: alphaOptions[i], number });
    }
    Haptics.selectionAsync();
    addTickets(batch);
  };

  const removeTicket = (id: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  };

  const clearTickets = () => {
    setTickets([]);
    setLastResults(null);
  };

  const updateTicket = (id: string, key: "alpha" | "number", value: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (key === "alpha") return { ...t, alpha: clampAlpha(value) };
        return { ...t, number: normalizeDigits(value).slice(0, 6) };
      }),
    );
  };

  const runCheck = async () => {
    if (!currentResult || tickets.length === 0 || checking) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChecking(true);
    setProgress(0);
    setProgressStep(0);

    const timer = setInterval(() => {
      setProgress((prev) => Math.min(prev + 8, 92));
      setProgressStep((s) => (s + 1) % EMOJI_CHECKING.length);
    }, 80);

    await new Promise((r) => setTimeout(r, 500));

    const entries = currentResult.entries ?? [];
    const prizeLookup = new Map<string, number>();
    const categoryAmountLookup = new Map<string, number>();
    currentResult.prizes.forEach((p) => {
      const prizeAmount = parseAwardKyat(p.amount);
      categoryAmountLookup.set(normalizeCategoryKey(p.amount), prizeAmount);
      p.numbers.forEach((rawNum) => {
        const key = rawNum.replace(/\s+/g, "");
        if (!prizeLookup.has(key)) prizeLookup.set(key, prizeAmount);
      });
    });
    const resultsForTickets: TicketResult[] = tickets.map((t) => {
      const number = normalizeDigits(t.number);
      const alpha = normalizeAlpha(t.alpha);
      const matches = entries
        .filter((e) => normalizeAlpha(e.alpha) === alpha && number.length >= e.matchLength && number.startsWith(normalizeDigits(e.pattern)))
        .sort(sortMatches);
      const ticketKey = `${alpha}-${number}`;
      const matchAmounts = matches.map((m) => {
        const parsed = parseAwardKyat(m.prizeCategory, m.note);
        if (parsed > 0) return parsed;
        return (
          categoryAmountLookup.get(normalizeCategoryKey(m.prizeCategory)) ??
          prizeLookup.get(ticketKey) ??
          0
        );
      });
      const totalKyat = matchAmounts.reduce((sum, v) => sum + v, 0);
      return { ticket: t, matches, matchAmounts, totalKyat };
    });

    await new Promise((r) => setTimeout(r, 300));
    clearInterval(timer);
    setProgress(100);
    setLastResults(resultsForTickets);
    setChecking(false);

    const anyWin = resultsForTickets.some((r) => r.matches.length > 0);
    setLastCheckWon(anyWin);
    setShowOutcomePopup(true);
    if (anyWin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const wonResults = (lastResults ?? []).filter((r) => r.matches.length > 0);
  const lostCount = (lastResults ?? []).filter((r) => r.matches.length === 0).length;
  const totalPrize = wonResults.reduce((sum, r) => sum + r.totalKyat, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#FFF7F2", "#FFEFE2", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.page, { width: contentWidth, paddingTop: topPadding }]}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.foreground }]}>{t.screenTitle}</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.screenSubtitle}</Text>
              </View>
              <View style={styles.headerActions}>
                <LanguageToggle language={language} onChange={setLanguage} />
                <UserBadge user={user} onPress={() => router.push("/admin")} />
              </View>
            </View>
          </View>

          <View style={[styles.columns, isDesktop && styles.columnsDesktop]}>
            <View style={[styles.column, isDesktop && styles.columnDesktop, styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t.drawSelect}</Text>
              <DrawSelector
                results={publishedResults}
                selectedDraw={selectedDraw}
                onSelect={setSelectedDraw}
              />
              <AppAdBanner placement="search" language={language} />

              <View style={styles.entryTabWrap}>
                <TouchableOpacity
                  onPress={() => setEntryTab("single")}
                  style={[
                    styles.entryTabBtn,
                    { borderColor: colors.border, backgroundColor: entryTab === "single" ? colors.primary : colors.background },
                  ]}
                >
                  <Text style={[styles.entryTabText, { color: entryTab === "single" ? colors.primaryForeground : colors.foreground }]}>
                    {t.tabSingle}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEntryTab("sameAlphaSeq")}
                  style={[
                    styles.entryTabBtn,
                    { borderColor: colors.border, backgroundColor: entryTab === "sameAlphaSeq" ? colors.primary : colors.background },
                  ]}
                >
                  <Text style={[styles.entryTabText, { color: entryTab === "sameAlphaSeq" ? colors.primaryForeground : colors.foreground }]}>
                    {t.tabSameAlpha}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEntryTab("sameNumberSeq")}
                  style={[
                    styles.entryTabBtn,
                    { borderColor: colors.border, backgroundColor: entryTab === "sameNumberSeq" ? colors.primary : colors.background },
                  ]}
                >
                  <Text style={[styles.entryTabText, { color: entryTab === "sameNumberSeq" ? colors.primaryForeground : colors.foreground }]}>
                    {t.tabSameNumber}
                  </Text>
                </TouchableOpacity>
              </View>

              {entryTab === "single" && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t.stepSingle}</Text>
                  <View style={[styles.row3, isMobile && styles.mobileMainRow]}>
                    <View style={[styles.alphaPickerWrap, isMobile && styles.mobileAlphaWrap]}>
                      <TouchableOpacity
                        style={[styles.input, styles.inputMini, styles.alphaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() => setOpenAlphaMenu("single")}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.alphaSelectText, { color: colors.foreground }]}>{singleAlpha}</Text>
                        <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.input, styles.inputGrow, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                      value={singleNumber}
                      onChangeText={(tx) => setSingleNumber(normalizeDigits(tx).slice(0, 6))}
                      placeholder="123456"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={addSingleTicket} activeOpacity={0.8}>
                      <Feather name="plus" size={16} color={colors.primaryForeground} />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {entryTab === "sameAlphaSeq" && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t.stepSameAlpha}</Text>
                  {isMobile ? (
                    <View style={styles.mobileBlock}>
                      <View style={styles.mobileMainRow}>
                        <View style={[styles.alphaPickerWrap, styles.mobileAlphaWrap]}>
                          <TouchableOpacity
                            style={[styles.input, styles.inputMini, styles.alphaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                            onPress={() => setOpenAlphaMenu("sameAlpha")}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.alphaSelectText, { color: colors.foreground }]}>{sameAlpha}</Text>
                            <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={[styles.input, styles.inputGrow, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                          value={prefixDigits}
                          onChangeText={(tx) => setPrefixDigits(normalizeDigits(tx).slice(0, 5))}
                          placeholder={t.prefixPlaceholder}
                          placeholderTextColor={colors.mutedForeground}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={[styles.mobileMainRow, styles.mobileSecondaryRow]}>
                        <TextInput
                          style={[styles.input, styles.mobileHalfInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                          value={rangeStart}
                          onChangeText={(tx) => setRangeStart(normalizeDigits(tx).slice(0, 3))}
                          placeholder={t.startPlaceholder}
                          placeholderTextColor={colors.mutedForeground}
                          keyboardType="numeric"
                        />
                        <TextInput
                          style={[styles.input, styles.mobileHalfInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                          value={rangeEnd}
                          onChangeText={(tx) => setRangeEnd(normalizeDigits(tx).slice(0, 3))}
                          placeholder={t.endPlaceholder}
                          placeholderTextColor={colors.mutedForeground}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={addSameAlphaRange} activeOpacity={0.8}>
                          <Feather name="plus" size={16} color={colors.primaryForeground} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.row3}>
                      <View style={styles.alphaPickerWrap}>
                        <TouchableOpacity
                          style={[styles.input, styles.inputMini, styles.alphaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                          onPress={() => setOpenAlphaMenu("sameAlpha")}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.alphaSelectText, { color: colors.foreground }]}>{sameAlpha}</Text>
                          <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[styles.input, styles.inputGrow, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                        value={prefixDigits}
                        onChangeText={(tx) => setPrefixDigits(normalizeDigits(tx).slice(0, 5))}
                        placeholder={t.prefixPlaceholder}
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.input, styles.inputMiniWide, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                        value={rangeStart}
                        onChangeText={(tx) => setRangeStart(normalizeDigits(tx).slice(0, 3))}
                        placeholder={t.startPlaceholder}
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.input, styles.inputMiniWide, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                        value={rangeEnd}
                        onChangeText={(tx) => setRangeEnd(normalizeDigits(tx).slice(0, 3))}
                        placeholder={t.endPlaceholder}
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={addSameAlphaRange} activeOpacity={0.8}>
                        <Feather name="plus" size={16} color={colors.primaryForeground} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {entryTab === "sameNumberSeq" && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t.stepSameNumber}</Text>
                  {isMobile ? (
                    <View style={styles.mobileBlock}>
                      <View style={styles.mobileMainRow}>
                        <View style={[styles.alphaPickerWrap, styles.mobileAlphaWrap]}>
                          <TouchableOpacity
                            style={[styles.input, styles.inputMini, styles.alphaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                            onPress={() => setOpenAlphaMenu("alphaStart")}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.alphaSelectText, { color: colors.foreground }]}>{alphaStart}</Text>
                            <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>
                        <View style={[styles.alphaPickerWrap, styles.mobileAlphaWrap]}>
                          <TouchableOpacity
                            style={[styles.input, styles.inputMini, styles.alphaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                            onPress={() => setOpenAlphaMenu("alphaEnd")}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.alphaSelectText, { color: colors.foreground }]}>{alphaEnd}</Text>
                            <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={[styles.mobileMainRow, styles.mobileSecondaryRow]}>
                        <TextInput
                          style={[styles.input, styles.inputGrow, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                          value={sameNumberForAlphaRange}
                          onChangeText={(tx) => setSameNumberForAlphaRange(normalizeDigits(tx).slice(0, 6))}
                          placeholder={t.numberPlaceholder}
                          placeholderTextColor={colors.mutedForeground}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={addSameNumberAlphaRange} activeOpacity={0.8}>
                          <Feather name="plus" size={16} color={colors.primaryForeground} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.row3}>
                      <View style={styles.alphaPickerWrap}>
                        <TouchableOpacity
                          style={[styles.input, styles.inputMini, styles.alphaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                          onPress={() => setOpenAlphaMenu("alphaStart")}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.alphaSelectText, { color: colors.foreground }]}>{alphaStart}</Text>
                          <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.alphaPickerWrap}>
                        <TouchableOpacity
                          style={[styles.input, styles.inputMini, styles.alphaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                          onPress={() => setOpenAlphaMenu("alphaEnd")}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.alphaSelectText, { color: colors.foreground }]}>{alphaEnd}</Text>
                          <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[styles.input, styles.inputGrow, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                        value={sameNumberForAlphaRange}
                        onChangeText={(tx) => setSameNumberForAlphaRange(normalizeDigits(tx).slice(0, 6))}
                        placeholder={t.numberPlaceholder}
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={addSameNumberAlphaRange} activeOpacity={0.8}>
                        <Feather name="plus" size={16} color={colors.primaryForeground} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              <View style={styles.ticketHeader}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 0 }]}>
                  {t.ticketList} ({toMM(tickets.length)})
                </Text>
                {tickets.length > 0 && (
                  <TouchableOpacity onPress={clearTickets} activeOpacity={0.7}>
                    <Text style={[styles.clearAllText, { color: colors.destructive }]}>{t.clear}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.ticketListBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {tickets.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noTickets}</Text>
                ) : (
                  <ScrollView style={{ maxHeight: 220 }}>
                    {tickets.map((t, idx) => (
                      <View key={t.id} style={styles.ticketRow}>
                        <Text style={[styles.ticketIndex, { color: colors.mutedForeground }]}>{toMM(idx + 1)}.</Text>
                        <TextInput
                          style={[styles.input, styles.ticketAlphaInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                          value={t.alpha}
                          onChangeText={(v) => updateTicket(t.id, "alpha", v)}
                        />
                        <TextInput
                          style={[styles.input, styles.ticketNumberInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                          value={t.number}
                          onChangeText={(v) => updateTicket(t.id, "number", v)}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity onPress={() => removeTicket(t.id)} style={styles.ticketRemoveBtn} activeOpacity={0.7}>
                          <Feather name="trash-2" size={15} color={colors.destructive} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: tickets.length > 0 ? colors.primary : colors.muted }]}
                onPress={runCheck}
                disabled={tickets.length === 0 || checking}
                activeOpacity={0.8}
              >
                <Feather
                  name="search"
                  size={18}
                  color={tickets.length > 0 ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={[styles.searchBtnText, { color: tickets.length > 0 ? colors.primaryForeground : colors.mutedForeground }]}
                >
                  {t.runCheck}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.column, isDesktop && styles.columnDesktop]}>
              <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.resultHeader}>
                  <Text style={[styles.resultTitle, { color: colors.foreground }]}>{t.resultTitle}</Text>
                  <Text style={styles.emojiBig}>
                    {checking
                      ? EMOJI_CHECKING[progressStep % EMOJI_CHECKING.length]
                      : lastResults
                        ? wonResults.length > 0
                          ? EMOJI_WIN
                          : EMOJI_LOSE
                        : EMOJI_IDLE}
                  </Text>
                </View>

                {(checking || progress > 0) && (
                  <View style={[styles.progressWrap, { backgroundColor: colors.muted }]}>
                    <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.primary }]} />
                  </View>
                )}

                {lastResults ? (
                  <>
                    <Text style={[styles.summaryText, { color: colors.foreground }]}>
                      {t.won}: {toMM(wonResults.length)} / {toMM(lastResults.length)}
                    </Text>
                    <Text style={[styles.summaryText, { color: colors.foreground }]}>
                      {t.lost}: {toMM(lostCount)}
                    </Text>
                    <Text style={[styles.summaryTotal, { color: colors.primary }]}>
                      {t.totalPrize}: {formatKyatMM(totalPrize)} {t.kyat}
                    </Text>

                    <View style={styles.divider} />
                    {wonResults.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noWin}</Text>
                    ) : (
                      <ScrollView style={{ maxHeight: 430 }}>
                        {wonResults.map((r) => (
                          <View key={r.ticket.id} style={[styles.winCard, { borderColor: "#BEEACF", backgroundColor: "#F0FFF4" }]}>
                            <Text style={[styles.winTicket, { color: colors.foreground }]}>{ticketLabel(r.ticket)}</Text>
                            {r.matches.map((m, i) => (
                              <View key={`${r.ticket.id}-${i}`} style={styles.winLine}>
                                <Text style={[styles.winLineText, { color: colors.mutedForeground }]}>
                                  • {m.prizeCategory} ({toMM(m.matchLength)} {t.digitUnit})
                                </Text>
                                <Text style={[styles.winLineAmount, { color: colors.primary }]}>
                                  {formatKyatMM(r.matchAmounts[i] ?? 0)} {t.kyat}
                                </Text>
                              </View>
                            ))}
                            <Text style={[styles.ticketTotal, { color: "#1E8449" }]}>
                              {t.ticketTotal}: {formatKyatMM(r.totalKyat)} {t.kyat}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </>
                ) : (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.addTicketsHint}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={openAlphaMenu !== null} transparent animationType="fade" onRequestClose={() => setOpenAlphaMenu(null)}>
        <Pressable style={styles.alphaModalBackdrop} onPress={() => setOpenAlphaMenu(null)}>
          <Pressable
            style={[
              styles.alphaModalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => undefined}
          >
            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {alphaOptions.map((a) => (
                <TouchableOpacity
                  key={`picker-${a}`}
                  style={styles.alphaModalItem}
                  onPress={() => {
                    if (openAlphaMenu === "single") setSingleAlpha(a);
                    if (openAlphaMenu === "sameAlpha") setSameAlpha(a);
                    if (openAlphaMenu === "alphaStart") setAlphaStart(a);
                    if (openAlphaMenu === "alphaEnd") setAlphaEnd(a);
                    setOpenAlphaMenu(null);
                  }}
                >
                  <Text style={[styles.alphaModalItemText, { color: colors.foreground }]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showOutcomePopup} transparent animationType="fade" onRequestClose={() => setShowOutcomePopup(false)}>
        <Pressable style={styles.alphaModalBackdrop} onPress={() => setShowOutcomePopup(false)}>
          <Pressable
            style={[
              styles.outcomeCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => undefined}
          >
            <Text style={[styles.outcomeTitle, { color: colors.foreground }]}>
              {lastCheckWon
                ? `🎉 ${t.popupCongrats}`
                : `💛 ${t.popupTryAgain}`}
            </Text>
            <Image source={require("@/assets/images/mks-logo.png")} style={styles.outcomeLogo} />
            <Image
              source={{
                uri: lastCheckWon
                  ? "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExODFqd3o0YjJ2MXpwYXJjczA4dnVydDcwMnM0YjA5dW9rMTRhaXFoYSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26u4cqiYI30juCOGY/giphy.gif"
                  : "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd3B6d3Bwd2V2aWJkY3RiMDA0Y3N2a3A2NTV0Nzc0eHZlaGh3a2h2aiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l3q2K5jinAlChoCLS/giphy.gif",
              }}
              style={styles.outcomeGif}
            />
            {lastCheckWon ? (
              <>
                <Text style={[styles.outcomeListTitle, { color: colors.foreground }]}>{t.popupWinningListTitle}</Text>
                <ScrollView style={styles.outcomeList}>
                  {wonResults.map((r) => (
                    <Text key={`popup-${r.ticket.id}`} style={[styles.outcomeListItem, { color: colors.mutedForeground }]}>
                      • {ticketLabel(r.ticket)} - ဆုကြေးငွေတန်ဘိုး {formatKyatMM(r.totalKyat)} {t.kyat}
                    </Text>
                  ))}
                </ScrollView>
                <Text style={[styles.outcomeMessage, { color: colors.primary }]}>
                  {t.popupTotalLabel}: {formatKyatMM(totalPrize)} {t.kyat}
                </Text>
              </>
            ) : (
              <Text style={[styles.outcomeMessage, { color: colors.mutedForeground }]}>{t.popupBlessing}</Text>
            )}
            <TouchableOpacity
              style={[styles.outcomeBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowOutcomePopup(false)}
              activeOpacity={0.85}
            >
              <Text style={[styles.outcomeBtnText, { color: colors.primaryForeground }]}>
                {t.popupClose}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { alignSelf: "center", paddingHorizontal: 12, gap: 12 },
  header: { paddingBottom: 8 },
  headerRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  headerActions: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "nowrap" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  columns: { gap: 12, alignItems: "stretch" },
  columnsDesktop: { flexDirection: "row", alignItems: "flex-start" },
  column: { gap: 12 },
  columnDesktop: { flex: 1 },
  formCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  resultCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
    marginTop: 12,
    marginBottom: 4,
  },
  row3: { flexDirection: "row", gap: 8, alignItems: "center" },
  mobileBlock: { gap: 8 },
  mobileMainRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  mobileSecondaryRow: { alignItems: "stretch" },
  mobileAlphaWrap: { width: 72, flexShrink: 0 },
  mobileHalfInput: { flex: 1 },
  entryTabWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  entryTabBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  entryTabText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  alphaPickerWrap: { position: "relative" },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  inputMini: { width: 64, textAlign: "center" },
  inputMiniWide: { width: 72, textAlign: "center" },
  inputGrow: { flex: 1, minWidth: 0 },
  alphaSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  alphaSelectText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  smallBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ticketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  clearAllText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  ticketListBox: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
  },
  ticketRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  ticketIndex: { width: 24, fontSize: 12, fontFamily: "Inter_400Regular" },
  ticketAlphaInput: { width: 54, textAlign: "center", height: 40 },
  ticketNumberInput: { flex: 1, minWidth: 0, height: 40 },
  ticketRemoveBtn: { width: 28, alignItems: "center" },
  searchBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  searchBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emojiBig: { fontSize: 28 },
  progressWrap: { height: 10, borderRadius: 6, marginTop: 10, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 6 },
  summaryText: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 8 },
  summaryTotal: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 8 },
  divider: { height: 1, backgroundColor: "#E8E8E8", marginVertical: 10 },
  winCard: { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 8 },
  winTicket: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 6 },
  winLine: { gap: 3, marginBottom: 5 },
  winLineText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  winLineAmount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  ticketTotal: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 6 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  alphaModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  alphaModalCard: {
    width: "100%",
    maxWidth: 280,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
  },
  alphaModalItem: {
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  alphaModalItemText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  outcomeCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 10,
  },
  outcomeTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  outcomeLogo: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  outcomeGif: {
    width: 220,
    height: 150,
    borderRadius: 12,
  },
  outcomeListTitle: {
    width: "100%",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  outcomeList: {
    width: "100%",
    maxHeight: 140,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  outcomeListItem: {
    fontSize: 12,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  outcomeMessage: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  outcomeBtn: {
    minWidth: 110,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 2,
  },
  outcomeBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
