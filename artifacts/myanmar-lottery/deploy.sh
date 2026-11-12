#!/bin/bash
set -e

echo "🔨 Building Expo web..."
cd "$(dirname "$0")"
pnpm exec expo export --platform web

echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting:mkslottery --token "$FIREBASE_TOKEN" --project mks-myanmarlottery

echo "✅ Deployed! Visit: https://mkslottery.web.app"
