import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { useColors } from "@/hooks/useColors";
import { useLottery } from "@/context/LotteryContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { AppAd } from "@/types/ad";
import { trackAdClick } from "@/services/adService";

function isAdVisible(ad: AppAd): boolean {
  if (!ad.isActive) return false;
  const now = Date.now();
  if (ad.startAt) {
    const start = new Date(ad.startAt).getTime();
    if (Number.isFinite(start) && now < start) return false;
  }
  if (ad.endAt) {
    const end = new Date(ad.endAt).getTime();
    if (Number.isFinite(end) && now > end) return false;
  }
  return true;
}

export default function AdsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ads } = useLottery();
  const { language } = useAppLanguage();

  const t = useMemo(
    () =>
      language === "en"
        ? {
            title: "Advertisements",
            subtitle: "Partner lottery shops and sponsors",
            empty: "No advertisements available now.",
            open: "Open",
            placement: "Placement",
            home: "Home",
            search: "Checker",
            both: "Home + Checker",
          }
        : {
            title: "ကြော်ငြာများ",
            subtitle: "ပါတနာထီဆိုင်များနှင့် စပွန်ဆာများ",
            empty: "ယခုအချိန်တွင် ကြော်ငြာမရှိသေးပါ။",
            open: "ဖွင့်မည်",
            placement: "ပြမည့်နေရာ",
            home: "Result",
            search: "Checker",
            both: "Result + Checker",
          },
    [language],
  );

  const visibleAds = useMemo(
    () =>
      ads
        .filter(isAdVisible)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    [ads],
  );

  const openAd = async (ad: AppAd) => {
    const raw = ad.targetUrl?.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
      void trackAdClick(ad);
      return;
    }
    try {
      await Linking.openURL(url);
      void trackAdClick(ad);
    } catch (e) {
      console.warn("Cannot open ad url", e);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
        <View style={styles.page}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.subtitle}</Text>

          {visibleAds.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.empty}</Text>
            </View>
          ) : (
            visibleAds.map((ad) => {
              const placementLabel =
                ad.placement === "home"
                  ? t.home
                  : ad.placement === "search"
                    ? t.search
                    : t.both;
              const title = language === "en" ? ad.titleEn || ad.titleMm : ad.titleMm || ad.titleEn || "";

              return (
                <View key={ad.id || `${ad.titleMm}-${ad.order}`} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Image source={{ uri: ad.imageUrl }} style={styles.image} resizeMode="cover" />
                  <Text style={[styles.adTitle, { color: colors.foreground }]}>{title}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {t.placement}: {placementLabel}
                  </Text>
                  <TouchableOpacity
                    style={[styles.openBtn, { backgroundColor: colors.primary }]}
                    onPress={() => void openAd(ad)}
                    activeOpacity={0.85}
                  >
                    <Feather name="external-link" size={14} color={colors.primaryForeground} />
                    <Text style={[styles.openBtnText, { color: colors.primaryForeground }]}>{t.open}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { paddingHorizontal: 12, paddingTop: Platform.OS === "web" ? 26 : 16, gap: 12 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 10,
  },
  adTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  openBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  openBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
