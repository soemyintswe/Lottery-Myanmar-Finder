import React, { useMemo, useState } from "react";
import { TouchableOpacity, Text, StyleSheet, View, useWindowDimensions, Modal, ScrollView, Pressable } from "react-native";
import { useColors } from "@/hooks/useColors";
import { LotteryResult } from "@/types/lottery";
import { toMM, toMMDate } from "@/utils/myanmar";

interface DrawSelectorProps {
  results: LotteryResult[];
  selectedDraw: number | null;
  onSelect: (draw: number) => void;
  draftLabel?: string;
  useDropdownAfter?: number; // switch to dropdown when draws exceed this count
}

export default function DrawSelector({
  results,
  selectedDraw,
  onSelect,
  draftLabel = "Draft",
  useDropdownAfter = 3,
}: DrawSelectorProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 920;
  const isMobile = width < 560;
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => results.find((r) => r.drawNumber === selectedDraw) ?? results[0] ?? null,
    [results, selectedDraw],
  );
  const shouldUseDropdown = results.length > useDropdownAfter;

  const handlePick = (drawNumber: number) => {
    onSelect(drawNumber);
    setOpen(false);
  };

  if (shouldUseDropdown) {
    const label = selected
      ? `${toMM(selected.drawNumber)} ကြိမ် • ${toMMDate(selected.drawDate)}${selected.publishStatus === "draft" ? ` • ${draftLabel}` : ""}`
      : "-";

    return (
      <View style={styles.dropdownWrap}>
        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={[styles.dropdownBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.dropdownText, { color: colors.foreground }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.dropdownHint, { color: colors.mutedForeground }]}>
            {results.length} draws
          </Text>
        </TouchableOpacity>

        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
            <Pressable style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {draftLabel === "Draft" ? "Select Draw" : "ထီပွဲ ရွေးချယ်ပါ"}
              </Text>
              <ScrollView style={{ maxHeight: Math.min(420, width - 80) }}>
                {results.map((r) => {
                  const active = r.drawNumber === selectedDraw;
                  return (
                    <TouchableOpacity
                      key={r.id ?? r.drawNumber}
                      onPress={() => handlePick(r.drawNumber)}
                      style={[
                        styles.row,
                        {
                          backgroundColor: active ? colors.muted : "transparent",
                          borderColor: colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                          {toMM(r.drawNumber)} ကြိမ်
                        </Text>
                        <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                          {toMMDate(r.drawDate)}
                        </Text>
                      </View>
                      {r.publishStatus === "draft" && (
                        <View style={[styles.draftChip, { borderColor: colors.border }]}>
                          <Text style={[styles.draftChipText, { color: colors.foreground }]}>{draftLabel}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

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
        <View style={styles.chipTopRow}>
          <Text style={[styles.number, { color: active ? colors.primaryForeground : colors.foreground }]}>
            {toMM(r.drawNumber)} ကြိမ်
          </Text>
          {r.publishStatus === "draft" && (
            <View style={[styles.draftDot, { backgroundColor: active ? colors.primaryForeground : colors.destructive }]} />
          )}
        </View>
        <Text style={[styles.date, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
          {toMMDate(r.drawDate)}
        </Text>
        {r.publishStatus === "draft" && (
          <Text style={[styles.draftInline, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
            {draftLabel}
          </Text>
        )}
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
  chipTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  draftDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    opacity: 0.9,
  },
  draftInline: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  dropdownWrap: {
    paddingVertical: 8,
  },
  dropdownBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  dropdownHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rowTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  rowSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  draftChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  draftChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
