# Firestore Admin Upload Permission Fix

## Issue

The Admin page could parse an Excel file but Firestore rejected the upload with `Missing or insufficient permissions`.

## Cause

The Admin page previously used a browser-local session. That session identified the administrator to the app interface but did not create a Firebase Authentication identity. Firestore security rules therefore rejected the document write.

## Correction

- Admin and content-creator logins now also authenticate with Firebase Authentication before using Firestore write features.
- Firestore rules permit public read access to lottery results.
- Only the two configured administrator Firebase email accounts can write lottery results, advertisements, localization content, user administration data, and feedback administration data.
- Public visitors cannot write lottery results.

## Validation

- Verified the primary administrator Firebase Authentication credentials successfully.
- TypeScript validation passed.
- Expo web production export passed.
- Firestore rules compiled and were released to the `mks-myanmarlottery` Firebase project.

## Admin upload steps

1. Refresh the Admin page completely with `Ctrl + F5`.
2. Log out and log in again so Firebase Authentication is refreshed.
3. Select the Excel file, enter the correct draw number and draw date, then select the Firestore upload button.

No passwords, private keys, API keys, or tokens are stored in this record.
