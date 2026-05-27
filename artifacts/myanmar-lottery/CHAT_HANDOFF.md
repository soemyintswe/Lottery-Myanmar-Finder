# Lottery Myanmar Finder - Chat Handoff

This file exists so future chats can resume work without losing context. Read this before changing auth, user management, admin flows, or deployment.

## Project Identity

- Live project: `https://mks-myanmarlottery.web.app`
- App root: `artifacts/myanmar-lottery`
- Main admin route: `/admin`
- Public routes should stay focused on:
  - `Result`
  - `Checker`
  - `Advertisements`

## What The User Wants Long-Term

- Admin panel for lottery data, advertisements, and user management
- Internal user and staff login from `/admin`
- Clear role-based management:
  - `admin`
  - `content_creator`
  - `user`
- Reliable online publish/deploy after fixes
- Strong visual confirmation for save, edit, delete, publish, and login flows
- New chats should continue from written records instead of rediscovering everything

## Summary Of Prior Chat Themes

### Chat Theme 1: Core Admin/User System

- Role-based user management similar to common website admin panels
- Login by `username / email / phone + password`
- Password reset and admin control over other users
- Admin visibility into user-submitted signup data

### Chat Theme 2: UI Separation And Route Cleanup

- Admin panel split into tabs:
  - `Lottery Data`
  - `Advertisements`
  - `User Management`
- Public navigation simplified
- Admin login and public account experience repeatedly cleaned up
- Mobile-view overflow and usability issues addressed

### Chat Theme 3: Data Consistency, Login Recovery, Ads CRUD

- Repeated issues caused by mixed data sources and fallback logic
- Login sometimes hit Firestore fallback, API fallback, or local recovery mode
- Some users appeared to disappear after refresh
- Ads CRUD needed clearer confirmation and rollback behavior
- Project-memory documents were requested so future chats stay connected

### Chat Theme 4: Firestore Enablement + Shared Login UI

- Firestore database was not created/enabled initially, causing permission errors and missing data.
- Temporary Firestore rules were applied during setup so the app could read/write.
- Added shared auth state across tabs/pages via `AuthContext`.
- Added user profile badge (initials + label + role) to public pages and restored role-based edit buttons.
- Multiple mobile header/layout fixes were required to keep language/profile/refresh visible.
- Auth persistence was switched to `sessionStorage` (instead of `localStorage`) to avoid unintended logout on browser back/forward in some cases, while still auto-clearing on tab/window close.

## Known Technical Risk Areas

### 1) Authentication Is Historically Fragile

- `services/userAdminService.ts` contains layered fallback logic
- There has been tension between:
  - remote API auth
  - Firestore-local auth
  - browser local-cache recovery
- Before changing login behavior, test:
  - admin login
  - created user login
  - password reset
  - refresh persistence
  - logout
  - browser back/forward navigation does not log out

### 2) User Records May Exist In More Than One Historical Source

- Some prior work used API-side users
- Some recovery work added browser-local persistence and local seeded recovery users
- If users seem missing, do not assume they are deleted; confirm which source is being read

### 3) Ads CRUD Was Recently Hardened

- `delete / add / edit / active toggle` now tries to reflect real remote success/failure better
- If remote sync fails, UI should not silently pretend success
- Re-test ads after any changes to context refresh or ad service merge logic

## Current User-Facing Expectations

- If delete is confirmed and actually succeeds, the item should disappear and stay gone
- If delete fails remotely, the UI should restore the item and show an error
- If add/edit succeeds only locally, the UI should say so clearly
- User creation should validate invalid username, duplicate username/email/phone, and wrong password/login cases with explicit messages

## Files That Matter Most

- Admin screen:
  - `app/(tabs)/admin.tsx`
- Auth and user-management service:
  - `services/userAdminService.ts`
- Ad CRUD logic:
  - `services/adService.ts`
- Shared app loading/context:
  - `context/LotteryContext.tsx`
- Firebase config:
  - `config/firebase.ts`

## Recommended Resume Workflow For Future Chats

1. Read `PROJECT_STRUCTURE.md`
2. Read this file
3. Read `PROJECT_PROCESS_LOG.md`
4. Inspect the exact service and UI files related to the new request
5. Typecheck
6. Export web build
7. Deploy to Firebase
8. Tell the user what changed and what still needs validation

## Important Safety Guidance

- Do not casually remove fallback code unless replacement behavior is verified
- Do not switch hosting or Firebase project away from `mks-myanmarlottery`
- Do not assume one successful local test means cross-device consistency is solved
- When the user asks for online verification, deploy the actual fix before closing
