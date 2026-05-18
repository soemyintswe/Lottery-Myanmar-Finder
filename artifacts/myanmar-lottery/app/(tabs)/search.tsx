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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { useLottery } from "@/context/LotteryContext";
import { LotteryRuleEntry, MYANMAR_ALPHABETS } from "@/types/lottery";
import DrawSelector from "@/components/DrawSelector";
import { normalizeDigits, toMM } from "@/utils/myanmar";

type Ticket = {
  id: string;
  alpha: string;
  number: string;
};

type TicketResult = {
  ticket: Ticket;
  matches: LotteryRuleEntry[];
  totalKyat: number;
};

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

function parseAwardKyat(categoryRaw: string): number {
  const category = categoryRaw || "";
  const bracketMatches = Array.from(category.matchAll(/\(([^)]*)\)/g));
  const amountFromBrackets = bracketMatches
    .map((m) => parseMmInt(m[1]))
    .find((n) => n > 0) ?? 0;

  const inlineMatch = category.match(/[0-9၀-၉][0-9၀-၉,\s.]*/);
  const amountFromInline = inlineMatch ? parseMmInt(inlineMatch[0]) : 0;

  const amount = amountFromBrackets || amountFromInline;
  if (!amount) return 0;
  if (category.includes("သိန်း")) return amount * 100000;
  if (category.includes("သောင်း")) return amount * 10000;
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

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { results, selectedDraw, setSelectedDraw } = useLottery();

  const [singleAlpha, setSingleAlpha] = useState("က");
  const [singleNumber, setSingleNumber] = useState("");

  const [sameAlpha, setSameAlpha] = useState("က");
  const [prefixDigits, setPrefixDigits] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const [alphaStart, setAlphaStart] = useState("က");
  const [alphaEnd, setAlphaEnd] = useState("ဃ");
  const [sameNumberForAlphaRange, setSameNumberForAlphaRange] = useState("");
  const [openAlphaMenu, setOpenAlphaMenu] = useState<null | "single" | "sameAlpha" | "alphaStart" | "alphaEnd">(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState(0);
  const [lastResults, setLastResults] = useState<TicketResult[] | null>(null);

  const currentResult = results.find((r) => r.drawNumber === selectedDraw) ?? null;

  const isDesktop = width >= 980;
  const contentWidth = Math.min(width - 24, 1120);
  const topPadding = Platform.OS === "web" ? 26 : insets.top + 8;

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
    const resultsForTickets: TicketResult[] = tickets.map((t) => {
      const number = normalizeDigits(t.number);
      const alpha = clampAlpha(t.alpha);
      const matches = entries
        .filter((e) => e.alpha === alpha && number.length >= e.matchLength && number.startsWith(e.pattern))
        .sort(sortMatches);
      const totalKyat = matches.reduce((sum, m) => sum + parseAwardKyat(m.prizeCategory), 0);
      return { ticket: t, matches, totalKyat };
    });

    await new Promise((r) => setTimeout(r, 300));
    clearInterval(timer);
    setProgress(100);
    setLastResults(resultsForTickets);
    setChecking(false);

    const anyWin = resultsForTickets.some((r) => r.matches.length > 0);
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
            <Text style={[styles.title, { color: colors.foreground }]}>ထီ စစ်ဆေးရန်</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Batch Lottery Checker</Text>
          </View>

          <View style={[styles.columns, isDesktop && styles.columnsDesktop]}>
            <View style={[styles.column, styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ထီပွဲရွေးချယ်ပါ</Text>
              <DrawSelector
                results={results}
                selectedDraw={selectedDraw}
                onSelect={setSelectedDraw}
              />

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>၁) တစ်စောင်ချင်းထည့်ရန်</Text>
              <View style={styles.row3}>
                <View style={styles.alphaPickerWrap}>
                  <TouchableOpacity
                    style={[styles.input, styles.inputMini, styles.alphaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setOpenAlphaMenu((v) => (v === "single" ? null : "single"))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.alphaSelectText, { color: colors.foreground }]}>{singleAlpha}</Text>
                    <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  {openAlphaMenu === "single" && (
                    <View style={[styles.alphaMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <ScrollView style={{ maxHeight: 170 }}>
                        {alphaOptions.map((a) => (
                          <TouchableOpacity
                            key={`single-${a}`}
                            style={styles.alphaMenuItem}
                            onPress={() => {
                              setSingleAlpha(a);
                              setOpenAlphaMenu(null);
                            }}
                          >
                            <Text style={{ color: colors.foreground }}>{a}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <TextInput
                  style={[styles.input, styles.inputGrow, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={singleNumber}
                  onChangeText={(t) => setSingleNumber(normalizeDigits(t).slice(0, 6))}
                  placeholder="123456"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={addSingleTicket} activeOpacity={0.8}>
                  <Feather name="plus" size={16} color={colors.primaryForeground} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>၂) အက္ခရာတူ နံပါတ် Range (ဥပမာ က-123451 မှ က-123460)</Text>
              <View style={styles.row3}>
                <View style={styles.alphaPickerWrap}>
                  <TouchableOpacity
                    style={[styles.input, styles.inputMini, styles.alphaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setOpenAlphaMenu((v) => (v === "sameAlpha" ? null : "sameAlpha"))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.alphaSelectText, { color: colors.foreground }]}>{sameAlpha}</Text>
                    <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  {openAlphaMenu === "sameAlpha" && (
                    <View style={[styles.alphaMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <ScrollView style={{ maxHeight: 170 }}>
                        {alphaOptions.map((a) => (
                          <TouchableOpacity
                            key={`same-${a}`}
                            style={styles.alphaMenuItem}
                            onPress={() => {
                              setSameAlpha(a);
                              setOpenAlphaMenu(null);
                            }}
                          >
                            <Text style={{ color: colors.foreground }}>{a}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <TextInput
                  style={[styles.input, styles.inputGrow, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={prefixDigits}
                  onChangeText={(t) => setPrefixDigits(normalizeDigits(t).slice(0, 5))}
                  placeholder="ရှေ့ဂဏန်း (ဥပမာ 1234)"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.inputMiniWide, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={rangeStart}
                  onChangeText={(t) => setRangeStart(normalizeDigits(t).slice(0, 3))}
                  placeholder="အစ"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.inputMiniWide, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={rangeEnd}
                  onChangeText={(t) => setRangeEnd(normalizeDigits(t).slice(0, 3))}
                  placeholder="ဆုံး"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={addSameAlphaRange} activeOpacity={0.8}>
                  <Feather name="plus" size={16} color={colors.primaryForeground} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>၃) နံပါတ်တူ အက္ခရာ Range (ဥပမာ က-123451 မှ ဃ-123451)</Text>
              <View style={styles.row3}>
                <View style={styles.alphaPickerWrap}>
                  <TouchableOpacity
                    style={[styles.input, styles.inputMini, styles.alphaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setOpenAlphaMenu((v) => (v === "alphaStart" ? null : "alphaStart"))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.alphaSelectText, { color: colors.foreground }]}>{alphaStart}</Text>
                    <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  {openAlphaMenu === "alphaStart" && (
                    <View style={[styles.alphaMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <ScrollView style={{ maxHeight: 170 }}>
                        {alphaOptions.map((a) => (
                          <TouchableOpacity
                            key={`start-${a}`}
                            style={styles.alphaMenuItem}
                            onPress={() => {
                              setAlphaStart(a);
                              setOpenAlphaMenu(null);
                            }}
                          >
                            <Text style={{ color: colors.foreground }}>{a}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <View style={styles.alphaPickerWrap}>
                  <TouchableOpacity
                    style={[styles.input, styles.inputMini, styles.alphaSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setOpenAlphaMenu((v) => (v === "alphaEnd" ? null : "alphaEnd"))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.alphaSelectText, { color: colors.foreground }]}>{alphaEnd}</Text>
                    <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  {openAlphaMenu === "alphaEnd" && (
                    <View style={[styles.alphaMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <ScrollView style={{ maxHeight: 170 }}>
                        {alphaOptions.map((a) => (
                          <TouchableOpacity
                            key={`end-${a}`}
                            style={styles.alphaMenuItem}
                            onPress={() => {
                              setAlphaEnd(a);
                              setOpenAlphaMenu(null);
                            }}
                          >
                            <Text style={{ color: colors.foreground }}>{a}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <TextInput
                  style={[styles.input, styles.inputGrow, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={sameNumberForAlphaRange}
                  onChangeText={(t) => setSameNumberForAlphaRange(normalizeDigits(t).slice(0, 6))}
                  placeholder="နံပါတ် (ဥပမာ 123451)"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={addSameNumberAlphaRange} activeOpacity={0.8}>
                  <Feather name="plus" size={16} color={colors.primaryForeground} />
                </TouchableOpacity>
              </View>

              <View style={styles.ticketHeader}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 0 }]}>ထီတိုက်မည့် လက်မှတ်စာရင်း ({toMM(tickets.length)})</Text>
                {tickets.length > 0 && (
                  <TouchableOpacity onPress={clearTickets} activeOpacity={0.7}>
                    <Text style={[styles.clearAllText, { color: colors.destructive }]}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.ticketListBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {tickets.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>ထီလက်မှတ် မထည့်ရသေးပါ</Text>
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
                  ထီတိုက်စစ်မည်
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.column}>
              <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.resultHeader}>
                  <Text style={[styles.resultTitle, { color: colors.foreground }]}>စစ်ဆေးမှု ရလဒ်</Text>
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
                      ပေါက်လက်မှတ်: {toMM(wonResults.length)} / {toMM(lastResults.length)}
                    </Text>
                    <Text style={[styles.summaryText, { color: colors.foreground }]}>
                      မပေါက်လက်မှတ်: {toMM(lostCount)}
                    </Text>
                    <Text style={[styles.summaryTotal, { color: colors.primary }]}>
                      စုစုပေါင်း ဆုကြေး: {formatKyatMM(totalPrize)} ကျပ်
                    </Text>

                    <View style={styles.divider} />
                    {wonResults.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>ယခုထည့်ထားသော လက်မှတ်များ မပေါက်ပါ</Text>
                    ) : (
                      <ScrollView style={{ maxHeight: 430 }}>
                        {wonResults.map((r) => (
                          <View key={r.ticket.id} style={[styles.winCard, { borderColor: "#BEEACF", backgroundColor: "#F0FFF4" }]}>
                            <Text style={[styles.winTicket, { color: colors.foreground }]}>{ticketLabel(r.ticket)}</Text>
                            {r.matches.map((m, i) => (
                              <View key={`${r.ticket.id}-${i}`} style={styles.winLine}>
                                <Text style={[styles.winLineText, { color: colors.mutedForeground }]}>
                                  • {m.prizeCategory} ({toMM(m.matchLength)} လုံး)
                                </Text>
                                <Text style={[styles.winLineAmount, { color: colors.foreground }]}>
                                  {formatKyatMM(parseAwardKyat(m.prizeCategory))} ကျပ်
                                </Text>
                              </View>
                            ))}
                            <Text style={[styles.ticketTotal, { color: "#1E8449" }]}>
                              လက်မှတ်စုစုပေါင်း: {formatKyatMM(r.totalKyat)} ကျပ်
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </>
                ) : (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>ထီလက်မှတ်ထည့်ပြီး စစ်ဆေးပါ</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { alignSelf: "center", paddingHorizontal: 12, gap: 12 },
  header: { paddingBottom: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  columns: { gap: 12 },
  columnsDesktop: { flexDirection: "row", alignItems: "flex-start" },
  column: { flex: 1, gap: 12 },
  formCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  resultCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 4,
  },
  row3: { flexDirection: "row", gap: 8, alignItems: "center" },
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
  inputGrow: { flex: 1 },
  alphaSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  alphaSelectText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  alphaMenu: {
    position: "absolute",
    top: 48,
    left: 0,
    width: 120,
    borderWidth: 1,
    borderRadius: 10,
    zIndex: 50,
    elevation: 6,
    paddingVertical: 4,
  },
  alphaMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  smallBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
  ticketNumberInput: { flex: 1, height: 40 },
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
  winLine: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  winLineText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  winLineAmount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  ticketTotal: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 6 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
