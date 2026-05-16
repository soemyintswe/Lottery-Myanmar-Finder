import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { LotteryResult } from "@/types/lottery";

interface DrawSelectorProps {
  results: LotteryResult[];
  selectedDraw: number | null;
  onSelect: (draw: number) => void;
}

export default function DrawSelector({ results, selectedDraw, onSelect }: DrawSelectorProps) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {results.map((r) => {
        const active = r.drawNumber === selectedDraw;
        return (
          <TouchableOpacity
            key={r.id ?? r.drawNumber}
            onPress={() => onSelect(r.drawNumber)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.number, { color: active ? colors.primaryForeground : colors.foreground }]}>
              {r.drawNumber} ကြိမ်
            </Text>
            <Text style={[styles.date, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
              {r.drawDate}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 90,
    alignItems: "center",
  },
  number: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
