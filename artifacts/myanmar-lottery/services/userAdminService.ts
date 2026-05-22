import { db } from "@/config/firebase";
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
const USER_COLLECTION = "app_users";
const USER_DATA_COLLECTION = "app_user_data";
const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";

type AuthMode = "remote_api" | "firestore_local";
type LocalSession = { userId: string; token: string };

type StoredUserDoc = {
  username: string;
  usernameLower: string;
  email: string;
  emailLower: string;
  phone: string;
  phoneNormalized: string;
  address: string;
  passwordHash: string;
  role: UserRole;
  status: "active" | "disabled";
  approvalStatus: UserApprovalStatus;
  mustChangePassword: boolean;
  createdAt: number;
  updatedAt: number;
};

type StoredUserDataDoc = {
  userId: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  title: string;
  note: string;
  status: UserDataStatus;
  createdAt: number;
  updatedAt: number;
};

function readLocalStorage(key: string): string {
  if (typeof window === "undefined" || !window.localStorage) return "";
  return window.localStorage.getItem(key) ?? "";
}

function writeLocalStorage(key: string, value: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
}

function getConfiguredApiBaseUrl(): string {
  return ENV_API_BASE_URL.replace(/\/+$/, "");
}

export function setApiBaseUrl(url: string): void {
  void url;
}

export function getApiBaseUrl(): string {
  return getConfiguredApiBaseUrl();
}

export function getUserAuthMode(): AuthMode {
  return getConfiguredApiBaseUrl() ? "remote_api" : "firestore_local";
}

function buildApiUrl(path: string): string {
  const base = getConfiguredApiBaseUrl();
  if (!base) throw new Error("API base URL is not configured.");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(buildApiUrl(path), { ...options, headers });
  const body = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    throw new Error(parseErrorMessage(body, `Request failed (${response.status})`));
  }
  return body as T;
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeEmail(value: string): string {
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
  if (raw.includes("@")) return { kind: "email", value: normalizeEmail(raw) };
  if (isLikelyPhoneIdentifier(raw)) return { kind: "phone", value: normalizePhone(raw) };
  return { kind: "username", value: normalizeUsername(raw) };
}

function contactMatchesUser(doc: StoredUserDoc, contact: string): boolean {
  const trimmed = contact.trim();
  if (!trimmed) return false;
  const normalizedPhone = normalizePhone(trimmed);
  if (normalizedPhone && normalizedPhone === normalizePhone(doc.phone ?? "")) return true;
  return normalizeEmail(trimmed) === normalizeEmail(doc.email ?? "");
}

async function hashPassword(password: string): Promise<string> {
  if (!password) return "";
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let hash = 0;
  for (let i = 0; i < password.length; i += 1) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function toManagedUser(id: string, doc: StoredUserDoc): ManagedUser {
  return {
    id,
    username: doc.username,
    email: doc.email,
    phone: doc.phone,
    address: doc.address,
    passwordHash: doc.passwordHash,
    role: doc.role,
    status: doc.status ?? "active",
    approvalStatus: doc.approvalStatus ?? "approved",
    mustChangePassword: !!doc.mustChangePassword,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toUserDataRecord(id: string, doc: StoredUserDataDoc): UserDataRecord {
  return {
    id,
    userId: doc.userId,
    username: doc.username,
    email: doc.email,
    phone: doc.phone,
    address: doc.address,
    title: doc.title,
    note: doc.note,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function findUserDocByIdentifier(identifier: string) {
  const lookup = normalizeIdentifier(identifier);
  const field =
    lookup.kind === "email"
      ? "emailLower"
      : lookup.kind === "phone"
      ? "phoneNormalized"
      : "usernameLower";
  const firstSnap = await getDocs(
    query(collection(db, USER_COLLECTION), where(field, "==", lookup.value), limit(1)),
  );
  if (!firstSnap.empty) {
    const row = firstSnap.docs[0];
    return { id: row.id, data: row.data() as StoredUserDoc, ref: row.ref };
  }

  // Fallback for legacy docs that were created before normalized fields existed.
  const allSnap = await getDocs(collection(db, USER_COLLECTION));
  for (const row of allSnap.docs) {
    const data = row.data() as StoredUserDoc;
    const matches =
      lookup.kind === "email"
        ? normalizeEmail(data.email ?? "") === lookup.value
        : lookup.kind === "phone"
          ? normalizePhone(data.phone ?? "") === lookup.value
          : normalizeUsername(data.username ?? "") === lookup.value;
    if (matches) return { id: row.id, data, ref: row.ref };
  }
  return null;
}

async function hasConflictingUser(data: {
  username: string;
  email: string;
  phone: string;
  excludeId?: string;
}): Promise<boolean> {
  const checks = [
    query(collection(db, USER_COLLECTION), where("usernameLower", "==", normalizeUsername(data.username)), limit(1)),
    query(collection(db, USER_COLLECTION), where("emailLower", "==", normalizeEmail(data.email)), limit(1)),
    query(collection(db, USER_COLLECTION), where("phoneNormalized", "==", normalizePhone(data.phone)), limit(1)),
  ];
  for (const q of checks) {
    const snap = await getDocs(q);
    if (!snap.empty) {
      const found = snap.docs[0];
      if (!data.excludeId || found.id !== data.excludeId) {
        return true;
      }
    }
  }
  return false;
}

async function ensureDefaultAdminLocal(): Promise<void> {
  const adminSnap = await getDocs(
    query(collection(db, USER_COLLECTION), where("role", "==", "admin"), limit(1)),
  );
  if (!adminSnap.empty) return;

  const now = Date.now();
  await addDoc(collection(db, USER_COLLECTION), {
    username: "admin",
    usernameLower: "admin",
    email: "admin@example.com",
    emailLower: "admin@example.com",
    phone: "+959111111111",
    phoneNormalized: "+959111111111",
    address: "Yangon",
    passwordHash: await hashPassword("ChangeMe123!"),
    role: "admin",
    status: "active",
    approvalStatus: "approved",
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
  } satisfies StoredUserDoc);
}

function getLocalSession(): LocalSession | null {
  const raw = readLocalStorage(LOCAL_SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LocalSession;
    if (!parsed.userId || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setLocalSession(session: LocalSession | null): void {
  if (!session) {
    writeLocalStorage(LOCAL_SESSION_STORAGE_KEY, "");
    return;
  }
  writeLocalStorage(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function ensureLocalToken(token: string): LocalSession {
  const session = getLocalSession();
  if (!session || session.token !== token) {
    throw new Error("Session expired. Please login again.");
  }
  return session;
}

async function getLocalUserById(userId: string): Promise<ManagedUser | null> {
  const ref = doc(db, USER_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toManagedUser(snap.id, snap.data() as StoredUserDoc);
}

async function ensureLocalAdmin(token: string): Promise<ManagedUser> {
  const session = ensureLocalToken(token);
  const user = await getLocalUserById(session.userId);
  if (!user) throw new Error("Session invalid.");
  if (user.role !== "admin") throw new Error("Only admin can perform this action.");
  return user;
}

async function loginLocal(identifier: string, password: string): Promise<LoginResult> {
  await ensureDefaultAdminLocal();
  const row = await findUserDocByIdentifier(identifier);
  if (!row) throw new Error("Invalid credentials.");
  const status = row.data.status ?? "active";
  const approvalStatus = row.data.approvalStatus ?? "approved";
  if (status !== "active") throw new Error("This account is disabled.");
  if (approvalStatus !== "approved") {
    throw new Error("This account is not allowed to login yet.");
  }

  const inputHash = await hashPassword(password);
  if (inputHash !== row.data.passwordHash) throw new Error("Invalid credentials.");

  const token = `local-${row.id}-${Date.now()}`;
  setLocalSession({ userId: row.id, token });
  return {
    token,
    user: toManagedUser(row.id, row.data),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

async function signupLocal(input: SignUpInput): Promise<ManagedUser> {
  await ensureDefaultAdminLocal();
  if (await hasConflictingUser(input)) {
    throw new Error("username, email, or phone number already exists.");
  }
  const now = Date.now();
  const ref = await addDoc(collection(db, USER_COLLECTION), {
    username: input.username.trim(),
    usernameLower: normalizeUsername(input.username),
    email: input.email.trim(),
    emailLower: normalizeEmail(input.email),
    phone: input.phone.trim(),
    phoneNormalized: normalizePhone(input.phone),
    address: (input.address ?? "").trim(),
    passwordHash: await hashPassword(input.password),
    role: "user",
    status: "active",
    approvalStatus: "approved",
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  } satisfies StoredUserDoc);
  return {
    id: ref.id,
    username: input.username.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: (input.address ?? "").trim(),
    role: "user",
    status: "active",
    approvalStatus: "approved",
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  };
}

async function listLocalUsers(): Promise<ManagedUser[]> {
  const snap = await getDocs(
    query(collection(db, USER_COLLECTION), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((row) => toManagedUser(row.id, row.data() as StoredUserDoc));
}

async function createLocalUser(token: string, payload: CreateUserInput): Promise<ManagedUser> {
  await ensureLocalAdmin(token);
  if (await hasConflictingUser(payload)) {
    throw new Error("username, email, or phone number already exists.");
  }
  const now = Date.now();
  const ref = await addDoc(collection(db, USER_COLLECTION), {
    username: payload.username.trim(),
    usernameLower: normalizeUsername(payload.username),
    email: payload.email.trim(),
    emailLower: normalizeEmail(payload.email),
    phone: payload.phone.trim(),
    phoneNormalized: normalizePhone(payload.phone),
    address: (payload.address ?? "").trim(),
    passwordHash: await hashPassword(payload.password),
    role: payload.role,
    status: "active",
    approvalStatus: "approved",
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
  } satisfies StoredUserDoc);
  return {
    id: ref.id,
    username: payload.username.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    address: (payload.address ?? "").trim(),
    role: payload.role,
    status: "active",
    approvalStatus: "approved",
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function updateLocalUserRole(token: string, userId: string, role: UserRole): Promise<void> {
  await ensureLocalAdmin(token);
  const ref = doc(db, USER_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found.");
  await updateDoc(ref, { role, updatedAt: Date.now() });
}

async function updateLocalUserApprovalStatus(
  token: string,
  userId: string,
  approvalStatus: UserApprovalStatus,
): Promise<void> {
  await ensureLocalAdmin(token);
  const ref = doc(db, USER_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found.");
  await updateDoc(ref, { approvalStatus, updatedAt: Date.now() });
}

async function disableLocalUser(token: string, userId: string): Promise<void> {
  await ensureLocalAdmin(token);
  const ref = doc(db, USER_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found.");
  await updateDoc(ref, { status: "disabled", updatedAt: Date.now() });
}

async function setLocalUserStatus(token: string, userId: string, status: "active" | "disabled"): Promise<void> {
  await ensureLocalAdmin(token);
  const ref = doc(db, USER_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found.");
  await updateDoc(ref, { status, updatedAt: Date.now() });
}

async function deleteLocalUser(token: string, userId: string): Promise<void> {
  await ensureLocalAdmin(token);
  const ref = doc(db, USER_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found.");
  const user = snap.data() as StoredUserDoc;
  if (user.role === "admin") throw new Error("Admin account cannot be deleted.");
  await deleteDoc(ref);
}

async function resetLocalUserPassword(token: string, userId: string, newPassword: string): Promise<void> {
  await ensureLocalAdmin(token);
  const ref = doc(db, USER_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found.");
  await updateDoc(ref, {
    passwordHash: await hashPassword(newPassword),
    mustChangePassword: true,
    updatedAt: Date.now(),
  });
}

async function changeLocalPassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const session = ensureLocalToken(token);
  const ref = doc(db, USER_COLLECTION, session.userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found.");
  const user = snap.data() as StoredUserDoc;
  const currentHash = await hashPassword(currentPassword);
  if (currentHash !== user.passwordHash) throw new Error("Current password is incorrect.");
  await updateDoc(ref, {
    passwordHash: await hashPassword(newPassword),
    mustChangePassword: false,
    updatedAt: Date.now(),
  });
}

async function resetLocalPasswordByVerification(
  identifier: string,
  emailOrPhone: string,
  newPassword: string,
): Promise<void> {
  const row = await findUserDocByIdentifier(identifier);
  if (!row) throw new Error("User not found.");
  if (!contactMatchesUser(row.data, emailOrPhone)) {
    throw new Error("Email/Phone verification failed.");
  }
  await updateDoc(row.ref, {
    passwordHash: await hashPassword(newPassword),
    mustChangePassword: false,
    updatedAt: Date.now(),
  });
}

async function createLocalUserData(token: string, input: UserDataInput): Promise<UserDataRecord> {
  const session = ensureLocalToken(token);
  const user = await getLocalUserById(session.userId);
  if (!user) throw new Error("Session invalid.");
  if (user.status !== "active" || user.approvalStatus === "terminated") {
    throw new Error("Your account cannot submit data.");
  }

  const now = Date.now();
  const ref = await addDoc(collection(db, USER_DATA_COLLECTION), {
    userId: user.id,
    username: user.username,
    email: user.email,
    phone: input.phone?.trim() || user.phone,
    address: input.address?.trim() || user.address || "",
    title: input.title.trim(),
    note: (input.note ?? "").trim(),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  } satisfies StoredUserDataDoc);

  return {
    id: ref.id,
    userId: user.id,
    username: user.username,
    email: user.email,
    phone: input.phone?.trim() || user.phone,
    address: input.address?.trim() || user.address || "",
    title: input.title.trim(),
    note: (input.note ?? "").trim(),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

async function listLocalUserDataByUser(userId: string): Promise<UserDataRecord[]> {
  const snap = await getDocs(
    query(
      collection(db, USER_DATA_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((row) => toUserDataRecord(row.id, row.data() as StoredUserDataDoc));
}

async function listLocalUserDataForAdmin(token: string): Promise<UserDataRecord[]> {
  await ensureLocalAdmin(token);
  const snap = await getDocs(
    query(collection(db, USER_DATA_COLLECTION), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((row) => toUserDataRecord(row.id, row.data() as StoredUserDataDoc));
}

async function updateLocalUserDataStatus(
  token: string,
  recordId: string,
  status: UserDataStatus,
): Promise<void> {
  await ensureLocalAdmin(token);
  const ref = doc(db, USER_DATA_COLLECTION, recordId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Data record not found.");
  await updateDoc(ref, { status, updatedAt: Date.now() });
}

export function getStoredAdminApiToken(): string {
  return readLocalStorage(AUTH_STORAGE_KEY);
}

export function setStoredAdminApiToken(token: string): void {
  writeLocalStorage(AUTH_STORAGE_KEY, token);
}

export function clearUserSession(): void {
  setLocalSession(null);
  setStoredAdminApiToken("");
}

export async function getCurrentUser(token: string): Promise<ManagedUser | null> {
  if (!token) return null;
  if (getUserAuthMode() === "remote_api") {
    try {
      const data = await requestJson<{ user: ManagedUser }>("/api/auth/me", {}, token);
      return data.user ?? null;
    } catch {
      return null;
    }
  }
  const session = ensureLocalToken(token);
  return getLocalUserById(session.userId);
}

export async function signupUser(input: SignUpInput): Promise<ManagedUser> {
  // Keep signup reliable for web deployment even when API base URL is set.
  return signupLocal(input);
}

export async function loginUser(identifier: string, password: string): Promise<LoginResult> {
  if (getUserAuthMode() === "remote_api") {
    try {
      return await requestJson<LoginResult>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
    } catch {
      // Fall back to local auth so username/email/phone login keeps working.
      return loginLocal(identifier, password);
    }
  }
  return loginLocal(identifier, password);
}

export function logoutUser(): void {
  clearUserSession();
}

export async function submitUserData(token: string, input: UserDataInput): Promise<UserDataRecord> {
  // Use local persisted data model for user submissions.
  return createLocalUserData(token, input);
}

export async function getMySubmittedData(token: string): Promise<UserDataRecord[]> {
  const session = ensureLocalToken(token);
  return listLocalUserDataByUser(session.userId);
}

export async function loginAdminApi(identifier: string, password: string): Promise<LoginResult> {
  if (getUserAuthMode() === "remote_api") {
    try {
      return await requestJson<LoginResult>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
    } catch {
      return loginLocal(identifier, password);
    }
  }
  return loginLocal(identifier, password);
}

export async function getAdminUsers(token: string): Promise<ManagedUser[]> {
  if (getUserAuthMode() === "remote_api") {
    const data = await requestJson<{ users: ManagedUser[] }>("/api/admin/users", {}, token);
    return data.users ?? [];
  }
  await ensureLocalAdmin(token);
  return listLocalUsers();
}

export async function createAdminUser(token: string, payload: CreateUserInput): Promise<ManagedUser> {
  if (getUserAuthMode() === "remote_api") {
    const data = await requestJson<{ user: ManagedUser }>(
      "/api/admin/users",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    );
    return data.user;
  }
  return createLocalUser(token, payload);
}

export async function updateAdminUserRole(token: string, userId: string, role: UserRole): Promise<void> {
  if (getUserAuthMode() === "remote_api") {
    await requestJson<{ user: ManagedUser }>(
      `/api/admin/users/${userId}`,
      { method: "PATCH", body: JSON.stringify({ role }) },
      token,
    );
    return;
  }
  await updateLocalUserRole(token, userId, role);
}

export async function updateAdminUserApprovalStatus(
  token: string,
  userId: string,
  approvalStatus: UserApprovalStatus,
): Promise<void> {
  if (getUserAuthMode() === "remote_api") {
    throw new Error("Approval update via remote API is not configured.");
  }
  await updateLocalUserApprovalStatus(token, userId, approvalStatus);
}

export async function disableAdminUser(token: string, userId: string): Promise<void> {
  if (getUserAuthMode() === "remote_api") {
    await requestJson<{ message: string }>(
      `/api/admin/users/${userId}`,
      { method: "DELETE" },
      token,
    );
    return;
  }
  await disableLocalUser(token, userId);
}

export async function setAdminUserStatus(
  token: string,
  userId: string,
  status: "active" | "disabled",
): Promise<void> {
  if (getUserAuthMode() === "remote_api") {
    throw new Error("User status update via remote API is not configured.");
  }
  await setLocalUserStatus(token, userId, status);
}

export async function deleteAdminUser(token: string, userId: string): Promise<void> {
  if (getUserAuthMode() === "remote_api") {
    throw new Error("User delete via remote API is not configured.");
  }
  await deleteLocalUser(token, userId);
}

export async function resetAdminUserPassword(
  token: string,
  userId: string,
  newPassword: string,
): Promise<void> {
  if (getUserAuthMode() === "remote_api") {
    await requestJson<{ message: string }>(
      `/api/admin/users/${userId}/reset-password`,
      {
        method: "POST",
        body: JSON.stringify({ newPassword, mustChangePassword: true }),
      },
      token,
    );
    return;
  }
  await resetLocalUserPassword(token, userId, newPassword);
}

export async function changeMyPassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (getUserAuthMode() === "remote_api") {
    await requestJson<{ message: string }>(
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
  if (getUserAuthMode() === "remote_api") {
    await requestJson<{ message: string }>(
      "/api/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ identifier, emailOrPhone, newPassword }),
      },
    );
    return;
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
  // Keep admin data-review available in local firestore mode.
  return listLocalUserDataForAdmin(token);
}

export async function updateAdminSubmittedDataStatus(
  token: string,
  recordId: string,
  status: UserDataStatus,
): Promise<void> {
  await updateLocalUserDataStatus(token, recordId, status);
}
