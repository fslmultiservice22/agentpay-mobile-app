# AgentPay Wallet - Build & Deploy Guide

## Prerequisites

Before building for Play Store, ensure you have:

1. **Expo Account:** Create at https://expo.dev
2. **EAS CLI:** `npm install -g eas-cli`
3. **Android Keystore:** For signing APK/AAB
4. **Google Play Developer Account:** https://play.google.com/console
5. **Service Account Key:** From Google Cloud Console

## Step 1: Setup EAS CLI

```bash
# Login to Expo
eas login

# Initialize EAS for your project
eas build:configure
```

## Step 2: Create Android Keystore

```bash
# Generate keystore (first time only)
eas credentials -p android

# Follow prompts to:
# 1. Create new keystore
# 2. Set keystore password
# 3. Set key alias and password
```

## Step 3: Build for Play Store

### Option A: Build APK (for testing)

```bash
# Build APK for preview
eas build -p android --profile preview

# Download APK from EAS dashboard
# Install on device: adb install app-release.apk
```

### Option B: Build AAB (for Play Store)

```bash
# Build Android App Bundle for production
eas build -p android --profile production

# This creates an AAB file ready for Play Store
```

## Step 4: Setup Google Play Console

1. Go to https://play.google.com/console
2. Create new app: "AgentPay Wallet"
3. Fill in app details:
   - **App name:** AgentPay Wallet
   - **Default language:** English
   - **App type:** Finance
   - **Category:** Finance
   - **Content rating:** Complete questionnaire
   - **Privacy policy:** Link to PRIVACY_POLICY.md
   - **Terms of service:** Link to TERMS_OF_SERVICE.md

## Step 5: Create Service Account

1. Go to Google Cloud Console
2. Create new project: "AgentPay"
3. Enable Google Play Android Developer API
4. Create service account:
   - Go to Service Accounts
   - Create new service account
   - Generate JSON key
5. Grant permissions:
   - Go to Google Play Console
   - Settings → API access
   - Link service account
   - Grant "Admin" role

## Step 6: Configure EAS for Submission

```bash
# Copy service account key
cp ~/Downloads/service-account-key.json ~/.android/service-account-key.json

# Update eas.json with correct path
```

## Step 7: Submit to Play Store

```bash
# Submit AAB to Play Store
eas submit -p android --latest

# Follow prompts to:
# 1. Select build
# 2. Confirm submission
# 3. Review submission status
```

## Step 8: Manage Release

In Google Play Console:

1. **Create Release:**
   - Go to "Release" → "Production"
   - Create new release
   - Add AAB file
   - Add release notes
   - Review app details

2. **Complete Store Listing:**
   - Add screenshots (5-8 per language)
   - Add app description
   - Add feature graphics
   - Add icon and promo graphics

3. **Set Content Rating:**
   - Complete content rating questionnaire
   - Receive rating certificate

4. **Review Policies:**
   - Ensure compliance with Play Store policies
   - Review data safety section
   - Confirm privacy policy

5. **Submit for Review:**
   - Click "Submit for review"
   - Wait for Google Play review (typically 24-48 hours)

6. **Publish:**
   - Once approved, click "Publish"
   - Select rollout percentage (start with 10%, increase gradually)

## Step 9: Monitor After Launch

```bash
# View app statistics
eas analytics

# Monitor crashes
eas crashes

# Check user reviews
# Go to Play Console → Reviews

# Monitor ratings
# Go to Play Console → Ratings
```

## Automatic Updates

Users can enable automatic updates:

1. **In-App Updates:**
   - Check for updates on app launch
   - Notify users of new versions
   - Provide download/install buttons

2. **Play Store Updates:**
   - Enable auto-update in Play Store settings
   - Gradual rollout reduces risk

## Troubleshooting

### Build Fails

```bash
# Clean build
eas build -p android --profile production --clear-cache

# Check logs
eas build:view
```

### Submission Fails

1. Check app signing configuration
2. Verify service account permissions
3. Ensure AAB file is valid
4. Review Play Store policies

### App Crashes

1. Check crash reports in Play Console
2. Review logs: `adb logcat`
3. Test on multiple devices
4. Use Firebase Crashlytics for monitoring

## Version Management

### Incrementing Version

Update `app.config.ts`:

```typescript
export default {
  version: "1.1.0",  // Update this
  // ...
}
```

Then rebuild and submit.

### Release Notes

Create release notes for each version:

```markdown
## Version 1.1.0 (May 24, 2026)

### New Features
- Telegram bot integration
- OTA update system
- Enhanced security

### Bug Fixes
- Fixed portfolio display
- Improved performance

### Security
- Added biometric authentication
- Implemented encryption

### Known Issues
- None
```

## Compliance Checklist

Before submitting to Play Store:

- [ ] Privacy Policy linked and compliant with GDPR
- [ ] Terms of Service linked
- [ ] Data safety section completed
- [ ] App permissions justified
- [ ] No prohibited content
- [ ] No malware or security issues
- [ ] Complies with Play Store policies
- [ ] Screenshots and descriptions accurate
- [ ] Contact email provided
- [ ] Support URL provided

## Post-Launch

### Monitor Metrics

- **Installs:** Track growth
- **Ratings:** Monitor user satisfaction
- **Crashes:** Fix critical issues
- **Reviews:** Respond to user feedback
- **Revenue:** Track in-app purchases (if applicable)

### Update Strategy

- **Security Updates:** Deploy immediately
- **Bug Fixes:** Deploy within 1-2 weeks
- **Features:** Plan quarterly releases
- **Gradual Rollout:** Start at 10%, increase to 100%

### Support

- **Email:** support@agentpay.app
- **In-App Support:** Include support button
- **FAQ:** Maintain FAQ page
- **Community:** Consider Discord/Telegram community

---

**Last Updated:** May 23, 2026  
**Version:** 1.0

For questions, contact: build@agentpay.app
