import React, { useEffect, useState } from "react";
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
import { LotteryResult, PrizeEntry } from "@/types/lottery";
import PrizeBadge from "@/components/PrizeBadge";

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
  const [openCategoryPickerIndex, setOpenCategoryPickerIndex] = useState<number | null>(null);
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
    setOpenCategoryPickerIndex(null);
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
    setOpenCategoryPickerIndex(null);
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

      if (editingResult?.id && !editingResult.id.startsWith("local-")) {
        await updateResult(editingResult.id, { drawNumber: drawNum, drawDate, prizes: cleanPrizes });
      } else {
        await addResult({ drawNumber: drawNum, drawDate, prizes: cleanPrizes });
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
                  onChangeText={(t) => updatePrizeAmount(idx, t)}
                  placeholder="ဥပမာ - ကျပ်သိန်း (၅၀၀၀) ဆု"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="default"
                />
                <TouchableOpacity
                  style={[styles.pickerToggle, { borderColor: colors.border, backgroundColor: colors.muted }]}
                  onPress={() =>
                    setOpenCategoryPickerIndex((prev) => (prev === idx ? null : idx))
                  }
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerToggleText, { color: colors.foreground }]}>
                    စာရင်းမှရွေးမည်
                  </Text>
                  <Feather
                    name={openCategoryPickerIndex === idx ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
                {openCategoryPickerIndex === idx && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {PRIZE_CATEGORY_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            updatePrizeAmount(idx, option);
                            setOpenCategoryPickerIndex(null);
                          }}
                          style={[
                            styles.amtChip,
                            {
                              backgroundColor: prize.amount === option ? colors.primary : colors.muted,
                              borderColor: prize.amount === option ? colors.primary : colors.border,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.amtChipText, { color: prize.amount === option ? colors.primaryForeground : colors.foreground }]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
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
  prizesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  prizeInputCard: { borderRadius: 12, padding: 12, borderWidth: 1, marginTop: 8 },
  prizeInputHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  subFieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  pickerToggle: {
    marginTop: 8,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerToggleText: { fontSize: 13, fontFamily: "Inter_500Medium" },
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
