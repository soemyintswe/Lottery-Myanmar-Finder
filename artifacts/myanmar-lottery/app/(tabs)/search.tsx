import React, { useState } from "react";
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
import { useColors } from "@/hooks/useColors";
import { useLottery } from "@/context/LotteryContext";
import { MYANMAR_ALPHABETS } from "@/types/lottery";
import { searchLottery } from "@/services/lotteryService";
import { SearchResult } from "@/types/lottery";
import SearchResultCard from "@/components/SearchResultCard";
import DrawSelector from "@/components/DrawSelector";
import { normalizeDigits, toMM } from "@/utils/myanmar";
import { LinearGradient } from "expo-linear-gradient";

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { results, selectedDraw, setSelectedDraw } = useLottery();

  const [selectedAlpha, setSelectedAlpha] = useState<string | null>(null);
  const [numberInput, setNumberInput] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const currentResult = results.find((r) => r.drawNumber === selectedDraw) ?? null;

  const isDesktop = width >= 980;
  const contentWidth = Math.min(width - 24, 1120);
  const topPadding = Platform.OS === "web" ? 26 : insets.top + 8;

  // Normalize to English digits for length counting and matching
  const normalizedInput = normalizeDigits(numberInput);

  const handleSearch = () => {
    if (!currentResult) return;
    if (normalizedInput.length === 0) return;

    const detectedAlpha = numberInput.match(/[က-အ]/)?.[0] ?? null;
    const alphaForSearch = selectedAlpha ?? detectedAlpha;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = searchLottery(currentResult, normalizedInput, alphaForSearch);
    setSearchResult(result);
    if (!selectedAlpha && detectedAlpha && MYANMAR_ALPHABETS.includes(detectedAlpha)) {
      setSelectedAlpha(detectedAlpha);
    }

    if (result.matched) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleClear = () => {
    setNumberInput("");
    setSearchResult(null);
    setSelectedAlpha(null);
  };

  const handleNumberChange = (t: string) => {
    // Accept both Myanmar and English digit input
    setNumberInput(t);
    setSearchResult(null);
  };

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
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Search Lottery Number</Text>
          </View>

          <View style={[styles.columns, isDesktop && styles.columnsDesktop]}>
            <View style={[styles.column, styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ထီပွဲရွေးချယ်ပါ</Text>
              <DrawSelector
                results={results}
                selectedDraw={selectedDraw}
                onSelect={setSelectedDraw}
              />

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>မြန်မာ အက္ခရာ (အကြံပြု)</Text>
              <View style={styles.alphabetGrid}>
                {MYANMAR_ALPHABETS.map((alpha) => (
                  <TouchableOpacity
                    key={alpha}
                    onPress={() => {
                      setSelectedAlpha(selectedAlpha === alpha ? null : alpha);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.alphaChip,
                      {
                        backgroundColor: selectedAlpha === alpha ? colors.primary : colors.card,
                        borderColor: selectedAlpha === alpha ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.alphaText,
                        { color: selectedAlpha === alpha ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {alpha}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                ဂဏန်း ထည့်ပါ (မြန်မာ/English)
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.foreground,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                  value={numberInput}
                  onChangeText={handleNumberChange}
                  placeholder="ဥပမာ - ၇၅၇၇၆၇ သို့မဟုတ် 757767"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="default"
                  maxLength={12}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
                {numberInput.length > 0 && (
                  <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
                    <Feather name="x" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>

              {normalizedInput.length > 0 && normalizedInput.length <= 6 && (
                <View style={[styles.digitPreview, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.digitPreviewLabel, { color: colors.mutedForeground }]}>စစ်ဆေးမည့် ဂဏန်း:</Text>
                  <Text style={[styles.digitPreviewValue, { color: colors.foreground }]}>
                    {toMM(normalizedInput)}
                    <Text style={[styles.digitPreviewEn, { color: colors.mutedForeground }]}> ({normalizedInput})</Text>
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.searchBtn,
                  { backgroundColor: normalizedInput.length >= 1 ? colors.primary : colors.muted },
                ]}
                onPress={handleSearch}
                disabled={normalizedInput.length < 1}
                activeOpacity={0.8}
              >
                <Feather
                  name="search"
                  size={18}
                  color={normalizedInput.length >= 1 ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.searchBtnText,
                    { color: normalizedInput.length >= 1 ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  စစ်ဆေးမည်
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.column}>
              {searchResult && <SearchResultCard result={searchResult} />}
              <View style={[styles.rulesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.rulesTitle, { color: colors.foreground }]}>စစ်ဆေးပုံ နည်းလမ်း</Text>
                <View style={styles.ruleRow}>
                  <View style={[styles.ruleDot, { backgroundColor: "#C0392B" }]} />
                  <Text style={[styles.ruleText, { color: colors.mutedForeground }]}>
                    အက္ခရာ + ဂဏန်း ၆ လုံး တိတိကျကျ ကိုက် → ဆုကြီး
                  </Text>
                </View>
                <View style={styles.ruleRow}>
                  <View style={[styles.ruleDot, { backgroundColor: "#27AE60" }]} />
                  <Text style={[styles.ruleText, { color: colors.mutedForeground }]}>
                    အက္ခရာ + ရှေ့ဂဏန်း ၅/၄/၃/၂/၁ လုံး ကိုက် → ပဒေသာ/ဘဏ္ဍာသိမ်းဆု
                  </Text>
                </View>
                <View style={styles.ruleRow}>
                  <View style={[styles.ruleDot, { backgroundColor: "#8E44AD" }]} />
                  <Text style={[styles.ruleText, { color: colors.mutedForeground }]}>
                    အက္ခရာ မရွေးထားပါက နံပါတ်ကိုက်မှုသာ ပြမည်၊ အတည်ပြုဖို့ အက္ခရာရွေးပါ
                  </Text>
                </View>
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
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 4,
  },
  alphabetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  alphaChip: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  alphaText: { fontSize: 18, fontFamily: "Inter_500Medium" },
  inputRow: { position: "relative" },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingRight: 44,
    fontSize: 18,
    letterSpacing: 2,
  },
  clearBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  digitPreview: {
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  digitPreviewLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  digitPreviewValue: { fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  digitPreviewEn: { fontSize: 12, fontFamily: "Inter_400Regular" },
  searchBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  searchBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  rulesCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  rulesTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  ruleDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  ruleText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
