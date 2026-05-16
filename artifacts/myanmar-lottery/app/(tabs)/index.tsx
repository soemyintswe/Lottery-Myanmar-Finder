import React from "react";
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
import { useLottery } from "@/context/LotteryContext";
import DrawSelector from "@/components/DrawSelector";
import NumberChip from "@/components/NumberChip";
import PrizeBadge from "@/components/PrizeBadge";
import { Feather } from "@expo/vector-icons";
import { toMM, toMMDate } from "@/utils/myanmar";
import { LinearGradient } from "expo-linear-gradient";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { results, loading, error, firestoreConnected, refresh, selectedDraw, setSelectedDraw } = useLottery();

  const current = results.find((r) => r.drawNumber === selectedDraw) ?? results[0] ?? null;
  const isDesktop = width >= 980;
  const contentWidth = Math.min(width - 24, 1120);

  const topPadding = Platform.OS === "web" ? 26 : insets.top + 8;

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
              <Text style={[styles.title, { color: colors.foreground }]}>မြန်မာ ထီ ရလဒ်</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Myanmar Lottery Results</Text>
            </View>
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
                      {firestoreConnected ? "Firebase" : "Local Seed"}
                    </Text>
                  </View>
                </View>

                {!!current.sourceName && (
                  <View style={styles.metaRow}>
                    <Feather name="check-circle" size={12} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      Data source: {current.sourceName}
                    </Text>
                  </View>
                )}

                {!!current.verifiedAt && (
                  <View style={styles.metaRow}>
                    <Feather name="clock" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      Verified: {new Date(current.verifiedAt).toLocaleString()}
                    </Text>
                  </View>
                )}

                {!!current.sourceUrl && (
                  <TouchableOpacity onPress={() => Linking.openURL(current.sourceUrl!)} activeOpacity={0.7}>
                    <Text style={[styles.sourceLink, { color: colors.primary }]}>Source Link ဖွင့်မည်</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.prizesGrid, isDesktop && styles.prizesGridDesktop]}>
                {current.prizes.map((prize, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.prizeSection,
                      isDesktop && styles.prizeSectionDesktop,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.prizeHeader}>
                      <PrizeBadge amount={prize.amount} />
                      <Text style={[styles.winnerCount, { color: colors.mutedForeground }]}>
                        {toMM(prize.numbers.length)} ဆုကံ
                      </Text>
                    </View>
                    {prize.numbers.length > 0 ? (
                      <View style={styles.numbersWrap}>
                        {prize.numbers.map((num, nIdx) => (
                          <NumberChip key={nIdx} number={num} />
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.emptyPrize, { color: colors.mutedForeground }]}>
                        ယခုအတွက် စာရင်းမထည့်ရသေးပါ
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.center}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>ရလဒ်မတွေ့ပါ</Text>
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  winnerCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  numbersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
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
