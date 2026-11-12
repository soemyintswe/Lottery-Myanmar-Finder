import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useLottery } from "@/context/LotteryContext";
import { parseLotteryExcelFile } from "@/services/lotteryExcelImport";
import { loginUser } from "@/services/userAdminService";
import { upsertResultByDrawNumber } from "@/services/lotteryService";
import { LotteryResult } from "@/types/lottery";
import UserBadge from "@/components/UserBadge";
import { useLocalSearchParams } from "expo-router";

function isImportAllowed(role?: string | null) {
  const normalized = String(role ?? "").toLowerCase();
  return normalized === "admin" || normalized === "content_creator";
}

export default function AdminScreen() {
  const { user, loading, refreshAuth, logout } = useAuth();
  const { refresh, results, pendingEditResultId, clearPendingEdit } = useLottery();
  const { drawId } = useLocalSearchParams<{ drawId?: string | string[] }>();
  const [identifier, setIdentifier] = useState("soemyintswe@gmail.com");
  const [password, setPassword] = useState("sms*>IWT2026");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [drawNumberText, setDrawNumberText] = useState("88");
  const [drawDateText, setDrawDateText] = useState("");
  const [sourceUrlText, setSourceUrlText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [preview, setPreview] = useState<{
    result: LotteryResult;
    entriesCount: number;
    prizeCount: number;
  } | null>(null);

  const displayUserId = useMemo(() => {
    if (!user) return "";
    return user.id || user.username || user.email || "unknown";
  }, [user]);

  const canImport = useMemo(() => isImportAllowed(user?.role), [user?.role]);

  const requestedDrawId = Array.isArray(drawId) ? drawId[0] : drawId;
  const editTargetId = requestedDrawId || pendingEditResultId;
  const editTarget = useMemo(
    () => results.find((result) => result.id === editTargetId) ?? null,
    [editTargetId, results],
  );

  useEffect(() => {
    if (!editTarget) return;
    setDrawNumberText(String(editTarget.drawNumber));
    setDrawDateText(editTarget.drawDate || "");
    setSourceUrlText(editTarget.sourceUrl?.startsWith("http") ? editTarget.sourceUrl : "");
    setSelectedFile(null);
    setPreview(null);
    setUploadMessage("");
    setError("");
    clearPendingEdit();
  }, [clearPendingEdit, editTarget]);

  const handleLogin = useCallback(async () => {
    const loginId = identifier.trim();
    const loginPassword = password.trim();
    if (!loginId || !loginPassword) {
      setError("Username / Email / Phone နှင့် Password ကိုဖြည့်ပါ။");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await loginUser(loginId, loginPassword);
      await refreshAuth();
    } catch (err: any) {
      setError(err?.message || "Login မအောင်မြင်ပါ။");
    } finally {
      setSubmitting(false);
    }
  }, [identifier, password, refreshAuth]);

  const openExcelPicker = useCallback(() => {
    const doc = globalThis.document;
    if (!doc) {
      setError("ဒီ browser မှာ Excel file picker မဖွင့်နိုင်သေးပါ။");
      return;
    }
    const input = doc.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      setSelectedFile(file);
      setPreview(null);
      setUploadMessage("");
    };
    input.click();
  }, []);

  const handleImport = useCallback(async () => {
    if (!canImport) {
      setError("ဒီ account နဲ့ Excel upload မလုပ်နိုင်ပါ။");
      return;
    }
    if (!selectedFile) {
      setError("Excel file ကိုရွေးပါ။");
      return;
    }

    const drawNumber = Number(drawNumberText);
    if (!Number.isFinite(drawNumber) || drawNumber <= 0) {
      setError("ထီပေါက်စဉ် အကြိမ်ကို မှန်ကန်အောင်ထည့်ပါ။");
      return;
    }

    const drawDate = drawDateText.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(drawDate)) {
      setError("ထီပွဲရက်စွဲကို YYYY-MM-DD ပုံစံနဲ့ထည့်ပါ။");
      return;
    }

    const sourceUrl = sourceUrlText.trim();
    if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
      setError("တရားဝင်ရလဒ် URL ကို https:// ဖြင့် မှန်ကန်စွာထည့်ပါ။");
      return;
    }

    setUploading(true);
    setError("");
    setUploadMessage("");

    try {
      const parsed = await parseLotteryExcelFile(selectedFile, {
        drawNumber,
        drawDate,
        sourceUrl,
      });

      await upsertResultByDrawNumber(parsed.result);
      await refresh();

      setPreview(parsed);
      setUploadMessage(
        `Draw ${drawNumber} ကို Firestore ထဲသို့ တင်ပြီးပါပြီ။ ဆုအမျိုးအစား ${parsed.prizeCount} ခု၊ entry ${parsed.entriesCount} ခု ပါဝင်ပါတယ်။`,
      );
    } catch (err: any) {
      setError(err?.message || "Excel upload မအောင်မြင်ပါ။");
    } finally {
      setUploading(false);
    }
  }, [canImport, drawDateText, drawNumberText, refresh, selectedFile, sourceUrlText]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#C73D2C" />
        <Text style={styles.helperText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Admin Login</Text>
            <Text style={styles.subtitle}>Username / Email / Phone နဲ့ ဝင်နိုင်ပါတယ်</Text>

            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Username / Email / Phone"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              onSubmitEditing={handleLogin}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={submitting}
              style={[styles.button, submitting ? styles.buttonDisabled : null]}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>လော့ဂ်အင်</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.dashboardContent}>
      <View style={styles.dashboardCard}>
        <View style={styles.dashboardHeader}>
          <View style={styles.dashboardHeading}>
            <Text style={styles.title}>Welcome, Admin</Text>
            <Text style={styles.subtitle}>User ID: {displayUserId}</Text>
          </View>
          <UserBadge user={user} onLogout={logout} />
        </View>
        <Text style={styles.helperText}>Login ဝင်ထားပါပြီ။</Text>

        <View style={styles.dashboardRow}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user.username}</Text>
        </View>
        <View style={styles.dashboardRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email || "-"}</Text>
        </View>
        <View style={styles.dashboardRow}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user.role}</Text>
        </View>

        <View style={styles.importCard}>
          <Text style={styles.sectionTitle}>
            {editTarget ? `Draw ${editTarget.drawNumber} ကိုပြင်ဆင်ရန်` : "Excel Upload to Firestore"}
          </Text>
          <Text style={styles.subtitle}>
            {editTarget
              ? `Draw ${editTarget.drawNumber} အတွက် Excel file အသစ်တင်ပါက ယခင်အချက်အလက်ကို အစားထိုးသိမ်းဆည်းမည်။`
              : "နောက်ဆုံးထီပေါက်စဉ်ကို Excel file နဲ့ တင်နိုင်ပါတယ်။"}
          </Text>

          <View style={styles.importRow}>
            <View style={styles.importField}>
              <Text style={styles.label}>ထီပေါက်စဉ် အကြိမ်</Text>
              <TextInput
                value={drawNumberText}
                onChangeText={setDrawNumberText}
                placeholder="88"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            <View style={styles.importField}>
              <Text style={styles.label}>ထီပွဲရက်စွဲ (YYYY-MM-DD)</Text>
              <TextInput
                value={drawDateText}
                onChangeText={setDrawDateText}
                placeholder="2026-07-01"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.importField}>
            <Text style={styles.label}>အောင်ဘာလေ တရားဝင် ထီပေါက်စဉ် URL (မဖြစ်မနေမဟုတ်)</Text>
            <TextInput
              value={sourceUrlText}
              onChangeText={setSourceUrlText}
              placeholder="https://..."
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Text style={styles.helperText}>
              ဤ draw အတွက် တရားဝင်ရလဒ်စာမျက်နှာလင့်ခ်ကို သိမ်းဆည်းပေးမည်။
            </Text>
          </View>

          <TouchableOpacity onPress={openExcelPicker} style={styles.secondaryButton} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>
              {selectedFile ? `ရွေးထားသောဖိုင်: ${selectedFile.name}` : "Excel ဖိုင်ရွေးမည်"}
            </Text>
          </TouchableOpacity>

          {!!preview && (
            <View style={styles.previewBox}>
              <Text style={styles.previewText}>Draw: {preview.result.drawNumber}</Text>
              <Text style={styles.previewText}>Date: {preview.result.drawDate}</Text>
              <Text style={styles.previewText}>Prizes: {preview.prizeCount}</Text>
              <Text style={styles.previewText}>Entries: {preview.entriesCount}</Text>
            </View>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!uploadMessage && <Text style={styles.success}>{uploadMessage}</Text>}

          <View style={styles.importActions}>
            <TouchableOpacity
              onPress={handleImport}
              disabled={uploading || !canImport}
              style={[styles.button, uploading ? styles.buttonDisabled : null]}
              activeOpacity={0.85}
            >
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Firestore သို့တင်မည်</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={refresh} style={[styles.button, styles.secondaryAction]} activeOpacity={0.85}>
              <Text style={styles.secondaryActionText}>ဒေတာ refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff7f1",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  dashboardContent: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff7f1",
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ead9cb",
    gap: 14,
  },
  dashboardCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ead9cb",
    gap: 12,
  },
  dashboardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  dashboardHeading: { flex: 1, minWidth: 220, gap: 4 },
  importCard: {
    backgroundColor: "#fffaf6",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eddcca",
    gap: 14,
    marginTop: 8,
  },
  importRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  importField: {
    flexBasis: 260,
    flexGrow: 1,
    gap: 6,
  },
  importActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f1f1f",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1f1f",
  },
  subtitle: {
    fontSize: 14,
    color: "#9a7864",
  },
  helperText: {
    fontSize: 14,
    color: "#9a7864",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ead9cb",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fffdfb",
    color: "#1f1f1f",
  },
  button: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#c73d2c",
    paddingHorizontal: 18,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#ead9cb",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#8e6a53",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryAction: {
    backgroundColor: "#fff7f1",
  },
  secondaryActionText: {
    color: "#8e6a53",
    fontSize: 15,
    fontWeight: "700",
  },
  previewBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f0e0d2",
    gap: 4,
  },
  previewText: {
    color: "#6c4f3d",
    fontSize: 14,
  },
  error: {
    color: "#d92d20",
    fontSize: 14,
  },
  success: {
    color: "#13824b",
    fontSize: 14,
  },
  dashboardRow: {
    gap: 4,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1e6da",
  },
  label: {
    fontSize: 13,
    color: "#9a7864",
  },
  value: {
    fontSize: 16,
    color: "#1f1f1f",
    fontWeight: "600",
  },
});
