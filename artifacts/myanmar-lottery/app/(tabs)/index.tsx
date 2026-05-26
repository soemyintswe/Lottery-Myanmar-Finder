import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { useLottery } from "@/context/LotteryContext";
import DrawSelector from "@/components/DrawSelector";
import LanguageToggle from "@/components/LanguageToggle";
import AppAdBanner from "@/components/AppAdBanner";
import NumberChip from "@/components/NumberChip";
import PrizeBadge from "@/components/PrizeBadge";
import Feather from "@expo/vector-icons/Feather";
import { normalizeDigits, toMM, toMMDate } from "@/utils/myanmar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { LotteryRuleEntry } from "@/types/lottery";
import { isResultPublished } from "@/services/lotteryService";
import { useAuth } from "@/context/AuthContext";
import UserBadge from "@/components/UserBadge";

function normalizeCategory(input: string): string {
  return input.replace(/[:：]/g, "").replace(/\s+/g, " ").trim();
}

function parseMmInt(value?: string | null): number | null {
  if (!value) return null;
  const digits = normalizeDigits(value);
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function parseRuleFromNote(note?: string) {
  if (!note) return null;
  const compact = note.replace(/\s+/g, "");
  const beforeUnit = compact.split("ယူနစ်")[0] ?? compact;
  const lenMatch =
    beforeUnit.match(/ရှေ့ဂဏန်း\(([0-9၀-၉]+)\)လုံး/) ??
    beforeUnit.match(/\(([0-9၀-၉]+)\)လုံးအစဉ်လိုက်တူ/) ??
    beforeUnit.match(/\(([0-9၀-၉]+)\)လုံး/);
  const unitMatch = compact.match(/\(([0-9၀-၉]+)ယူနစ်\)/) ?? compact.match(/([0-9၀-၉]+)ယူနစ်/);
  if (!lenMatch || !unitMatch) return null;
  const len = parseMmInt(lenMatch[1]);
  const units = parseMmInt(unitMatch[1]);
  if (!len || !units) return null;
  return { len, units };
}

function parseTotalFromNote(note?: string) {
  if (!note) return null;
  const m = note.match(/စုစုပေါင်း\s*([0-9၀-၉]+)\s*ဦး/);
  if (!m) return null;
  return parseMmInt(m[1]);
}

function getEntryMatchLength(entry: LotteryRuleEntry): number | null {
  if (entry.matchLength >= 1 && entry.matchLength <= 6) return entry.matchLength;
  const patternLen = normalizeDigits(entry.pattern || "").length;
  if (patternLen >= 1 && patternLen <= 6) return patternLen;
  return null;
}

function getPrizeMeta(entries: LotteryRuleEntry[]) {
  const sumWinners = entries.reduce((acc, e) => acc + (parseMmInt(e.winners) ?? 0), 0);
  const firstRuleNote = entries.find((e) => !!parseRuleFromNote(e.note))?.note ?? "";
  const firstNote = firstRuleNote || entries.find((e) => !!e.note)?.note || "";
  const rule = parseRuleFromNote(firstRuleNote);

  if (rule) {
    const totalWinners = rule.units * Math.pow(10, 6 - rule.len);
    return {
      ruleText: firstRuleNote,
      winnerText: `ကံထူးရှင် (${toMM(totalWinners)}) ဦး`,
    };
  }

  const categoryName = normalizeCategory(entries[0]?.prizeCategory ?? "");
  const isPadesa = categoryName.includes("ဝေဝေဆာဆာပဒေသာ");
  const matchLength = entries.map(getEntryMatchLength).find((v): v is number => v !== null) ?? null;
  if (isPadesa && matchLength) {
    const countBasedTotal = entries.length * Math.pow(10, 6 - matchLength);
    const totalWinners = sumWinners > 0 ? Math.max(sumWinners, countBasedTotal) : countBasedTotal;
    return {
      ruleText: firstNote,
      winnerText: `ကံထူးရှင် (${toMM(totalWinners)}) ဦး`,
    };
  }

  const totalFromNote = entries.map((e) => parseTotalFromNote(e.note)).find((v) => !!v) ?? null;
  if (totalFromNote) {
    return {
      ruleText: firstNote,
      winnerText: `ကံထူးရှင် (${toMM(totalFromNote)}) ဦး`,
    };
  }

  if (sumWinners > 0) {
    return {
      ruleText: firstNote,
      winnerText: `ကံထူးရှင် (${toMM(sumWinners)}) ဦး`,
    };
  }

  return {
    ruleText: firstNote,
    winnerText: `ကံထူးရှင် (${toMM(entries.length)}) ဦး`,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { language, setLanguage } = useAppLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    results,
    loading,
    error,
    firestoreConnected,
    refresh,
    selectedDraw,
    setSelectedDraw,
    requestEditResult,
  } = useLottery();

  const canEdit = user?.role === "admin" || user?.role === "content_creator";

  const publishedResults = useMemo(
    () => results.filter((r) => isResultPublished(r)),
    [results],
  );

  const current = publishedResults.find((r) => r.drawNumber === selectedDraw) ?? publishedResults[0] ?? null;
  const isDesktop = width >= 980;
  const isMobile = width < 640;
  const contentWidth = Math.min(width - 24, 1120);

  const topPadding = Platform.OS === "web" ? 26 : insets.top + 8;
  const t = useMemo(
    () =>
      language === "en"
        ? {
            title: "Myanmar Lottery Results",
            subtitle: "Official Draw Summary",
            syncFirebase: "Firebase",
            syncLocal: "Local Seed",
            editAdmin: "Edit (Admin)",
            dataSource: "Data source",
            verified: "Verified",
            sourceLink: "Open Source Link",
            winner: "Winners",
            noNumbers: "No numbers yet for this prize",
            noResult: "No draw result found",
            editPrize: "Edit Prize",
          }
        : {
            title: "မြန်မာ ထီ ရလဒ်",
            subtitle: "Myanmar Lottery Results",
            syncFirebase: "Firebase",
            syncLocal: "Local Seed",
            editAdmin: "Edit (Admin)",
            dataSource: "Data source",
            verified: "Verified",
            sourceLink: "Source Link ဖွင့်မည်",
            winner: "ကံထူးရှင်",
            noNumbers: "ယခုအတွက် စာရင်းမထည့်ရသေးပါ",
            noResult: "ရလဒ်မတွေ့ပါ",
            editPrize: "ဒီဆု ပြင်မည်",
          },
    [language],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#FFF3EA", "#FFEAD5", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.page, { width: contentWidth, paddingTop: topPadding }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>{t.title}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.subtitle}</Text>
            </View>
            <View style={styles.headerActions}>
              <LanguageToggle language={language} onChange={setLanguage} />
              <UserBadge user={user} onPress={() => router.push("/admin")} />
              <TouchableOpacity
                onPress={refresh}
                style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather name="refresh-cw" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: "#FFF3F3", borderColor: colors.destructive }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorBannerText, { color: colors.destructive }]} numberOfLines={2}>
                {error}
              </Text>
            </View>
          )}

          <DrawSelector
            results={publishedResults}
            selectedDraw={selectedDraw}
            onSelect={setSelectedDraw}
          />
          <AppAdBanner placement="home" language={language} />

          {current ? (
            <>
              <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.heroTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.drawTitle, { color: colors.foreground }]}>
                      {toMM(current.drawNumber)} ကြိမ်မြောက် ထီပွဲ
                    </Text>
                    <Text style={[styles.drawDate, { color: colors.mutedForeground }]}>
                      {toMMDate(current.drawDate)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.syncBadge,
                      { backgroundColor: firestoreConnected ? "#D5F5E3" : colors.accent },
                    ]}
                  >
                    <Feather
                      name={firestoreConnected ? "cloud" : "cloud-off"}
                      size={10}
                      color={firestoreConnected ? "#27AE60" : colors.accentForeground}
                    />
                    <Text
                      style={[
                        styles.syncBadgeText,
                        { color: firestoreConnected ? "#27AE60" : colors.accentForeground },
                      ]}
                    >
                      {firestoreConnected ? t.syncFirebase : t.syncLocal}
                    </Text>
                  </View>
                </View>
                {canEdit && !!current.id && (
                  <TouchableOpacity
                    onPress={() => {
                      requestEditResult(current.id!);
                      router.push("/admin");
                    }}
                    style={[styles.inlineEditBtn, { backgroundColor: colors.muted }]}
                    activeOpacity={0.8}
                  >
                    <Feather name="edit-2" size={14} color={colors.primary} />
                    <Text style={[styles.inlineEditText, { color: colors.primary }]}>{t.editAdmin}</Text>
                  </TouchableOpacity>
                )}

                {!!current.sourceName && (
                  <View style={styles.metaRow}>
                    <Feather name="check-circle" size={12} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      {t.dataSource}: {current.sourceName}
                    </Text>
                  </View>
                )}

                {!!current.verifiedAt && (
                  <View style={styles.metaRow}>
                    <Feather name="clock" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      {t.verified}: {new Date(current.verifiedAt).toLocaleString()}
                    </Text>
                  </View>
                )}

                {!!current.sourceUrl && current.sourceUrl.startsWith("http") && (
                  <TouchableOpacity onPress={() => Linking.openURL(current.sourceUrl!)} activeOpacity={0.7}>
                    <Text style={[styles.sourceLink, { color: colors.primary }]}>{t.sourceLink}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.prizesGrid, isDesktop && styles.prizesGridDesktop]}>
                {current.prizes.map((prize, idx) => (
                  (() => {
                    const categoryEntries =
                      current.entries?.filter(
                        (e) => normalizeCategory(e.prizeCategory) === normalizeCategory(prize.amount),
                      ) ?? [];
                    const meta = getPrizeMeta(categoryEntries);
                    return (
                  <View
                    key={idx}
                    style={[
                      styles.prizeSection,
                      isDesktop && styles.prizeSectionDesktop,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={[styles.prizeHeader, isMobile && styles.prizeHeaderMobile]}>
                      <View style={[styles.prizeHeaderLeft, isMobile && styles.prizeHeaderLeftMobile]}>
                        <PrizeBadge amount={prize.amount} />
                      </View>
                      <View style={[styles.prizeHeaderRight, isMobile && styles.prizeHeaderRightMobile]}>
                        <Text style={[styles.winnerCount, isMobile && styles.winnerCountMobile, { color: colors.mutedForeground }]}>
                          {meta.winnerText.replace("ကံထူးရှင်", t.winner)}
                        </Text>
                        {canEdit && !!current.id && (
                          <TouchableOpacity
                            onPress={() => {
                              requestEditResult(current.id!, prize.amount);
                              router.push("/admin");
                            }}
                            style={[styles.prizeEditBtn, { backgroundColor: colors.muted }]}
                            activeOpacity={0.8}
                          >
                            <Feather name="edit-2" size={12} color={colors.primary} />
                            <Text style={[styles.prizeEditText, { color: colors.primary }]}>{t.editPrize}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {!!meta.ruleText && (
                      <Text style={[styles.prizeRuleNote, { color: colors.mutedForeground }]}>
                        {meta.ruleText}
                      </Text>
                    )}
                    {prize.numbers.length > 0 ? (
                      <View style={styles.numbersWrap}>
                        {prize.numbers.map((num, nIdx) => (
                          <NumberChip key={nIdx} number={num} />
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.emptyPrize, { color: colors.mutedForeground }]}>
                        {t.noNumbers}
                      </Text>
                    )}
                  </View>
                    );
                  })()
                ))}
              </View>
            </>
          ) : (
            <View style={styles.center}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noResult}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: {
    alignSelf: "center",
    paddingHorizontal: 12,
    gap: 12,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  header: {
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  errorBanner: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  drawTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  drawDate: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 3,
  },
  syncBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  syncBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  inlineEditBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineEditText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  sourceLink: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
  },
  prizesGrid: {
    gap: 10,
  },
  prizesGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  prizeSection: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  prizeSectionDesktop: {
    width: "49%",
  },
  prizeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  prizeHeaderMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  prizeHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  prizeHeaderLeftMobile: {
    flex: 0,
  },
  prizeHeaderRight: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 8,
  },
  prizeHeaderRightMobile: {
    alignItems: "flex-start",
    marginLeft: 0,
  },
  winnerCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
  winnerCountMobile: {
    textAlign: "left",
  },
  prizeEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  prizeEditText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  numbersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  prizeRuleNote: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  emptyPrize: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
