# Lottery Draw Selector

## Purpose

The result and checker pages now use one compact draw selector instead of displaying every lottery draw as separate cards.

## How it works

- The newest draw is selected and displayed by default.
- Use the dropdown to select any uploaded draw.
- Type an exact draw number to select it directly.
- Use the calendar to select the draw date.
- Dates are displayed in `DD-MM-YYYY` format. Firestore continues to store dates safely in `YYYY-MM-DD` format internally.

## Admin date entry

The Admin Excel upload and direct-edit form now uses the same calendar control and displays dates as `DD-MM-YYYY`.
