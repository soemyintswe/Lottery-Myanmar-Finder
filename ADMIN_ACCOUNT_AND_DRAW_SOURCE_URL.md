# Account Controls and Official Draw Source URL

## Purpose

This update makes account access visible in every main page header and lets an administrator store the official Aung Bar Lay result page for each lottery draw.

## Account controls

- When no user session exists, the top-right area displays a **Login** button. It opens `/admin`.
- When signed in, the top-right area displays the profile badge with initials and the user role.
- A **Logout** button appears beside the profile badge. Selecting it clears the app session and Firebase authentication session.
- The Admin dashboard also displays the same profile badge and Logout button at the top of the page, so Logout does not remain below the Excel form.

## Saving an official result URL

1. Sign in at `/admin` with an Admin or Content Creator account.
2. Enter the draw number and draw date.
3. Paste the official Aung Bar Lay result-page link in **အောင်ဘာလေ တရားဝင် ထီပေါက်စဉ် URL**.
4. Select the Excel file and choose **Firestore သို့တင်မည်**.
5. The URL is saved as `sourceUrl` in the relevant `lottery_results` draw document and is shown through the existing Source Link on the result page.

## Notes

- The URL field is optional to retain compatibility with previous Excel uploads.
- A supplied URL must begin with `http://` or `https://`.
- To add an official URL to an existing draw, upload that draw's Excel file again with the same draw number and the URL. The existing draw document is updated.
