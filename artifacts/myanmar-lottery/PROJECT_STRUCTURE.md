# Lottery Myanmar Finder - Project Structure

## 1) Main App Layout
- Framework: Expo + React Native Web (`expo-router`)
- App root: `artifacts/myanmar-lottery`
- Main routes:
  - Public Result: `app/(tabs)/index.tsx`
  - Public Checker: `app/(tabs)/search.tsx`
  - Public Advertisements: `app/(tabs)/ads.tsx`
  - Admin: `app/(tabs)/admin.tsx`
  - Redirect: `app/account.tsx -> /admin`

## 2) Core Layers
- UI components: `components/`
  - Example: `PrizeBadge.tsx`, `DrawSelector.tsx`, `AppAdBanner.tsx`
- State/context:
  - `context/LotteryContext.tsx` (results, ads, selected draw, sync status)
  - `context/AppLanguageContext.tsx` (MM/EN language state)
- Services:
  - `services/lotteryService.ts` (lottery CRUD/read/search + realtime subscribe)
  - `services/adService.ts` (ad CRUD/read/click tracking)
  - `services/userAdminService.ts` (admin/user auth + role/user management)
- Types:
  - `types/lottery.ts`, `types/ad.ts`, `types/user.ts`

## 3) Firebase Integration
- Firebase config: `config/firebase.ts`
- Active project (fixed): `mks-myanmarlottery`
- Firestore collections:
  - `lottery_results`
  - `app_ads`
  - `app_users`
  - `app_user_data`

## 4) Data Flow (Lottery)
1. `LotteryContext` loads initial data via `getAllResults()`.
2. `subscribeResults()` listens Firestore realtime updates (cross-device consistency).
3. Result/Checker UI only uses context state, so all devices update from same source.
4. Local override is now development-only (localhost only), not used on production host.

## 5) Publish/Visibility Rules
- Result page and Checker page show only published records.
- `publishStatus === "draft"` is hidden from public pages.
- Admin can publish a draft to make it visible immediately.

## 6) User Management Summary
- Admin login path: `/admin`
- Supported login identifier: `username / email / phone + password`
- User controls (admin):
  - Create user
  - Role change
  - Allow / Deny
  - Active / Disable
  - Delete
  - Password reset / temp password
- User self-service:
  - Change default/current password
  - Forgot password (identifier + registered email/phone verification)

## 7) Deploy
- Web hosting: Firebase Hosting
- Target site: `https://mks-myanmarlottery.web.app`
- Command:
  - `pnpm --dir artifacts/myanmar-lottery exec expo export --platform web`
  - `pnpm --dir artifacts/myanmar-lottery exec firebase deploy --only hosting:mks-myanmarlottery --project mks-myanmarlottery`

## 8) Important Note for Future Changes
- Do not switch fallback Firebase config to old project.
- Keep deploy scripts pointed to `mks-myanmarlottery`.
- If data appears different across devices, first verify:
  - Firestore project ID
  - `publishStatus` of target draw
  - Browser cache/service worker state
