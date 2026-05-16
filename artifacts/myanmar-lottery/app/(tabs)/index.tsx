import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLottery } from "@/context/LotteryContext";
import DrawSelector from "@/components/DrawSelector";
import NumberChip from "@/components/NumberChip";
import PrizeBadge from "@/components/PrizeBadge";
import { Feather } from "@expo/vector-icons";
import { toMM, toMMDate } from "@/utils/myanmar";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { results, loading, error, firestoreConnected, refresh, selectedDraw, setSelectedDraw } = useLottery();

  const current = results.find((r) => r.drawNumber === selectedDraw) ?? results[0] ?? null;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>မြန်မာ ထီ ရလဒ်</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Myanmar Lottery Results</Text>
        </View>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn} activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="refresh-cw" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
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
        results={results}
        selectedDraw={selectedDraw}
        onSelect={setSelectedDraw}
      />

      {current ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.drawHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.drawHeaderTop}>
              <Text style={[styles.drawTitle, { color: colors.foreground }]}>
                {toMM(current.drawNumber)} ကြိမ်မြောက် မြန်မာ ထီ
              </Text>
              <View style={[
                styles.offlineBadge,
                { backgroundColor: firestoreConnected ? "#D5F5E3" : colors.accent }
              ]}>
                <Feather
                  name={firestoreConnected ? "cloud" : "cloud-off"}
                  size={10}
                  color={firestoreConnected ? "#27AE60" : colors.accentForeground}
                />
                <Text style={[
                  styles.offlineBadgeText,
                  { color: firestoreConnected ? "#27AE60" : colors.accentForeground }
                ]}>
                  {firestoreConnected ? "Firebase" : "Local"}
                </Text>
              </View>
            </View>
            <Text style={[styles.drawDate, { color: colors.mutedForeground }]}>
              ဆုမဲဖောက်သည့်နေ့ — {toMMDate(current.drawDate)}
            </Text>
          </View>

          {current.prizes.map((prize, idx) => (
            <View key={idx} style={[styles.prizeSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.prizeHeader}>
                <PrizeBadge amount={prize.amount} />
                <Text style={[styles.winnerCount, { color: colors.mutedForeground }]}>
                  {toMM(prize.numbers.length)} ဆုကံ
                </Text>
              </View>
              <View style={styles.numbersWrap}>
                {prize.numbers.map((num, nIdx) => (
                  <NumberChip key={nIdx} number={num} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Feather name="inbox" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>ရလဒ်မတွေ့ပါ</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
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
  refreshBtn: {
    padding: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 10,
    borderRadius: 8,
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
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  drawHeader: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  drawHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  drawTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  drawDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  offlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  offlineBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  prizeSection: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  prizeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  winnerCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  numbersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
