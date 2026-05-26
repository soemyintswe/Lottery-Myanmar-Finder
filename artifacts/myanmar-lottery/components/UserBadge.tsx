import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { ManagedUser } from "@/types/user";
import { useColors } from "@/hooks/useColors";

function initials(value: string): string {
  const v = (value || "").trim();
  if (!v) return "?";
  const parts = v.split(/\s+/g);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
  return `${first}${second}`.toUpperCase();
}

export default function UserBadge({
  user,
  onPress,
}: {
  user: ManagedUser | null;
  onPress?: () => void;
}) {
  const colors = useColors();

  const label = useMemo(() => {
    if (!user) return "";
    return user.username || user.email || user.phone || "";
  }, [user]);

  if (!user) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.card }]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials(label)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.role, { color: colors.mutedForeground }]} numberOfLines={1}>
          {user.role}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 160,
    maxWidth: 240,
  },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  name: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  role: { fontSize: 10, fontFamily: "Inter_400Regular" },
});

