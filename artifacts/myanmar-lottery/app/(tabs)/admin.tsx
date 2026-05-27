import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Feather from "@expo/vector-icons/Feather";
import { useColors } from "@/hooks/useColors";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { useLottery } from "@/context/LotteryContext";
import LanguageToggle from "@/components/LanguageToggle";
import { useAuth } from "@/context/AuthContext";
import {
  updateResult,
  deleteResult,
  upsertResultByDrawNumber,
  saveLocalOverride,
  saveLocalOverridesBulk,
  removeLocalOverride,
  isResultPublished,
} from "@/services/lotteryService";
import {
  upsertAd,
  deleteAdById,
  deleteAllAds,
} from "@/services/adService";
import {
  changeMyPassword,
  createAdminUser,
  deleteAdminUser,
  generateTempPassword,
  getAdminSubmittedData,
  getAdminUsers,
  getCurrentUser,
  getStoredAdminApiToken,
  loginAdminApi,
  logoutUser,
  resetPasswordByEmailOrPhone,
  resetAdminUserPassword,
  setAdminUserStatus,
  setStoredAdminApiToken,
  updateAdminSubmittedDataStatus,
  updateAdminUserApprovalStatus,
  updateAdminUserRole,
} from "@/services/userAdminService";
import { LotteryResult, PrizeEntry, LotteryRuleEntry, MYANMAR_ALPHABETS } from "@/types/lottery";
import { AppAd, AdPlacement } from "@/types/ad";
import { ManagedUser, UserApprovalStatus, UserDataRecord, UserDataStatus, UserRole } from "@/types/user";
import PrizeBadge from "@/components/PrizeBadge";
import { normalizeDigits, toMM } from "@/utils/myanmar";
import * as XLSX from "xlsx";
import { deleteField } from "firebase/firestore";

const ADMIN_PIN = "1234";
const ALPHA_BASE_OPTIONS = [...MYANMAR_ALPHABETS];

const PRIZE_CATEGORY_OPTIONS = [
  "အထူးဆုကြီး ကျပ်သိန်း (၅၀၀၀) ဆု",
  "အထူးဆုကြီး ကျပ်သိန်း (၃၀၀၀) ဆု",
  "အထူးဆုကြီး ကျပ်သိန်း (၂၀၀၀) ဆု",
  "အထူးဆုကြီး ကျပ်သိန်း (၁၀၀၀) ဆု",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၅၀၀) ဆုများ",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၂၀၀) ဆုများ",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၁၀၀) ဆုများ",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၅၀) ဆုများ",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၂၀) ဆုများ",
  "ဆုတစ်ဆုခြင်းကျပ်သိန်း (၁၀) ဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ်(၃)သိန်းဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ်(၂)သိန်းဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ်(၁)သိန်းဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ်(၅)သောင်းဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ်(၁)သောင်းဆုများ",
  "ဘဏ္ဍာသိမ်းရငွေမှ ပြန်လည်ချီးမြှင့်သောဆုမဲများ",
  "ကျပ်သိန်း (၅၀၀၀) ဆု",
  "ကျပ်သိန်း (၃၀၀၀) ဆု",
  "ကျပ်သိန်း (၂၀၀၀) ဆု",
  "ကျပ်သိန်း (၁၀၀၀) ဆု",
  "ကျပ်သိန်း (၅၀၀) ဆုများ",
  "ကျပ်သိန်း (၂၀၀) ဆုများ",
  "ကျပ်သိန်း (၁၀၀) ဆုများ",
  "ကျပ်သိန်း (၅၀) ဆုများ",
  "ကျပ်သိန်း (၂၀) ဆုများ",
  "ကျပ် (၁၀) သိန်းဆုများ",
  "ဘဏ္ဍာသိမ်းရငွေမှ ကျပ် (၁၀) သိန်းဆု",
  "ဝေဝေဆာဆာပဒေသာ ကျပ် (၃) သိန်းဆုများ",
  "ဘဏ္ဍာသိမ်းရငွေမှ ဝေဝေဆာဆာပဒေသာ ကျပ် (၃) သိန်းဆု",
  "ဝေဝေဆာဆာပဒေသာ ကျပ် (၂) သိန်းဆုများ",
  "ဘဏ္ဍာသိမ်းရငွေမှ ဝေဝေဆာဆာပဒေသာ ကျပ် (၂) သိန်းဆု",
  "ဝေဝေဆာဆာပဒေသာ ကျပ် (၁) သိန်းဆုများ",
  "ဘဏ္ဍာသိမ်းရငွေမှ ဝေဝေဆာဆာပဒေသာ ကျပ် (၁) သိန်းဆု",
  "ဝေဝေဆာဆာပဒေသာ ကျပ် (၅) သောင်းဆုများ",
  "ဝေဝေဆာဆာပဒေသာ ကျပ် (၁) သောင်းဆု",
];

const LEGACY_AMOUNT_TO_CATEGORY: Record<string, string> = {
  "5000": "ကျပ်သိန်း (၅၀၀၀) ဆု",
  "3000": "ကျပ်သိန်း (၃၀၀၀) ဆု",
  "2000": "ကျပ်သိန်း (၂၀၀၀) ဆု",
  "1000": "ကျပ်သိန်း (၁၀၀၀) ဆု",
  "500": "ကျပ်သိန်း (၅၀၀) ဆုများ",
  "300": "ကျပ်သိန်း (၃၀၀) ဆုများ",
  "200": "ကျပ်သိန်း (၂၀၀) ဆုများ",
  "100": "ကျပ်သိန်း (၁၀၀) ဆုများ",
  "50": "ကျပ်သိန်း (၅၀) ဆုများ",
  "20": "ကျပ်သိန်း (၂၀) ဆုများ",
};

function normalizeCategoryValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return LEGACY_AMOUNT_TO_CATEGORY[trimmed] ?? trimmed;
}

function normalizeSearchText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function matchesCategoryFilter(option: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const optionText = normalizeSearchText(option);
  const queryText = normalizeSearchText(q);
  if (optionText.includes(queryText)) return true;
  const qDigits = normalizeDigits(q);
  if (!qDigits) return false;
  return normalizeDigits(option).includes(qDigits);
}

type EntryTemplate = {
  matchLength: number;
  winners: string;
  note: string;
};

type AdminSectionTab = "lottery" | "ads" | "users";
const ADMIN_ACTIVE_TAB_KEY = "mm_admin_active_tab";

function winnerTextByMatchLength(matchLength: number): string {
  const perEntryWinners = Math.pow(10, Math.max(0, 6 - matchLength));
  return `${toMM(perEntryWinners)} ဦး`;
}

function inferEntryTemplate(categoryRaw: string): EntryTemplate | null {
  const category = normalizeCategoryValue(categoryRaw);
  if (!category) return null;

  const hasPadesa = category.includes("ဝေဝေဆာဆာပဒေသာ");
  const isReAward = category.includes("ပြန်လည်ချီးမြှင့်");
  const isSpecial = category.includes("အထူးဆုကြီး");
  const isSinglePrize = category.includes("ဆုတစ်ဆုခြင်း");

  if (hasPadesa) {
    let matchLength = 0;
    if (category.includes("(၃)") || category.includes("၃)")) matchLength = 5;
    else if (category.includes("(၂)") || category.includes("၂)")) matchLength = 4;
    else if (category.includes("(၁)") || category.includes("၁)")) {
      if (category.includes("သိန်း")) matchLength = 3;
      else if (category.includes("သောင်း")) matchLength = 1;
    } else if (category.includes("(၅)") || category.includes("၅)")) {
      if (category.includes("သောင်း")) matchLength = 2;
    }
    if (!matchLength) {
      const digits = normalizeDigits(category);
      if (digits === "3") matchLength = 5;
      else if (digits === "2") matchLength = 4;
      else if (digits === "1" && category.includes("သိန်း")) matchLength = 3;
      else if (digits === "5" && category.includes("သောင်း")) matchLength = 2;
      else if (digits === "1" && category.includes("သောင်း")) matchLength = 1;
    }
    if (!matchLength) matchLength = 3;

    return {
      matchLength,
      winners: winnerTextByMatchLength(matchLength),
      note: `အက္ခရာနှင့် ရှေ့ဂဏန်း(${toMM(matchLength)})လုံးအစဉ်လိုက်တူ`,
    };
  }

  if (isSpecial) {
    return {
      matchLength: 6,
      winners: "၁ ဦး",
      note: "အထူးဆုကြီး",
    };
  }

  if (isSinglePrize) {
    return {
      matchLength: 6,
      winners: "၁ ဦး",
      note: "ဆုတစ်ဆုခြင်း",
    };
  }

  if (isReAward || category.includes("ဘဏ္ဍာသိမ်း")) {
    return {
      matchLength: 6,
      winners: "၁ ဦး",
      note: "ပြန်လည်ချီးမြှင့်သောဆုမဲ",
    };
  }

  return {
    matchLength: 6,
    winners: "၁ ဦး",
    note: "",
  };
}

function cleanEntryDraft(entry: LotteryRuleEntry, index: number): LotteryRuleEntry | null {
  const prizeCategory = normalizeCategoryValue(String(entry.prizeCategory ?? ""));
  const alpha = String(entry.alpha ?? "").trim();
  const pattern = normalizeDigits(String(entry.pattern ?? "")).slice(0, 6);
  if (!prizeCategory || !alpha || !pattern) return null;
  const parsedLen = parseInt(String(entry.matchLength ?? ""), 10);
  const matchLength = Number.isFinite(parsedLen)
    ? Math.max(1, Math.min(6, parsedLen))
    : Math.max(1, Math.min(6, pattern.length));
  const rankRaw = String(entry.rank ?? "").trim();
  const parsedRank = parseInt(normalizeDigits(rankRaw), 10);
  const rank = Number.isFinite(parsedRank) ? parsedRank : index + 1;
  return {
    id: String(entry.id ?? "").trim() || `e${Date.now()}-${index}`,
    prizeCategory,
    alpha,
    pattern: pattern.slice(0, matchLength),
    matchLength,
    winners: String(entry.winners ?? "").trim(),
    note: String(entry.note ?? "").trim(),
    rank,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function downloadFileOnWeb(fileName: string, blob: Blob) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function normalizeSheetText(value: unknown): string {
  return String(value ?? "").trim();
}

function buildPrizesFromEntries(cleanEntries: LotteryRuleEntry[]): PrizeEntry[] {
  const order: string[] = [];
  const bucket = new Map<string, string[]>();
  cleanEntries.forEach((entry) => {
    const key = normalizeCategoryValue(entry.prizeCategory);
    if (!bucket.has(key)) {
      bucket.set(key, []);
      order.push(key);
    }
    bucket.get(key)!.push(`${entry.alpha}-${entry.pattern}`);
  });
  return order.map((category) => ({
    amount: category,
    numbers: bucket.get(category) ?? [],
  }));
}

export default function AdminScreen() {
  const colors = useColors();
  const { refreshAuth } = useAuth();
  const { language, setLanguage } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    results,
    ads,
    adsLoading,
    error: globalError,
    refresh,
    setSelectedDraw,
    adminUnlocked,
    setAdminUnlocked,
    pendingEditResultId,
    pendingEditCategory,
    clearPendingEdit,
  } = useLottery();

  const firestoreDisabled = globalError === "FIRESTORE_DISABLED";
  const isNarrow = width < 520;

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResult, setEditingResult] = useState<LotteryResult | null>(null);
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [editingAd, setEditingAd] = useState<AppAd | null>(null);
  const [adTitleMm, setAdTitleMm] = useState("");
  const [adTitleEn, setAdTitleEn] = useState("");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adTargetUrl, setAdTargetUrl] = useState("");
  const [adPlacement, setAdPlacement] = useState<AdPlacement>("both");
  const [adOrder, setAdOrder] = useState("1");
  const [adActive, setAdActive] = useState(true);
  const [adSaving, setAdSaving] = useState(false);

  const [drawNumber, setDrawNumber] = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [prizes, setPrizes] = useState<PrizeEntry[]>([{ amount: "ကျပ်သိန်း (၃၀၀၀) ဆု", numbers: [""] }]);
  const [entries, setEntries] = useState<LotteryRuleEntry[]>([]);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [verifiedAt, setVerifiedAt] = useState("");
  const [openCategoryPickerIndex, setOpenCategoryPickerIndex] = useState<number | null>(null);
  const [prizeCategoryQuery, setPrizeCategoryQuery] = useState("");
  const [openPrizeAlphaPickerIndex, setOpenPrizeAlphaPickerIndex] = useState<number | null>(null);
  const [prizeAlphaQuery, setPrizeAlphaQuery] = useState("");
  const [prizeAlphaDrafts, setPrizeAlphaDrafts] = useState<string[]>([]);
  const [prizeNumberDrafts, setPrizeNumberDrafts] = useState<string[]>([]);
  const [showAdvancedEntries, setShowAdvancedEntries] = useState(false);
  const [openEntryCategoryPickerIndex, setOpenEntryCategoryPickerIndex] = useState<number | null>(null);
  const [entryCategoryQuery, setEntryCategoryQuery] = useState("");
  const [openAlphaPickerIndex, setOpenAlphaPickerIndex] = useState<number | null>(null);
  const [alphaQuery, setAlphaQuery] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>(PRIZE_CATEGORY_OPTIONS);
  const [saving, setSaving] = useState(false);
  const [publishingDraw, setPublishingDraw] = useState<number | null>(null);
  const [saveInfo, setSaveInfo] = useState("");
  // Sample ads/local ads caching has been removed. Keep the UI Firestore-only for consistency.
  const [adminApiToken, setAdminApiToken] = useState("");
  const [adminApiIdentifier, setAdminApiIdentifier] = useState("");
  const [adminApiPassword, setAdminApiPassword] = useState("");
  const [showAdminApiPassword, setShowAdminApiPassword] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [userDataRecords, setUserDataRecords] = useState<UserDataRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userCreateLoading, setUserCreateLoading] = useState(false);
  const [currentAuthUser, setCurrentAuthUser] = useState<ManagedUser | null>(null);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>("content_creator");
  const [selfCurrentPassword, setSelfCurrentPassword] = useState("");
  const [selfNewPassword, setSelfNewPassword] = useState("");
  const [showSelfCurrentPassword, setShowSelfCurrentPassword] = useState(false);
  const [showSelfNewPassword, setShowSelfNewPassword] = useState(false);
  const [showSelfPasswordFields, setShowSelfPasswordFields] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotContact, setForgotContact] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotReset, setShowForgotReset] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminSectionTab>(() => {
    if (typeof window === "undefined" || !window.sessionStorage) return "users";
    const savedTab = window.sessionStorage.getItem(ADMIN_ACTIVE_TAB_KEY);
    if (savedTab === "lottery" || savedTab === "ads" || savedTab === "users") return savedTab;
    return "users";
  });
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | UserRole>("all");
  const [userSearch, setUserSearch] = useState("");

  const adReport = useMemo(() => {
    const total = ads.length;
    const active = ads.filter((a) => a.isActive).length;
    const totalClicks = ads.reduce((sum, a) => sum + (a.clickCount ?? 0), 0);
    const topAds = [...ads]
      .sort((a, b) => (b.clickCount ?? 0) - (a.clickCount ?? 0))
      .slice(0, 5);
    return { total, active, totalClicks, topAds };
  }, [ads]);

  const filteredUsers = useMemo(() => {
    const needle = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
      if (!needle) return true;
      const hay = `${u.username} ${u.email} ${u.phone} ${u.address ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [users, userRoleFilter, userSearch]);

  const topPadding = Platform.OS === "web" ? 26 : insets.top + 8;
  const contentWidth = Math.min(width - 24, 1120);
  const t = useMemo(
    () =>
      language === "en"
        ? {
            lockTitle: "Admin Login",
            lockSub: "Enter PIN",
            pinInvalid: "Invalid PIN",
            unlock: "Unlock",
            adminTitle: "",
            adminSub: "",
            drawNo: "Draw Number",
            drawDate: "Draw Date (YYYY-MM-DD)",
            sourceName: "Source Name",
            sourceUrl: "Source URL",
            verifiedAt: "Verified At (optional)",
            ticketBuilderHint: "Use this section to build visible result tickets (alpha-number).",
            advancedTogglePrefix: "Advanced: Entries / Note / Winners / Rank",
            advancedHelp: "This advanced section drives search logic. Use Template to auto-fill Match Length, Winners, and Note.",
            hide: "Hide",
            show: "Show",
            save: "Save Draft",
            saving: "Saving...",
            clear: "Clear",
            addData: "Add Data",
            editData: "Edit Data",
            close: "Close",
            noResult: "No lottery data yet",
            addNew: "Add New",
            errorTitle: "Error",
            invalidDrawNo: "Please enter a valid draw number.",
            dateRequired: "Please enter the draw date.",
            prizeRequired: "Please add at least one prize category and number.",
            invalidVerifiedAt: "Please enter a valid Verified At date/time.",
            deleteConfirmTitle: "Delete",
            deleteConfirmQuestion: "Do you want to delete this draw data?",
            deleteConfirmYes: "Delete",
            cancel: "Cancel",
            saveTimeout: "Save timed out. Please try again.",
            saveLocalOnly: "Saved locally. Firebase sync is pending.",
            saveDone: "Saved successfully.",
            saveFailed: "Failed to save.",
            drawSuffix: "draw",
            resultPrizes: "Prize sets",
            moreItems: "more",
            edit: "Edit",
            prizeType: "Prize Category",
            list: "List",
            alphaNumberAdd: "Add Alpha + Number",
            addedList: "Added List",
            entryPrefix: "Entry #",
            template: "Template",
            categoryLabel: "Category",
            entryCategoryPlaceholder: "Entry prize category",
            alphaLabel: "Alpha",
            patternLabel: "Number Pattern",
            matchLen: "Match Length",
            rank: "Rank",
            winners: "Winners",
            noteLabel: "Note (Rule)",
            notePlaceholder: "Rule note",
            prizeExample: "e.g. MMK Lakhs (5000) Prize",
            alphaPlaceholder: "Alpha",
            digitsPlaceholder: "Number (digits)",
            numbersListPlaceholder: "e.g. က-757767, ခ-123456 (comma separated)",
            advancedEntriesHeader: "Entries / Note / Winners / Rank",
            focusLabel: "Focused Prize Category",
            focusClear: "Show All",
            addFocusedPrize: "Add this prize category",
            saveDraftDone: "Saved as draft. Review and Publish when ready.",
            publish: "Publish",
            draft: "Draft",
            published: "Published",
            publishing: "Publishing...",
            publishConfirmTitle: "Publish",
            publishConfirmQuestion: "Publish this draw to live checker now?",
            publishDone: "Published successfully.",
            backup: "Backup",
            restore: "Restore",
            excelTemplate: "Excel Template",
            exportExcel: "Export Excel",
            importExcel: "Import Excel",
            restoreDone: "Restore completed.",
            restoreFailed: "Restore failed.",
            deleteDetails: "Delete this draw data?",
            deleteDone: "Deleted successfully.",
            deleteFailed: "Delete failed.",
            importExcelDone: "Excel data loaded into editor. Please review and Save Draft.",
            importExcelFailed: "Excel import failed.",
            invalidBackup: "Invalid backup file format.",
            adsTitle: "Advertisements",
            adsSub: "Home/Search banner ads",
            tabLotteryData: "Lottery Data",
            tabAdvertisements: "Advertisements",
            tabUserManagement: "User Management",
            addAd: "Add Ad",
            editAd: "Edit Ad",
            adTitleMm: "Title (Myanmar)",
            adTitleEn: "Title (English)",
            adImageUrl: "Image URL",
            adTargetUrl: "Target URL",
            adPlacement: "Placement",
            adOrder: "Order",
            adStatus: "Active",
            adSave: "Save Ad",
            adDeleteConfirm: "Delete this ad?",
            adDeleteDone: "Ad deleted.",
            adDeleteFailed: "Ad delete failed.",
            adDeleteLocalOnly: "Ad deleted locally. Firebase delete is pending.",
            adSaveDone: "Ad saved.",
            adSaveFailed: "Ad save failed.",
            adStatusDone: "Ad updated.",
            adStatusFailed: "Ad update failed.",
            adPlacementHome: "Home",
            adPlacementSearch: "Search",
            adPlacementBoth: "Both",
            adOpen: "Open Link",
            adSeedSamples: "",
            adReportTitle: "Ad Report Dashboard",
            adTotal: "Total Ads",
            adActiveCount: "Active Ads",
            adTotalClicks: "Total Clicks",
            adTop: "Top Clicked Ads",
            usersTitle: "Users Data",
            usersSub: "",
            userRoleAll: "All",
            userSearchPlaceholder: "Search username, email, phone, location",
            apiLoginIdentifier: "Username / Email / Phone",
            apiLoginPassword: "Password",
            showPassword: "Show",
            hidePassword: "Hide",
            apiLogin: "Login",
            apiLoginLoading: "Logging in...",
            apiLogout: "Logout",
            apiRefresh: "Refresh",
            usersEmpty: "No users found.",
            addNewUser: "Add New User",
            hideNewUserForm: "Hide Create Form",
            createUser: "Create User",
            createUserHint: "Create account with default password",
            userName: "Username",
            userEmail: "Email",
            userPhone: "Phone",
            userAddress: "Location",
            userPassword: "Password",
            userRole: "Role",
            roleAdmin: "Admin",
            roleContentCreator: "Content Creator",
            roleUser: "User",
            makeAdmin: "Make Admin",
            makeCreator: "Make Creator",
            allowUser: "Allow",
            denyUser: "Deny",
            activateUser: "Active",
            disableUser: "Disable",
            deleteUser: "Delete",
            generatePassword: "Generate",
            resetPassword: "Reset Password",
            resetPasswordPrompt: "Enter a temporary password for this user.",
            createdByAdmin: "User created successfully.",
            roleUpdated: "User role updated.",
            userDisabled: "User disabled.",
            passwordResetDone: "User password reset successfully.",
            passwordGenerated: "Temporary password generated.",
            passwordChanged: "Password changed successfully.",
            accountReady: "Account ready.",
            loginTimeout: "Login timed out. Please try again.",
            loadUsersTimeout: "Loading users timed out. Please refresh.",
            invalidUsername: "Username must be 3-32 chars (letters, numbers, ., _, -).",
            invalidEmail: "Please enter a valid email address.",
            invalidPhone: "Please enter a valid phone number.",
            wrongPassword: "Password is incorrect.",
            userNotFound: "Username/Email/Phone not found.",
            duplicateUser: "Username, email, or phone already exists.",
            changeMyPassword: "Change My Password",
            currentPassword: "Current Password",
            newPasswordLabel: "New Password",
            savePassword: "Update Password",
            forgotPassword: "Forgot Password",
            forgotHint: "Verify using registered email or phone and set a new password.",
            verifyContact: "Registered Email or Phone",
            verifyReset: "Verify & Reset Password",
            forgotDone: "Password reset completed.",
            actionActive: "Active",
            actionDisabled: "Disabled",
            noAdminPermission: "This account can login, but cannot manage users.",
            customerTitle: "Customer Accounts",
            customerSub: "Review user-submitted data",
            approval: "Approval",
            approvalPending: "Pending",
            approvalApproved: "Approved",
            approvalDenied: "Denied",
            approvalTerminated: "Terminated",
            actionApprove: "Approve",
            actionDeny: "Deny",
            actionTerminate: "Terminate",
            submittedDataTitle: "User Submitted Data",
            dataStatus: "Data Status",
            noSubmittedData: "No user-submitted data yet.",
            statusUpdated: "Status updated.",
          }
        : {
            lockTitle: "အက်မင် လော့ဂ်အင်",
            lockSub: "PIN နံပါတ် ထည့်ပါ",
            pinInvalid: "PIN မှားသည်",
            unlock: "ဝင်မည်",
            adminTitle: "",
            adminSub: "",
            drawNo: "ထီပွဲနံပါတ်",
            drawDate: "ထီပွဲရက်စွဲ (YYYY-MM-DD)",
            sourceName: "Source Name",
            sourceUrl: "Source URL",
            verifiedAt: "Verified At (optional)",
            ticketBuilderHint: "Result page ပေါ်မှာပြမည့် ဆုနံပါတ်များကို ဒီအပိုင်းမှာထည့်ပါ။ အက္ခရာ + နံပါတ် ကို builder နဲ့ထည့်နိုင်ပါတယ်။",
            advancedTogglePrefix: "Advanced: Entries / Note / Winners / Rank",
            advancedHelp: "Search logic / Winner count / Rule note အတွက်အသုံးပြုသော advanced data ဖြစ်သည်။ Category ရွေးပြီး `Template` ကိုနှိပ်လျှင် Match Length / Winners / Note ကို auto-fill ပေးသည်။",
            hide: "ဖျောက်မည်",
            show: "ဖွင့်မည်",
            save: "Draft သိမ်းမည်",
            saving: "သိမ်းနေသည်...",
            clear: "ရှင်းမည်",
            addData: "ထီ ဒေတာ ထည့်မည်",
            editData: "ပြင်ဆင်မည်",
            close: "ပိတ်မည်",
            noResult: "ထီဒေတာ မရှိသေးပါ",
            addNew: "Add New",
            errorTitle: "အမှား",
            invalidDrawNo: "ထီပွဲနံပါတ် မှန်ကန်စွာ ထည့်ပါ",
            dateRequired: "ရက်စွဲ ထည့်ပါ",
            prizeRequired: "ဆုအမျိုးအစားနှင့် နံပါတ်များ အနည်းဆုံး ၁ ခု ထည့်ပါ",
            invalidVerifiedAt: "Verified At format မှန်ကန်စွာ ထည့်ပါ",
            deleteConfirmTitle: "ဖျက်မည်",
            deleteConfirmQuestion: "ထီ ဒေတာ ဖျက်မည်လား?",
            deleteConfirmYes: "ဖျက်မည်",
            cancel: "မဖျက်ပါ",
            saveTimeout: "သိမ်းဆည်းချိန် များနေပါသည်။ နောက်တစ်ကြိမ် ထပ်စမ်းပါ။",
            saveLocalOnly: "Local တွင် သိမ်းပြီးပါပြီ။ Firebase sync မပြီးသေးပါ။",
            saveDone: "သိမ်းဆည်းပြီးပါပြီ",
            saveFailed: "သိမ်းဆည်း၍မရပါ",
            drawSuffix: "ကြိမ်",
            resultPrizes: "ဆုအုပ်စု",
            moreItems: "ခု ထပ်ရှိ",
            edit: "ပြင်ဆင်မည်",
            prizeType: "ဆုကြေး အမျိုးအစား",
            list: "စာရင်း",
            alphaNumberAdd: "အက္ခရာ + နံပါတ် ထည့်ရန်",
            addedList: "ထည့်ပြီးသော စာရင်း",
            entryPrefix: "Entry #",
            template: "Template",
            categoryLabel: "ဆုအမျိုးအစား (Category)",
            entryCategoryPlaceholder: "Entry ဆုအမျိုးအစား",
            alphaLabel: "အက္ခရာ (Alpha)",
            patternLabel: "နံပါတ် Pattern",
            matchLen: "Match Length",
            rank: "Rank",
            winners: "ကံထူးရှင်အရေအတွက်",
            noteLabel: "မှတ်ချက် (Note / Rule)",
            notePlaceholder: "မှတ်ချက် / rule note",
            prizeExample: "ဥပမာ - ကျပ်သိန်း (၅၀၀၀) ဆု",
            alphaPlaceholder: "အက္ခရာ",
            digitsPlaceholder: "နံပါတ် (digits)",
            numbersListPlaceholder: "ဥပမာ - က-757767, ခ-123456 (ကော်မာနှင့် ခွဲပါ)",
            advancedEntriesHeader: "Entries / Note / Winners / Rank",
            focusLabel: "ယခု ပြင်ဆင်နေသော ဆုအမျိုးအစား",
            focusClear: "အားလုံးပြမည်",
            addFocusedPrize: "ဒီဆုအမျိုးအစား ထည့်မည်",
            saveDraftDone: "Draft အဖြစ် သိမ်းပြီးပါပြီ။ စစ်ဆေးပြီး Publish နှိပ်မှ live checker တွင်ပေါ်မည်။",
            publish: "Publish",
            draft: "Draft",
            published: "Published",
            publishing: "Publish လုပ်နေသည်...",
            publishConfirmTitle: "Publish လုပ်မည်",
            publishConfirmQuestion: "ဒီထီပွဲကို live checker တွင် ချက်ချင်းပြမလား?",
            publishDone: "Publish လုပ်ပြီးပါပြီ။",
            backup: "Backup",
            restore: "Restore",
            excelTemplate: "Excel Template",
            exportExcel: "Excel ထုတ်မည်",
            importExcel: "Excel ထည့်မည်",
            restoreDone: "Restore ပြီးပါပြီ။",
            restoreFailed: "Restore မအောင်မြင်ပါ။",
            deleteDetails: "ဒီထီပွဲဒေတာကို ဖျက်မလား?",
            deleteDone: "ဖျက်ပြီးပါပြီ။",
            deleteFailed: "ဖျက်၍မရပါ။",
            importExcelDone: "Excel data ကို editor ထဲထည့်ပြီးပါပြီ။ စစ်ဆေးပြီး Save Draft နှိပ်ပါ။",
            importExcelFailed: "Excel import မအောင်မြင်ပါ။",
            invalidBackup: "Backup file format မှန်ကန်မှုမရှိပါ။",
            adsTitle: "ကြော်ငြာ စီမံခန့်ခွဲမှု",
            adsSub: "Home/Search တွင်ပြမည့် banner ကြော်ငြာ",
            tabLotteryData: "Lottery Data",
            tabAdvertisements: "Advertisements",
            tabUserManagement: "User Management",
            addAd: "ကြော်ငြာ ထည့်မည်",
            editAd: "ကြော်ငြာ ပြင်မည်",
            adTitleMm: "ခေါင်းစဉ် (မြန်မာ)",
            adTitleEn: "ခေါင်းစဉ် (အင်္ဂလိပ်)",
            adImageUrl: "ရုပ်ပုံ URL",
            adTargetUrl: "ဖွင့်မည့် လိပ်စာ URL",
            adPlacement: "ပြမည့်နေရာ",
            adOrder: "အစဉ်",
            adStatus: "Active",
            adSave: "ကြော်ငြာ သိမ်းမည်",
            adDeleteConfirm: "ဒီကြော်ငြာကို ဖျက်မလား?",
            adDeleteDone: "ကြော်ငြာ ဖျက်ပြီးပါပြီ။",
            adDeleteFailed: "ကြော်ငြာ ဖျက်၍မရပါ။",
            adDeleteLocalOnly: "ကြော်ငြာကို Local မှ ဖျက်ပြီးပါပြီ။ Firebase delete မပြီးသေးပါ။",
            adSaveDone: "ကြော်ငြာ သိမ်းပြီးပါပြီ။",
            adSaveFailed: "ကြော်ငြာ သိမ်း၍မရပါ။",
            adStatusDone: "ကြော်ငြာ အခြေအနေ ပြင်ပြီးပါပြီ။",
            adStatusFailed: "ကြော်ငြာ အခြေအနေ ပြင်၍မရပါ။",
            adPlacementHome: "Home",
            adPlacementSearch: "Search",
            adPlacementBoth: "Both",
            adOpen: "Link ဖွင့်မည်",
            adSeedSamples: "",
            adReportTitle: "ကြော်ငြာ Report Dashboard",
            adTotal: "ကြော်ငြာစုစုပေါင်း",
            adActiveCount: "လက်ရှိ Active",
            adTotalClicks: "Click စုစုပေါင်း",
            adTop: "Click အများဆုံး",
            usersTitle: "Users Data",
            usersSub: "",
            userRoleAll: "အားလုံး",
            userSearchPlaceholder: "Username / Email / Phone / Location ဖြင့်ရှာရန်",
            apiLoginIdentifier: "Username / Email / Phone",
            apiLoginPassword: "Password",
            showPassword: "ပြမည်",
            hidePassword: "ဖျောက်မည်",
            apiLogin: "လော့ဂ်အင်",
            apiLoginLoading: "ဝင်ရောက်နေသည်...",
            apiLogout: "ထွက်မည်",
            apiRefresh: "ပြန်ဖတ်မည်",
            usersEmpty: "အသုံးပြုသူမရှိသေးပါ။",
            addNewUser: "User အသစ်ထည့်မည်",
            hideNewUserForm: "User ဖန်တီးပုံစံပိတ်မည်",
            createUser: "User အသစ်ဖန်တီးမည်",
            createUserHint: "Default password ဖြင့် user အကောင့်အသစ်ဖန်တီးရန်",
            userName: "Username",
            userEmail: "Email",
            userPhone: "Phone",
            userAddress: "Location",
            userPassword: "Password",
            userRole: "Role",
            roleAdmin: "Admin",
            roleContentCreator: "Content Creator",
            roleUser: "User",
            makeAdmin: "Admin အဖြစ်ပြောင်း",
            makeCreator: "Creator အဖြစ်ပြောင်း",
            allowUser: "Allow",
            denyUser: "Deny",
            activateUser: "Active",
            disableUser: "ပိတ်မည်",
            deleteUser: "ဖျက်မည်",
            generatePassword: "Generate",
            resetPassword: "Password Reset",
            resetPasswordPrompt: "ဤ user အတွက် ခေတ္တ password အသစ်ထည့်ပါ။",
            createdByAdmin: "User ဖန်တီးပြီးပါပြီ။",
            roleUpdated: "Role ပြင်ပြီးပါပြီ။",
            userDisabled: "User ကို disable လုပ်ပြီးပါပြီ။",
            passwordResetDone: "User password reset ပြီးပါပြီ။",
            passwordGenerated: "Temporary password အသစ် generate လုပ်ပြီးပါပြီ။",
            passwordChanged: "Password ပြောင်းပြီးပါပြီ။",
            accountReady: "Account အသုံးပြုနိုင်ပါပြီ။",
            loginTimeout: "Login အချိန်ကျော်သွားပါတယ်။ ထပ်စမ်းပါ။",
            loadUsersTimeout: "User စာရင်းဖတ်ချိန်ကျော်သွားပါတယ်။ Refresh လုပ်ပါ။",
            invalidUsername: "Username ကို ၃ မှ ၃၂ လုံးအတွင်း (စာလုံး၊ဂဏန်း၊ ., _, -) ဖြင့်ထည့်ပါ။",
            invalidEmail: "မှန်ကန်သော Email လိပ်စာထည့်ပါ။",
            invalidPhone: "မှန်ကန်သော Phone နံပါတ်ထည့်ပါ။",
            wrongPassword: "Password မှားနေပါတယ်။",
            userNotFound: "Username/Email/Phone မတွေ့ပါ။",
            duplicateUser: "Username၊ Email သို့မဟုတ် Phone သည်ရှိပြီးသားဖြစ်နေပါသည်။",
            changeMyPassword: "ကိုယ်ပိုင် Password ပြောင်းမည်",
            currentPassword: "လက်ရှိ Password",
            newPasswordLabel: "Password အသစ်",
            savePassword: "Password Update",
            forgotPassword: "Password မေ့သွားလား",
            forgotHint: "မှတ်ပုံတင်ထားသော Email (သို့) Phone နဲ့စစ်ဆေးပြီး Password အသစ်ပြန်သတ်မှတ်ပါ။",
            verifyContact: "မှတ်ပုံတင် Email (သို့) Phone",
            verifyReset: "အတည်ပြုပြီး Reset လုပ်မည်",
            forgotDone: "Password reset ပြီးပါပြီ။",
            actionActive: "Active",
            actionDisabled: "Disabled",
            noAdminPermission: "ဒီ account ဖြင့် login ဝင်နိုင်သော်လည်း user management မလုပ်နိုင်ပါ။",
            customerTitle: "Customer အကောင့်များ",
            customerSub: "User တင်ထားသောဒေတာများကြည့်ရန်",
            approval: "အတည်ပြုအခြေအနေ",
            approvalPending: "စောင့်ဆိုင်း",
            approvalApproved: "အတည်ပြု",
            approvalDenied: "ငြင်းပယ်",
            approvalTerminated: "ရပ်ဆိုင်း",
            actionApprove: "Approve",
            actionDeny: "Deny",
            actionTerminate: "Terminate",
            submittedDataTitle: "User တင်ထားသောဒေတာများ",
            dataStatus: "Data Status",
            noSubmittedData: "User တင်ထားသောဒေတာ မရှိသေးပါ။",
            statusUpdated: "Status ပြင်ပြီးပါပြီ။",
          },
    [language],
  );

  const handlePinSubmit = () => {
    if (pin === ADMIN_PIN) {
      setAdminUnlocked(true);
      setPinError(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setPinError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPin("");
    }
  };

  const openAdd = () => {
    setDrawNumber("");
    setDrawDate(new Date().toISOString().slice(0, 10));
    setPrizes([{ amount: "ကျပ်သိန်း (၃၀၀၀) ဆု", numbers: [""] }]);
    setEntries([]);
    setSourceName("");
    setSourceUrl("");
    setVerifiedAt("");
    setOpenCategoryPickerIndex(null);
    setOpenPrizeAlphaPickerIndex(null);
    setOpenEntryCategoryPickerIndex(null);
    setOpenAlphaPickerIndex(null);
    setPrizeCategoryQuery("");
    setPrizeAlphaQuery("");
    setPrizeAlphaDrafts(["က"]);
    setPrizeNumberDrafts([""]);
    setEntryCategoryQuery("");
    setAlphaQuery("");
    setSaveInfo("");
    setShowAdvancedEntries(false);
    setFocusedCategory(null);
    setEditingResult(null);
    setShowAddModal(true);
  };

  const openEdit = (r: LotteryResult, focusCategory?: string | null) => {
    setDrawNumber(String(r.drawNumber));
    setDrawDate(r.drawDate);
    setPrizes(
      r.prizes.map((p) => ({
        ...p,
        amount: normalizeCategoryValue(String(p.amount ?? "")),
        numbers: [...p.numbers],
      })),
    );
    setEntries(
      (r.entries ?? []).map((e, i) => ({
        id: e.id || `e${i + 1}`,
        prizeCategory: normalizeCategoryValue(String(e.prizeCategory ?? "")),
        alpha: String(e.alpha ?? ""),
        pattern: String(e.pattern ?? ""),
        matchLength: Number(e.matchLength ?? 0) || 1,
        winners: String(e.winners ?? ""),
        note: String(e.note ?? ""),
        rank: Number(e.rank ?? i + 1),
      })),
    );
    setSourceName(String(r.sourceName ?? ""));
    setSourceUrl(String(r.sourceUrl ?? ""));
    setVerifiedAt(
      r.verifiedAt ? new Date(r.verifiedAt).toISOString().slice(0, 16) : "",
    );
    setOpenCategoryPickerIndex(null);
    setOpenPrizeAlphaPickerIndex(null);
    setOpenEntryCategoryPickerIndex(null);
    setOpenAlphaPickerIndex(null);
    setPrizeCategoryQuery("");
    setPrizeAlphaQuery("");
    setPrizeAlphaDrafts(r.prizes.map(() => "က"));
    setPrizeNumberDrafts(r.prizes.map(() => ""));
    setEntryCategoryQuery("");
    setAlphaQuery("");
    setSaveInfo("");
    setShowAdvancedEntries((r.entries ?? []).length > 0 || !!focusCategory);
    setFocusedCategory(focusCategory ? normalizeCategoryValue(focusCategory) : null);
    setEditingResult(r);
    setShowAddModal(true);
  };

  const addPrizeRow = (defaultCategory?: string) => {
    const nextCategory = normalizeCategoryValue(defaultCategory ?? "ကျပ်သိန်း (၁၀၀) ဆုများ");
    setPrizes((prev) => [...prev, { amount: nextCategory, numbers: [""] }]);
    setPrizeAlphaDrafts((prev) => [...prev, MYANMAR_ALPHABETS[0]]);
    setPrizeNumberDrafts((prev) => [...prev, ""]);
    addCategoryOption(nextCategory);
  };

  const removePrizeRow = (idx: number) => {
    setPrizes((prev) => prev.filter((_, i) => i !== idx));
    setPrizeAlphaDrafts((prev) => prev.filter((_, i) => i !== idx));
    setPrizeNumberDrafts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePrizeAmount = (idx: number, amount: string) => {
    setPrizes((prev) => prev.map((p, i) => (i === idx ? { ...p, amount } : p)));
  };

  const updatePrizeNumbers = (idx: number, numbersStr: string) => {
    setPrizes((prev) => prev.map((p, i) => (i === idx ? { ...p, numbers: numbersStr ? numbersStr.split(",").map(n => n.trim()) : [""] } : p)));
  };

  const updatePrizeAlphaDraft = (idx: number, alpha: string) => {
    setPrizeAlphaDrafts((prev) => prev.map((v, i) => (i === idx ? alpha : v)));
  };

  const updatePrizeNumberDraft = (idx: number, pattern: string) => {
    setPrizeNumberDrafts((prev) => prev.map((v, i) => (i === idx ? normalizeDigits(pattern).slice(0, 6) : v)));
  };

  const appendPrizeTicket = (idx: number) => {
    const alpha = String(prizeAlphaDrafts[idx] ?? "").trim();
    const pattern = normalizeDigits(String(prizeNumberDrafts[idx] ?? ""));
    if (!alpha || !pattern) return;
    const ticket = `${alpha}-${pattern}`;
    setPrizes((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const existing = p.numbers.filter((n) => n.trim().length > 0);
        if (existing.includes(ticket)) return p;
        return { ...p, numbers: [...existing, ticket] };
      }),
    );
    updatePrizeNumberDraft(idx, "");
  };

  const addCategoryOption = (rawValue: string) => {
    const value = normalizeCategoryValue(rawValue);
    if (!value) return;
    setCategoryOptions((prev) => (prev.includes(value) ? prev : [...prev, value]));
  };

  const filteredPrizeCategories = useMemo(
    () => categoryOptions.filter((option) => matchesCategoryFilter(option, prizeCategoryQuery)),
    [categoryOptions, prizeCategoryQuery],
  );

  const filteredEntryCategories = useMemo(
    () => categoryOptions.filter((option) => matchesCategoryFilter(option, entryCategoryQuery)),
    [categoryOptions, entryCategoryQuery],
  );

  const filteredPrizeAlphaOptions = useMemo(() => {
    const q = prizeAlphaQuery.trim();
    const base = [...ALPHA_BASE_OPTIONS];
    if (!q) return base;
    return base.filter((opt) => opt.includes(q));
  }, [prizeAlphaQuery]);

  const alphaOptionsByCategory = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const add = (categoryRaw: string, alphaRaw: string) => {
      const category = normalizeCategoryValue(String(categoryRaw ?? ""));
      const alpha = String(alphaRaw ?? "").trim();
      if (!category || !alpha) return;
      if (!map.has(category)) map.set(category, new Set<string>());
      map.get(category)!.add(alpha);
    };
    results.forEach((r) => (r.entries ?? []).forEach((e) => add(e.prizeCategory, e.alpha)));
    entries.forEach((e) => add(e.prizeCategory, e.alpha));
    return map;
  }, [results, entries]);

  const filteredAlphaOptions = useMemo(() => {
    if (openAlphaPickerIndex === null) return [];
    const currentCategory = normalizeCategoryValue(entries[openAlphaPickerIndex]?.prizeCategory ?? "");
    const base = new Set(ALPHA_BASE_OPTIONS);
    const categorySpecific = alphaOptionsByCategory.get(currentCategory);
    categorySpecific?.forEach((a) => base.add(a));
    const options = Array.from(base).sort();
    const q = alphaQuery.trim();
    if (!q) return options;
    return options.filter((opt) => opt.includes(q));
  }, [openAlphaPickerIndex, entries, alphaOptionsByCategory, alphaQuery]);

  const visiblePrizeIndices = useMemo(() => {
    if (!focusedCategory) return prizes.map((_, idx) => idx);
    const target = normalizeCategoryValue(focusedCategory);
    return prizes
      .map((prize, idx) => ({ prize, idx }))
      .filter(({ prize }) => normalizeCategoryValue(prize.amount) === target)
      .map(({ idx }) => idx);
  }, [prizes, focusedCategory]);

  const visibleEntryIndices = useMemo(() => {
    if (!focusedCategory) return entries.map((_, idx) => idx);
    const target = normalizeCategoryValue(focusedCategory);
    return entries
      .map((entry, idx) => ({ entry, idx }))
      .filter(({ entry }) => normalizeCategoryValue(entry.prizeCategory) === target)
      .map(({ idx }) => idx);
  }, [entries, focusedCategory]);

  const addEntryRow = () => {
    const nextRank = entries.length + 1;
    setEntries((prev) => [
      ...prev,
      {
        id: `e${Date.now()}-${nextRank}`,
        prizeCategory: "ကျပ်သိန်း (၃၀၀၀) ဆု",
        alpha: MYANMAR_ALPHABETS[0],
        pattern: "",
        matchLength: 6,
        winners: "",
        note: "",
        rank: nextRank,
      },
    ]);
  };

  const removeEntryRow = (idx: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateEntry = <K extends keyof LotteryRuleEntry>(idx: number, key: K, value: LotteryRuleEntry[K]) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [key]: value } : e)));
  };

  const applyTemplateToEntry = (idx: number, categoryRaw: string, force = false) => {
    const template = inferEntryTemplate(categoryRaw);
    if (!template) return;
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== idx) return e;
        const next = { ...e, prizeCategory: normalizeCategoryValue(categoryRaw) };
        if (force || !e.matchLength || e.matchLength <= 0) next.matchLength = template.matchLength;
        if (force || !String(e.winners ?? "").trim()) next.winners = template.winners;
        if (force || !String(e.note ?? "").trim()) next.note = template.note;
        return next;
      }),
    );
  };

  const exportBackupJson = () => {
    if (typeof window === "undefined" || Platform.OS !== "web") {
      Alert.alert(t.errorTitle, "Web only feature");
      return;
    }
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      items: results,
    };
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFileOnWeb(
      `lottery-backup-${stamp}.json`,
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }),
    );
  };

  const buildTemplateWorkbook = (seed?: LotteryResult) => {
    const header = ["ဆုအမျိုးအစား", "အက္ခရာ", "ထီနံပါတ်", "ကံထူးရှင်အရေအတွက်", "မှတ်ချက်"];
    const rows: Array<Array<string | number>> = [header];
    if (seed?.entries?.length) {
      seed.entries.slice(0, 120).forEach((entry) => {
        rows.push([
          normalizeCategoryValue(entry.prizeCategory),
          entry.alpha,
          entry.pattern,
          entry.winners ?? "",
          entry.note ?? "",
        ]);
      });
    } else {
      rows.push(["ကျပ်သိန်း (၅၀၀၀) ဆု", "က", "123456", "၁ ဦး", "အထူးဆုကြီး"]);
      rows.push(["ဝေဝေဆာဆာပဒေသာ ကျပ် (၂) သိန်းဆုများ", "ခ", "1234", "၁၀၀၀ ဦး", "အက္ခရာနှင့် ရှေ့ဂဏန်း(၄)လုံးအစဉ်လိုက်တူ"]);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "draw-template");
    return wb;
  };

  const exportTemplateExcel = (seed?: LotteryResult) => {
    if (typeof window === "undefined" || Platform.OS !== "web") {
      Alert.alert(t.errorTitle, "Web only feature");
      return;
    }
    const wb = buildTemplateWorkbook(seed);
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const name = seed
      ? `lottery-draw-${seed.drawNumber}-template.xlsx`
      : "lottery-draw-template.xlsx";
    downloadFileOnWeb(
      name,
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    );
  };

  const restoreBackupJson = () => {
    if (typeof window === "undefined" || Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert(t.errorTitle, "Web only feature");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const parsed = JSON.parse(text);
        const rawItems = Array.isArray(parsed) ? parsed : parsed?.items;
        if (!Array.isArray(rawItems)) {
          Alert.alert(t.errorTitle, t.invalidBackup);
          return;
        }
        const cleanItems = rawItems
          .map((item) => item as LotteryResult)
          .filter((item) => typeof item?.drawNumber === "number" && Array.isArray(item?.prizes))
          .map((item) => ({
            drawNumber: item.drawNumber,
            drawDate: item.drawDate,
            prizes: item.prizes,
            entries: item.entries ?? [],
            sourceName: item.sourceName ?? "",
            sourceUrl: item.sourceUrl ?? "",
            verifiedAt: item.verifiedAt,
            publishStatus: item.publishStatus ?? "published",
            publishedAt: item.publishedAt,
          }));
        if (cleanItems.length === 0) {
          Alert.alert(t.errorTitle, t.invalidBackup);
          return;
        }
        saveLocalOverridesBulk(cleanItems);
        await refresh();
        setSaveInfo(t.restoreDone);
      } catch (err) {
        console.warn("Restore backup failed", err);
        Alert.alert(t.errorTitle, t.restoreFailed);
      }
    };
    input.click();
  };

  const importFromExcel = () => {
    if (typeof window === "undefined" || Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert(t.errorTitle, "Web only feature");
      return;
    }
    if (!canManageContent) {
      Alert.alert(t.errorTitle, t.noAdminPermission);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });

        const parsedEntries = rows
          .map((row, idx) => {
            const prizeCategory = normalizeCategoryValue(normalizeSheetText(row["ဆုအမျိုးအစား"]));
            const alpha = normalizeSheetText(row["အက္ခရာ"]);
            const pattern = normalizeDigits(normalizeSheetText(row["ထီနံပါတ်"])).slice(0, 6);
            const winners = normalizeSheetText(row["ကံထူးရှင်အရေအတွက်"]);
            const note = normalizeSheetText(row["မှတ်ချက်"]);
            const guessedLength = Math.max(1, Math.min(6, pattern.length || 6));
            return cleanEntryDraft(
              {
                id: `excel-${Date.now()}-${idx}`,
                prizeCategory,
                alpha,
                pattern,
                matchLength: guessedLength,
                winners,
                note,
                rank: idx + 1,
              },
              idx,
            );
          })
          .filter((entry): entry is LotteryRuleEntry => !!entry);

        if (parsedEntries.length === 0) {
          Alert.alert(t.errorTitle, t.importExcelFailed);
          return;
        }

        const drawFromName = (file.name.match(/(?:draw|lottery)[^0-9]*([0-9]{1,4})/i)?.[1] ?? "").trim();
        const nextDraw = drawFromName || drawNumber || String((results[0]?.drawNumber ?? 0) + 1);

        setDrawNumber(nextDraw);
        setDrawDate(new Date().toISOString().slice(0, 10));
        setEntries(parsedEntries);
        const nextPrizes = buildPrizesFromEntries(parsedEntries);
        setPrizes(nextPrizes.length ? nextPrizes : [{ amount: "ကျပ်သိန်း (၃၀၀၀) ဆု", numbers: [""] }]);
        setPrizeAlphaDrafts(nextPrizes.map(() => MYANMAR_ALPHABETS[0]));
        setPrizeNumberDrafts(nextPrizes.map(() => ""));
        setSourceName(file.name);
        setSourceUrl("");
        setVerifiedAt("");
        setShowAdvancedEntries(true);
        setEditingResult(null);
        setFocusedCategory(null);
        setActiveAdminTab("lottery");
        setShowAddModal(true);
        setSaveInfo(t.importExcelDone);
      } catch (err) {
        console.warn("Excel import failed", err);
        Alert.alert(t.errorTitle, t.importExcelFailed);
      }
    };
    input.click();
  };

  const openAddAd = () => {
    if (!canManageContent) {
      Alert.alert(t.errorTitle, t.noAdminPermission);
      return;
    }
    setEditingAd(null);
    setAdTitleMm("");
    setAdTitleEn("");
    setAdImageUrl("");
    setAdTargetUrl("");
    setAdPlacement("both");
    setAdOrder(String((ads[ads.length - 1]?.order ?? 0) + 1));
    setAdActive(true);
    setShowAdModal(true);
  };

  const openEditAd = (ad: AppAd) => {
    if (!canManageContent) {
      Alert.alert(t.errorTitle, t.noAdminPermission);
      return;
    }
    setEditingAd(ad);
    setAdTitleMm(ad.titleMm ?? "");
    setAdTitleEn(ad.titleEn ?? "");
    setAdImageUrl(ad.imageUrl ?? "");
    setAdTargetUrl(ad.targetUrl ?? "");
    setAdPlacement(ad.placement ?? "both");
    setAdOrder(String(ad.order ?? 1));
    setAdActive(ad.isActive !== false);
    setShowAdModal(true);
  };

  const handleSaveAd = async () => {
    if (adSaving) return;
    const titleMm = adTitleMm.trim();
    const imageUrl = adImageUrl.trim();
    const targetUrl = adTargetUrl.trim();
    const order = Number(normalizeDigits(adOrder || "1")) || 1;
    if (!titleMm || !imageUrl || !targetUrl) {
      Alert.alert(t.errorTitle, t.prizeRequired);
      return;
    }

    setAdSaving(true);
    setSaveInfo("");
    const payload: Omit<AppAd, "id" | "createdAt" | "updatedAt"> = {
      titleMm,
      titleEn: adTitleEn.trim(),
      imageUrl,
      targetUrl,
      placement: adPlacement,
      isActive: adActive,
      order,
    };

    try {
      // 1) Write first
      await withTimeout(upsertAd(payload, editingAd?.id), 20000, t.saveTimeout);

      // 2) Close the form immediately (users expect to return to the dashboard right away)
      setShowAdModal(false);
      setEditingAd(null);
      setSaveInfo(t.adSaveDone);

      // 3) Refresh data in the background so the dashboard list updates shortly after.
      void refresh();
    } catch (e) {
      console.warn("Ad save failed", e);
      Alert.alert(t.errorTitle, t.adSaveFailed);
    } finally {
      setAdSaving(false);
    }
  };

  const handleDeleteAd = (ad: AppAd) => {
    const performDelete = async () => {
      try {
        const id = ad.id || "";
        if (!id) return;
        await withTimeout(deleteAdById(id), 15000, t.saveTimeout);
        await refresh();
        setSaveInfo(t.adDeleteDone);
      } catch (e) {
        console.warn("Ad delete failed", e);
        Alert.alert(t.errorTitle, t.adDeleteFailed);
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(`${t.deleteConfirmTitle}\n\n${t.adDeleteConfirm}`);
      if (ok) void performDelete();
      return;
    }

    Alert.alert(t.deleteConfirmTitle, t.adDeleteConfirm, [
      { text: t.cancel, style: "cancel" },
      { text: t.deleteConfirmYes, style: "destructive", onPress: () => void performDelete() },
    ]);
  };

  const toggleAdActive = async (ad: AppAd) => {
    const payload: Omit<AppAd, "id" | "createdAt" | "updatedAt"> = {
      titleMm: ad.titleMm,
      titleEn: ad.titleEn ?? "",
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      placement: ad.placement ?? "both",
      isActive: !ad.isActive,
      order: ad.order ?? 1,
      startAt: ad.startAt,
      endAt: ad.endAt,
    };
    try {
      await withTimeout(upsertAd(payload, ad.id), 15000, t.saveTimeout);
      setSaveInfo(t.adStatusDone);
    } catch (e) {
      console.warn("Toggle ad failed", e);
      setSaveInfo(t.adStatusFailed);
      Alert.alert(t.errorTitle, t.adStatusFailed);
    } finally {
      await refresh();
    }
  };

  const handleDeleteAllAds = async () => {
    const run = async () => {
      try {
        setAdSaving(true);
        setSaveInfo("");
        const count = await withTimeout(deleteAllAds(), 30000, t.saveTimeout);
        await refresh();
        setSaveInfo(`${t.adDeleteDone} (${toMM(count)})`);
      } catch (e) {
        console.warn("delete all ads failed", e);
        Alert.alert(t.errorTitle, t.adDeleteFailed);
      } finally {
        setAdSaving(false);
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(`${t.deleteConfirmTitle}\n\nDelete ALL advertisements?`);
      if (ok) void run();
      return;
    }
    Alert.alert(t.deleteConfirmTitle, "Delete ALL advertisements?", [
      { text: t.cancel, style: "cancel" },
      { text: t.deleteConfirmYes, style: "destructive", onPress: () => void run() },
    ]);
  };

  const roleLabel = (role: UserRole): string => {
    if (role === "admin") return t.roleAdmin;
    if (role === "content_creator") return t.roleContentCreator;
    return t.roleUser;
  };

  const toUiErrorMessage = (raw: string): string => {
    const msg = (raw || "").toLowerCase();
    if (msg.includes("password is incorrect")) return t.wrongPassword;
    if (msg.includes("invalid credentials")) return t.wrongPassword;
    if (msg.includes("username/email/phone not found")) return t.userNotFound;
    if (msg.includes("user not found")) return t.userNotFound;
    if (msg.includes("already exists")) return t.duplicateUser;
    return raw || t.saveFailed;
  };

  const approvalLabel = (status: UserApprovalStatus): string => {
    if (status === "approved") return t.approvalApproved;
    if (status === "denied") return t.approvalDenied;
    if (status === "terminated") return t.approvalTerminated;
    return t.approvalPending;
  };

  const dataStatusLabel = (status: UserDataStatus): string => {
    if (status === "approved") return t.approvalApproved;
    if (status === "denied") return t.approvalDenied;
    if (status === "terminated") return t.approvalTerminated;
    return t.approvalPending;
  };

  const loadUsers = async (tokenOverride?: string) => {
    const token = tokenOverride ?? adminApiToken;
    if (!token) return;

    try {
      setUsersLoading(true);
      setUsersError("");
      const list = await withTimeout(
        getAdminUsers(token),
        15000,
        t.loadUsersTimeout,
      );
      setUsers(list);
      void getAdminSubmittedData(token)
        .then((submitted) => {
          setUserDataRecords(submitted);
        })
        .catch(() => {
          setUserDataRecords([]);
        });
    } catch (err: any) {
      const message = err?.message ?? t.saveFailed;
      setUsersError(message);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleApiLogin = async () => {
    if (!adminApiIdentifier.trim() || !adminApiPassword.trim()) {
      Alert.alert(t.errorTitle, t.prizeRequired);
      return;
    }

    try {
      setUsersLoading(true);
      setUsersError("");
      const data = await withTimeout(
        loginAdminApi(adminApiIdentifier.trim(), adminApiPassword),
        10000,
        t.loginTimeout,
      );
      setAdminApiToken(data.token);
      setStoredAdminApiToken(data.token);
      setCurrentAuthUser(data.user);
      setAdminApiPassword("");
      void refreshAuth();
      if (data.user.role === "admin") {
        void loadUsers(data.token);
      } else {
        setUsers([]);
        setUserDataRecords([]);
      }
      if (data.user.mustChangePassword) {
        setShowSelfPasswordFields(true);
      }
    } catch (err: any) {
      const message = toUiErrorMessage(err?.message ?? t.saveFailed);
      setUsersError(message);
      Alert.alert(t.errorTitle, message);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleApiLogout = () => {
    logoutUser();
    setAdminApiToken("");
    setStoredAdminApiToken("");
    setCurrentAuthUser(null);
    setUsers([]);
    setUserDataRecords([]);
    setUsersError("");
    void refreshAuth();
  };

  const canManageUsers = !!adminApiToken && currentAuthUser?.role === "admin";
  const canManageContent =
    !!adminApiToken && (currentAuthUser?.role === "admin" || currentAuthUser?.role === "content_creator");
  const isLoggedIn = !!adminApiToken;

  const handleGenerateCreatePassword = () => {
    const generated = generateTempPassword(10);
    setNewPassword(generated);
    setSaveInfo(t.passwordGenerated);
  };

  const handleShowCreateUserForm = () => {
    setNewUsername("");
    setNewEmail("");
    setNewPhone("");
    setNewAddress("");
    setNewPassword("");
    setNewRole("content_creator");
    setShowCreateUserForm(true);
    setShowNewUserPassword(false);
  };

  const resetCreateUserForm = () => {
    setNewUsername("");
    setNewEmail("");
    setNewPhone("");
    setNewAddress("");
    setNewPassword("");
    setShowNewUserPassword(false);
    setNewRole("content_creator");
    setShowCreateUserForm(false);
  };

  const handleCreateUser = async () => {
    if (!canManageUsers) return;
    const username = newUsername.trim();
    const email = newEmail.trim();
    const phone = newPhone.trim();
    if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) {
      Alert.alert(t.errorTitle, t.invalidUsername);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert(t.errorTitle, t.invalidEmail);
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      Alert.alert(t.errorTitle, t.invalidPhone);
      return;
    }
    if (
      !username ||
      !email ||
      !phone
    ) {
      Alert.alert(t.errorTitle, t.prizeRequired);
      return;
    }

    try {
      setUserCreateLoading(true);
      setUsersError("");
      const passwordToUse = newPassword.trim() || generateTempPassword(10);
      await createAdminUser(adminApiToken, {
        username,
        email,
        phone,
        address: newAddress.trim(),
        password: passwordToUse,
        role: newRole,
      });
      resetCreateUserForm();
      void loadUsers();
      setSaveInfo(`${t.createdByAdmin}  (${passwordToUse})`);
    } catch (err: any) {
      const message = toUiErrorMessage(err?.message ?? t.saveFailed);
      setUsersError(message);
      Alert.alert(t.errorTitle, message);
    } finally {
      setUserCreateLoading(false);
    }
  };

  const handleChangeRole = async (user: ManagedUser, role: UserRole) => {
    if (!canManageUsers || user.role === role) return;
    try {
      await updateAdminUserRole(adminApiToken, user.id, role);
      await loadUsers();
      setSaveInfo(t.roleUpdated);
    } catch (err: any) {
      const message = err?.message ?? t.saveFailed;
      setUsersError(message);
      Alert.alert(t.errorTitle, message);
    }
  };

  const handleSetUserStatus = async (user: ManagedUser, status: "active" | "disabled") => {
    if (!canManageUsers) return;

    const run = async () => {
      try {
        await setAdminUserStatus(adminApiToken, user.id, status);
        await loadUsers();
        setSaveInfo(status === "active" ? t.actionActive : t.userDisabled);
      } catch (err: any) {
        const message = err?.message ?? t.saveFailed;
        setUsersError(message);
        Alert.alert(t.errorTitle, message);
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const actionLabel = status === "active" ? t.activateUser : t.disableUser;
      const ok = window.confirm(`${user.username}\n\n${actionLabel}?`);
      if (ok) void run();
      return;
    }

    const actionLabel = status === "active" ? t.activateUser : t.disableUser;
    Alert.alert(t.deleteConfirmTitle, `${user.username}\n\n${actionLabel}?`, [
      { text: t.cancel, style: "cancel" },
      { text: t.deleteConfirmYes, style: "destructive", onPress: () => void run() },
    ]);
  };

  const handleDeleteUser = async (user: ManagedUser) => {
    if (!canManageUsers) return;
    const run = async () => {
      try {
        await deleteAdminUser(adminApiToken, user.id);
        await loadUsers();
        setSaveInfo(t.deleteDone);
      } catch (err: any) {
        const message = err?.message ?? t.saveFailed;
        setUsersError(message);
        Alert.alert(t.errorTitle, message);
      }
    };
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(`${user.username}\n\n${t.deleteUser}?`);
      if (ok) void run();
      return;
    }
    Alert.alert(t.deleteConfirmTitle, `${user.username}\n\n${t.deleteUser}?`, [
      { text: t.cancel, style: "cancel" },
      { text: t.deleteConfirmYes, style: "destructive", onPress: () => void run() },
    ]);
  };

  const handleSetApproval = async (user: ManagedUser, status: UserApprovalStatus) => {
    if (!canManageUsers) return;
    try {
      await updateAdminUserApprovalStatus(adminApiToken, user.id, status);
      await loadUsers();
      setSaveInfo(t.statusUpdated);
    } catch (err: any) {
      const message = err?.message ?? t.saveFailed;
      setUsersError(message);
      Alert.alert(t.errorTitle, message);
    }
  };

  const handleSetRecordStatus = async (record: UserDataRecord, status: UserDataStatus) => {
    if (!canManageUsers) return;
    try {
      await updateAdminSubmittedDataStatus(adminApiToken, record.id, status);
      await loadUsers();
      setSaveInfo(t.statusUpdated);
    } catch (err: any) {
      const message = err?.message ?? t.saveFailed;
      setUsersError(message);
      Alert.alert(t.errorTitle, message);
    }
  };

  const handleResetUserPassword = async (user: ManagedUser) => {
    if (!canManageUsers) return;

    let nextPassword = generateTempPassword(10);

    if (Platform.OS === "web" && typeof window !== "undefined") {
      nextPassword = window.prompt(t.resetPasswordPrompt, nextPassword) ?? "";
    } else {
      Alert.alert(t.errorTitle, "Web only feature");
      return;
    }

    if (!nextPassword.trim()) return;

    try {
      await resetAdminUserPassword(adminApiToken, user.id, nextPassword.trim());
      setSaveInfo(`${t.passwordResetDone}  (${nextPassword.trim()})`);
    } catch (err: any) {
      const message = err?.message ?? t.saveFailed;
      setUsersError(message);
      Alert.alert(t.errorTitle, message);
    }
  };

  const handleChangeOwnPassword = async () => {
    if (!adminApiToken) return;
    if (!selfCurrentPassword.trim() || !selfNewPassword.trim()) {
      Alert.alert(t.errorTitle, t.prizeRequired);
      return;
    }
    try {
      await changeMyPassword(adminApiToken, selfCurrentPassword.trim(), selfNewPassword.trim());
      setSelfCurrentPassword("");
      setSelfNewPassword("");
      setCurrentAuthUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
      setSaveInfo(t.passwordChanged);
    } catch (err: any) {
      const message = err?.message ?? t.saveFailed;
      setUsersError(message);
      Alert.alert(t.errorTitle, message);
    }
  };

  const handleForgotPasswordReset = async () => {
    if (!forgotIdentifier.trim() || !forgotContact.trim() || !forgotNewPassword.trim()) {
      Alert.alert(t.errorTitle, t.prizeRequired);
      return;
    }
    try {
      await resetPasswordByEmailOrPhone(
        forgotIdentifier.trim(),
        forgotContact.trim(),
        forgotNewPassword.trim(),
      );
      setForgotIdentifier("");
      setForgotContact("");
      setForgotNewPassword("");
      setSaveInfo(t.forgotDone);
    } catch (err: any) {
      const message = err?.message ?? t.saveFailed;
      setUsersError(message);
      Alert.alert(t.errorTitle, message);
    }
  };

  const publishDraw = (r: LotteryResult) => {
    if (!canManageContent) {
      Alert.alert(t.errorTitle, t.noAdminPermission);
      return;
    }
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(`${t.publishConfirmTitle}\n\n${toMM(r.drawNumber)} ${t.drawSuffix} - ${t.publishConfirmQuestion}`);
      if (!ok) return;
      void (async () => {
        try {
          setPublishingDraw(r.drawNumber);
          const nowIso = new Date().toISOString();
          const payload: Omit<LotteryResult, "id" | "createdAt" | "updatedAt"> = {
            drawNumber: r.drawNumber,
            drawDate: r.drawDate,
            prizes: r.prizes,
            entries: r.entries ?? [],
            sourceName: r.sourceName,
            sourceUrl: r.sourceUrl,
            verifiedAt: r.verifiedAt ?? nowIso,
            publishStatus: "published",
            publishedAt: nowIso,
          };
          if (r.id && !r.id.startsWith("local-")) {
            await withTimeout(updateResult(r.id, payload), 20000, t.saveTimeout);
          } else {
            await withTimeout(upsertResultByDrawNumber(payload), 20000, t.saveTimeout);
          }
          saveLocalOverride(payload);
          await refresh();
          setActiveAdminTab("lottery");
          setSelectedDraw(r.drawNumber);
          setSaveInfo(t.publishDone);
        } catch (err: any) {
          const msg = err?.message ?? t.saveFailed;
          console.warn("Publish failed", err);
          window.alert(`${t.errorTitle}\n${msg}`);
        } finally {
          setPublishingDraw(null);
        }
      })();
      return;
    }
    Alert.alert(
      t.publishConfirmTitle,
      `${toMM(r.drawNumber)} ${t.drawSuffix} - ${t.publishConfirmQuestion}`,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.publish,
          onPress: async () => {
            try {
              setPublishingDraw(r.drawNumber);
              const nowIso = new Date().toISOString();
              const payload: Omit<LotteryResult, "id" | "createdAt" | "updatedAt"> = {
                drawNumber: r.drawNumber,
                drawDate: r.drawDate,
                prizes: r.prizes,
                entries: r.entries ?? [],
                sourceName: r.sourceName,
                sourceUrl: r.sourceUrl,
                verifiedAt: r.verifiedAt ?? nowIso,
                publishStatus: "published",
                publishedAt: nowIso,
              };
              if (r.id && !r.id.startsWith("local-")) {
                await withTimeout(updateResult(r.id, payload), 20000, t.saveTimeout);
              } else {
                await withTimeout(upsertResultByDrawNumber(payload), 20000, t.saveTimeout);
              }
              // Local override is only meaningful on localhost; keep it as an optional helper.
              saveLocalOverride(payload);
              await refresh();
              setActiveAdminTab("lottery");
              setSelectedDraw(r.drawNumber);
              setSaveInfo(t.publishDone);
            } catch (err: any) {
              const msg = err?.message ?? t.saveFailed;
              console.warn("Publish failed", err);
              Alert.alert(t.errorTitle, msg);
            } finally {
              setPublishingDraw(null);
            }
          },
        },
      ],
    );
  };

  const unpublishDraw = (r: LotteryResult) => {
    if (!canManageContent) {
      Alert.alert(t.errorTitle, t.noAdminPermission);
      return;
    }
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(
        `${language === "en" ? "Unpublish" : "Unpublish လုပ်မည်"}\n\n${toMM(r.drawNumber)} ${t.drawSuffix}\n${language === "en" ? "Hide this draw from public pages?" : "ဒီထီပွဲကို public မှဖျောက်မလား?"}`,
      );
      if (!ok) return;
      void (async () => {
        try {
          setPublishingDraw(r.drawNumber);
          const payload: any = {
            drawNumber: r.drawNumber,
            drawDate: r.drawDate,
            prizes: r.prizes,
            entries: r.entries ?? [],
            sourceName: r.sourceName,
            sourceUrl: r.sourceUrl,
            verifiedAt: r.verifiedAt,
            publishStatus: "draft",
            publishedAt: deleteField(),
          };
          if (r.id && !r.id.startsWith("local-")) {
            await withTimeout(updateResult(r.id, payload), 20000, t.saveTimeout);
          } else {
            await withTimeout(upsertResultByDrawNumber(payload), 20000, t.saveTimeout);
          }
          await refresh();
          setActiveAdminTab("lottery");
          setSelectedDraw(r.drawNumber);
          setSaveInfo(language === "en" ? "Unpublished." : "Unpublish လုပ်ပြီးပါပြီ။");
        } catch (err: any) {
          const msg = err?.message ?? t.saveFailed;
          console.warn("Unpublish failed", err);
          window.alert(`${t.errorTitle}\n${msg}`);
        } finally {
          setPublishingDraw(null);
        }
      })();
      return;
    }
    Alert.alert(
      language === "en" ? "Unpublish" : "Unpublish လုပ်မည်",
      `${toMM(r.drawNumber)} ${t.drawSuffix}\n${language === "en" ? "Hide this draw from public pages?" : "ဒီထီပွဲကို public မှဖျောက်မလား?"}`,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: language === "en" ? "Unpublish" : "Unpublish",
          style: "destructive",
          onPress: async () => {
            try {
              setPublishingDraw(r.drawNumber);
              const payload: any = {
                drawNumber: r.drawNumber,
                drawDate: r.drawDate,
                prizes: r.prizes,
                entries: r.entries ?? [],
                sourceName: r.sourceName,
                sourceUrl: r.sourceUrl,
                verifiedAt: r.verifiedAt,
                publishStatus: "draft",
                publishedAt: deleteField(),
              };
              if (r.id && !r.id.startsWith("local-")) {
                await withTimeout(updateResult(r.id, payload), 20000, t.saveTimeout);
              } else {
                await withTimeout(upsertResultByDrawNumber(payload), 20000, t.saveTimeout);
              }
              await refresh();
              setActiveAdminTab("lottery");
              setSelectedDraw(r.drawNumber);
              setSaveInfo(language === "en" ? "Unpublished." : "Unpublish လုပ်ပြီးပါပြီ။");
            } catch (err: any) {
              const msg = err?.message ?? t.saveFailed;
              console.warn("Unpublish failed", err);
              Alert.alert(t.errorTitle, msg);
            } finally {
              setPublishingDraw(null);
            }
          },
        },
      ],
    );
  };

  const saveEditor = async (mode: "draft" | "publish") => {
    if (!canManageContent) {
      Alert.alert(t.errorTitle, t.noAdminPermission);
      return;
    }
      const drawNum = parseInt(drawNumber, 10);
      if (isNaN(drawNum) || drawNum <= 0) {
        Alert.alert(t.errorTitle, t.invalidDrawNo);
        return;
      }
      if (!drawDate) {
        Alert.alert(t.errorTitle, t.dateRequired);
        return;
      }
      setSaving(true);
      setSaveInfo("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const cleanPrizes: PrizeEntry[] = prizes
          .map((p) => ({
            amount: normalizeCategoryValue(String(p.amount ?? "")),
            numbers: p.numbers.filter((n) => n.trim().length > 0),
          }))
          .filter((p) => p.amount && p.numbers.length > 0);

        const cleanEntries = entries
          .map((e, idx) => cleanEntryDraft(e, idx))
          .filter((e): e is LotteryRuleEntry => !!e);

        if (cleanPrizes.length === 0) {
          Alert.alert(t.errorTitle, t.prizeRequired);
          return;
        }

        let verifiedAtIso: string | undefined = undefined;
        if (verifiedAt.trim()) {
          const parsedVerifiedAt = new Date(verifiedAt);
          if (Number.isNaN(parsedVerifiedAt.getTime())) {
            Alert.alert(t.errorTitle, t.invalidVerifiedAt);
            return;
          }
          verifiedAtIso = parsedVerifiedAt.toISOString();
        }

        const nowIso = new Date().toISOString();
        const payload: Omit<LotteryResult, "id" | "createdAt" | "updatedAt"> = {
          drawNumber: drawNum,
          drawDate,
          prizes: cleanPrizes,
          entries: cleanEntries,
          publishStatus: mode === "publish" ? "published" : "draft",
          ...(mode === "publish" ? { publishedAt: nowIso } : {}),
        };
        if (sourceName.trim()) payload.sourceName = sourceName.trim();
        if (sourceUrl.trim()) payload.sourceUrl = sourceUrl.trim();
        if (verifiedAtIso) payload.verifiedAt = verifiedAtIso;
        if (mode === "publish" && !payload.verifiedAt) payload.verifiedAt = nowIso;

        if (editingResult?.id && !editingResult.id.startsWith("local-")) {
          await withTimeout(updateResult(editingResult.id, payload), 20000, t.saveTimeout);
        } else {
          await withTimeout(upsertResultByDrawNumber(payload), 20000, t.saveTimeout);
        }

        saveLocalOverride(payload);

        setShowAddModal(false);
        setSaving(false);
        setSaveInfo(
          mode === "publish"
            ? `${t.publishDone}  (#${toMM(drawNum)})`
            : `${t.saveDraftDone}  (#${toMM(drawNum)})`,
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
          await withTimeout(refresh(), 15000, "refresh timeout");
        } catch (err: any) {
          console.warn("Refresh after save failed:", err?.message ?? err);
        }
        setActiveAdminTab("lottery");
        setSelectedDraw(drawNum);
      } catch (e: any) {
        const message = e?.message ?? t.saveFailed;
        setSaveInfo(message);
        Alert.alert(t.errorTitle, message);
      } finally {
        setSaving(false);
      }
  };

  const handleSave = async () => {
    await saveEditor("draft");
  };

  const handlePublishFromEditor = async () => {
    if (!canManageContent) {
      Alert.alert(t.errorTitle, t.noAdminPermission);
      return;
    }
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(
        `${t.publishConfirmTitle}\n\n${language === "en" ? "Publish this draw to live checker now?" : "ဒီထီပွဲကို live checker တွင် ချက်ချင်းပြမလား?"}`,
      );
      if (ok) void saveEditor("publish");
      return;
    }
    Alert.alert(
      t.publishConfirmTitle,
      language === "en" ? "Publish this draw to live checker now?" : "ဒီထီပွဲကို live checker တွင် ချက်ချင်းပြမလား?",
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.publish,
          onPress: () => {
            void saveEditor("publish");
          },
        },
      ],
    );
  };

  const handleDelete = (r: LotteryResult) => {
    if (!canManageContent) {
      Alert.alert(t.errorTitle, t.noAdminPermission);
      return;
    }
    const performDelete = async () => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        removeLocalOverride(r.drawNumber);
        if (r.id && !r.id.startsWith("local-")) {
          await deleteResult(r.id);
        }
        await refresh();
        setSaveInfo(t.deleteDone);
      } catch (err) {
        console.warn("Delete failed", err);
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.alert(`${t.errorTitle}\n${t.deleteFailed}`);
        } else {
          Alert.alert(t.errorTitle, t.deleteFailed);
        }
      }
    };

    const message = `${toMM(r.drawNumber)} ${t.drawSuffix}\n${r.drawDate}\n${t.deleteDetails}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(`${t.deleteConfirmTitle}\n\n${message}`);
      if (ok) void performDelete();
      return;
    }

    Alert.alert(t.deleteConfirmTitle, message, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.deleteConfirmYes,
        style: "destructive",
        onPress: () => {
          void performDelete();
        },
      },
    ]);
  };

  useEffect(() => {
    const fromResults = results.flatMap((r) => [
      ...r.prizes.map((p) => normalizeCategoryValue(String(p.amount ?? ""))),
      ...(r.entries ?? []).map((e) => normalizeCategoryValue(String(e.prizeCategory ?? ""))),
    ]);
    const fromDraft = [
      ...prizes.map((p) => normalizeCategoryValue(String(p.amount ?? ""))),
      ...entries.map((e) => normalizeCategoryValue(String(e.prizeCategory ?? ""))),
    ];
    const merged = Array.from(
      new Set([...PRIZE_CATEGORY_OPTIONS, ...fromResults, ...fromDraft].filter(Boolean)),
    );
    setCategoryOptions(merged);
  }, [results, prizes, entries]);

  useEffect(() => {
    if (!pendingEditResultId) return;
    const target = results.find((r) => r.id === pendingEditResultId);
    if (target) openEdit(target, pendingEditCategory);
    clearPendingEdit();
  }, [pendingEditResultId, pendingEditCategory, results, clearPendingEdit]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.setItem(ADMIN_ACTIVE_TAB_KEY, activeAdminTab);
  }, [activeAdminTab]);

  useEffect(() => {
    const storedToken = getStoredAdminApiToken();
    if (!storedToken) return;
    setAdminApiToken(storedToken);
    void (async () => {
      try {
        const me = await getCurrentUser(storedToken);
        if (!me) {
          setAdminApiToken("");
          setStoredAdminApiToken("");
          setCurrentAuthUser(null);
          return;
        }
        setCurrentAuthUser(me);
        if (me.role === "admin") {
          await loadUsers(storedToken);
        }
      } catch {
        setAdminApiToken("");
        setStoredAdminApiToken("");
      }
    })();
  }, []);

  useEffect(() => {
    if (!adminApiToken || currentAuthUser?.role !== "admin") return;
    if (activeAdminTab === "users" && users.length === 0 && !usersLoading) {
      void loadUsers();
    }
  }, [activeAdminTab, adminApiToken, currentAuthUser?.role, users.length, usersLoading]);

  // Auto-sample seeding removed.

  if (false) {
    return (
      <View style={[styles.lockScreen, { backgroundColor: colors.background, paddingTop: topPadding }]}>
        <View style={[styles.lockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.lockIcon, { backgroundColor: colors.muted }]}>
            <Feather name="lock" size={28} color={colors.primary} />
          </View>
          <LanguageToggle language={language} onChange={setLanguage} />
          <Text style={[styles.lockTitle, { color: colors.foreground }]}>{t.lockTitle}</Text>
          <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>{t.lockSub}</Text>
          <TextInput
            style={[
              styles.pinInput,
              {
                backgroundColor: colors.background,
                borderColor: pinError ? colors.destructive : colors.border,
                color: colors.foreground,
                fontFamily: "Inter_600SemiBold",
              },
            ]}
            value={pin}
            onChangeText={(t) => { setPin(t.replace(/[^0-9]/g, "").slice(0, 6)); setPinError(false); }}
            placeholder="••••"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handlePinSubmit}
          />
          {pinError && (
            <Text style={[styles.pinError, { color: colors.destructive }]}>{t.pinInvalid}</Text>
          )}
          <TouchableOpacity
            style={[styles.pinBtn, { backgroundColor: colors.primary }]}
            onPress={handlePinSubmit}
            activeOpacity={0.8}
          >
            <Text style={[styles.pinBtnText, { color: colors.primaryForeground }]}>{t.unlock}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.page, { width: contentWidth }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <View />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={width < 760}
            contentContainerStyle={styles.headerActions}
            style={styles.headerActionsScroller}
          >
            <LanguageToggle language={language} onChange={setLanguage} />
            {isLoggedIn && (
              <>
                <TouchableOpacity
                  onPress={exportBackupJson}
                  style={[styles.headerMiniBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <Feather name="download" size={14} color={colors.foreground} />
                  <Text style={[styles.headerMiniBtnText, { color: colors.foreground }]}>{t.backup}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={restoreBackupJson}
                  style={[styles.headerMiniBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <Feather name="upload" size={14} color={colors.foreground} />
                  <Text style={[styles.headerMiniBtnText, { color: colors.foreground }]}>{t.restore}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => exportTemplateExcel(results[0])}
                  style={[styles.headerMiniBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <Feather name="file-text" size={14} color={colors.foreground} />
                  <Text style={[styles.headerMiniBtnText, { color: colors.foreground }]}>{t.excelTemplate}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={importFromExcel}
                  style={[styles.headerMiniBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <Feather name="file-plus" size={14} color={colors.foreground} />
                  <Text style={[styles.headerMiniBtnText, { color: colors.foreground }]}>{t.importExcel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    handleApiLogout();
                    setActiveAdminTab("users");
                  }}
                  style={[styles.iconBtn, { backgroundColor: colors.muted }]}
                  activeOpacity={0.7}
                >
                  <Feather name="log-out" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
                {activeAdminTab === "lottery" && (
                  <TouchableOpacity
                    onPress={openAdd}
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={18} color={colors.primaryForeground} />
                    <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>{t.addData}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoggedIn && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={width < 760}
            contentContainerStyle={[styles.tabStrip, { backgroundColor: colors.card, borderColor: colors.border }]}
            style={styles.tabStripScroller}
          >
            {([
              ["lottery", t.tabLotteryData],
              ["ads", t.tabAdvertisements],
              ["users", t.tabUserManagement],
            ] as [AdminSectionTab, string][]).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveAdminTab(key)}
                style={[
                  styles.tabBtn,
                  {
                    backgroundColor: activeAdminTab === key ? colors.primary : colors.muted,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: activeAdminTab === key ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {activeAdminTab === "users" && (
        <View style={[styles.adsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View
            style={[
              styles.adsHeader,
              isNarrow ? { flexDirection: "column", alignItems: "flex-start" } : null,
            ]}
          >
            <View>
              <Text style={[styles.adsTitle, { color: colors.foreground }]}>{t.usersTitle}</Text>
            </View>
            {!!adminApiToken && (
              <View
                style={[
                  styles.adsHeaderActions,
                  isNarrow ? { justifyContent: "flex-start", alignSelf: "stretch" } : null,
                ]}
              >
                <TouchableOpacity
                  onPress={() => void loadUsers()}
                  style={[styles.headerMiniBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <Feather name="refresh-cw" size={14} color={colors.foreground} />
                  <Text style={[styles.headerMiniBtnText, { color: colors.foreground }]}>{t.apiRefresh}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    handleApiLogout();
                    setActiveAdminTab("users");
                  }}
                  style={[styles.headerMiniBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <Feather name="log-out" size={14} color={colors.foreground} />
                  <Text style={[styles.headerMiniBtnText, { color: colors.foreground }]}>{t.apiLogout}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {firestoreDisabled && (
            <View style={[styles.noticeBox, { borderColor: "#F5C6CB", backgroundColor: "#FDECEA" }]}>
              <Text style={[styles.noticeText, { color: colors.destructive }]}>
                {language === "en"
                  ? "Cloud Firestore is disabled for this project. Enable Firestore API / create a Firestore database in Firebase Console, then reload."
                  : "ဒီ Project အတွက် Cloud Firestore မဖွင့်ထားသေးပါ။ Firebase Console ထဲမှာ Firestore ကို Enable/Database Create လုပ်ပြီးနောက် Reload လုပ်ပါ။"}
              </Text>
            </View>
          )}

          {!adminApiToken ? (
            <View style={styles.userFormWrap}>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={adminApiIdentifier}
                onChangeText={setAdminApiIdentifier}
                placeholder={t.apiLoginIdentifier}
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[styles.fieldInput, styles.passwordInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={adminApiPassword}
                onChangeText={setAdminApiPassword}
                placeholder={t.apiLoginPassword}
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showAdminApiPassword}
              />
              <TouchableOpacity
                style={[styles.passwordToggleBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
                onPress={() => setShowAdminApiPassword((v) => !v)}
                activeOpacity={0.8}
              >
                <Feather name={showAdminApiPassword ? "eye-off" : "eye"} size={15} color={colors.foreground} />
                <Text style={[styles.passwordToggleText, { color: colors.foreground }]}>
                  {showAdminApiPassword ? t.hidePassword : t.showPassword}
                </Text>
              </TouchableOpacity>
              {!!usersError && <Text style={[styles.adsEmpty, { color: colors.destructive }]}>{usersError}</Text>}
              <View style={styles.placementRow}>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => void handleApiLogin()}
                  activeOpacity={0.8}
                  disabled={usersLoading}
                >
                  <Feather name="log-in" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
                    {usersLoading ? t.apiLoginLoading : t.apiLogin}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.headerMiniBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  onPress={() => setShowForgotReset((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Feather name="help-circle" size={14} color={colors.foreground} />
                  <Text style={[styles.headerMiniBtnText, { color: colors.foreground }]}>{t.forgotPassword}</Text>
                </TouchableOpacity>
              </View>
              {showForgotReset && (
                <View style={[styles.adReportCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={[styles.adsSubtitle, { color: colors.mutedForeground }]}>{t.forgotHint}</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={forgotIdentifier}
                    onChangeText={setForgotIdentifier}
                    placeholder={t.apiLoginIdentifier}
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={forgotContact}
                    onChangeText={setForgotContact}
                    placeholder={t.verifyContact}
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={forgotNewPassword}
                    onChangeText={setForgotNewPassword}
                    placeholder={t.newPasswordLabel}
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showForgotNewPassword}
                  />
                  <TouchableOpacity
                    style={[styles.passwordToggleBtn, { borderColor: colors.border, backgroundColor: colors.muted, alignSelf: "flex-start" }]}
                    onPress={() => setShowForgotNewPassword((v) => !v)}
                    activeOpacity={0.8}
                  >
                    <Feather name={showForgotNewPassword ? "eye-off" : "eye"} size={15} color={colors.foreground} />
                    <Text style={[styles.passwordToggleText, { color: colors.foreground }]}>
                      {showForgotNewPassword ? t.hidePassword : t.showPassword}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.primary, alignSelf: "flex-start" }]}
                    onPress={() => void handleForgotPasswordReset()}
                    activeOpacity={0.8}
                  >
                    <Feather name="refresh-ccw" size={16} color={colors.primaryForeground} />
                    <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>{t.verifyReset}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {!!currentAuthUser && (
                <View style={[styles.adReportCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Text style={[styles.adTitle, { color: colors.foreground }]}>
                    {currentAuthUser.username} ({roleLabel(currentAuthUser.role)})
                  </Text>
                  <Text style={[styles.adSub, { color: colors.mutedForeground }]}>
                    {currentAuthUser.email}  •  {currentAuthUser.phone}
                  </Text>
                  <Text style={[styles.adSub, { color: currentAuthUser.mustChangePassword ? colors.destructive : colors.primary }]}>
                    {currentAuthUser.mustChangePassword ? t.resetPassword : t.accountReady}
                  </Text>
                  <TouchableOpacity
                    style={[styles.headerMiniBtn, { backgroundColor: colors.muted, borderColor: colors.border, alignSelf: "flex-start" }]}
                    onPress={() => setShowSelfPasswordFields((v) => !v)}
                    activeOpacity={0.8}
                  >
                    <Feather name="key" size={14} color={colors.foreground} />
                    <Text style={[styles.headerMiniBtnText, { color: colors.foreground }]}>{t.changeMyPassword}</Text>
                  </TouchableOpacity>
                  {(showSelfPasswordFields || currentAuthUser.mustChangePassword) && (
                    <View style={styles.userFormWrap}>
                      <TextInput
                        style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                        value={selfCurrentPassword}
                        onChangeText={setSelfCurrentPassword}
                        placeholder={t.currentPassword}
                        placeholderTextColor={colors.mutedForeground}
                        secureTextEntry={!showSelfCurrentPassword}
                      />
                      <TouchableOpacity
                        style={[styles.passwordToggleBtn, { borderColor: colors.border, backgroundColor: colors.muted, alignSelf: "flex-start" }]}
                        onPress={() => setShowSelfCurrentPassword((v) => !v)}
                        activeOpacity={0.8}
                      >
                        <Feather name={showSelfCurrentPassword ? "eye-off" : "eye"} size={15} color={colors.foreground} />
                        <Text style={[styles.passwordToggleText, { color: colors.foreground }]}>
                          {showSelfCurrentPassword ? t.hidePassword : t.showPassword}
                        </Text>
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                        value={selfNewPassword}
                        onChangeText={setSelfNewPassword}
                        placeholder={t.newPasswordLabel}
                        placeholderTextColor={colors.mutedForeground}
                        secureTextEntry={!showSelfNewPassword}
                      />
                      <TouchableOpacity
                        style={[styles.passwordToggleBtn, { borderColor: colors.border, backgroundColor: colors.muted, alignSelf: "flex-start" }]}
                        onPress={() => setShowSelfNewPassword((v) => !v)}
                        activeOpacity={0.8}
                      >
                        <Feather name={showSelfNewPassword ? "eye-off" : "eye"} size={15} color={colors.foreground} />
                        <Text style={[styles.passwordToggleText, { color: colors.foreground }]}>
                          {showSelfNewPassword ? t.hidePassword : t.showPassword}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.primary, alignSelf: "flex-start" }]}
                        onPress={() => void handleChangeOwnPassword()}
                        activeOpacity={0.8}
                      >
                        <Feather name="check" size={16} color={colors.primaryForeground} />
                        <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>{t.savePassword}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {canManageUsers ? (
                <>
                  <View style={styles.userFormWrap}>
                    <View style={styles.placementRow}>
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.primary }]}
                        onPress={showCreateUserForm ? resetCreateUserForm : handleShowCreateUserForm}
                        activeOpacity={0.8}
                      >
                        <Feather name={showCreateUserForm ? "x" : "user-plus"} size={16} color={colors.primaryForeground} />
                        <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
                          {showCreateUserForm ? t.hideNewUserForm : t.addNewUser}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                      value={userSearch}
                      onChangeText={setUserSearch}
                      placeholder={t.userSearchPlaceholder}
                      placeholderTextColor={colors.mutedForeground}
                    />
                    <View style={styles.placementRow}>
                      {(["all", "admin", "content_creator", "user"] as const).map((role) => (
                        <TouchableOpacity
                          key={`role-filter-${role}`}
                          onPress={() => setUserRoleFilter(role)}
                          style={[
                            styles.placementBtn,
                            {
                              backgroundColor: userRoleFilter === role ? colors.primary : colors.muted,
                              borderColor: colors.border,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.placementBtnText,
                              { color: userRoleFilter === role ? colors.primaryForeground : colors.foreground },
                            ]}
                          >
                            {role === "all" ? t.userRoleAll : roleLabel(role)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      </View>
                    </View>

                  {showCreateUserForm && (
                    <View style={[styles.adReportCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Text style={[styles.adReportTitle, { color: colors.foreground }]}>{t.createUser}</Text>
                      <Text style={[styles.adsSubtitle, { color: colors.mutedForeground }]}>{t.createUserHint}</Text>
                      <View style={styles.userFormWrap}>
                        <TextInput
                          style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                          value={newUsername}
                          onChangeText={setNewUsername}
                          placeholder={t.userName}
                          placeholderTextColor={colors.mutedForeground}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TextInput
                          style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                          value={newEmail}
                          onChangeText={setNewEmail}
                          placeholder={t.userEmail}
                          placeholderTextColor={colors.mutedForeground}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TextInput
                          style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                          value={newPhone}
                          onChangeText={setNewPhone}
                          placeholder={t.userPhone}
                          placeholderTextColor={colors.mutedForeground}
                        />
                        <TextInput
                          style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                          value={newAddress}
                          onChangeText={setNewAddress}
                          placeholder={t.userAddress}
                          placeholderTextColor={colors.mutedForeground}
                        />
                        <TextInput
                          style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                          value={newPassword}
                          onChangeText={setNewPassword}
                          placeholder={t.userPassword}
                          placeholderTextColor={colors.mutedForeground}
                          secureTextEntry={!showNewUserPassword}
                        />
                        <View style={styles.placementRow}>
                          <TouchableOpacity
                            style={[styles.headerMiniBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                            onPress={() => setShowNewUserPassword((v) => !v)}
                            activeOpacity={0.8}
                          >
                            <Feather name={showNewUserPassword ? "eye-off" : "eye"} size={14} color={colors.foreground} />
                            <Text style={[styles.headerMiniBtnText, { color: colors.foreground }]}>
                              {showNewUserPassword ? t.hidePassword : t.showPassword}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.headerMiniBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                            onPress={handleGenerateCreatePassword}
                            activeOpacity={0.8}
                          >
                            <Feather name="shuffle" size={14} color={colors.foreground} />
                            <Text style={[styles.headerMiniBtnText, { color: colors.foreground }]}>{t.generatePassword}</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.placementRow}>
                          {(["admin", "content_creator", "user"] as UserRole[]).map((role) => (
                            <TouchableOpacity
                              key={`new-role-${role}`}
                              onPress={() => setNewRole(role)}
                              style={[
                                styles.placementBtn,
                                {
                                  backgroundColor: newRole === role ? colors.primary : colors.muted,
                                  borderColor: colors.border,
                                },
                              ]}
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.placementBtnText,
                                  { color: newRole === role ? colors.primaryForeground : colors.foreground },
                                ]}
                              >
                                {roleLabel(role)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TouchableOpacity
                          style={[styles.addBtn, { backgroundColor: colors.primary, alignSelf: "flex-start" }]}
                          onPress={() => void handleCreateUser()}
                          activeOpacity={0.8}
                          disabled={userCreateLoading}
                        >
                          <Feather name="user-plus" size={16} color={colors.primaryForeground} />
                          <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
                            {userCreateLoading ? t.saving : t.createUser}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {usersLoading ? (
                    <Text style={[styles.adsEmpty, { color: colors.mutedForeground }]}>{t.saving}</Text>
                  ) : filteredUsers.length === 0 ? (
                    <Text style={[styles.adsEmpty, { color: colors.mutedForeground }]}>{t.usersEmpty}</Text>
                  ) : (
                    <View style={[styles.adReportCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      {filteredUsers.map((user) => (
                        <View key={user.id} style={[styles.adCard, { borderColor: colors.border }]}>
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={[styles.adTitle, { color: colors.foreground }]}>{user.username}</Text>
                            <Text style={[styles.adSub, { color: colors.mutedForeground }]}>{user.email}</Text>
                            <Text style={[styles.adSub, { color: colors.mutedForeground }]}>{user.phone}</Text>
                            {!!user.address && <Text style={[styles.adSub, { color: colors.mutedForeground }]}>{t.userAddress}: {user.address}</Text>}
                            <Text style={[styles.adSub, { color: colors.mutedForeground }]}>
                              {t.userRole}: {roleLabel(user.role)}
                            </Text>
                            <Text style={[styles.adSub, { color: user.status === "active" ? colors.primary : colors.destructive }]}>
                              {user.status === "active" ? t.actionActive : t.actionDisabled}
                            </Text>
                            <Text style={[styles.adSub, { color: colors.mutedForeground }]}>
                              {t.approval}: {approvalLabel(user.approvalStatus)}
                            </Text>
                            <ScrollView
                              horizontal
                              nestedScrollEnabled
                              showsHorizontalScrollIndicator={width < 760}
                              contentContainerStyle={styles.userActionRow}
                            >
                              <TouchableOpacity
                                onPress={() => void handleChangeRole(user, "admin")}
                                style={[styles.actionBtnWide, { backgroundColor: "#D6EAF8" }]}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.actionBtnText, { color: "#1B4F72" }]}>{t.makeAdmin}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => void handleChangeRole(user, "content_creator")}
                                style={[styles.actionBtnWide, { backgroundColor: "#EBF5FB" }]}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.actionBtnText, { color: "#2471A3" }]}>{t.makeCreator}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => void handleSetApproval(user, "approved")}
                                style={[styles.actionBtnWide, { backgroundColor: "#D5F5E3" }]}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.actionBtnText, { color: "#1E8449" }]}>{t.allowUser}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => void handleSetApproval(user, "denied")}
                                style={[styles.actionBtnWide, { backgroundColor: "#FDF2E9" }]}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.actionBtnText, { color: "#AF601A" }]}>{t.denyUser}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => void handleSetUserStatus(user, "active")}
                                style={[styles.actionBtnWide, { backgroundColor: "#EAF2F8" }]}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.actionBtnText, { color: "#2E86C1" }]}>{t.activateUser}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => void handleSetUserStatus(user, "disabled")}
                                style={[styles.actionBtnWide, { backgroundColor: "#FDECEA" }]}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.actionBtnText, { color: colors.destructive }]}>{t.disableUser}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => void handleResetUserPassword(user)}
                                style={[styles.actionBtnWide, { backgroundColor: "#FFF4E5" }]}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.actionBtnText, { color: "#B9770E" }]}>{t.resetPassword}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => void handleDeleteUser(user)}
                                style={[styles.actionBtnWide, { backgroundColor: "#FDECEA" }]}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.actionBtnText, { color: colors.destructive }]}>{t.deleteUser}</Text>
                              </TouchableOpacity>
                            </ScrollView>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {!!usersError && <Text style={[styles.adsEmpty, { color: colors.destructive }]}>{usersError}</Text>}

                  <View style={[styles.adReportCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={[styles.adReportTitle, { color: colors.foreground }]}>{t.submittedDataTitle}</Text>
                    {userDataRecords.length === 0 ? (
                      <Text style={[styles.adsEmpty, { color: colors.mutedForeground }]}>{t.noSubmittedData}</Text>
                    ) : (
                      userDataRecords.map((row) => (
                        <View key={row.id} style={[styles.submissionRow, { borderColor: colors.border }]}>
                          <Text style={[styles.adTitle, { color: colors.foreground }]}>{row.username}</Text>
                          <Text style={[styles.adSub, { color: colors.mutedForeground }]}>{row.email}</Text>
                          <Text style={[styles.adSub, { color: colors.mutedForeground }]}>{row.phone}</Text>
                          {!!row.address && <Text style={[styles.adSub, { color: colors.mutedForeground }]}>{row.address}</Text>}
                          <Text style={[styles.adSub, { color: colors.foreground }]}>{row.title}</Text>
                          {!!row.note && <Text style={[styles.adSub, { color: colors.mutedForeground }]}>{row.note}</Text>}
                          <Text style={[styles.adSub, { color: colors.primary }]}>
                            {t.dataStatus}: {dataStatusLabel(row.status)}
                          </Text>
                          <ScrollView
                            horizontal
                            nestedScrollEnabled
                            showsHorizontalScrollIndicator={width < 760}
                            contentContainerStyle={styles.userActionRow}
                          >
                            <TouchableOpacity
                              onPress={() => void handleSetRecordStatus(row, "approved")}
                              style={[styles.actionBtnWide, { backgroundColor: "#D5F5E3" }]}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.actionBtnText, { color: "#1E8449" }]}>{t.actionApprove}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => void handleSetRecordStatus(row, "denied")}
                              style={[styles.actionBtnWide, { backgroundColor: "#FDF2E9" }]}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.actionBtnText, { color: "#AF601A" }]}>{t.actionDeny}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => void handleSetRecordStatus(row, "terminated")}
                              style={[styles.actionBtnWide, { backgroundColor: "#FDECEA" }]}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.actionBtnText, { color: colors.destructive }]}>{t.actionTerminate}</Text>
                            </TouchableOpacity>
                          </ScrollView>
                        </View>
                      ))
                    )}
                  </View>
                </>
              ) : (
                <Text style={[styles.adsEmpty, { color: colors.mutedForeground }]}>
                  {currentAuthUser ? t.noAdminPermission : ""}
                </Text>
              )}
            </View>
          )}
        </View>
        )}

        {activeAdminTab === "ads" && (
        <View style={[styles.adsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View
            style={[
              styles.adsHeader,
              isNarrow ? { flexDirection: "column", alignItems: "flex-start" } : null,
            ]}
          >
            <View>
              <Text style={[styles.adsTitle, { color: colors.foreground }]}>{t.adsTitle}</Text>
              <Text style={[styles.adsSubtitle, { color: colors.mutedForeground }]}>{t.adsSub}</Text>
            </View>
            <View
              style={[
                styles.adsHeaderActions,
                isNarrow ? { justifyContent: "flex-start", alignSelf: "stretch" } : null,
              ]}
            >
              <TouchableOpacity
                onPress={() => void handleDeleteAllAds()}
                style={[styles.headerMiniBtn, { backgroundColor: "#FDECEA", borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Feather name="trash-2" size={14} color={colors.destructive} />
                <Text style={[styles.headerMiniBtnText, { color: colors.destructive }]}>
                  {language === "en" ? "Delete All" : "အားလုံးဖျက်မည်"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openAddAd}
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={16} color={colors.primaryForeground} />
                <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>{t.addAd}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {firestoreDisabled && (
            <View style={[styles.noticeBox, { borderColor: "#F5C6CB", backgroundColor: "#FDECEA" }]}>
              <Text style={[styles.noticeText, { color: colors.destructive }]}>
                {language === "en"
                  ? "Cloud Firestore is disabled, so ads cannot be loaded/saved. Enable Firestore in Firebase Console and reload."
                  : "Cloud Firestore မဖွင့်ထားသေးလို့ ကြော်ငြာများကို ဖတ်/သိမ်း မရသေးပါ။ Firebase Console ထဲမှာ Firestore Enable လုပ်ပြီး Reload လုပ်ပါ။"}
              </Text>
            </View>
          )}

          <View style={[styles.adReportCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.adReportTitle, { color: colors.foreground }]}>{t.adReportTitle}</Text>
            <View style={styles.adReportStats}>
              <View style={styles.adStatItem}>
                <Text style={[styles.adStatValue, { color: colors.foreground }]}>{toMM(adReport.total)}</Text>
                <Text style={[styles.adStatLabel, { color: colors.mutedForeground }]}>{t.adTotal}</Text>
              </View>
              <View style={styles.adStatItem}>
                <Text style={[styles.adStatValue, { color: colors.foreground }]}>{toMM(adReport.active)}</Text>
                <Text style={[styles.adStatLabel, { color: colors.mutedForeground }]}>{t.adActiveCount}</Text>
              </View>
              <View style={styles.adStatItem}>
                <Text style={[styles.adStatValue, { color: colors.foreground }]}>{toMM(adReport.totalClicks)}</Text>
                <Text style={[styles.adStatLabel, { color: colors.mutedForeground }]}>{t.adTotalClicks}</Text>
              </View>
            </View>
            <Text style={[styles.adTopTitle, { color: colors.foreground }]}>{t.adTop}</Text>
            {adReport.topAds.length === 0 ? (
              <Text style={[styles.adsEmpty, { color: colors.mutedForeground }]}>-</Text>
            ) : (
              adReport.topAds.map((ad) => (
                <View key={`top-${ad.id || ad.titleMm}`} style={styles.adTopRow}>
                  <Text style={[styles.adTopName, { color: colors.foreground }]} numberOfLines={1}>
                    {ad.titleMm}
                  </Text>
                  <Text style={[styles.adTopCount, { color: colors.mutedForeground }]}>
                    {toMM(ad.clickCount ?? 0)}
                  </Text>
                </View>
              ))
            )}
          </View>

          {adsLoading ? (
            <Text style={[styles.adsEmpty, { color: colors.mutedForeground }]}>
              {language === "en" ? "Loading ads..." : "ကြော်ငြာများ ဖတ်နေသည်..."}
            </Text>
          ) : ads.length === 0 ? (
            <Text style={[styles.adsEmpty, { color: colors.mutedForeground }]}>-</Text>
          ) : (
            ads.map((ad) => (
              <View key={ad.id || `${ad.titleMm}-${ad.order}`} style={[styles.adCard, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.adTitle, { color: colors.foreground }]}>{ad.titleMm}</Text>
                  {!!ad.titleEn && <Text style={[styles.adSub, { color: colors.mutedForeground }]}>{ad.titleEn}</Text>}
                  <Text style={[styles.adSub, { color: colors.mutedForeground }]}>
                    {t.adPlacement}:{" "}
                    {ad.placement === "home"
                      ? t.adPlacementHome
                      : ad.placement === "search"
                        ? t.adPlacementSearch
                        : t.adPlacementBoth}
                    {"  "}•{"  "}
                    {t.adOrder}: {toMM(ad.order ?? 0)}
                  </Text>
                  <Text style={[styles.adSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {ad.targetUrl}
                  </Text>
                </View>
                <View style={styles.adActions}>
                  <TouchableOpacity
                    onPress={() => openEditAd(ad)}
                    style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={15} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      void toggleAdActive(ad);
                    }}
                    style={[styles.actionBtn, { backgroundColor: ad.isActive ? "#D5F5E3" : colors.muted }]}
                    activeOpacity={0.7}
                  >
                    <Feather name={ad.isActive ? "eye" : "eye-off"} size={15} color={ad.isActive ? "#27AE60" : colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteAd(ad)}
                    style={[styles.actionBtn, { backgroundColor: "#FDECEA" }]}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={15} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
        )}

        {activeAdminTab === "lottery" && (
        results.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="database" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noResult}</Text>
          </View>
        ) : (
          results.map((r) => (
            <View key={r.id} style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.resultCardHeader}>
                <View>
                  <Text style={[styles.resultDrawNum, { color: colors.foreground }]}>
                    {toMM(r.drawNumber)} {t.drawSuffix}
                  </Text>
                  <Text style={[styles.resultDate, { color: colors.mutedForeground }]}>{r.drawDate}</Text>
                  <View
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: isResultPublished(r) ? "#D5F5E3" : "#FDF2E9",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        { color: isResultPublished(r) ? "#27AE60" : "#AF601A" },
                      ]}
                    >
                      {isResultPublished(r) ? t.published : t.draft}
                    </Text>
                  </View>
                </View>
                <View style={styles.resultActions}>
                  {!isResultPublished(r) ? (
                    <TouchableOpacity
                      onPress={() => publishDraw(r)}
                      style={[styles.publishBtn, { backgroundColor: colors.primary }]}
                      activeOpacity={0.8}
                      disabled={publishingDraw === r.drawNumber}
                    >
                      <Feather
                        name={publishingDraw === r.drawNumber ? "loader" : "check"}
                        size={14}
                        color={colors.primaryForeground}
                      />
                      <Text style={[styles.publishBtnText, { color: colors.primaryForeground }]}>
                        {publishingDraw === r.drawNumber ? t.publishing : t.publish}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => unpublishDraw(r)}
                      style={[styles.publishBtn, { backgroundColor: colors.muted }]}
                      activeOpacity={0.8}
                      disabled={publishingDraw === r.drawNumber}
                    >
                      <Feather
                        name={publishingDraw === r.drawNumber ? "loader" : "slash"}
                        size={14}
                        color={colors.foreground}
                      />
                      <Text style={[styles.publishBtnText, { color: colors.foreground }]}>
                        {publishingDraw === r.drawNumber ? t.saving : (language === "en" ? "Unpublish" : "Unpublish")}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => exportTemplateExcel(r)}
                    style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                    activeOpacity={0.7}
                  >
                    <Feather name="file-text" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openEdit(r)}
                    style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(r)}
                    style={[styles.actionBtn, { backgroundColor: "#FDECEA" }]}
                    activeOpacity={0.7}
                  >
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.prizeSummary}>
                {r.prizes.slice(0, 3).map((p, i) => (
                  <View key={i} style={styles.prizeRow}>
                    <PrizeBadge amount={p.amount} compact />
                    <Text style={[styles.prizeNums, { color: colors.mutedForeground }]}>
                      {p.numbers.slice(0, 2).join(", ")}{p.numbers.length > 2 ? ` +${p.numbers.length - 2}` : ""}
                    </Text>
                  </View>
                ))}
                {r.prizes.length > 3 && (
                  <Text style={[styles.morePrizes, { color: colors.mutedForeground }]}>
                    + {toMM(r.prizes.length - 3)} {t.moreItems}
                  </Text>
                )}
              </View>
            </View>
          ))
        )
        )}
      </ScrollView>
      </View>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingResult ? t.editData : t.addData}
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)} activeOpacity={0.7}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.drawNo}</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={drawNumber}
              onChangeText={setDrawNumber}
              placeholder="86"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.drawDate}</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={drawDate}
              onChangeText={setDrawDate}
              placeholder="2026-05-01"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.sourceName}</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={sourceName}
              onChangeText={setSourceName}
              placeholder="Pools Myanmar Lottery"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.sourceUrl}</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={sourceUrl}
              onChangeText={setSourceUrl}
              placeholder="https://example.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.verifiedAt}</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={verifiedAt}
              onChangeText={setVerifiedAt}
              placeholder="2026-05-18T10:30"
              placeholderTextColor={colors.mutedForeground}
            />

            <View style={styles.prizesHeader}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 0 }]}>{t.resultPrizes}</Text>
              <TouchableOpacity onPress={() => addPrizeRow(focusedCategory ?? undefined)} activeOpacity={0.7}>
                <Feather name="plus-circle" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {!!focusedCategory && (
              <View style={[styles.focusRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={styles.focusTextWrap}>
                  <Text style={[styles.focusLabel, { color: colors.mutedForeground }]}>{t.focusLabel}</Text>
                  <Text style={[styles.focusValue, { color: colors.foreground }]}>{focusedCategory}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setFocusedCategory(null)}
                  style={[styles.focusClearBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.focusClearText, { color: colors.primary }]}>{t.focusClear}</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
              {t.ticketBuilderHint}
            </Text>

            {visiblePrizeIndices.length === 0 && !!focusedCategory && (
              <TouchableOpacity
                style={[styles.focusAddBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => addPrizeRow(focusedCategory)}
                activeOpacity={0.8}
              >
                <Feather name="plus-circle" size={16} color={colors.primary} />
                <Text style={[styles.focusAddText, { color: colors.primary }]}>{t.addFocusedPrize}</Text>
              </TouchableOpacity>
            )}

            {visiblePrizeIndices.map((idx) => {
              const prize = prizes[idx];
              return (
              <View key={idx} style={[styles.prizeInputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.prizeInputHeader}>
                  <Text style={[styles.subFieldLabel, { color: colors.mutedForeground }]}>{t.prizeType}</Text>
                  {prizes.length > 1 && (
                    <TouchableOpacity onPress={() => removePrizeRow(idx)} activeOpacity={0.7}>
                      <Feather name="trash-2" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.inlineRow}>
                  <TextInput
                    style={[styles.fieldInput, styles.inlineGrow, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                    value={prize.amount}
                    onFocus={() => {
                      setOpenCategoryPickerIndex(idx);
                      setPrizeCategoryQuery("");
                    }}
                    onChangeText={(t) => {
                      updatePrizeAmount(idx, t);
                      setPrizeCategoryQuery(t);
                      setOpenCategoryPickerIndex(idx);
                    }}
                    placeholder={t.prizeExample}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="default"
                  />
                  <TouchableOpacity
                    style={[styles.listBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    onPress={() => {
                      setOpenCategoryPickerIndex((prev) => (prev === idx ? null : idx));
                      setPrizeCategoryQuery("");
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="list" size={14} color={colors.foreground} />
                    <Text style={[styles.listBtnText, { color: colors.foreground }]}>{t.list}</Text>
                  </TouchableOpacity>
                </View>
                {openCategoryPickerIndex === idx && (
                  <View style={[styles.dropdownPanel, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                      {filteredPrizeCategories.map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            updatePrizeAmount(idx, option);
                            setPrizeCategoryQuery(option);
                            setOpenCategoryPickerIndex(null);
                          }}
                          style={styles.dropdownItem}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {!!prizeCategoryQuery.trim() &&
                      !categoryOptions.includes(normalizeCategoryValue(prizeCategoryQuery)) && (
                        <TouchableOpacity
                          onPress={() => {
                            const newValue = normalizeCategoryValue(prizeCategoryQuery);
                            addCategoryOption(newValue);
                            updatePrizeAmount(idx, newValue);
                            setOpenCategoryPickerIndex(null);
                          }}
                          style={[styles.dropdownAddBtn, { borderTopColor: colors.border }]}
                          activeOpacity={0.8}
                        >
                          <Feather name="plus" size={14} color={colors.primary} />
                          <Text style={[styles.dropdownAddText, { color: colors.primary }]}>
                            {t.addNew}: {normalizeCategoryValue(prizeCategoryQuery)}
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                )}
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{t.alphaNumberAdd}</Text>
                <View style={styles.row3}>
                  <View style={styles.rowInput}>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={prizeAlphaDrafts[idx] ?? ""}
                      onFocus={() => {
                        setOpenPrizeAlphaPickerIndex(idx);
                        setPrizeAlphaQuery("");
                      }}
                      onChangeText={(t) => {
                        const v = t.trim();
                        updatePrizeAlphaDraft(idx, v);
                        setPrizeAlphaQuery(v);
                        setOpenPrizeAlphaPickerIndex(idx);
                      }}
                      placeholder={t.alphaPlaceholder}
                      placeholderTextColor={colors.mutedForeground}
                    />
                    {openPrizeAlphaPickerIndex === idx && (
                      <View style={[styles.dropdownPanel, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                          {filteredPrizeAlphaOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              onPress={() => {
                                updatePrizeAlphaDraft(idx, option);
                                setPrizeAlphaQuery(option);
                                setOpenPrizeAlphaPickerIndex(null);
                              }}
                              style={styles.dropdownItem}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{option}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        {!!prizeAlphaQuery.trim() &&
                          !filteredPrizeAlphaOptions.includes(prizeAlphaQuery.trim()) && (
                            <TouchableOpacity
                              onPress={() => {
                                const next = prizeAlphaQuery.trim();
                                updatePrizeAlphaDraft(idx, next);
                                setOpenPrizeAlphaPickerIndex(null);
                              }}
                              style={[styles.dropdownAddBtn, { borderTopColor: colors.border }]}
                              activeOpacity={0.8}
                            >
                              <Feather name="plus" size={14} color={colors.primary} />
                              <Text style={[styles.dropdownAddText, { color: colors.primary }]}>{t.addNew}: {prizeAlphaQuery.trim()}</Text>
                            </TouchableOpacity>
                          )}
                      </View>
                    )}
                  </View>
                  <View style={styles.rowInput}>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={prizeNumberDrafts[idx] ?? ""}
                      onChangeText={(t) => updatePrizeNumberDraft(idx, t)}
                      placeholder={t.digitsPlaceholder}
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.addTicketBtn, { backgroundColor: colors.primary }]}
                    onPress={() => appendPrizeTicket(idx)}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={16} color={colors.primaryForeground} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{t.addedList}</Text>
                <TextInput
                  style={[styles.fieldInput, styles.multilineInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                  value={prize.numbers.join(", ")}
                  onChangeText={(t) => updatePrizeNumbers(idx, t)}
                  placeholder={t.numbersListPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="default"
                  multiline
                />
              </View>
              );
            })}

            <TouchableOpacity
              style={[styles.advancedToggle, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => setShowAdvancedEntries((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={[styles.advancedToggleText, { color: colors.foreground }]}>
                {t.advancedTogglePrefix} {showAdvancedEntries ? t.hide : t.show}
              </Text>
              <Feather
                name={showAdvancedEntries ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>

            {showAdvancedEntries && (
              <>
                <Text style={[styles.helpText, { color: colors.mutedForeground }]}>{t.advancedHelp}</Text>
                <View style={styles.prizesHeader}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 0 }]}>
                    {t.advancedEntriesHeader}
                  </Text>
                  <TouchableOpacity onPress={addEntryRow} activeOpacity={0.7}>
                    <Feather name="plus-circle" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {visibleEntryIndices.map((idx) => {
                  const entry = entries[idx];
                  return (
              <View key={entry.id || `entry-${idx}`} style={[styles.prizeInputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.prizeInputHeader}>
                  <Text style={[styles.subFieldLabel, { color: colors.mutedForeground }]}>{t.entryPrefix}{idx + 1}</Text>
                  <View style={styles.entryActionRow}>
                    <TouchableOpacity
                      onPress={() => applyTemplateToEntry(idx, entry.prizeCategory, true)}
                      style={[styles.templateBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                      activeOpacity={0.8}
                    >
                      <Feather name="zap" size={13} color={colors.foreground} />
                      <Text style={[styles.templateBtnText, { color: colors.foreground }]}>{t.template}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeEntryRow(idx)} activeOpacity={0.7}>
                      <Feather name="trash-2" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{t.categoryLabel}</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                  value={entry.prizeCategory}
                  onFocus={() => {
                    setOpenEntryCategoryPickerIndex(idx);
                    setEntryCategoryQuery("");
                  }}
                  onChangeText={(t) => {
                    applyTemplateToEntry(idx, t, false);
                    setEntryCategoryQuery(t);
                    setOpenEntryCategoryPickerIndex(idx);
                  }}
                  placeholder={t.entryCategoryPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                />
                {openEntryCategoryPickerIndex === idx && (
                  <View style={[styles.dropdownPanel, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                      {filteredEntryCategories.map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            applyTemplateToEntry(idx, option, false);
                            setEntryCategoryQuery(option);
                            setOpenEntryCategoryPickerIndex(null);
                          }}
                          style={styles.dropdownItem}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {!!entryCategoryQuery.trim() &&
                      !categoryOptions.includes(normalizeCategoryValue(entryCategoryQuery)) && (
                        <TouchableOpacity
                          onPress={() => {
                            const newValue = normalizeCategoryValue(entryCategoryQuery);
                            addCategoryOption(newValue);
                            applyTemplateToEntry(idx, newValue, false);
                            setOpenEntryCategoryPickerIndex(null);
                          }}
                          style={[styles.dropdownAddBtn, { borderTopColor: colors.border }]}
                          activeOpacity={0.8}
                        >
                          <Feather name="plus" size={14} color={colors.primary} />
                          <Text style={[styles.dropdownAddText, { color: colors.primary }]}>
                            {t.addNew}: {normalizeCategoryValue(entryCategoryQuery)}
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                )}

                <View style={styles.row2}>
                  <View style={styles.rowInput}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{t.alphaLabel}</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={entry.alpha}
                      onFocus={() => {
                        setOpenAlphaPickerIndex(idx);
                        setAlphaQuery("");
                      }}
                      onChangeText={(t) => {
                        const value = t.trim();
                        updateEntry(idx, "alpha", value);
                        setAlphaQuery(value);
                        setOpenAlphaPickerIndex(idx);
                      }}
                      placeholder={t.alphaLabel}
                      placeholderTextColor={colors.mutedForeground}
                    />
                    {openAlphaPickerIndex === idx && (
                      <View style={[styles.dropdownPanel, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                          {filteredAlphaOptions.map((option) => (
                            <TouchableOpacity
                              key={option}
                              onPress={() => {
                                updateEntry(idx, "alpha", option);
                                setAlphaQuery(option);
                                setOpenAlphaPickerIndex(null);
                              }}
                              style={styles.dropdownItem}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{option}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        {!!alphaQuery.trim() &&
                          !filteredAlphaOptions.includes(alphaQuery.trim()) && (
                            <TouchableOpacity
                              onPress={() => {
                                const next = alphaQuery.trim();
                                updateEntry(idx, "alpha", next);
                                setOpenAlphaPickerIndex(null);
                              }}
                              style={[styles.dropdownAddBtn, { borderTopColor: colors.border }]}
                              activeOpacity={0.8}
                            >
                              <Feather name="plus" size={14} color={colors.primary} />
                              <Text style={[styles.dropdownAddText, { color: colors.primary }]}>{t.addNew}: {alphaQuery.trim()}</Text>
                            </TouchableOpacity>
                          )}
                      </View>
                    )}
                  </View>

                  <View style={styles.rowInput}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{t.patternLabel}</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={entry.pattern}
                      onChangeText={(t) => updateEntry(idx, "pattern", normalizeDigits(t).slice(0, 6))}
                      placeholder={t.patternLabel}
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.row3}>
                  <View style={styles.rowInput}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{t.matchLen}</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={String(entry.matchLength ?? "")}
                      onChangeText={(t) => updateEntry(idx, "matchLength", Number(normalizeDigits(t) || "0"))}
                      placeholder={t.matchLen}
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.rowInput}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{t.rank}</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={String(entry.rank ?? "")}
                      onChangeText={(t) => updateEntry(idx, "rank", Number(normalizeDigits(t) || "0"))}
                      placeholder={t.rank}
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.rowInput}>
                    <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{t.winners}</Text>
                    <TextInput
                      style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
                      value={entry.winners ?? ""}
                      onChangeText={(t) => updateEntry(idx, "winners", t)}
                      placeholder={t.winners}
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                </View>

                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{t.noteLabel}</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    styles.multilineInput,
                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginTop: 8 },
                  ]}
                  value={entry.note ?? ""}
                  onChangeText={(t) => updateEntry(idx, "note", t)}
                  placeholder={t.notePlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  textAlignVertical="top"
                />
              </View>
                  );
                })}
              </>
            )}

            {!!saveInfo && (
              <Text style={[styles.saveInfo, { color: colors.mutedForeground }]}>
                {saveInfo}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Feather name="save" size={18} color={saving ? colors.mutedForeground : colors.primaryForeground} />
              <Text style={[styles.saveBtnText, { color: saving ? colors.mutedForeground : colors.primaryForeground }]}>
                {saving ? t.saving : t.save}
              </Text>
            </TouchableOpacity>

            {canManageContent && (
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: saving ? colors.muted : colors.primary, marginTop: 10 }]}
                onPress={handlePublishFromEditor}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Feather name="check" size={18} color={saving ? colors.mutedForeground : colors.primaryForeground} />
                <Text style={[styles.saveBtnText, { color: saving ? colors.mutedForeground : colors.primaryForeground }]}>
                  {saving ? t.publishing : t.publish}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showAdModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editingAd ? t.editAd : t.addAd}
            </Text>
            <TouchableOpacity onPress={() => !adSaving && setShowAdModal(false)} activeOpacity={0.7} disabled={adSaving}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.adTitleMm}</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={adTitleMm}
              onChangeText={setAdTitleMm}
              placeholder={t.adTitleMm}
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.adTitleEn}</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={adTitleEn}
              onChangeText={setAdTitleEn}
              placeholder={t.adTitleEn}
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.adImageUrl}</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={adImageUrl}
              onChangeText={setAdImageUrl}
              placeholder="https://..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.adTargetUrl}</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={adTargetUrl}
              onChangeText={setAdTargetUrl}
              placeholder="https://..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.row2}>
              <View style={styles.rowInput}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.adPlacement}</Text>
                <View style={styles.placementRow}>
                  {(["home", "search", "both"] as AdPlacement[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setAdPlacement(p)}
                      style={[
                        styles.placementBtn,
                        {
                          backgroundColor: adPlacement === p ? colors.primary : colors.muted,
                          borderColor: colors.border,
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.placementBtnText, { color: adPlacement === p ? colors.primaryForeground : colors.foreground }]}>
                        {p === "home" ? t.adPlacementHome : p === "search" ? t.adPlacementSearch : t.adPlacementBoth}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.rowInput}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.adOrder}</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={adOrder}
                  onChangeText={(v) => setAdOrder(normalizeDigits(v))}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.placementBtn, { marginTop: 10, backgroundColor: adActive ? "#D5F5E3" : colors.muted, borderColor: colors.border }]}
              onPress={() => setAdActive((v) => !v)}
              activeOpacity={0.8}
            >
              <Feather name={adActive ? "check-circle" : "circle"} size={14} color={adActive ? "#27AE60" : colors.mutedForeground} />
              <Text style={[styles.placementBtnText, { color: adActive ? "#27AE60" : colors.foreground }]}>{t.adStatus}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: adSaving ? colors.muted : colors.primary }]}
              onPress={() => void handleSaveAd()}
              disabled={adSaving}
              activeOpacity={0.8}
            >
              <Feather name="save" size={18} color={adSaving ? colors.mutedForeground : colors.primaryForeground} />
              <Text style={[styles.saveBtnText, { color: adSaving ? colors.mutedForeground : colors.primaryForeground }]}>
                {adSaving ? t.saving : t.adSave}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { alignSelf: "center", flex: 1, paddingHorizontal: 12 },
  lockScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  lockCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    gap: 10,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  lockTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  lockSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  pinInput: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    marginTop: 8,
  },
  pinError: { fontSize: 13, fontFamily: "Inter_400Regular" },
  pinBtn: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  pinBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerActionsScroller: {
    maxWidth: "100%",
  },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "nowrap", justifyContent: "flex-start", paddingRight: 6 },
  headerMiniBtn: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerMiniBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  noticeBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  noticeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  tabStripScroller: {
    maxWidth: "100%",
  },
  tabStrip: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "nowrap",
  },
  tabBtn: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  adsSection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 6,
  },
  userFormWrap: {
    gap: 8,
  },
  adsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  adsHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  adsTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  adsSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  adsEmpty: { fontSize: 12, fontFamily: "Inter_400Regular" },
  adReportCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  adReportTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  adReportStats: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  adStatItem: { minWidth: 90 },
  adStatValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  adStatLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  adTopTitle: { fontSize: 12, fontFamily: "Inter_700Bold" },
  adTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  adTopName: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  adTopCount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  adCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: "column",
    gap: 8,
  },
  adTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  adSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  adActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  userActionCol: { gap: 6, alignItems: "center" },
  userActionRow: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "flex-start", flexWrap: "nowrap", paddingRight: 4 },
  actionBtnWide: {
    minHeight: 30,
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  submissionRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 3,
    marginTop: 8,
  },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  resultCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  resultCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  resultDrawNum: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  resultDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusChip: {
    alignSelf: "flex-start",
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  resultActions: { flexDirection: "row", gap: 8 },
  publishBtn: {
    minHeight: 34,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  publishBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  actionBtn: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  prizeSummary: { marginTop: 10, gap: 6 },
  prizeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  prizeNums: { fontSize: 13, fontFamily: "Inter_400Regular" },
  morePrizes: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalScroll: { padding: 20, gap: 8 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 12 },
  helpText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
  focusRow: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  focusTextWrap: { flex: 1 },
  focusLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  focusValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  focusClearBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  focusClearText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  focusAddBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  focusAddText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inlineRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  inlineGrow: { flex: 1 },
  listBtn: {
    marginTop: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  listBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  addTicketBtn: {
    marginTop: 8,
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  advancedToggle: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  advancedToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fieldInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  passwordInput: { marginBottom: 8 },
  passwordToggleBtn: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  passwordToggleText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  multilineInput: {
    minHeight: 86,
    height: 86,
    paddingTop: 10,
    paddingBottom: 10,
  },
  prizesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  prizeInputCard: { borderRadius: 12, padding: 12, borderWidth: 1, marginTop: 8 },
  prizeInputHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  entryActionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  templateBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  templateBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  subFieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 8 },
  dropdownPanel: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownItemText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  dropdownAddBtn: {
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dropdownAddText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  row2: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  row3: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  rowInput: { flex: 1, minWidth: 220 },
  placementRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  placementBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  placementBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  amtChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  amtChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  saveInfo: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 10 },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
