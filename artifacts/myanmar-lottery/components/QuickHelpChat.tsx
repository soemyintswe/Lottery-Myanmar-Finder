import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppLanguage } from "@/context/AppLanguageContext";
import { useColors } from "@/hooks/useColors";

type QuickAction = {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  route: "/" | "/search" | "/admin";
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: "latest",
    icon: "home",
    route: "/",
  },
  {
    key: "search",
    icon: "search",
    route: "/search",
  },
  {
    key: "admin",
    icon: "shield",
    route: "/admin",
  },
];

export default function QuickHelpChat() {
  const colors = useColors();
  const { language } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const bottomOffset = useMemo(() => {
    const tabLift = Platform.OS === "web" ? 90 : 82;
    return insets.bottom + tabLift;
  }, [insets.bottom]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {open && <Pressable style={styles.scrim} onPress={() => setOpen(false)} />}
      <View pointerEvents="box-none" style={[styles.anchor, { bottom: bottomOffset }]}>
        {open && (
          <View
            style={[
              styles.panel,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.foreground,
              },
            ]}
          >
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: colors.foreground }]}>
                {language === "en" ? "Help Chat" : "အကူအညီ Chat"}
              </Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.muted }]}
                activeOpacity={0.7}
              >
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.panelHint, { color: colors.mutedForeground }]}>
              {language === "en"
                ? "Quick actions to open key pages faster."
                : "Chat ကို အလွယ်ဖွင့်နိုင်အောင် quick actions ထည့်ထားပါတယ်။"}
            </Text>

            <View style={styles.actionsWrap}>
              {QUICK_ACTIONS.map((action) => (
                (() => {
                  const text =
                    language === "en"
                      ? {
                          latest: { label: "Latest Result", description: "Go to home result page" },
                          search: { label: "Check Tickets", description: "Open ticket checker page" },
                          admin: { label: "Admin Panel", description: "Open add/edit data page" },
                        }
                      : {
                          latest: { label: "နောက်ဆုံးရလဒ်", description: "ပင်မစာမျက်နှာကို ပြန်ဖွင့်မည်" },
                          search: { label: "ထီတိုက်စစ်မည်", description: "လက်မှတ်နံပါတ်တွေ စစ်ဆေးမည့် page" },
                          admin: { label: "Admin စာမျက်နှာ", description: "ရလဒ်ထည့်/ပြင်ရန် page" },
                        };
                  const tx = text[action.key as keyof typeof text];
                  return (
                <TouchableOpacity
                  key={action.key}
                  style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => {
                    setOpen(false);
                    router.push(action.route);
                  }}
                  activeOpacity={0.78}
                >
                  <View style={[styles.actionIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name={action.icon} size={14} color={colors.primary} />
                  </View>
                  <View style={styles.actionTextWrap}>
                    <Text style={[styles.actionLabel, { color: colors.foreground }]}>{tx.label}</Text>
                    <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>{tx.description}</Text>
                  </View>
                </TouchableOpacity>
                  );
                })()
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={() => setOpen((v) => !v)}
          activeOpacity={0.85}
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              borderColor: colors.primaryForeground,
            },
          ]}
        >
          <Feather name={open ? "x" : "message-circle"} size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  anchor: {
    position: "absolute",
    right: 16,
    alignItems: "flex-end",
    zIndex: 40,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  panel: {
    width: 286,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
    gap: 10,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panelTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  panelHint: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_400Regular",
  },
  actionsWrap: {
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  actionDesc: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
