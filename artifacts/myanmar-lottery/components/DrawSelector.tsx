import React from "react";
import { TouchableOpacity, Text, StyleSheet, View, useWindowDimensions } from "react-native";
import { useColors } from "@/hooks/useColors";
import { LotteryResult } from "@/types/lottery";
import { toMM, toMMDate } from "@/utils/myanmar";

interface DrawSelectorProps {
  results: LotteryResult[];
  selectedDraw: number | null;
  onSelect: (draw: number) => void;
}

export default function DrawSelector({ results, selectedDraw, onSelect }: DrawSelectorProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 920;
  const isMobile = width < 560;

  const content = results.map((r) => {
    const active = r.drawNumber === selectedDraw;
    return (
      <TouchableOpacity
        key={r.id ?? r.drawNumber}
        onPress={() => onSelect(r.drawNumber)}
        style={[
          styles.chip,
          isDesktop && styles.desktopChip,
          isMobile && styles.mobileChip,
          {
            backgroundColor: active ? colors.primary : colors.card,
            borderColor: active ? colors.primary : colors.border,
          },
        ]}
        activeOpacity={0.7}
      >
        <Text style={[styles.number, { color: active ? colors.primaryForeground : colors.foreground }]}>
          {toMM(r.drawNumber)} ကြိမ်
        </Text>
        <Text style={[styles.date, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
          {toMMDate(r.drawDate)}
        </Text>
      </TouchableOpacity>
    );
  });

  return <View style={[styles.container, isDesktop && styles.desktopContainer]}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  desktopContainer: {
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 90,
    alignItems: "center",
  },
  desktopChip: {
    minWidth: 150,
  },
  mobileChip: {
    minWidth: "48%",
    flexGrow: 1,
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
