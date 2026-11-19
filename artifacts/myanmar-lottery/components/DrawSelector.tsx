import React, { useEffect, useMemo, useState } from "react";
import { Platform, Text, TextInput, StyleSheet, View } from "react-native";
import DatePickerField from "@/components/DatePickerField";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { useColors } from "@/hooks/useColors";
import { LotteryResult } from "@/types/lottery";
import { formatDisplayDate, parseDisplayDateToIso } from "@/utils/date";
import { normalizeDigits, toMM } from "@/utils/myanmar";

interface DrawSelectorProps {
  results: LotteryResult[];
  selectedDraw: number | null;
  onSelect: (draw: number) => void;
}

export default function DrawSelector({ results, selectedDraw, onSelect }: DrawSelectorProps) {
  const colors = useColors();
  const { language } = useAppLanguage();
  const [drawInput, setDrawInput] = useState("");
  const [dateInput, setDateInput] = useState("");

  const selectedResult = useMemo(
    () => results.find((result) => result.drawNumber === selectedDraw) ?? results[0] ?? null,
    [results, selectedDraw],
  );

  useEffect(() => {
    if (!selectedResult) return;
    setDrawInput(String(selectedResult.drawNumber));
    setDateInput(formatDisplayDate(selectedResult.drawDate));
  }, [selectedResult]);

  const selectByDraw = (value: string) => {
    setDrawInput(value);
    const result = results.find((item) => item.drawNumber === Number(normalizeDigits(value)));
    if (result) onSelect(result.drawNumber);
  };

  const selectByDate = (value: string) => {
    setDateInput(value);
    const isoDate = parseDisplayDateToIso(value);
    const result = results.find((item) => item.drawDate === isoDate);
    if (result) onSelect(result.drawNumber);
  };

  const label = language === "en" ? "Select lottery draw" : "ထီပေါက်စဉ် ရွေးချယ်ရန်";
  const drawLabel = language === "en" ? "Draw number" : "အကြိမ်ရေ";
  const dateLabel = language === "en" ? "Draw date" : "ထီဖွင့်ရက်";
  const drawPlaceholder = language === "en" ? "Type draw number" : "အကြိမ်ရေ ရိုက်ထည့်ပါ";

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.fields}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{drawLabel}</Text>
          {Platform.OS === "web" ? (
            React.createElement("select", {
              value: selectedResult ? String(selectedResult.drawNumber) : "",
              onChange: (event: { target: { value: string } }) => selectByDraw(event.target.value),
              "aria-label": drawLabel,
              style: {
                width: "100%", height: 46, border: `1px solid ${colors.border}`, borderRadius: 10,
                padding: "0 12px", backgroundColor: colors.background, color: colors.foreground,
                fontSize: 14, fontFamily: "Inter, sans-serif", boxSizing: "border-box",
              },
              children: results.map((result) => React.createElement(
                "option",
                { key: result.id ?? result.drawNumber, value: String(result.drawNumber) },
                `${language === "en" ? "Draw" : "အကြိမ်"} ${language === "en" ? result.drawNumber : toMM(result.drawNumber)} — ${language === "en" ? formatDisplayDate(result.drawDate) : toMM(formatDisplayDate(result.drawDate))}`,
              )),
            })
          ) : (
            <TextInput value={drawInput} onChangeText={selectByDraw} placeholder={drawPlaceholder} keyboardType="number-pad" style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]} />
          )}
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{drawPlaceholder}</Text>
          <TextInput value={drawInput} onChangeText={selectByDraw} placeholder={drawPlaceholder} keyboardType="number-pad" style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]} />
        </View>
        <View style={styles.field}>
          <DatePickerField
            label={dateLabel}
            value={dateInput}
            onChange={selectByDate}
            placeholder="DD-MM-YYYY"
            helperText={language === "en" ? "Format: DD-MM-YYYY" : "ပုံစံ: ရက်-လ-နှစ်"}
            borderColor={colors.border}
            backgroundColor={colors.background}
            textColor={colors.foreground}
            mutedColor={colors.mutedForeground}
            primaryColor={colors.primary}
            primaryForeground={colors.primaryForeground}
          />
        </View>
      </View>
      {!!selectedResult && (
        <Text style={[styles.selectedText, { color: colors.mutedForeground }]}>
          {language === "en"
            ? `Showing Draw ${selectedResult.drawNumber} (${formatDisplayDate(selectedResult.drawDate)})`
            : `ဖော်ပြနေသည့် ထီပေါက်စဉ် = ${toMM(selectedResult.drawNumber)} ကြိမ် (${toMM(formatDisplayDate(selectedResult.drawDate))})`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  fields: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  field: {
    flexGrow: 1,
    flexBasis: 220,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  selectedText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
