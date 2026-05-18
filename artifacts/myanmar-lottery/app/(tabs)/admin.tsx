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
import { addResult, updateResult, deleteResult } from "@/services/lotteryService";
import { LotteryResult, PrizeEntry, LotteryRuleEntry, MYANMAR_ALPHABETS } from "@/types/lottery";
import PrizeBadge from "@/components/PrizeBadge";
import { normalizeDigits } from "@/utils/myanmar";

const ADMIN_PIN = "1234";

const PRIZE_CATEGORY_OPTIONS = [
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
  const [openEntryCategoryPickerIndex, setOpenEntryCategoryPickerIndex] = useState<number | null>(null);
  const [entryCategoryQuery, setEntryCategoryQuery] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>(PRIZE_CATEGORY_OPTIONS);
  const [saving, setSaving] = useState(false);

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
    setOpenEntryCategoryPickerIndex(null);
    setPrizeCategoryQuery("");
    setEntryCategoryQuery("");
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
    setOpenEntryCategoryPickerIndex(null);
    setPrizeCategoryQuery("");
    setEntryCategoryQuery("");
    setEditingResult(r);
    setShowAddModal(true);
  };

  const addPrizeRow = () => {
    setPrizes((prev) => [...prev, { amount: "ကျပ်သိန်း (၁၀၀) ဆုများ", numbers: [""] }]);
  };

  const removePrizeRow = (idx: number) => {
    setPrizes((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePrizeAmount = (idx: number, amount: string) => {
    setPrizes((prev) => prev.map((p, i) => (i === idx ? { ...p, amount } : p)));
  };

  const updatePrizeNumbers = (idx: number, numbersStr: string) => {
    setPrizes((prev) => prev.map((p, i) => (i === idx ? { ...p, numbers: numbersStr ? numbersStr.split(",").map(n => n.trim()) : [""] } : p)));
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

      if (editingResult?.id && !editingResult.id.startsWith("local-")) {
        await updateResult(editingResult.id, {
          drawNumber: drawNum,
          drawDate,
          prizes: cleanPrizes,
          entries: cleanEntries,
          sourceName: sourceName.trim() || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          verifiedAt: verifiedAtIso,
        });
      } else {
        await addResult({
          drawNumber: drawNum,
          drawDate,
          prizes: cleanPrizes,
          entries: cleanEntries,
          sourceName: sourceName.trim() || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          verifiedAt: verifiedAtIso,
        });
      }
      await refresh();
      setShowAddModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("မအောင်မြင်ပါ", e.message);
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
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                  value={prize.amount}
                  onFocus={() => {
                    setOpenCategoryPickerIndex(idx);
                    setPrizeCategoryQuery(prize.amount);
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
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                  value={prize.numbers.join(", ")}
                  onChangeText={(t) => updatePrizeNumbers(idx, t)}
                  placeholder="757767, 123456 (ကော်မာနှင့် ခွဲပါ)"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="default"
                  multiline
                />
              </View>
            ))}

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
                  <TouchableOpacity onPress={() => removeEntryRow(idx)} activeOpacity={0.7}>
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                  value={entry.prizeCategory}
                  onFocus={() => {
                    setOpenEntryCategoryPickerIndex(idx);
                    setEntryCategoryQuery(entry.prizeCategory || "");
                  }}
                  onChangeText={(t) => {
                    updateEntry(idx, "prizeCategory", t);
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
                            updateEntry(idx, "prizeCategory", option);
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
                            updateEntry(idx, "prizeCategory", newValue);
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
                  <TextInput
                    style={[styles.fieldInput, styles.rowInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                    value={entry.alpha}
                    onChangeText={(t) => updateEntry(idx, "alpha", t.trim())}
                    placeholder="အက္ခရာ"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <TextInput
                    style={[styles.fieldInput, styles.rowInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                    value={entry.pattern}
                    onChangeText={(t) => updateEntry(idx, "pattern", normalizeDigits(t).slice(0, 6))}
                    placeholder="Pattern (digits)"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.row3}>
                  <TextInput
                    style={[styles.fieldInput, styles.rowInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                    value={String(entry.matchLength ?? "")}
                    onChangeText={(t) => updateEntry(idx, "matchLength", Number(normalizeDigits(t) || "0"))}
                    placeholder="MatchLen"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.fieldInput, styles.rowInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                    value={String(entry.rank ?? "")}
                    onChangeText={(t) => updateEntry(idx, "rank", Number(normalizeDigits(t) || "0"))}
                    placeholder="Rank"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.fieldInput, styles.rowInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                    value={entry.winners ?? ""}
                    onChangeText={(t) => updateEntry(idx, "winners", t)}
                    placeholder="ကံထူးရှင်အရေအတွက်"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>

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
  subFieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
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
