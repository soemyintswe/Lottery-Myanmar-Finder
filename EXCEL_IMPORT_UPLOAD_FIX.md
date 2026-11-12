# Excel Upload Fix Record

## Issue

The Admin page could select an Excel file but failed during parsing with:

`Cannot read properties of undefined (reading 'read')`

## Cause and correction

The web build loaded the Excel library through a default import. In the browser bundle this could produce an undefined library object. The importer now uses the library namespace import, so its `read` and worksheet conversion functions are available in the web build.

## Validation

- TypeScript validation passed.
- Expo web production export passed.

## Upload requirements

- Select an `.xlsx` or `.xls` file.
- Set the intended draw number and draw date on the Admin page.
- Keep these Excel headers unchanged: `ဆုအမျိုးအစား`, `အက္ခရာ`, `ထီနံပါတ်`, `ကံထူးရှင်အရေအတွက်`, `မှတ်ချက်`.

No credentials, passwords, API keys, or personal data are recorded here.
