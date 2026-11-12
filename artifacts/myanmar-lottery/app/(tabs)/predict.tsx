import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";

import AppAdBanner from "@/components/AppAdBanner";
import DatePickerField from "@/components/DatePickerField";
import LanguageToggle from "@/components/LanguageToggle";
import UserBadge from "@/components/UserBadge";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useLottery } from "@/context/LotteryContext";
import { useColors } from "@/hooks/useColors";
import { getBirthdayLuckySuggestion, LuckyTicket, spinWheelLuckyTicket } from "@/services/luckyService";
import { calculateLotteryPrediction, FrequencyItem } from "@/services/predictionService";
import { isResultPublished } from "@/services/lotteryService";
import { calculateAgeDetails, parseDisplayDate } from "@/utils/date";
import { toMM } from "@/utils/myanmar";

type ScopeSize = "all" | "last10" | "last20";
const WHEEL_SECTOR_COUNT = 12;
const WHEEL_COLORS = ["#FEE7C6", "#FCD9EE", "#DAECFF", "#D9F7E3", "#FFE2D9", "#E8DEFF"];

function formatCount(value: number, language: "mm" | "en"): string {
  const text = value.toLocaleString("en-US");
  return language === "mm" ? toMM(text) : text;
}

function formatPercent(value: number, language: "mm" | "en"): string {
  const text = `${(value * 100).toFixed(1)}%`;
  return language === "mm" ? toMM(text) : text;
}

function displayDigits(value: string, language: "mm" | "en"): string {
  return language === "mm" ? toMM(value) : value;
}

function formatTicket(ticket: LuckyTicket, language: "mm" | "en") {
  return `${ticket.alpha}-${displayDigits(ticket.number, language)}`;
}

function sectorLabel(ticket: LuckyTicket, language: "mm" | "en"): string {
  return `${ticket.alpha} ${displayDigits(ticket.prefix2, language)}..${displayDigits(ticket.suffix2, language)}`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function createPieSlicePath(cx: number, cy: number, radius: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, radius, startDeg);
  const end = polarToCartesian(cx, cy, radius, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function FrequencyList({
  items,
  emptyText,
  language,
}: {
  items: FrequencyItem[];
  emptyText: string;
  language: "mm" | "en";
}) {
  const colors = useColors();
  if (items.length === 0) {
    return <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{emptyText}</Text>;
  }

  return (
    <View style={styles.listWrap}>
      {items.map((item, idx) => (
        <View key={`${item.value}-${idx}`} style={[styles.listRow, { borderColor: colors.border }]}>
          <View style={styles.listValueWrap}>
            <Text style={[styles.rankText, { color: colors.mutedForeground }]}>{formatCount(idx + 1, language)}.</Text>
            <Text style={[styles.valueText, { color: colors.foreground }]}>{displayDigits(item.value, language)}</Text>
          </View>
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {formatCount(item.count, language)} ({formatPercent(item.share, language)})
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function PredictScreen() {
  const colors = useColors();
  const { language, setLanguage } = useAppLanguage();
  const { user } = useAuth();
  const { results } = useLottery();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isDesktop = width >= 980;
  const isNarrow = width < 560;
  const contentWidth = Math.min(width - 24, 1120);
  const topPadding = Platform.OS === "web" ? 26 : insets.top + 8;

  const [scope, setScope] = useState<ScopeSize>("all");
  const [exportingCard, setExportingCard] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [spinningWheel, setSpinningWheel] = useState(false);
  const [wheelCandidates, setWheelCandidates] = useState<LuckyTicket[]>([]);
  const [wheelWinnerIndex, setWheelWinnerIndex] = useState<number | null>(null);
  const [wheelFinal, setWheelFinal] = useState<LuckyTicket | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [birthdayError, setBirthdayError] = useState<string | null>(null);
  const [birthdaySuggestion, setBirthdaySuggestion] = useState<ReturnType<typeof getBirthdayLuckySuggestion> | null>(null);

  const wheelSpinValue = useRef(new Animated.Value(0)).current;
  const wheelRotationRef = useRef(0);

  const canViewDrafts = user?.role === "admin";

  const visibleResults = useMemo(
    () => (canViewDrafts ? results : results.filter((r) => isResultPublished(r))),
    [results, canViewDrafts],
  );

  const scopedResults = useMemo(() => {
    const sorted = [...visibleResults].sort((a, b) => b.drawNumber - a.drawNumber);
    if (scope === "last10") return sorted.slice(0, 10);
    if (scope === "last20") return sorted.slice(0, 20);
    return sorted;
  }, [visibleResults, scope]);

  const insight = useMemo(() => calculateLotteryPrediction(scopedResults, 6), [scopedResults]);

  const t = useMemo(
    () =>
      language === "en"
        ? {
            title: "Prediction Center",
            subtitle: "Most frequent letters and number trends",
            all: "All Draws",
            last10: "Last 10",
            last20: "Last 20",
            analyzeScope: "Analyze scope",
            analyzed: "Analyzed",
            draws: "draws",
            tickets: "tickets",
            predictedCardTitle: "Predicted Next Possibility",
            predictedLetter: "Likely letter",
            predictedNumber: "Likely number",
            confidence: "Confidence",
            noPrediction: "Not enough six-digit history to estimate yet.",
            topLetters: "Most Frequent Letters",
            repeatedNumbers: "Most Repeated Exact Numbers",
            noRepeat: "No repeated exact numbers in selected scope yet.",
            hotDigits: "Hot Digits (0-9)",
            hotPrefix: "Hot Prefix (first 2 digits)",
            hotSuffix: "Hot Suffix (last 2 digits)",
            drawRange: "Draw range",
            exportCard: "Export Card",
            shareCard: "Share",
            exportDone: "Card image exported.",
            exportFail: "Cannot export now. Please retry.",
            wheelTitle: "Lucky Wheel",
            wheelDesc: "Spin and get a random full ticket with prefix/suffix.",
            spinNow: "Spin Wheel",
            spinning: "Spinning...",
            wheelResult: "Wheel result",
            frontPair: "Front pair",
            backPair: "Back pair",
            astroTitle: "Birthday & Weekday Lucky Pick",
            astroDesc: "Enter birthday (dd-mm-yyyy) for weekday-based lucky tickets.",
            birthLabel: "Birthday",
            birthPlaceholder: "e.g. 15-07-1998",
            predictByBirth: "Predict by Birthday",
            invalidBirth: "Invalid date format. Use dd-mm-yyyy.",
            ageTitle: "Current age",
            ageDetail: "{years} years, {months} months, {days} days",
            ageTotals: "As of today: {days} days | {hours} hours | {minutes} minutes",
            luckyDigits: "Lucky digits",
            luckyLetters: "Lucky letters",
            luckyTickets: "Suggested tickets",
            astrologyNote: "For guidance/entertainment only. Please verify with official lottery results.",
          }
        : {
            title: "ခန့်မှန်းရေး စင်တာ",
            subtitle: "အများဆုံးထွက်သော အက္ခရာနှင့် ဂဏန်း trend",
            all: "အားလုံး",
            last10: "နောက်ဆုံး ၁၀ ကြိမ်",
            last20: "နောက်ဆုံး ၂၀ ကြိမ်",
            analyzeScope: "စိစစ်မည့်အပိုင်း",
            analyzed: "စိစစ်ထားသည်",
            draws: "ကြိမ်",
            tickets: "လက်မှတ်",
            predictedCardTitle: "နောက်ထွက်နိုင်ခြေ ခန့်မှန်းချက်",
            predictedLetter: "ဖြစ်နိုင်ခြေမြင့် အက္ခရာ",
            predictedNumber: "ဖြစ်နိုင်ခြေမြင့် ဂဏန်း",
            confidence: "ယုံကြည်မှု",
            noPrediction: "၆ လုံးဂဏန်း history မလုံလောက်သေးပါ။",
            topLetters: "အများဆုံးထွက်သော အက္ခရာများ",
            repeatedNumbers: "ထပ်ထွက်နှုန်းများသော ဂဏန်းများ",
            noRepeat: "ရွေးထားသောအပိုင်းတွင် ထပ်ထွက် exact ဂဏန်း မရှိသေးပါ။",
            hotDigits: "အပူဆုံး ဂဏန်း (၀-၉)",
            hotPrefix: "အရှေ့ ၂ လုံး trend",
            hotSuffix: "အနောက် ၂ လုံး trend",
            drawRange: "စိစစ်ထားသော draw အပိုင်း",
            exportCard: "ကတ် Export",
            shareCard: "မျှဝေမည်",
            exportDone: "Prediction card ကို image အဖြစ် export ပြီးပါပြီ။",
            exportFail: "ယခုချိန် export မလုပ်နိုင်ပါ။ ထပ်စမ်းပါ။",
            wheelTitle: "ကံစမ်း Wheel",
            wheelDesc: "Wheel လှည့်ပြီး အက္ခရာ+ဂဏန်းအပြည့်အစုံ (ရှေ့/နောက်) ထုတ်မည်။",
            spinNow: "Wheel လှည့်မည်",
            spinning: "လှည့်နေသည်...",
            wheelResult: "Wheel ထွက်ရလဒ်",
            frontPair: "ရှေ့အစ ၂ လုံး",
            backPair: "နောက်အပိတ် ၂ လုံး",
            astroTitle: "မွေးသက္ကရာဇ် & နေ့နံ Lucky Pick",
            birthLabel: "မွေးသက္ကရာဇ်",
            astroDesc: "မွေးသက္ကရာဇ် (dd-mm-yyyy) ထည့်ပြီး နေ့နံကိုက် lucky tickets ထုတ်မည်။",
            birthPlaceholder: "ဥပမာ 15-07-1998",
            predictByBirth: "မွေးနေ့အလိုက် ခန့်မှန်းမည်",
            invalidBirth: "Date format မှားနေပါသည်။ dd-mm-yyyy သုံးပါ။",
            ageTitle: "လက်ရှိအသက်",
            ageDetail: "{years} နှစ်၊ {months} လ၊ {days} ရက်",
            ageTotals: "ယနေ့အထိ စုစုပေါင်း = {days} ရက် | {hours} နာရီ | {minutes} မိနစ်",
            luckyDigits: "ကိုက်ညီသော ဂဏန်း",
            luckyLetters: "ကိုက်ညီသော အက္ခရာ",
            luckyTickets: "ခန့်မှန်းလက်မှတ်များ",
            astrologyNote: "ဗေဒင်အခြေပြု အကြံပြုချက်သာဖြစ်ပြီး တရားဝင်ထီပေါက်စဉ်ဖြင့် အတည်ပြုပါ။",
          },
    [language],
  );

  const predictedNumberText = insight.predictedNumber ? displayDigits(insight.predictedNumber, language) : "--";
  const predictedLetterText = insight.predictedAlpha ?? "--";
  const ageDetails = useMemo(() => {
    const parsedBirthDate = parseDisplayDate(birthDate);
    return parsedBirthDate ? calculateAgeDetails(parsedBirthDate) : null;
  }, [birthDate]);
  const wheelSize = Math.max(220, Math.min(isDesktop ? 320 : width - 70, 320));
  const wheelRadius = wheelSize / 2;
  const sectorAngle = 360 / WHEEL_SECTOR_COUNT;

  const currentWheelTicket = useMemo(() => {
    if (wheelWinnerIndex !== null && wheelCandidates[wheelWinnerIndex]) return wheelCandidates[wheelWinnerIndex];
    return wheelFinal ?? wheelCandidates[0] ?? null;
  }, [wheelCandidates, wheelFinal, wheelWinnerIndex]);
  const wheelSpinDeg = wheelSpinValue.interpolate({
    inputRange: [0, 3600],
    outputRange: ["0deg", "3600deg"],
  });

  useEffect(() => {
    setWheelCandidates(Array.from({ length: WHEEL_SECTOR_COUNT }, () => spinWheelLuckyTicket(insight)));
    setWheelWinnerIndex(null);
    setWheelFinal(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insight]);

  const handleExportPredictionCard = async () => {
    if (exportingCard) return;
    setExportMessage(null);

    if (Platform.OS !== "web") {
      setExportMessage(t.exportFail);
      return;
    }

    try {
      setExportingCard(true);
      const root = document.getElementById("prediction-card-export");
      if (!root) throw new Error("prediction-card-not-found");
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default;
      const canvas = await html2canvas(root, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const dataUrl = canvas.toDataURL("image/png");
      const filename = `mks-prediction-${Date.now()}.png`;

      const doDownload = () => {
        const anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      };

      const canShareFiles = typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function";
      if (canShareFiles) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "MKS Prediction Card",
            text: "MKS Myanmar Lottery Prediction",
            files: [file],
          });
          setExportMessage(t.exportDone);
          return;
        }
      }

      doDownload();
      setExportMessage(t.exportDone);
    } catch (error) {
      console.warn("Prediction export failed", error);
      setExportMessage(t.exportFail);
    } finally {
      setExportingCard(false);
    }
  };

  const handleSpinWheel = () => {
    if (spinningWheel) return;
    const candidates = Array.from({ length: WHEEL_SECTOR_COUNT }, () => spinWheelLuckyTicket(insight));
    const winnerIndex = Math.floor(Math.random() * candidates.length);
    const turns = 5 + Math.floor(Math.random() * 3);
    const winnerCenterDeg = winnerIndex * sectorAngle + sectorAngle / 2;
    const finalRotationDelta = turns * 360 + ((360 - winnerCenterDeg) % 360);
    const nextRotation = wheelRotationRef.current + finalRotationDelta;

    setWheelCandidates(candidates);
    setWheelWinnerIndex(null);
    setSpinningWheel(true);
    setWheelFinal(null);
    Animated.timing(wheelSpinValue, {
      toValue: nextRotation,
      duration: 3200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      wheelRotationRef.current = nextRotation % 3600;
      setWheelWinnerIndex(winnerIndex);
      setWheelFinal(candidates[winnerIndex]);
      setSpinningWheel(false);
    });
  };

  const handleBirthdayPredict = () => {
    const suggestion = getBirthdayLuckySuggestion(birthDate, insight);
    if (!suggestion) {
      setBirthdaySuggestion(null);
      setBirthdayError(t.invalidBirth);
      return;
    }
    setBirthdayError(null);
    setBirthdaySuggestion(suggestion);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#F2FAFF", "#E8F5FF", "#FFFFFF"]}
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
          <View
            style={[
              styles.header,
              isNarrow ? { flexDirection: "column", alignItems: "flex-start", gap: 10 } : null,
            ]}
          >
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>{t.title}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.subtitle}</Text>
            </View>
            <View style={[styles.headerActions, isNarrow ? { alignSelf: "stretch", justifyContent: "flex-start" } : null]}>
              <LanguageToggle language={language} onChange={setLanguage} />
              <UserBadge user={user} onPress={() => router.push("/admin")} />
            </View>
          </View>

          <View style={[styles.scopeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.analyzeScope}</Text>
            <View style={styles.scopeTabs}>
              {([
                ["all", t.all],
                ["last10", t.last10],
                ["last20", t.last20],
              ] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.scopeBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: scope === key ? colors.primary : colors.background,
                    },
                  ]}
                  onPress={() => setScope(key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.scopeText,
                      { color: scope === key ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.scopeMetaWrap}>
              <Text style={[styles.scopeMetaText, { color: colors.mutedForeground }]}>
                {t.analyzed}: {formatCount(insight.drawsAnalyzed, language)} {t.draws} /{" "}
                {formatCount(insight.ticketsAnalyzed, language)} {t.tickets}
              </Text>
              {!!insight.analyzedDrawRange && (
                <Text style={[styles.scopeMetaText, { color: colors.mutedForeground }]}>
                  {t.drawRange}: {formatCount(insight.analyzedDrawRange.oldest, language)} -{" "}
                  {formatCount(insight.analyzedDrawRange.latest, language)}
                </Text>
              )}
            </View>
          </View>

          <AppAdBanner placement="search" language={language} />

          <View
            nativeID="prediction-card-export"
            style={[styles.predictionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.titleAndActions}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.predictedCardTitle}</Text>
              <TouchableOpacity
                style={[styles.exportBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => void handleExportPredictionCard()}
                activeOpacity={0.8}
              >
                <Feather name="download" size={14} color={colors.primary} />
                <Text style={[styles.exportBtnText, { color: colors.primary }]}>
                  {exportingCard ? t.shareCard : t.exportCard}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.predictionGrid, isDesktop && styles.predictionGridDesktop]}>
              <View style={[styles.predictionItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="type" size={16} color={colors.primary} />
                <Text style={[styles.predictionLabel, { color: colors.mutedForeground }]}>{t.predictedLetter}</Text>
                <Text style={[styles.predictionValue, { color: colors.foreground }]}>{predictedLetterText}</Text>
              </View>
              <View style={[styles.predictionItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="hash" size={16} color={colors.primary} />
                <Text style={[styles.predictionLabel, { color: colors.mutedForeground }]}>{t.predictedNumber}</Text>
                <Text style={[styles.predictionValue, { color: colors.foreground }]}>{predictedNumberText}</Text>
              </View>
              <View style={[styles.predictionItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="activity" size={16} color={colors.primary} />
                <Text style={[styles.predictionLabel, { color: colors.mutedForeground }]}>{t.confidence}</Text>
                <Text style={[styles.predictionValue, { color: colors.foreground }]}>
                  {formatPercent(insight.predictedNumberConfidence, language)}
                </Text>
              </View>
            </View>
            {!insight.predictedNumber && (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noPrediction}</Text>
            )}
            {!!exportMessage && <Text style={[styles.noticeText, { color: colors.primary }]}>{exportMessage}</Text>}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.wheelTitle}</Text>
            <Text style={[styles.subtitleText, { color: colors.mutedForeground }]}>{t.wheelDesc}</Text>

            <View style={styles.spinnerWrap}>
              <View style={[styles.pointer, { borderBottomColor: colors.primary }]} />
              <Animated.View style={{ transform: [{ rotate: wheelSpinDeg }] }}>
                <Svg width={wheelSize} height={wheelSize} viewBox={`0 0 ${wheelSize} ${wheelSize}`}>
                  {wheelCandidates.map((ticket, idx) => {
                    const startDeg = -90 + idx * sectorAngle;
                    const endDeg = startDeg + sectorAngle;
                    const midDeg = startDeg + sectorAngle / 2;
                    const path = createPieSlicePath(wheelRadius, wheelRadius, wheelRadius - 4, startDeg, endDeg);
                    const labelPoint = polarToCartesian(wheelRadius, wheelRadius, wheelRadius * 0.66, midDeg);
                    return (
                      <React.Fragment key={`sector-${idx}`}>
                        <Path d={path} fill={WHEEL_COLORS[idx % WHEEL_COLORS.length]} stroke="#FFFFFF" strokeWidth={1.4} />
                        <SvgText
                          x={labelPoint.x}
                          y={labelPoint.y}
                          fontSize={10}
                          fontWeight="700"
                          fill="#2A2A2A"
                          textAnchor="middle"
                          alignmentBaseline="middle"
                          transform={`rotate(${midDeg + 90} ${labelPoint.x} ${labelPoint.y})`}
                        >
                          {sectorLabel(ticket, language)}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}
                  <Circle cx={wheelRadius} cy={wheelRadius} r={wheelRadius * 0.2} fill="#FFFFFF" />
                  <Circle cx={wheelRadius} cy={wheelRadius} r={wheelRadius * 0.16} fill="#FFD47A" />
                </Svg>
              </Animated.View>

              <View style={[styles.wheelCenterBadge, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Feather name={spinningWheel ? "loader" : "target"} size={16} color={colors.primary} />
                <Text style={[styles.wheelCenterText, { color: colors.foreground }]}>
                  {currentWheelTicket ? formatTicket(currentWheelTicket, language) : "--"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleSpinWheel}
              activeOpacity={0.82}
            >
              <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                {spinningWheel ? t.spinning : t.spinNow}
              </Text>
            </TouchableOpacity>

            {!!currentWheelTicket && (
              <View style={[styles.resultBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.resultTitle, { color: colors.foreground }]}>{t.wheelResult}</Text>
                <Text style={[styles.resultMain, { color: colors.foreground }]}>{formatTicket(currentWheelTicket, language)}</Text>
                <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
                  {t.frontPair}: {displayDigits(currentWheelTicket.prefix2, language)} | {t.backPair}: {displayDigits(currentWheelTicket.suffix2, language)}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.astroTitle}</Text>
            <Text style={[styles.subtitleText, { color: colors.mutedForeground }]}>{t.astroDesc}</Text>

            <View style={styles.birthdayInputRow}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <DatePickerField
                  label={t.birthLabel}
                  value={birthDate}
                  onChange={(next) => {
                    setBirthDate(next);
                    setBirthdayError(null);
                  }}
                  placeholder={t.birthPlaceholder}
                  helperText={language === "en" ? "Format: dd-mm-yyyy" : "ပုံစံ: dd-mm-yyyy"}
                  borderColor={colors.border}
                  backgroundColor={colors.background}
                  textColor={colors.foreground}
                  mutedColor={colors.mutedForeground}
                  primaryColor={colors.primary}
                  primaryForeground={colors.primaryForeground}
                  maximumDate={new Date()}
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]}
                onPress={handleBirthdayPredict}
                activeOpacity={0.82}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>{t.predictByBirth}</Text>
              </TouchableOpacity>
            </View>

            {!!birthdayError && <Text style={[styles.errorText, { color: colors.destructive }]}>{birthdayError}</Text>}

            {!!ageDetails && (
              <View style={[styles.ageBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.resultTitle, { color: colors.foreground }]}>{t.ageTitle}</Text>
                <Text style={[styles.ageMain, { color: colors.foreground }]}>
                  {t.ageDetail
                    .replace("{years}", formatCount(ageDetails.years, language))
                    .replace("{months}", formatCount(ageDetails.months, language))
                    .replace("{days}", formatCount(ageDetails.days, language))}
                </Text>
                <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
                  {t.ageTotals
                    .replace("{days}", formatCount(ageDetails.totalDays, language))
                    .replace("{hours}", formatCount(ageDetails.totalHours, language))
                    .replace("{minutes}", formatCount(ageDetails.totalMinutes, language))}
                </Text>
              </View>
            )}

            {!!birthdaySuggestion && (
              <View style={[styles.resultBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.resultTitle, { color: colors.foreground }]}>
                  {language === "en" ? birthdaySuggestion.weekdayEn : birthdaySuggestion.weekdayMm}
                </Text>
                <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
                  {t.luckyDigits}: {displayDigits(birthdaySuggestion.luckyDigits.join(", "), language)}
                </Text>
                <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
                  {t.luckyLetters}: {birthdaySuggestion.luckyLetters.join(", ")}
                </Text>

                <Text style={[styles.resultTitle, styles.mt8, { color: colors.foreground }]}>{t.luckyTickets}</Text>
                {birthdaySuggestion.tickets.map((ticket, idx) => (
                  <View key={`birth-${idx}`} style={[styles.ticketRow, { borderColor: colors.border }]}>
                    <Text style={[styles.ticketMain, { color: colors.foreground }]}>
                      {formatCount(idx + 1, language)}. {formatTicket(ticket, language)}
                    </Text>
                    <Text style={[styles.ticketSub, { color: colors.mutedForeground }]}>
                      {t.frontPair}: {displayDigits(ticket.prefix2, language)} | {t.backPair}: {displayDigits(ticket.suffix2, language)}
                    </Text>
                  </View>
                ))}

                <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>{t.astrologyNote}</Text>
              </View>
            )}
          </View>

          <View style={[styles.columns, isDesktop && styles.columnsDesktop]}>
            <View style={[styles.column, styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.topLetters}</Text>
              <FrequencyList items={insight.topAlphas} emptyText="-" language={language} />
            </View>

            <View style={[styles.column, styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.repeatedNumbers}</Text>
              <FrequencyList items={insight.topRepeatedNumbers} emptyText={t.noRepeat} language={language} />
            </View>
          </View>

          <View style={[styles.columns, isDesktop && styles.columnsDesktop]}>
            <View style={[styles.column, styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.hotDigits}</Text>
              <FrequencyList items={insight.topDigits} emptyText="-" language={language} />
            </View>

            <View style={[styles.column, styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.hotPrefix}</Text>
              <FrequencyList items={insight.topPrefixes2} emptyText="-" language={language} />
              <Text style={[styles.sectionTitle, styles.subSectionTitle, { color: colors.foreground }]}>{t.hotSuffix}</Text>
              <FrequencyList items={insight.topSuffixes2} emptyText="-" language={language} />
            </View>
          </View>
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
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  scopeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  scopeTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scopeBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scopeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  scopeMetaWrap: {
    gap: 2,
  },
  scopeMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  predictionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  titleAndActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  exportBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  exportBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  subSectionTitle: {
    marginTop: 12,
  },
  subtitleText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  predictionGrid: {
    gap: 8,
  },
  predictionGridDesktop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  predictionItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  predictionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  predictionValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  spinnerWrap: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingTop: 18,
  },
  pointer: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 20,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    zIndex: 10,
  },
  wheelCenterBadge: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minWidth: 132,
  },
  wheelCenterText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  primaryBtnSmall: {
    minWidth: 170,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  primaryBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  resultBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginTop: 8,
  },
  resultTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  resultMain: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  resultSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  noticeText: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  birthdayInputRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 6,
  },
  birthInput: {
    flex: 1,
    minWidth: 200,
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  ageBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  ageMain: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  mt8: {
    marginTop: 8,
  },
  ticketRow: {
    marginTop: 6,
    borderTopWidth: 1,
    paddingTop: 6,
    gap: 2,
  },
  ticketMain: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  ticketSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  columns: {
    gap: 12,
  },
  columnsDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  column: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  listWrap: {
    marginTop: 10,
    gap: 6,
  },
  listRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  listValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  rankText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  valueText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
