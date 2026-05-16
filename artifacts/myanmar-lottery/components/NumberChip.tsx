import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { toMM } from "@/utils/myanmar";

interface NumberChipProps {
  number: string;
  highlight?: boolean;
  /** For prefix highlight: first N chars highlighted */
  prefixLength?: number;
  /** For suffix highlight: last N chars highlighted */
  suffixLength?: number;
}

export default function NumberChip({ number, highlight, prefixLength, suffixLength }: NumberChipProps) {
  const colors = useColors();
  const mmNumber = toMM(number);

  // Prefix highlight
  if (highlight && prefixLength && prefixLength < mmNumber.length) {
    const matched = mmNumber.slice(0, prefixLength);
    const rest = mmNumber.slice(prefixLength);
    return (
      <View style={[styles.chip, { backgroundColor: colors.card, borderColor: "#D4AC0D", borderWidth: 2 }]}>
        <Text style={styles.numberText}>
          <Text style={{ color: "#D4AC0D", fontFamily: "Inter_700Bold" }}>{matched}</Text>
          <Text style={{ color: colors.foreground }}>{rest}</Text>
        </Text>
      </View>
    );
  }

  // Suffix highlight
  if (highlight && suffixLength && suffixLength < mmNumber.length) {
    const rest = mmNumber.slice(0, mmNumber.length - suffixLength);
    const matched = mmNumber.slice(-suffixLength);
    return (
      <View style={[styles.chip, { backgroundColor: colors.card, borderColor: "#8E44AD", borderWidth: 2 }]}>
        <Text style={styles.numberText}>
          <Text style={{ color: colors.foreground }}>{rest}</Text>
          <Text style={{ color: "#8E44AD", fontFamily: "Inter_700Bold" }}>{matched}</Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.chip,
      { backgroundColor: highlight ? "#FFF3CD" : colors.card },
      highlight && { borderColor: "#D4AC0D", borderWidth: 2 },
    ]}>
      <Text style={[
        styles.numberText,
        { color: highlight ? "#C0392B" : colors.foreground },
        highlight && { fontFamily: "Inter_700Bold" },
      ]}>
        {mmNumber}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    margin: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  numberText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
});
