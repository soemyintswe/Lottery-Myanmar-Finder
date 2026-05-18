import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface PrizeBadgeProps {
  amount: string;
  compact?: boolean;
}

const LEGACY_LABELS: Record<string, string> = {
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

function getBadgeTheme(label: string): { bg: string; text: string } {
  if (label.includes("ဝေဝေဆာဆာ")) return { bg: "#8E44AD", text: "#FFFFFF" };
  if (label.includes("ဘဏ္ဍာသိမ်း")) return { bg: "#AF601A", text: "#FFFFFF" };
  if (label.includes("၅၀၀၀")) return { bg: "#922B21", text: "#FFFFFF" };
  if (label.includes("၃၀၀၀")) return { bg: "#C0392B", text: "#FFFFFF" };
  if (label.includes("၂၀၀၀")) return { bg: "#E67E22", text: "#FFFFFF" };
  if (label.includes("၁၀၀၀")) return { bg: "#D4AC0D", text: "#000000" };
  if (label.includes("၅၀၀")) return { bg: "#27AE60", text: "#FFFFFF" };
  if (label.includes("၂၀၀")) return { bg: "#2471A3", text: "#FFFFFF" };
  if (label.includes("၁၀၀")) return { bg: "#16A085", text: "#FFFFFF" };
  if (label.includes("(၅၀)")) return { bg: "#7F8C8D", text: "#FFFFFF" };
  return { bg: "#C0392B", text: "#FFFFFF" };
}

export default function PrizeBadge({ amount, compact }: PrizeBadgeProps) {
  const colors = useColors();
  const label = LEGACY_LABELS[amount] ?? amount;
  const theme = getBadgeTheme(label) ?? { bg: colors.primary, text: colors.primaryForeground };

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
    maxWidth: "100%",
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  compactText: {
    fontSize: 11,
  },
});
