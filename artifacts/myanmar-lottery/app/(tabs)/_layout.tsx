import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import CenterLogoWatermark from "@/components/CenterLogoWatermark";
import QuickHelpChat from "@/components/QuickHelpChat";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout({ labels }: { labels: { result: string; search: string; ads: string } }) {
  return (
    <View style={styles.layoutRoot}>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "star.circle", selected: "star.circle.fill" }} />
          <Label>{labels.result}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="search">
          <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
          <Label>{labels.search}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="ads">
          <Icon sf={{ default: "megaphone", selected: "megaphone.fill" }} />
          <Label>{labels.ads}</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <CenterLogoWatermark />
      <QuickHelpChat />
    </View>
  );
}

function ClassicTabLayout({ labels }: { labels: { result: string; search: string; ads: string } }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.layoutRoot}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : colors.background,
            borderTopWidth: isWeb ? 1 : 0,
            borderTopColor: colors.border,
            elevation: 0,
            ...(isWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : isWeb ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: colors.background },
                ]}
              />
            ) : null,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: labels.result,
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="star.circle" tintColor={color} size={24} />
              ) : (
                <Feather name="star" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: labels.search,
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="magnifyingglass" tintColor={color} size={24} />
              ) : (
                <Feather name="search" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="ads"
          options={{
            title: labels.ads,
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="megaphone" tintColor={color} size={24} />
              ) : (
                <Feather name="speaker" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            href: null,
            title: "Admin",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="lock.shield" tintColor={color} size={24} />
              ) : (
                <Feather name="shield" size={22} color={color} />
              ),
          }}
        />
      </Tabs>
      <CenterLogoWatermark />
      <QuickHelpChat />
    </View>
  );
}

export default function TabLayout() {
  const { language } = useAppLanguage();
  const labels =
    language === "en"
      ? { result: "Result", search: "Checker", ads: "Advertisements" }
      : { result: "ရလဒ်", search: "စစ်ဆေး", ads: "ကြော်ငြာများ" };

  if (isLiquidGlassAvailable()) {
    return (
      <AuthProvider>
        <NativeTabLayout labels={labels} />
      </AuthProvider>
    );
  }
  return (
    <AuthProvider>
      <ClassicTabLayout labels={labels} />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  layoutRoot: { flex: 1 },
});
