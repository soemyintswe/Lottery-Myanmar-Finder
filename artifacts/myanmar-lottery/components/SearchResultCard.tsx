import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useColors } from "@/hooks/useColors";
import { SearchResult } from "@/types/lottery";
import { toMM } from "@/utils/myanmar";

interface SearchResultCardProps {
  result: SearchResult;
}

export default function SearchResultCard({ result }: SearchResultCardProps) {
  const colors = useColors();
  const topMatch = result.matches?.[0];

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
              {result.inputAlpha
                ? `${result.inputAlpha}-${toMM(result.inputNumber)} သည် ဆုမပေါ်ပါ`
                : `${toMM(result.inputNumber)} နံပါတ်သည် ဆုမပေါ်ပါ`}
            </Text>
            {!!result.nearMatchesWithoutAlpha?.length && (
              <Text style={[styles.sub, { color: "#B9770E", marginTop: 6 }]}>
                နံပါတ်ကိုက်နိုင်သော်လည်း အက္ခရာမတူသော စာရင်း {toMM(result.nearMatchesWithoutAlpha.length)} ခု ရှိပါသည်။
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: "#F0FFF4", borderColor: "#27AE60", borderWidth: 2 }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: "#D5F5E3" }]}>
          <Feather name="award" size={22} color="#27AE60" />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.foreground }]}>ဂုဏ်ယူပါသည်! ဆုကံကောင်းသည်</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {result.inputAlpha
              ? `${result.inputAlpha}-${toMM(result.inputNumber)} ကိုက်ညီသည်`
              : `${toMM(result.inputNumber)} ကိုက်ညီသည်`}
          </Text>
        </View>
      </View>
      {!!topMatch && (
        <View style={[styles.matchItem, { borderColor: "#BEEACF", backgroundColor: "#FFFFFF" }]}>
          <Text style={[styles.matchTitle, { color: colors.foreground }]}>{topMatch.prizeCategory}</Text>
          <Text style={[styles.matchMeta, { color: colors.mutedForeground }]}>
            ကိုက်ညီချက်: {topMatch.alpha}-{toMM(topMatch.pattern)} ({toMM(topMatch.matchLength)} လုံး)
          </Text>
          {!!topMatch.winners && (
            <Text style={[styles.matchMeta, { color: colors.mutedForeground }]}>ကံထူးရှင်: {topMatch.winners}</Text>
          )}
        </View>
      )}

      {(result.matches?.length ?? 0) > 1 && (
        <Text style={[styles.extraCount, { color: colors.mutedForeground }]}>
          နောက်ထပ် ကိုက်ညီမှု {toMM((result.matches?.length ?? 1) - 1)} ခု ရှိပါသည်။
        </Text>
      )}
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
  matchItem: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  matchTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  matchMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  extraCount: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
