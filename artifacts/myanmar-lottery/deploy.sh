#!/bin/bash
set -e

echo "🔨 Building Expo web..."
cd "$(dirname "$0")"
pnpm exec expo export --platform web

echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting --token "$FIREBASE_TOKEN" --project myanmar-lottery-app-7dc07

echo "✅ Deployed! Visit: https://myanmar-lottery-app-7dc07.web.app"
