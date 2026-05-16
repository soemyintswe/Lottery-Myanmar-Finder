import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useColors } from "@/hooks/useColors";
import { SearchResult } from "@/types/lottery";
import PrizeBadge from "./PrizeBadge";
import { toMM } from "@/utils/myanmar";

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
              {toMM(result.inputNumber)} နံပါတ်သည် ဆုမပေါ်ပါ
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const isMajor = result.prizeType === "major";
  const isPrefix = result.matchKind === "prefix";
  const isSuffix = result.matchKind === "suffix";

  const matchDesc = () => {
    if (isMajor) return `${toMM(result.inputNumber)} နံပါတ်သည် တိတိကျကျ ကိုက်ညီသည်`;
    if (isPrefix) return `ရှေ့ဂဏန်း ${toMM(result.matchLength!)} လုံး (${toMM(result.matchedSegment!)}) ကိုက်ညီ → ${toMM(result.matchedNumber!)}`;
    if (isSuffix) return `နောက်ဂဏန်း ${toMM(result.matchLength!)} လုံး (${toMM(result.matchedSegment!)}) ကိုက်ညီ → ${toMM(result.matchedNumber!)}`;
    return "";
  };

  const cardBg = isMajor ? "#FFF8E1" : isSuffix ? "#F5EEF8" : "#F0FFF4";
  const cardBorder = isMajor ? "#D4AC0D" : isSuffix ? "#8E44AD" : "#27AE60";
  const iconBg = isMajor ? "#FFF3CD" : isSuffix ? "#EBD5F5" : "#D5F5E3";
  const iconColor = isMajor ? "#D4AC0D" : isSuffix ? "#8E44AD" : "#27AE60";

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 2 }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name="award" size={22} color={iconColor} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isMajor ? "ဂုဏ်ယူပါသည်! ဆုကံကောင်းသည်" : "ဝဲဝဲဆာဆာ ဆုကံကောင်းသည်"}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {matchDesc()}
          </Text>
        </View>
      </View>
      <View style={styles.badgeRow}>
        <PrizeBadge amount={result.prizeAmount!} />
        {!isMajor && (
          <View style={[styles.kindTag, { backgroundColor: isSuffix ? "#EBD5F5" : "#D5F5E3" }]}>
            <Text style={[styles.kindTagText, { color: isSuffix ? "#8E44AD" : "#27AE60" }]}>
              {isSuffix ? "နောက် ကိုက်" : "ရှေ့ ကိုက်"}
            </Text>
          </View>
        )}
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
    lineHeight: 20,
  },
  badgeRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kindTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kindTagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
