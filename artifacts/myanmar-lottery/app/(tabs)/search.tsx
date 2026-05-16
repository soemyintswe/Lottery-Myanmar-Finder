import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLottery } from "@/context/LotteryContext";
import { MYANMAR_ALPHABETS } from "@/types/lottery";
import { searchLottery } from "@/services/lotteryService";
import { SearchResult } from "@/types/lottery";
import SearchResultCard from "@/components/SearchResultCard";
import DrawSelector from "@/components/DrawSelector";

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { results, selectedDraw, setSelectedDraw } = useLottery();

  const [selectedAlpha, setSelectedAlpha] = useState<string | null>(null);
  const [numberInput, setNumberInput] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const currentResult = results.find((r) => r.drawNumber === selectedDraw) ?? null;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleSearch = () => {
    if (!currentResult) return;
    if (numberInput.trim().length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = searchLottery(currentResult, numberInput.trim(), selectedAlpha ?? undefined);
    setSearchResult(result);

    if (result.matched) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleClear = () => {
    setNumberInput("");
    setSearchResult(null);
    setSelectedAlpha(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>ထီ စစ်ဆေးရန်</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Search Lottery Number</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ထီပွဲရွေးချယ်ပါ</Text>
        <DrawSelector
          results={results}
          selectedDraw={selectedDraw}
          onSelect={setSelectedDraw}
        />

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>မြန်မာ အက္ခရာ</Text>
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
              <Text style={[
                styles.alphaText,
                { color: selectedAlpha === alpha ? colors.primaryForeground : colors.foreground },
              ]}>
                {alpha}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          ဂဏန်း ၆ လုံး ထည့်ပါ
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
                fontFamily: "Inter_500Medium",
              },
            ]}
            value={numberInput}
            onChangeText={(t) => {
              setNumberInput(t.replace(/[^0-9]/g, "").slice(0, 6));
              setSearchResult(null);
            }}
            placeholder="ဥပမာ - 757767"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            maxLength={6}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {numberInput.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.searchBtn,
            {
              backgroundColor: numberInput.length === 6 ? colors.primary : colors.muted,
            },
          ]}
          onPress={handleSearch}
          disabled={numberInput.length < 1}
          activeOpacity={0.8}
        >
          <Feather name="search" size={18} color={numberInput.length >= 1 ? colors.primaryForeground : colors.mutedForeground} />
          <Text style={[
            styles.searchBtnText,
            { color: numberInput.length >= 1 ? colors.primaryForeground : colors.mutedForeground },
          ]}>
            စစ်ဆေးမည်
          </Text>
        </TouchableOpacity>

        {searchResult && <SearchResultCard result={searchResult} />}

        {numberInput.length > 0 && numberInput.length < 6 && (
          <View style={[styles.hint, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="info" size={14} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              ဂဏန်း {numberInput.length} လုံး ထည့်ပြီး (ဆုကြီး {6 - numberInput.length} လုံးကျန်) ။
              ဂဏန်း ၁–၅ လုံးနှင့် ဝဲဝဲဆာဆာ စစ်ဆေးနိုင်သည်
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 4,
  },
  alphabetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  alphaChip: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  alphaText: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
  },
  inputRow: {
    position: "relative",
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 20,
    letterSpacing: 4,
  },
  clearBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  searchBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  searchBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  hint: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
