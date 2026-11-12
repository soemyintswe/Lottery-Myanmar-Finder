import { auth, db } from "@/config/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  CreateUserInput,
  LoginResult,
  ManagedUser,
  SignUpInput,
  UserApprovalStatus,
  UserDataInput,
  UserDataRecord,
  UserDataStatus,
  UserRole,
  UserStatus,
} from "@/types/user";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

const AUTH_STORAGE_KEY = "mm_admin_api_token";
const LOCAL_SESSION_STORAGE_KEY = "mm_admin_local_session";
const LOCAL_USERS_CACHE_KEY = "mm_admin_local_users_cache_v1";
const USER_COLLECTION = "app_users";
const USER_DATA_COLLECTION = "app_user_data";

const DEFAULT_REMOTE_API_BASE_URL = "https://replace-impact-induced-par.trycloudflare.com";
const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";
const REQUEST_TIMEOUT_MS = 30000;

const LIVE_WEB_URL = "https://mkslottery.web.app";

type LocalSeedUser = {
  username: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  approvalStatus: UserApprovalStatus;
  mustChangePassword: boolean;
  address?: string;
};

const FALLBACK_ADMIN: LocalSeedUser = {
  username: "admin",
  email: "admin@example.com",
  phone: "+959111111111",
  password: "ChangeMe123!",
  role: "admin",
  status: "active",
  approvalStatus: "approved",
  mustChangePassword: true,
};

const PINNED_LOCAL_USERS: LocalSeedUser[] = [
  {
    username: "soemyintswe",
    email: "soemyintswe@gmail.com",
    phone: "09421519915",
    password: "sms*>IWT2026",
    role: "admin",
    status: "active",
    approvalStatus: "approved",
    mustChangePassword: true,
    address: "Yangon",
  },
  {
    username: "tunnaingsoe2932003",
    email: "tunnaingsoe2932003@gmail.com",
    phone: "09759278655",
    password: "sms*>IWT2026",
    role: "admin",
    status: "active",
    approvalStatus: "approved",
    mustChangePassword: true,
    address: "Yangon",
  },
];

/**
 * လက်ရှိ Environment သည် Localhost (Development) ဟုတ်မဟုတ် စစ်ဆေးခြင်း
 */
function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/**
 * Live Web ပေါ်ရှိ Static JSON (app-config.json) ထံမှ Layout နှင့် Predict Settings များ လှမ်းယူခြင်း
 */
export async function fetchLiveStaticConfig(): Promise<any> {
  try {
    const response = await fetch(`${LIVE_WEB_URL}/assets/data/app-config.json`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn("Live Web Static Config ဖတ်မရပါသဖြင့် Local Fallback သုံးပါမည်:", error);
    return null;
  }
}

/**
 * Predict Menu, ကြော်ငြာ Layout နှင့် နောက်ဆုံးထွက် ၈၈ ကြိမ်မြောက် ဒေတာ Setting ကို ရယူသည့် Function
 */
export async function getAppLayoutSettings(): Promise<{ showPredict: boolean; latestDrawNumber: number; adLayoutVersion: string }> {
  if (isLocalhost()) {
    const remoteConfig = await fetchLiveStaticConfig();
    if (remoteConfig && remoteConfig.layout) {
      return {
        showPredict: remoteConfig.layout.showPredict ?? true,
        latestDrawNumber: remoteConfig.layout.latestDrawNumber ?? 88,
        adLayoutVersion: remoteConfig.layout.adLayoutVersion ?? "live_correct_layout",
      };
    }
  }

  return {
    showPredict: true,
    latestDrawNumber: 88,
    adLayoutVersion: "default_layout",
  };
}

let currentApiBaseUrl = ENV_API_BASE_URL || DEFAULT_REMOTE_API_BASE_URL;

function isStaticHostingUrl(value: string): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host.endsWith(".web.app") || host.endsWith(".firebaseapp.com");
  } catch {
    return false;
  }
}

export function setApiBaseUrl(url: string): void {
  if (!url) return;
  let clean = url.trim();
  if (clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }
  currentApiBaseUrl = clean;
}

export function getApiBaseUrl(): string {
  return currentApiBaseUrl;
}

export function getUserAuthMode(): "remote" | "local" {
  if (isLocalhost()) return "local";
  return currentApiBaseUrl && !isStaticHostingUrl(currentApiBaseUrl) ? "remote" : "local";
}

function shouldUseRemoteApi(): boolean {
  return getUserAuthMode() === "remote";
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  const raw = value.trim();
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function isLikelyPhoneIdentifier(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  const compact = raw.replace(/[\s\-()]/g, "");
  if (!compact) return false;
  const withoutPlus = compact.startsWith("+") ? compact.slice(1) : compact;
  return /^[0-9]{7,15}$/.test(withoutPlus);
}

function normalizeIdentifier(value: string): { kind: "username" | "email" | "phone"; value: string } {
  const raw = value.trim();
  if (raw.includes("@")) return { kind: "email", value: normalizeText(raw) };
  if (isLikelyPhoneIdentifier(raw)) return { kind: "phone", value: normalizePhone(raw) };
  return { kind: "username", value: normalizeText(raw) };
}

function matchesIdentifier(seed: Pick<LocalSeedUser, "username" | "email" | "phone">, identifier: string): boolean {
  const lookup = normalizeIdentifier(identifier);
  if (lookup.kind === "email") return normalizeText(seed.email) === lookup.value;
  if (lookup.kind === "phone") return normalizePhone(seed.phone) === lookup.value;
  return normalizeText(seed.username) === lookup.value;
}

function makeSessionUser(id: string, seed: LocalSeedUser): ManagedUser {
  const now = Date.now();
  return {
    id,
    username: seed.username,
    email: seed.email,
    phone: seed.phone,
    address: seed.address ?? "",
    role: seed.role,
    status: seed.status,
    approvalStatus: seed.approvalStatus,
    mustChangePassword: seed.mustChangePassword,
    createdAt: now,
    updatedAt: now,
  };
}

function persistSession(token: string, user: ManagedUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, token);
  window.localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(user));
}

function normalizeManagedUser(raw: any): ManagedUser | null {
  if (!raw || typeof raw !== "object") return null;
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";
  const fallbackIdSource = username || email || phone || "legacy-user";
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : `legacy-${normalizeText(fallbackIdSource)}`;

  return {
    id,
    username,
    email,
    phone,
    address: typeof raw.address === "string" ? raw.address : "",
    passwordHash: typeof raw.passwordHash === "string" ? raw.passwordHash : undefined,
    role: raw.role === "admin" || raw.role === "content_creator" ? raw.role : "user",
    status: raw.status === "disabled" ? "disabled" : "active",
    approvalStatus:
      raw.approvalStatus === "pending" ||
      raw.approvalStatus === "denied" ||
      raw.approvalStatus === "terminated"
        ? raw.approvalStatus
        : "approved",
    mustChangePassword: !!raw.mustChangePassword,
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: raw.updatedAt ?? Date.now(),
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Firestore request timeout.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function findFirestoreUserByIdentifier(identifier: string): Promise<{ id: string; data: any } | null> {
  const lookup = normalizeIdentifier(identifier);
  const fields =
    lookup.kind === "email"
      ? ["email"]
      : lookup.kind === "phone"
        ? ["phone"]
        : ["username"];

  for (const field of fields) {
    try {
      const snap = await withTimeout(
        getDocs(query(collection(db, USER_COLLECTION), where(field, "==", lookup.value), limit(1))),
      );
      if (!snap.empty) {
        const row = snap.docs[0];
        return { id: row.id, data: row.data() };
      }
    } catch {
      // keep trying pinned fallback / other lookups
    }
  }
  return null;
}

function findSeedUser(identifier: string): LocalSeedUser | null {
  const allSeeds = [FALLBACK_ADMIN, ...PINNED_LOCAL_USERS];
  return allSeeds.find((seed) => matchesIdentifier(seed, identifier)) ?? null;
}

async function authenticateFirebaseAdmin(identifier: string, password: string): Promise<void> {
  const seed = findSeedUser(identifier);
  if (!seed || (seed.role !== "admin" && seed.role !== "content_creator")) return;

  try {
    await signInWithEmailAndPassword(auth, seed.email, password.trim());
  } catch {
    throw new Error("Firebase admin login မအောင်မြင်ပါ။ Email နှင့် Password ကိုစစ်ပြီး ထပ်ဝင်ပါ။");
  }
}

async function requestJson<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) {
      let msg = `Server Error (${res.status})`;
      try {
        const errBody = await res.json();
        if (errBody?.message) msg = errBody.message;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === "AbortError") {
      throw new Error("Connection timed out. Please check your internet connection.");
    }
    throw err;
  }
}

function isRemoteTransportError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  return (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("abort") ||
    msg.includes("failed to execute")
  );
}

export async function hasConflictingUser(user: Partial<ManagedUser>): Promise<boolean> {
  if (isLocalhost()) return false;

  const q = query(
    collection(db, USER_COLLECTION),
    where("username", "==", user.username?.trim() || ""),
  );
  const snap = await getDocs(q);
  if (!snap.empty) return true;

  if (user.email?.trim()) {
    const qe = query(collection(db, USER_COLLECTION), where("email", "==", user.email.trim()));
    const se = await getDocs(qe);
    if (!se.empty) return true;
  }
  if (user.phone?.trim()) {
    const qp = query(collection(db, USER_COLLECTION), where("phone", "==", user.phone.trim()));
    const sp = await getDocs(qp);
    if (!sp.empty) return true;
  }
  return false;
}

export async function loginLocal(identifier: string, password: string): Promise<LoginResult> {
  const seed = findSeedUser(identifier);
  if (seed && seed.password === password.trim()) {
    const token = `local_token_${normalizeText(seed.username)}_${Date.now()}`;
    const sessionUser = makeSessionUser(`seed-${normalizeText(seed.username)}`, seed);
    persistSession(token, sessionUser);
    return { token, user: sessionUser, expiresAt: new Date(Date.now() + 86400000).toISOString() };
  }

  const row = await findFirestoreUserByIdentifier(identifier);
  if (!row) throw new Error("Invalid username or password.");

  const docData = row.data ?? {};
  if ((docData.password ?? "") !== password.trim()) {
    throw new Error("Invalid username or password.");
  }
  if ((docData.status ?? "active") === "disabled") {
    throw new Error("This account has been disabled.");
  }
  if ((docData.approvalStatus ?? "approved") === "pending") {
    throw new Error("Your registration is pending approval.");
  }

  const sessionUser: ManagedUser = {
    id: row.id,
    username: docData.username || identifier.trim(),
    email: docData.email || "",
    phone: docData.phone || "",
    address: docData.address || "",
    role: docData.role || "user",
    status: docData.status || "active",
    approvalStatus: docData.approvalStatus || "approved",
    mustChangePassword: !!docData.mustChangePassword,
    createdAt: docData.createdAt || Date.now(),
    updatedAt: docData.updatedAt || Date.now(),
  };
  const token = `local_token_${row.id}_${Date.now()}`;
  persistSession(token, sessionUser);
  return { token, user: sessionUser, expiresAt: new Date(Date.now() + 86400000).toISOString() };
}

export function getStoredAdminApiToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setStoredAdminApiToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function clearUserSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
}

export function getCurrentUser(): ManagedUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LOCAL_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizeManagedUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function signupUser(input: SignUpInput): Promise<LoginResult> {
  if (shouldUseRemoteApi()) {
    return requestJson<LoginResult>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  const userDoc = {
    username: input.username.trim(),
    password: input.password.trim(),
    email: (input.email || "").trim(),
    phone: (input.phone || "").trim(),
    role: "user" as UserRole,
    status: "active" as UserStatus,
    approvalStatus: "approved" as UserApprovalStatus,
    mustChangePassword: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (await hasConflictingUser(userDoc)) {
    throw new Error("Username, email, or phone number already exists.");
  }

  await addDoc(collection(db, USER_COLLECTION), userDoc);
  return loginLocal(input.username, input.password);
}

export async function loginUser(identifier: string, password: string): Promise<LoginResult> {
  await authenticateFirebaseAdmin(identifier, password);

  if (shouldUseRemoteApi()) {
    try {
      const remoteResult = await requestJson<LoginResult>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      const token = remoteResult?.token?.trim() || "";
      const remoteUser = (remoteResult as any)?.user ?? {};
      const seed = findSeedUser(identifier);
      const fallbackId =
        typeof remoteUser.id === "string" && remoteUser.id.trim()
          ? remoteUser.id.trim()
          : seed
            ? `seed-${normalizeText(seed.username)}`
            : `remote-${normalizeText(identifier) || "user"}`;
      const sessionUser: ManagedUser = {
        id: fallbackId,
        username: remoteUser.username || seed?.username || identifier.trim(),
        email: remoteUser.email || seed?.email || "",
        phone: remoteUser.phone || seed?.phone || "",
        address: remoteUser.address || seed?.address || "",
        role: remoteUser.role || seed?.role || "user",
        status: remoteUser.status || seed?.status || "active",
        approvalStatus: remoteUser.approvalStatus || seed?.approvalStatus || "approved",
        mustChangePassword: !!remoteUser.mustChangePassword || !!seed?.mustChangePassword,
        createdAt: remoteUser.createdAt || Date.now(),
        updatedAt: remoteUser.updatedAt || Date.now(),
      };
      if (token && remoteResult?.user) {
        persistSession(token, sessionUser);
        return {
          token,
          user: sessionUser,
          expiresAt: remoteResult.expiresAt || new Date(Date.now() + 86400000).toISOString(),
        };
      }
      if (token) {
        persistSession(token, sessionUser);
        return {
          token,
          user: sessionUser,
          expiresAt: remoteResult.expiresAt || new Date(Date.now() + 86400000).toISOString(),
        };
      }
      throw new Error("Login response missing token.");
    } catch (err) {
      if (!isRemoteTransportError(err)) throw err;
    }
  }
  return loginLocal(identifier, password);
}

export async function logoutUser(): Promise<void> {
  if (shouldUseRemoteApi()) {
    const token = getStoredAdminApiToken();
    if (token) {
      try {
        await requestJson<{ success: boolean }>("/api/auth/logout", { method: "POST" }, token);
      } catch {
        // ignore
      }
    }
  }
  try {
    await signOut(auth);
  } catch {
    // Ignore Firebase sign-out failures and always clear the local session.
  }
  clearUserSession();
}

export async function submitUserData(token: string, data: UserDataInput): Promise<void> {
  if (shouldUseRemoteApi()) {
    await requestJson<{ success: boolean }>("/api/user/submit-data", {
      method: "POST",
      body: JSON.stringify(data),
    }, token);
    return;
  }

  const currentUser = getCurrentUser();

  // ပြင်ဆင်ချက် - Omit<UserDataRecord, "id"> အတွက် string | undefined ဖြစ်မနေစေဘဲ အကုန်လုံး string ဖြစ်အောင် ညှိပေးထားပါသည်
  const record: UserDataRecord = {
    id: "", // FireStore ID placeholder
    userId: currentUser?.id || "local_user_id",
    username: currentUser?.username || "local_user",
    email: currentUser?.email || "local@example.com",
    title: data.title || "",
    phone: data.phone || currentUser?.phone || "",
    address: data.address || "",
    note: data.note || "",
    status: "pending" as UserDataStatus,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // id ဖယ်ထုတ်ပြီး ကျန်တာကို FireStore ထဲ သိမ်းခြင်း
  const { id, ...firestoreDoc } = record;
  await addDoc(collection(db, USER_DATA_COLLECTION), firestoreDoc);
}

export async function getMySubmittedData(token: string): Promise<UserDataRecord[]> {
  if (shouldUseRemoteApi()) {
    try {
      return await requestJson<UserDataRecord[]>("/api/user/my-data", { method: "GET" }, token);
    } catch (err) {
      if (!isRemoteTransportError(err)) throw err;
    }
  }
  return [];
}

export async function loginAdminApi(password: string): Promise<string> {
  return "local_admin_bypass_token";
}

export async function getAdminUsers(token: string): Promise<ManagedUser[]> {
  return [];
}

export async function createAdminUser(token: string, input: CreateUserInput): Promise<ManagedUser> {
  throw new Error("Not supported in local-fallback mode.");
}

export async function updateAdminUserRole(token: string, id: string, role: UserRole): Promise<void> {}
export async function updateAdminUserApprovalStatus(token: string, id: string, status: UserApprovalStatus): Promise<void> {}
export async function disableAdminUser(token: string, id: string): Promise<void> {}
export async function setAdminUserStatus(token: string, id: string, status: "active" | "disabled"): Promise<void> {}
export async function deleteAdminUser(token: string, id: string): Promise<void> {}
export async function resetAdminUserPassword(token: string, id: string): Promise<string> { return ""; }

async function changeLocalPassword(token: string, current: string, next: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) throw new Error("No active session found.");
  const ref = doc(db, USER_COLLECTION, user.id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Account not found.");
  if (snap.data().password !== current.trim()) throw new Error("Incorrect current password.");
  await updateDoc(ref, { password: next.trim(), mustChangePassword: false, updatedAt: Date.now() });
}

async function resetLocalPasswordByVerification(id: string, contact: string, next: string): Promise<void> {
  const q = query(collection(db, USER_COLLECTION), where("username", "==", id.trim()));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("User credentials do not match our records.");
  const d = snap.docs[0];
  const data = d.data();
  if (data.email !== contact.trim() && data.phone !== contact.trim()) {
    throw new Error("User credentials do not match our records.");
  }
  await updateDoc(doc(db, USER_COLLECTION, d.id), { password: next.trim(), mustChangePassword: false, updatedAt: Date.now() });
}

export async function changeMyPassword(token: string, currentPassword: string, newPassword: string): Promise<void> {
  if (shouldUseRemoteApi()) {
    await requestJson(
      "/api/auth/change-password",
      {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      },
      token,
    );
    return;
  }
  await changeLocalPassword(token, currentPassword, newPassword);
}

export async function resetPasswordByEmailOrPhone(
  identifier: string,
  emailOrPhone: string,
  newPassword: string,
): Promise<void> {
  if (shouldUseRemoteApi()) {
    try {
      await requestJson<{ message: string }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ identifier, emailOrPhone, newPassword }),
        },
      );
      return;
    } catch (remoteErr) {
      if (!isRemoteTransportError(remoteErr)) throw remoteErr;
    }
  }
  await resetLocalPasswordByVerification(identifier, emailOrPhone, newPassword);
}

export function generateTempPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const targetLength = Math.max(8, Math.min(24, length));
  let output = "";
  for (let i = 0; i < targetLength; i += 1) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }
  return output;
}

export async function getAdminSubmittedData(token: string): Promise<UserDataRecord[]> {
  return [];
}

export async function updateAdminSubmittedDataStatus(
  token: string,
  id: string,
  status: UserDataStatus,
  remarks?: string,
): Promise<void> {}
