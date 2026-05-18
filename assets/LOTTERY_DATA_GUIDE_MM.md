# Myanmar Lottery Excel Data Guide

ဒီ project မှာ ထီဒေတာအတွက် **Excel file ကို source of truth** အဖြစ်သုံးပါတယ်။

## 1. Excel ခေါင်းစဉ် format (မဖြစ်မနေ)

Excel sheet header row (row 1) ကို အောက်ပါခေါင်းစဉ်အတိုင်း တိတိကျကျသုံးပါ။

1. `ဆုအမျိုးအစား`
2. `အက္ခရာ`
3. `ထီနံပါတ်`
4. `ကံထူးရှင်အရေအတွက်`
5. `မှတ်ချက်`

Template file:
- `C:\PythonProject\Lottery-Myanmar-Finder\assets\Lottery_Draw_Template.xlsx`

## 2. Data ထည့်ပုံ rule

1. `အက္ခရာ` က တစ်လုံးပဲ ထည့်ပါ (ဥပမာ `က`, `ခ`, `ဂ` ...)
2. `ထီနံပါတ်` ကို digit only ထည့်ပါ (leading zero ရှိနိုင်ရင် text အဖြစ်သိမ်းပါ)
3. `မှတ်ချက်` ထဲမှာ `အက္ခရာနှင့်ရှေ့ဂဏန်း(၅)လုံးတူ` လို pattern ပါရင် match length ကို parser က auto ယူမယ်
4. ၆ လုံးဆု/၅ လုံးဆု/၄ လုံးဆု/... အားလုံး row တစ်ကြောင်းစီပြုစုပါ

## 3. Import command (Excel → App JSON)

Repo root မှာ run:

```powershell
pnpm --filter @workspace/myanmar-lottery run import:draw -- "C:\PythonProject\Lottery-Myanmar-Finder\assets\Myanmar_Lottery86_2026.xlsx" 86 2026-05-01 "C:\PythonProject\Lottery-Myanmar-Finder\artifacts\myanmar-lottery\assets\data\draw-86.json"
```

ဒီ command ပြီးရင် output:
- `C:\PythonProject\Lottery-Myanmar-Finder\artifacts\myanmar-lottery\assets\data\draw-86.json`

## 4. App build/deploy

```powershell
pnpm --filter @workspace/myanmar-lottery exec expo export --platform web
cd C:\PythonProject\Lottery-Myanmar-Finder\artifacts\myanmar-lottery
pnpm exec firebase deploy --only hosting --project mks-myanmarlottery --non-interactive
```

## 5. Notes

1. PDF/JPEG ကို manual reference အတွက်ပဲ သုံးပါ
2. Checker မှာ အက္ခရာ + ရှေ့ဂဏန်း(၅/၄/၃/၂/၁) rule အားလုံးကို JSON import data နဲ့တိုက်ပါတယ်
3. Draw အသစ်တစ်ခုထည့်တိုင်း template အတိုင်း Excel ပြုစုပြီး import command ပြန် run လုပ်ရုံနဲ့ update လုပ်နိုင်ပါတယ်
