import Feather from "@expo/vector-icons/Feather";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { parseDisplayDate, toDisplayDate } from "@/utils/date";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  helperText?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  primaryColor: string;
  primaryForeground: string;
};

export default function DatePickerField({
  value,
  onChange,
  placeholder,
  label,
  helperText,
  minimumDate,
  maximumDate,
  borderColor,
  backgroundColor,
  textColor,
  mutedColor,
  primaryColor,
  primaryForeground,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => parseDisplayDate(value) ?? new Date());

  useEffect(() => {
    if (!open) return;
    setTempDate(parseDisplayDate(value) ?? new Date());
  }, [open, value]);

  const displayValue = useMemo(() => value, [value]);

  const handleNativeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setTempDate(date);
  };

  const confirmSelection = () => {
    onChange(toDisplayDate(tempDate));
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>}
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor,
              borderColor,
              color: textColor,
            },
          ]}
          value={displayValue}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={mutedColor}
          keyboardType="numbers-and-punctuation"
          inputMode="numeric"
        />
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor, backgroundColor }]}
          onPress={() => setOpen(true)}
          activeOpacity={0.8}
        >
          <Feather name="calendar" size={18} color={primaryColor} />
        </TouchableOpacity>
      </View>
      {!!helperText && <Text style={[styles.helperText, { color: mutedColor }]}>{helperText}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => undefined}
            style={[styles.modalCard, { backgroundColor, borderColor }]}
          >
            <Text style={[styles.modalTitle, { color: textColor }]}>Select date</Text>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={handleNativeChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor, backgroundColor }]}
                onPress={() => setOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, { color: mutedColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: primaryColor, backgroundColor: primaryColor }]}
                onPress={confirmSelection}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, { color: primaryForeground }]}>Choose</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  helperText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  modalBtn: {
    minWidth: 92,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  modalBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
