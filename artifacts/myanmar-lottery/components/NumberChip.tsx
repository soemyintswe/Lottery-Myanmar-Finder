import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface NumberChipProps {
  number: string;
  highlight?: boolean;
  matchLength?: number;
}

export default function NumberChip({ number, highlight, matchLength }: NumberChipProps) {
  const colors = useColors();

  if (highlight && matchLength && matchLength < number.length) {
    const matched = number.slice(0, matchLength);
    const rest = number.slice(matchLength);
    return (
      <View style={[styles.chip, { backgroundColor: colors.card, borderColor: "#D4AC0D", borderWidth: 2 }]}>
        <Text style={styles.numberText}>
          <Text style={{ color: "#D4AC0D", fontFamily: "Inter_700Bold" }}>{matched}</Text>
          <Text style={{ color: colors.foreground }}>{rest}</Text>
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
        {number}
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
