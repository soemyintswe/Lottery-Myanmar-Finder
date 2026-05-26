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
const LOCAL_USERS_CACHE_KEY = "mm_admin_local_users_cache_v1";
const USER_COLLECTION = "app_users";
const USER_DATA_COLLECTION = "app_user_data";
const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";
const REQUEST_TIMEOUT_MS = 9000;
// Firestore reads on some mobile networks can be slow; use a slightly higher
// timeout to reduce false "timeout" fallbacks that cause browser-to-browser divergence.
const FIRESTORE_OP_TIMEOUT_MS = 12000;
const FALLBACK_ADMIN = {
  username: "admin",
  email: "admin@example.com",
  phone: "+959111111111",
  password: "ChangeMe123!",
};
const PINNED_LOCAL_USERS = [
  {
    username: "soemyintswe",
    email: "soemyintswe@gmail.com",
    phone: "09421519915",
    address: "Yangon",
  },
  {
    username: "tunnaingsoe2932003",
    email: "tunnaingsoe2932003@gmail.com",
    phone: "09759278655",
    address: "Yangon",
  },
] as const;
const PINNED_LOCAL_USER_PASSWORD = "sms*>IWT2026";
const PINNED_ADMIN_EMAILS = new Set<string>(["soemyintswe@gmail.com", "tunnaingsoe2932003@gmail.com"]);

type AuthMode = "remote_api" | "firestore_local";
type LocalSession = { userId: string; token: string };
type CachedLocalUser = StoredUserDoc & { id: string };

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

function generateLocalId(prefix = "u"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readCachedLocalUsers(): CachedLocalUser[] {
  const raw = readLocalStorage(LOCAL_USERS_CACHE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CachedLocalUser[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && typeof row.id === "string" && !!row.id);
  } catch {
    return [];
  }
}

function writeCachedLocalUsers(users: CachedLocalUser[]): void {
  writeLocalStorage(LOCAL_USERS_CACHE_KEY, JSON.stringify(users));
}

function upsertCachedLocalUser(user: CachedLocalUser): void {
  const rows = readCachedLocalUsers();
  const next = rows.filter((row) => row.id !== user.id);
  next.unshift(user);
  writeCachedLocalUsers(next);
}

function removeCachedLocalUser(userId: string): void {
  const rows = readCachedLocalUsers().filter((row) => row.id !== userId);
  writeCachedLocalUsers(rows);
}

function findCachedLocalUserById(userId: string): CachedLocalUser | null {
  return readCachedLocalUsers().find((row) => row.id === userId) ?? null;
}

function findCachedLocalUserByIdentifier(identifier: string): CachedLocalUser | null {
  const lookup = normalizeIdentifier(identifier);
  for (const row of readCachedLocalUsers()) {
    const matched =
      lookup.kind === "email"
        ? normalizeEmail(row.email ?? "") === lookup.value
        : lookup.kind === "phone"
          ? normalizePhone(row.phone ?? "") === lookup.value
          : normalizeUsername(row.username ?? "") === lookup.value;
    if (matched) return row;
  }
  return null;
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

function isLocalSessionToken(token: string): boolean {
  return token.startsWith("local-");
}

function shouldUseRemoteApi(token?: string): boolean {
  const hasRemote = !!getConfiguredApiBaseUrl();
  if (!hasRemote) return false;
  if (token && isLocalSessionToken(token)) return false;
  return true;
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
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(buildApiUrl(path), {
      ...options,
      headers,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({} as Record<string, unknown>));
    if (!response.ok) {
      throw new Error(parseErrorMessage(body, `Request failed (${response.status})`));
    }
    return body as T;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Login request timed out. Please try again.");
    }
    if (typeof err?.message === "string" && err.message.trim()) {
      throw err;
    }
    throw new Error("Network error. Please check internet and try again.");
  } finally {
    clearTimeout(timer);
  }
}

function isLocalAuthFallbackError(err: unknown): boolean {
  const msg = ((err as { message?: string } | undefined)?.message ?? "").toLowerCase();
  return (
    msg.includes("invalid credentials") ||
    msg.includes("user not found") ||
    msg.includes("firestore request timeout") ||
    msg.includes("permission-denied") ||
    msg.includes("network")
  );
}

function isRemoteTransportError(err: unknown): boolean {
  const msg = ((err as { message?: string } | undefined)?.message ?? "").toLowerCase();
  return (
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("network error") ||
    msg.includes("failed to fetch")
  );
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

function withFirestoreTimeout<T>(promise: Promise<T>, timeoutMs = FIRESTORE_OP_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Firestore request timeout.")), timeoutMs);
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

function isFallbackAdminIdentifier(identifier: string): boolean {
  const lookup = normalizeIdentifier(identifier);
  if (lookup.kind === "username") return lookup.value === normalizeUsername(FALLBACK_ADMIN.username);
  if (lookup.kind === "email") return lookup.value === normalizeEmail(FALLBACK_ADMIN.email);
  return lookup.value === normalizePhone(FALLBACK_ADMIN.phone);
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
  const firstSnap = await withFirestoreTimeout(
    getDocs(
    query(collection(db, USER_COLLECTION), where(field, "==", lookup.value), limit(1)),
    ),
  );
  if (!firstSnap.empty) {
    const row = firstSnap.docs[0];
    return { id: row.id, data: row.data() as StoredUserDoc, ref: row.ref };
  }

  // Fallback for legacy docs that were created before normalized fields existed.
  const allSnap = await withFirestoreTimeout(getDocs(collection(db, USER_COLLECTION)));
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
  const cachedConflict = readCachedLocalUsers().find((row) => {
    if (data.excludeId && row.id === data.excludeId) return false;
    return (
      normalizeUsername(row.username) === normalizeUsername(data.username) ||
      normalizeEmail(row.email) === normalizeEmail(data.email) ||
      normalizePhone(row.phone) === normalizePhone(data.phone)
    );
  });
  if (cachedConflict) return true;

  const checks = [
    query(collection(db, USER_COLLECTION), where("usernameLower", "==", normalizeUsername(data.username)), limit(1)),
    query(collection(db, USER_COLLECTION), where("emailLower", "==", normalizeEmail(data.email)), limit(1)),
    query(collection(db, USER_COLLECTION), where("phoneNormalized", "==", normalizePhone(data.phone)), limit(1)),
  ];
  try {
    for (const q of checks) {
      const snap = await getDocs(q);
      if (!snap.empty) {
        const found = snap.docs[0];
        if (!data.excludeId || found.id !== data.excludeId) {
          return true;
        }
      }
    }
  } catch {
    // Ignore Firestore read errors and rely on local cache checks.
  }
  return false;
}

async function ensureDefaultAdminLocal(): Promise<void> {
  const hasCachedAdmin = readCachedLocalUsers().some((row) => row.role === "admin");
  if (hasCachedAdmin) return;

  try {
    const adminSnap = await withFirestoreTimeout(
      getDocs(
        query(collection(db, USER_COLLECTION), where("role", "==", "admin"), limit(1)),
      ),
    );
    if (!adminSnap.empty) return;

    const now = Date.now();
    await withFirestoreTimeout(
      addDoc(collection(db, USER_COLLECTION), {
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
      } satisfies StoredUserDoc),
    );
  } catch {
    const now = Date.now();
    upsertCachedLocalUser({
      id: "local-admin-seed",
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
    });
  }

  // Keep pinned operator accounts available, but do NOT overwrite their roles.
  // On a fresh browser (clean storage), the previous implementation would seed them
  // as role="user", causing "can login but cannot manage users" even if Firestore says admin.
  const cached = readCachedLocalUsers();
  const byEmail = new Set(cached.map((row) => normalizeEmail(row.email)));
  for (const seeded of PINNED_LOCAL_USERS) {
    const emailLower = normalizeEmail(seeded.email);
    if (byEmail.has(emailLower)) continue;
    try {
      const snap = await withFirestoreTimeout(
        getDocs(query(collection(db, USER_COLLECTION), where("emailLower", "==", emailLower), limit(1))),
      );
      if (!snap.empty) {
        const row = snap.docs[0];
        const data = row.data() as StoredUserDoc;
        // Bootstrap: these emails should always have admin privileges for managing this internal app.
        // This avoids getting locked out when the first admin account is unknown.
        if (PINNED_ADMIN_EMAILS.has(emailLower) && data.role !== "admin") {
          try {
            await withFirestoreTimeout(updateDoc(row.ref, { role: "admin", updatedAt: Date.now() }));
            data.role = "admin";
          } catch {
            // If update fails, still cache the Firestore role to avoid divergence.
          }
        }
        upsertCachedLocalUser({ id: row.id, ...data });
        continue;
      }
    } catch {
      // If Firestore is unreachable, avoid seeding a potentially wrong role.
      // The user can still login with existing local cache if available.
    }
  }
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
  if (userId === "fallback-admin") {
    const now = Date.now();
    return {
      id: "fallback-admin",
      username: FALLBACK_ADMIN.username,
      email: FALLBACK_ADMIN.email,
      phone: FALLBACK_ADMIN.phone,
      address: "Yangon",
      role: "admin",
      status: "active",
      approvalStatus: "approved",
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    };
  }
  try {
    const ref = doc(db, USER_COLLECTION, userId);
    const snap = await withFirestoreTimeout(getDoc(ref));
    if (snap.exists()) {
      const data = snap.data() as StoredUserDoc;
      upsertCachedLocalUser({ id: snap.id, ...data });
      return toManagedUser(snap.id, data);
    }
  } catch {
    // fall through to cached user
  }
  const cached = findCachedLocalUserById(userId);
  return cached ? toManagedUser(cached.id, cached) : null;
}

async function ensureLocalAdmin(token: string): Promise<ManagedUser> {
  const session = ensureLocalToken(token);
  const user = await getLocalUserById(session.userId);
  if (!user) throw new Error("Session invalid.");
  if (user.role !== "admin") throw new Error("Only admin can perform this action.");
  return user;
}

async function loginLocal(identifier: string, password: string): Promise<LoginResult> {
  // Fast fallback path when Firestore is slow/unreachable.
  if (isFallbackAdminIdentifier(identifier) && password === FALLBACK_ADMIN.password) {
    const token = `local-fallback-admin-${Date.now()}`;
    setLocalSession({ userId: "fallback-admin", token });
    const now = Date.now();
    return {
      token,
      user: {
        id: "fallback-admin",
        username: FALLBACK_ADMIN.username,
        email: FALLBACK_ADMIN.email,
        phone: FALLBACK_ADMIN.phone,
        address: "Yangon",
        role: "admin",
        status: "active",
        approvalStatus: "approved",
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  await ensureDefaultAdminLocal();
  let row = null as Awaited<ReturnType<typeof findUserDocByIdentifier>> | null;
  try {
    row = await findUserDocByIdentifier(identifier);
  } catch {
    row = null;
  }
  let localData: StoredUserDoc | null = row?.data ?? null;
  let localId = row?.id ?? "";
  if (!localData) {
    const cached = findCachedLocalUserByIdentifier(identifier);
    if (cached) {
      localData = cached;
      localId = cached.id;
    }
  }

  if (!localData) throw new Error("Username/Email/Phone not found.");
  const status = localData.status ?? "active";
  const approvalStatus = localData.approvalStatus ?? "approved";
  if (status !== "active") throw new Error("This account is disabled.");
  if (approvalStatus !== "approved") {
    throw new Error("This account is not allowed to login yet.");
  }

  const inputHash = await hashPassword(password);
  if (inputHash !== localData.passwordHash) throw new Error("Password is incorrect.");

  const token = `local-${localId}-${Date.now()}`;
  setLocalSession({ userId: localId, token });
  upsertCachedLocalUser({ id: localId, ...localData });
  return {
    token,
    user: toManagedUser(localId, localData),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

async function signupLocal(input: SignUpInput): Promise<ManagedUser> {
  await ensureDefaultAdminLocal();
  if (await hasConflictingUser(input)) {
    throw new Error("username, email, or phone number already exists.");
  }
  const now = Date.now();
  const payload: StoredUserDoc = {
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
  };
  let id = generateLocalId("signup");
  try {
    const ref = await addDoc(collection(db, USER_COLLECTION), payload);
    id = ref.id;
  } catch {
    // Keep working with local cache when Firestore is unavailable.
  }
  upsertCachedLocalUser({ id, ...payload });
  return {
    id,
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
  await ensureDefaultAdminLocal();
  const map = new Map<string, CachedLocalUser>();
  for (const row of readCachedLocalUsers()) {
    map.set(row.id, row);
  }
  try {
    const snap = await getDocs(
      query(collection(db, USER_COLLECTION), orderBy("createdAt", "desc")),
    );
    for (const row of snap.docs) {
      const data = row.data() as StoredUserDoc;
      map.set(row.id, { id: row.id, ...data });
      upsertCachedLocalUser({ id: row.id, ...data });
    }
  } catch {
    // Firestore unavailable; use cached users.
  }
  return [...map.values()]
    .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))
    .map((row) => toManagedUser(row.id, row));
}

async function createLocalUser(token: string, payload: CreateUserInput): Promise<ManagedUser> {
  await ensureLocalAdmin(token);
  if (await hasConflictingUser(payload)) {
    throw new Error("username, email, or phone number already exists.");
  }
  const now = Date.now();
  const userDoc: StoredUserDoc = {
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
  };
  let id = generateLocalId("user");
  try {
    const ref = await addDoc(collection(db, USER_COLLECTION), userDoc);
    id = ref.id;
  } catch {
    // Firestore unavailable; use cached users.
  }
  upsertCachedLocalUser({ id, ...userDoc });
  return {
    id,
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
  const now = Date.now();
  const cached = findCachedLocalUserById(userId);
  if (cached) {
    upsertCachedLocalUser({ ...cached, role, updatedAt: now });
  }
  try {
    const ref = doc(db, USER_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      if (!cached) throw new Error("User not found.");
      return;
    }
    await updateDoc(ref, { role, updatedAt: now });
  } catch {
    if (!cached) throw new Error("User not found.");
  }
}

async function updateLocalUserApprovalStatus(
  token: string,
  userId: string,
  approvalStatus: UserApprovalStatus,
): Promise<void> {
  await ensureLocalAdmin(token);
  const now = Date.now();
  const cached = findCachedLocalUserById(userId);
  if (cached) {
    upsertCachedLocalUser({ ...cached, approvalStatus, updatedAt: now });
  }
  try {
    const ref = doc(db, USER_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      if (!cached) throw new Error("User not found.");
      return;
    }
    await updateDoc(ref, { approvalStatus, updatedAt: now });
  } catch {
    if (!cached) throw new Error("User not found.");
  }
}

async function disableLocalUser(token: string, userId: string): Promise<void> {
  await setLocalUserStatus(token, userId, "disabled");
}

async function setLocalUserStatus(token: string, userId: string, status: "active" | "disabled"): Promise<void> {
  await ensureLocalAdmin(token);
  const now = Date.now();
  const cached = findCachedLocalUserById(userId);
  if (cached) {
    upsertCachedLocalUser({ ...cached, status, updatedAt: now });
  }
  try {
    const ref = doc(db, USER_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      if (!cached) throw new Error("User not found.");
      return;
    }
    await updateDoc(ref, { status, updatedAt: now });
  } catch {
    if (!cached) throw new Error("User not found.");
  }
}

async function deleteLocalUser(token: string, userId: string): Promise<void> {
  await ensureLocalAdmin(token);
  const cached = findCachedLocalUserById(userId);
  if (cached?.role === "admin") throw new Error("Admin account cannot be deleted.");
  removeCachedLocalUser(userId);
  try {
    const ref = doc(db, USER_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      if (!cached) throw new Error("User not found.");
      return;
    }
    const user = snap.data() as StoredUserDoc;
    if (user.role === "admin") throw new Error("Admin account cannot be deleted.");
    await deleteDoc(ref);
  } catch {
    if (!cached) throw new Error("User not found.");
  }
}

async function resetLocalUserPassword(token: string, userId: string, newPassword: string): Promise<void> {
  await ensureLocalAdmin(token);
  const now = Date.now();
  const nextHash = await hashPassword(newPassword);
  const cached = findCachedLocalUserById(userId);
  if (cached) {
    upsertCachedLocalUser({
      ...cached,
      passwordHash: nextHash,
      mustChangePassword: true,
      updatedAt: now,
    });
  }
  try {
    const ref = doc(db, USER_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      if (!cached) throw new Error("User not found.");
      return;
    }
    await updateDoc(ref, {
      passwordHash: nextHash,
      mustChangePassword: true,
      updatedAt: now,
    });
  } catch {
    if (!cached) throw new Error("User not found.");
  }
}

async function changeLocalPassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const session = ensureLocalToken(token);
  let user: StoredUserDoc | null = null;
  try {
    const ref = doc(db, USER_COLLECTION, session.userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      user = snap.data() as StoredUserDoc;
      upsertCachedLocalUser({ id: session.userId, ...user });
    }
  } catch {
    user = null;
  }
  if (!user) {
    const cached = findCachedLocalUserById(session.userId);
    if (cached) user = cached;
  }
  if (!user) throw new Error("User not found.");
  const currentHash = await hashPassword(currentPassword);
  if (currentHash !== user.passwordHash) throw new Error("Current password is incorrect.");
  const nextHash = await hashPassword(newPassword);
  const now = Date.now();
  upsertCachedLocalUser({
    id: session.userId,
    ...user,
    passwordHash: nextHash,
    mustChangePassword: false,
    updatedAt: now,
  });
  try {
    const ref = doc(db, USER_COLLECTION, session.userId);
    await updateDoc(ref, {
      passwordHash: nextHash,
      mustChangePassword: false,
      updatedAt: now,
    });
  } catch {
    // local cache updated
  }
}

async function resetLocalPasswordByVerification(
  identifier: string,
  emailOrPhone: string,
  newPassword: string,
): Promise<void> {
  let row = null as Awaited<ReturnType<typeof findUserDocByIdentifier>> | null;
  try {
    row = await findUserDocByIdentifier(identifier);
  } catch {
    row = null;
  }
  let foundId = row?.id ?? "";
  let foundDoc: StoredUserDoc | null = row?.data ?? null;
  if (!foundDoc) {
    const cached = findCachedLocalUserByIdentifier(identifier);
    if (cached) {
      foundId = cached.id;
      foundDoc = cached;
    }
  }
  if (!foundDoc) throw new Error("User not found.");
  if (!contactMatchesUser(foundDoc, emailOrPhone)) {
    throw new Error("Email/Phone verification failed.");
  }
  const now = Date.now();
  const nextHash = await hashPassword(newPassword);
  upsertCachedLocalUser({
    id: foundId,
    ...foundDoc,
    passwordHash: nextHash,
    mustChangePassword: false,
    updatedAt: now,
  });
  if (row?.ref) {
    try {
      await updateDoc(row.ref, {
        passwordHash: nextHash,
        mustChangePassword: false,
        updatedAt: now,
      });
    } catch {
      // keep local cache
    }
  }
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
  if (shouldUseRemoteApi(token)) {
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
  if (shouldUseRemoteApi()) {
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
  try {
    return await loginLocal(identifier, password);
  } catch (localErr) {
    // Legacy compatibility: if API URL exists, try remote auth as secondary source.
    if (getConfiguredApiBaseUrl() && isLocalAuthFallbackError(localErr)) {
      return requestJson<LoginResult>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ identifier, password }),
        },
        undefined,
        4000,
      );
    }
    throw localErr;
  }
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
  if (shouldUseRemoteApi()) {
    try {
      return await requestJson<LoginResult>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
    } catch (remoteErr) {
      if (!isRemoteTransportError(remoteErr)) throw remoteErr;
      return loginLocal(identifier, password);
    }
  }
  try {
    return await loginLocal(identifier, password);
  } catch (localErr) {
    if (getConfiguredApiBaseUrl() && isLocalAuthFallbackError(localErr)) {
      return requestJson<LoginResult>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ identifier, password }),
        },
        undefined,
        4000,
      );
    }
    throw localErr;
  }
}

export async function getAdminUsers(token: string): Promise<ManagedUser[]> {
  if (shouldUseRemoteApi(token)) {
    const data = await requestJson<{ users: ManagedUser[] }>("/api/admin/users", {}, token);
    return data.users ?? [];
  }
  await ensureLocalAdmin(token);
  return listLocalUsers();
}

export async function createAdminUser(token: string, payload: CreateUserInput): Promise<ManagedUser> {
  if (shouldUseRemoteApi(token)) {
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
  if (shouldUseRemoteApi(token)) {
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
  if (shouldUseRemoteApi(token)) {
    throw new Error("Approval update via remote API is not configured.");
  }
  await updateLocalUserApprovalStatus(token, userId, approvalStatus);
}

export async function disableAdminUser(token: string, userId: string): Promise<void> {
  if (shouldUseRemoteApi(token)) {
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
  if (shouldUseRemoteApi(token)) {
    throw new Error("User status update via remote API is not configured.");
  }
  await setLocalUserStatus(token, userId, status);
}

export async function deleteAdminUser(token: string, userId: string): Promise<void> {
  if (shouldUseRemoteApi(token)) {
    throw new Error("User delete via remote API is not configured.");
  }
  await deleteLocalUser(token, userId);
}

export async function resetAdminUserPassword(
  token: string,
  userId: string,
  newPassword: string,
): Promise<void> {
  if (shouldUseRemoteApi(token)) {
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
  if (shouldUseRemoteApi(token)) {
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
