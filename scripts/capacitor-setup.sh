#!/usr/bin/env sh
set -eu
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npm run build
npx cap add android
npx cap add ios
npx cap sync
printf '\nCapacitor est initialisé. Ouvrez ensuite Android Studio ou Xcode.\n'
