import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppLanguage } from "@/context/AppLanguageContext";
import { useColors } from "@/hooks/useColors";

type Props = {
  language: AppLanguage;
  onChange: (next: AppLanguage) => void;
  mmLabel?: string;
  enLabel?: string;
};

export default function LanguageToggle({
  language,
  onChange,
  mmLabel = "မြန်မာ",
  enLabel = "English",
}: Props) {
  const colors = useColors();
  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <TouchableOpacity
        onPress={() => onChange("mm")}
        style={[styles.btn, { backgroundColor: language === "mm" ? colors.primary : "transparent" }]}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, { color: language === "mm" ? colors.primaryForeground : colors.mutedForeground }]}>
          {mmLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onChange("en")}
        style={[styles.btn, { backgroundColor: language === "en" ? colors.primary : "transparent" }]}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, { color: language === "en" ? colors.primaryForeground : colors.mutedForeground }]}>
          {enLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  btnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
