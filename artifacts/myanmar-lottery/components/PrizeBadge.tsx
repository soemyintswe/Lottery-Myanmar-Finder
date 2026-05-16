import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface PrizeBadgeProps {
  amount: string;
  compact?: boolean;
}

const PRIZE_COLORS: Record<string, { bg: string; text: string }> = {
  "3000": { bg: "#C0392B", text: "#FFFFFF" },
  "2000": { bg: "#E67E22", text: "#FFFFFF" },
  "1000": { bg: "#D4AC0D", text: "#000000" },
  "500":  { bg: "#27AE60", text: "#FFFFFF" },
  "300":  { bg: "#2980B9", text: "#FFFFFF" },
  "200":  { bg: "#8E44AD", text: "#FFFFFF" },
  "100":  { bg: "#16A085", text: "#FFFFFF" },
  "50":   { bg: "#7F8C8D", text: "#FFFFFF" },
  "wai":  { bg: "#BDC3C7", text: "#2C3E50" },
};

const PRIZE_LABELS: Record<string, string> = {
  "3000": "၃၀၀၀ သိန်း",
  "2000": "၂၀၀၀ သိန်း",
  "1000": "၁၀၀၀ သိန်း",
  "500":  "၅၀၀ သိန်း",
  "300":  "၃၀၀ သိန်း",
  "200":  "၂၀၀ သိန်း",
  "100":  "၁၀၀ သိန်း",
  "50":   "၅၀ သိန်း",
  "wai":  "ဝဲဝဲဆာဆာ",
};

export default function PrizeBadge({ amount, compact }: PrizeBadgeProps) {
  const colors = useColors();
  const theme = PRIZE_COLORS[amount] ?? { bg: colors.primary, text: colors.primaryForeground };
  const label = PRIZE_LABELS[amount] ?? amount;

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg }, compact && styles.compact]}>
      <Text style={[styles.text, { color: theme.text }, compact && styles.compactText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  compactText: {
    fontSize: 11,
  },
});
