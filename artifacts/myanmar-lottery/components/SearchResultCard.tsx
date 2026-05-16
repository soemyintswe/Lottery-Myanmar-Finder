import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { SearchResult } from "@/types/lottery";
import PrizeBadge from "./PrizeBadge";

interface SearchResultCardProps {
  result: SearchResult;
}

export default function SearchResultCard({ result }: SearchResultCardProps) {
  const colors = useColors();

  if (!result.matched) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: "#FDECEA" }]}>
            <Feather name="x-circle" size={22} color="#C0392B" />
          </View>
          <View style={styles.textWrap}>
            <Text style={[styles.title, { color: colors.foreground }]}>ထပ်မံ ကံကောင်း ကြိုးစားပါ</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              {result.inputNumber} နံပါတ်သည် ဆုမပေါ်ပါ
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const isMajor = result.prizeType === "major";

  return (
    <View style={[
      styles.card,
      { backgroundColor: isMajor ? "#FFF8E1" : "#F0FFF4", borderColor: isMajor ? "#D4AC0D" : "#27AE60" },
      { borderWidth: 2 },
    ]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: isMajor ? "#FFF3CD" : "#D5F5E3" }]}>
          <Feather name="award" size={22} color={isMajor ? "#D4AC0D" : "#27AE60"} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isMajor ? "ဂုဏ်ယူပါသည်! ဆုကံကောင်းသည်" : "ဝဲဝဲဆာဆာ ဆုကံကောင်းသည်"}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {isMajor
              ? `${result.inputNumber} နံပါတ်သည် ဆုမဲပေါ်သည်`
              : `ရှေ့ဂဏန်း ${result.matchLength} လုံး ကိုက်ညီသည် (${result.matchedPrefix})`}
          </Text>
        </View>
      </View>
      <View style={styles.badgeRow}>
        <PrizeBadge amount={result.prizeAmount!} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  badgeRow: {
    marginTop: 10,
    flexDirection: "row",
  },
});
