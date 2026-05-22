import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useColors } from "@/hooks/useColors";
import { useLottery } from "@/context/LotteryContext";
import { AppAd, AdPlacement } from "@/types/ad";
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

interface Props {
  placement: Exclude<AdPlacement, "both">;
  language: "mm" | "en";
}

export default function AppAdBanner({ placement, language }: Props) {
  const colors = useColors();
  const { ads } = useLottery();

  const ad = useMemo(() => {
    return ads
      .filter((a) => a.placement === placement || a.placement === "both")
      .filter(isAdVisible)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))[0];
  }, [ads, placement]);

  if (!ad) return null;

  const openLink = async () => {
    const raw = ad.targetUrl?.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    // Web browsers can block popups when the navigation is delayed by awaits.
    // Open immediately, then track click in background.
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
      void trackAdClick(ad);
      return;
    }
    if (!url) return;
    try {
      await Linking.openURL(url);
      void trackAdClick(ad);
    } catch (e) {
      console.warn("Cannot open ad url", e);
    }
  };

  const title = language === "en" ? ad.titleEn || ad.titleMm : ad.titleMm || ad.titleEn || "";

  return (
    <TouchableOpacity
      style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={openLink}
      activeOpacity={0.9}
    >
      <View style={styles.row}>
        <Image source={{ uri: ad.imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.content}>
          <View style={styles.labelRow}>
            <Text style={[styles.sponsored, { color: colors.mutedForeground }]}>
              {language === "en" ? "Sponsored" : "ကြော်ငြာ"}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.ctaRow}>
            <Text style={[styles.cta, { color: colors.primary }]}>
              {language === "en" ? "Open" : "ဖွင့်ကြည့်မည်"}
            </Text>
            <Feather name="external-link" size={12} color={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  image: {
    width: 92,
    height: 68,
    borderRadius: 10,
  },
  content: {
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sponsored: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  ctaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cta: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
