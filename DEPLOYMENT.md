# AgentPay Wallet - Deployment Guide

## Prerequisites

- Expo CLI installed: `npm install -g expo-cli`
- EAS CLI installed: `npm install -g eas-cli`
- Expo account created at https://expo.dev
- Apple Developer account (for iOS)
- Google Play Developer account (for Android)

---

## Step 1: Setup EAS Build

### 1.1 Install EAS CLI
```bash
npm install -g eas-cli
```

### 1.2 Login to Expo
```bash
eas login
```

### 1.3 Initialize EAS
```bash
eas build:configure
```

This creates `eas.json` in your project root.

---

## Step 2: Configure app.config.ts

Ensure the following are set correctly:

```typescript
const env = {
  appName: "AgentPay",           // Display name
  appSlug: "agentpay-mobile-app", // Unique identifier
  logoUrl: "",                    // S3 URL of app icon
  scheme: "manus20240115103045",  // Deep link scheme
  iosBundleId: "space.manus.agentpay.mobile.app",
  androidPackage: "space.manus.agentpay.mobile.app",
};
```

---

## Step 3: Build for Android (APK)

### 3.1 Build APK
```bash
eas build --platform android --type apk
```

### 3.2 Build AAB (Google Play)
```bash
eas build --platform android --type app-bundle
```

### 3.3 Monitor Build
```bash
# View build status
eas build:list

# Download APK when ready
eas build:download --id <BUILD_ID>
```

---

## Step 4: Build for iOS (IPA)

### 4.1 Build IPA
```bash
eas build --platform ios --type ipa
```

### 4.2 Build for App Store
```bash
eas build --platform ios --type app-store
```

### 4.3 Monitor Build
```bash
# View build status
eas build:list

# Download IPA when ready
eas build:download --id <BUILD_ID>
```

---

## Step 5: Configure Signing

### Android Signing
```bash
eas build:configure --platform android
```

Choose "Generate new keystore" for first build.

### iOS Signing
```bash
eas build:configure --platform ios
```

Choose "Automatic" for managed signing.

---

## Step 6: Submit to App Stores

### Android (Google Play)
```bash
eas submit --platform android --latest
```

### iOS (App Store)
```bash
eas submit --platform ios --latest
```

---

## Step 7: Testing Before Deployment

### 7.1 Run Tests
```bash
pnpm test
```

### 7.2 Build Locally (Simulator)
```bash
# iOS Simulator
eas build --platform ios --local

# Android Emulator
eas build --platform android --local
```

### 7.3 Test on Device
```bash
# Generate QR code for Expo Go
expo start

# Scan QR code on device with Expo Go app
```

---

## Step 8: Version Management

### Update Version
```bash
# In app.config.ts
version: "1.0.1"

# In package.json
"version": "1.0.1"
```

### Increment Build Number
```bash
# iOS
ios.buildNumber: "2"

# Android
android.versionCode: 2
```

---

## Environment Variables

### Create .env file
```bash
EXPO_PUBLIC_API_URL=https://api.agentpay.com
EXPO_PUBLIC_COINGECKO_API_KEY=your_api_key
EXPO_PUBLIC_QONTO_CLIENT_ID=your_client_id
EXPO_PUBLIC_QONTO_CLIENT_SECRET=your_client_secret
```

### Use in Code
```typescript
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
```

---

## Build Configuration (eas.json)

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildType": "simulator"
      }
    },
    "preview2": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildType": "simulator"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "buildType": "app-store"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccount": "path/to/service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456"
      }
    }
  }
}
```

---

## Troubleshooting

### Build Fails
1. Check logs: `eas build:view --id <BUILD_ID>`
2. Verify `app.config.ts` syntax
3. Ensure all dependencies are installed
4. Clear cache: `eas build:cache:delete`

### Signing Issues
1. Regenerate keystore: `eas build:configure --platform android`
2. Check Apple Developer account is active
3. Verify bundle IDs match

### Submission Fails
1. Check app store requirements
2. Verify version numbers are incremented
3. Ensure all required screenshots/descriptions

---

## Monitoring & Analytics

### View Build Logs
```bash
eas build:view --id <BUILD_ID>
```

### View Submission Status
```bash
eas submit:view --id <SUBMISSION_ID>
```

### Monitor App Performance
- Google Play Console: https://play.google.com/console
- App Store Connect: https://appstoreconnect.apple.com

---

## Rollback & Recovery

### Revert to Previous Build
```bash
eas build:list
# Find previous build ID
eas build:download --id <PREVIOUS_BUILD_ID>
```

### Rollback on App Store
- iOS: Use App Store Connect to select previous version
- Android: Use Google Play Console to rollback

---

## Continuous Deployment

### Setup GitHub Actions
Create `.github/workflows/build.yml`:

```yaml
name: EAS Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install -g eas-cli
      - run: eas build --platform android --type apk
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Rotate signing keys** - Periodically update keystores
3. **Enable 2FA** - On Apple and Google accounts
4. **Monitor permissions** - Review app permissions regularly
5. **Keep dependencies updated** - Run `npm audit fix`

---

## Release Checklist

- [ ] All tests passing
- [ ] Version number incremented
- [ ] Changelog updated
- [ ] Screenshots prepared
- [ ] App description updated
- [ ] Privacy policy link added
- [ ] Terms of service link added
- [ ] Build tested on device
- [ ] Signing certificates valid
- [ ] Environment variables configured
- [ ] Analytics configured
- [ ] Crash reporting enabled
- [ ] Push notifications tested
- [ ] Offline mode tested
- [ ] Performance optimized
