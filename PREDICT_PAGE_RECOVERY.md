# Prediction Page Recovery Record

## Purpose

Restore the Myanmar lottery prediction page at `/predict` after it was removed during the earlier Git recovery.

## Restored features

- Draw selection and prediction analysis
- Next-draw probability summary
- Lucky wheel with an alphabet and full ticket-number result
- Birthday and weekday lucky-number suggestions
- Most frequent alphabets and numbers
- Popular digits, first two digits, and last two digits
- Prediction-card image export on the web

## Files restored

- `artifacts/myanmar-lottery/app/(tabs)/predict.tsx`
- `artifacts/myanmar-lottery/components/DatePickerField.tsx`
- `artifacts/myanmar-lottery/services/predictionService.ts`
- `artifacts/myanmar-lottery/services/luckyService.ts`
- `artifacts/myanmar-lottery/utils/date.ts`

## Supporting packages

The restored screen requires the following packages, which are declared in `artifacts/myanmar-lottery/package.json`:

- `@react-native-community/datetimepicker` for selecting a birthday
- `html2canvas` for exporting the prediction card as an image on web

## Validation performed

1. Ran TypeScript validation with `pnpm --dir artifacts/myanmar-lottery run typecheck`.
2. Ran the Expo web export for the production hosting build.
3. Kept the existing Firebase project and hosting mapping unchanged:
   - Firebase project: `mks-myanmarlottery`
   - Hosting site: `mkslottery`

## Deployment procedure

After validation, deploy only the generated hosting build using:

```powershell
pnpm --dir artifacts/myanmar-lottery exec firebase deploy --only hosting:mkslottery --project mks-myanmarlottery --non-interactive
```

No passwords, API keys, service-account credentials, or private data are recorded in this document.
