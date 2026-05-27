# Lottery Myanmar Finder - Project Process Log

This file records the working process for this project so future chats can continue efficiently.

## Standard Change Workflow

1. Confirm the request and identify the affected area:
   - lottery data
   - advertisements
   - user/auth/admin
   - deploy/mobile/responsive
2. Read the relevant source files first
3. Check whether the behavior uses:
   - remote API
   - Firestore
   - local browser fallback/cache
4. Make the code change
5. Run:
   - `pnpm --dir artifacts/myanmar-lottery run typecheck`
6. Build web:
   - `pnpm --dir artifacts/myanmar-lottery exec expo export --platform web`
7. Deploy:
   - `pnpm --dir artifacts/myanmar-lottery exec firebase deploy --only hosting --project mks-myanmarlottery --non-interactive`
8. Report the live URL and what to verify

## Operational Rules

- Prefer fixing the real data flow instead of masking it with UI-only changes
- If the action is destructive or high-impact, make sure the UI shows explicit feedback
- When a save/delete/edit can fail remotely, do not silently claim success
- If fallback logic is involved, test both fresh login and refresh behavior

## Deployment Notes

- Production site: `https://mks-myanmarlottery.web.app`
- The web app should remain deployed to the `mks-myanmarlottery` Firebase project
- After significant admin changes, ask the user to do a hard refresh if browser cache could interfere

## Areas Changed Across Recent Chats

### Admin/User Management

- Added admin login through `/admin`
- Added user-management UI tabs
- Added create user, role change, status controls, password actions
- Added explicit validation and clearer error messages
- Added fallback/recovery behavior during auth issues

### Advertisements

- Added ad management UI in admin panel
- Added sample ad seeding
- Hardened add/edit/delete/toggle flows to better reflect actual remote success/failure
- Added merge logic so local unsynced ad state is less likely to be overwritten on refresh

### Lottery Data

- Lottery data editor and publish flow were expanded
- Public pages are intended to show only published results
- Admin publish status affects visibility

### Mobile And UX

- Multiple responsive fixes were requested
- User strongly values direct usability on both desktop and mobile
- Admin actions should feel immediate, clear, and trustworthy

### Firestore + Auth UI

- Firestore had to be created/enabled in Firebase Console for `mks-myanmarlottery`.
- Added shared auth context so login persists across `/admin`, `/`, `/search`, `/ads`.
- Added user badge in headers and restored role-based edit buttons.
- Auth persistence uses `sessionStorage` so login survives refresh/back within the same tab, but clears when the tab/window is closed (no `beforeunload` logout, because it can trigger on back/forward full navigations in some browsers).

## Known Follow-Up Work

- Auth should eventually be simplified to a single trustworthy source of truth
- User records should be audited so recovery users, cached users, and remote users are not fighting each other
- Ads sample-content lifecycle may need one-click cleanup tools if the user keeps reseeding during testing

## Notes For Future Assistants

- Read the user request carefully for whether the expectation is:
  - public behavior
  - admin-only behavior
  - persistent cross-device data
- The user often checks the deployed site immediately, so incomplete local-only fixes will cause confusion
- When behavior depends on persistence, mention whether it is:
  - remote-persistent
  - local-cache only
  - fallback/recovery mode
