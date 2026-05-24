# AgentPay Wallet - Mobile UI/UX Design System

## Design Philosophy

AgentPay Wallet follows **Apple Human Interface Guidelines (HIG)** to deliver a first-party iOS app experience. The design prioritizes **one-handed usage** on mobile portrait orientation (9:16) with clean, minimal aesthetics and intuitive interactions.

---

## Screen Architecture

### Core Screens
1. **Splash Screen** - Logo and loading animation
2. **Onboarding** - Welcome and feature explanation
3. **Wallet Connection** - MetaMask, WalletConnect, Import seed
4. **Home Dashboard** - Portfolio overview, quick actions
5. **Portfolio Dashboard** - Real-time charts, holdings, performance
6. **Transaction History** - Chronological list with filters
7. **Recurring Payments** - Scheduled transfers management
8. **Send Payment** - Recipient, amount, confirmation
9. **Receive Payment** - QR code, address sharing
10. **Settings** - Account, notifications, security

### Tab Navigation
- Home - Portfolio overview
- Portfolio - Charts and analytics
- Transactions - History and export
- Recurring - Scheduled payments
- Settings - Configuration

---

## Color Palette

### Primary Colors
| Color | Light | Dark | Usage |
|-------|-------|------|-------|
| Primary | #0a7ea4 | #0a7ea4 | Buttons, links, active states |
| Background | #ffffff | #151718 | Screen backgrounds |
| Surface | #f5f5f5 | #1e2022 | Cards, elevated surfaces |
| Foreground | #11181C | #ECEDEE | Primary text |
| Muted | #687076 | #9BA1A6 | Secondary text |

### Semantic Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Success | #22C55E | Completed transactions, positive changes |
| Warning | #F59E0B | Pending transactions, alerts |
| Error | #EF4444 | Failed transactions, errors |
| Border | #E5E7EB / #334155 | Dividers, borders |

---

## Key User Flows

### Flow 1: View Portfolio & Monitor Prices
1. User opens app → Home Screen
2. Taps Portfolio Dashboard tab
3. Views price chart with time range selector
4. Taps holdings list for detailed breakdown
5. Taps individual holding for details

### Flow 2: Send Money to Bank Account
1. User taps Send button on Home
2. Enters recipient IBAN (validated)
3. Enters amount and description
4. Confirms transaction details
5. Receives confirmation with transaction ID

### Flow 3: Schedule Recurring Payment
1. Navigate to Recurring Payments tab
2. Tap Create Payment button
3. Fill recipient info (IBAN, name)
4. Select frequency (daily/weekly/monthly)
5. Confirm and payment scheduled
6. Receive confirmation notification

### Flow 4: Export Transaction History
1. Navigate to Transactions tab
2. Apply filters (date range, type)
3. Tap Export button
4. Select format (CSV/JSON/PDF)
5. File downloaded to device
6. Option to share or open

### Flow 5: Setup Security & Backup
1. Navigate to Settings → Security
2. Tap Backup Seed Phrase
3. Complete security verification
4. Display 12/24 word seed phrase
5. User writes down or exports securely
6. Confirm backup complete

---

## Interaction Design

### Press Feedback
| Element | Feedback | Implementation |
|---------|----------|----------------|
| Primary Buttons | Scale 0.97 + haptic | scale: 0.97 + impactAsync(Light) |
| List Items | Opacity 0.7 | opacity: 0.7 on press |
| Icons | Opacity 0.6 | opacity: 0.6 on press |
| Cards | Subtle shadow lift | Shadow increase on press |

### Haptic Feedback
- Button tap → Light impact
- Toggle/Switch → Medium impact
- Success → Success notification
- Error → Error notification

### Animations
- Transitions → 200-300ms duration
- Scale changes → 0.95-0.98 range
- Fade in/out → 150-250ms
- No bouncy springs → Prefer timing curves

---

## Accessibility

### Text Sizing
- Titles → 24-28pt (bold)
- Subtitles → 16-18pt (semibold)
- Body → 14-16pt (regular)
- Captions → 12-14pt (regular)
- Line height → 1.2-1.5× font size

### Touch Targets
- Minimum → 44×44pt (iOS standard)
- Buttons → 48×48pt preferred
- Spacing → 16pt between interactive elements

### Color Contrast
- Text on background → 4.5:1 minimum (WCAG AA)
- UI elements → 3:1 minimum
- Dark mode → Same ratios maintained

---

## Component Library

### Buttons
- Primary → Full width, tinted background
- Secondary → Outlined, no background
- Tertiary → Text only, minimal styling
- Disabled → Reduced opacity

### Cards
- Standard → Rounded corners (12pt), shadow, padding 16pt
- Elevated → Increased shadow depth
- Pressable → Opacity feedback on press

### Lists
- Dividers → 1pt border, muted color
- Spacing → 12pt vertical padding per item
- Swipe actions → Delete, archive on long press

### Forms
- Text Input → Border on focus, clear button
- Validation → Real-time feedback, error color
- Keyboard → Numeric for amounts, email for emails

---

## Navigation

### Tab Bar
- 5 tabs → Home, Portfolio, Transactions, Recurring, Settings
- Icons → SF Symbols (iOS native)
- Labels → Visible always
- Spacing → Equal distribution

### Header
- Title → Left-aligned, bold
- Back button → Left side, chevron icon
- Actions → Right-aligned (search, menu)

### Modals & Sheets
- Half-sheet → For secondary actions
- Full-screen → For complex flows
- Dismiss → Swipe down or X button

---

## Performance Optimization

### List Rendering
- FlatList → Always for scrollable lists
- Virtualization → Enabled for 50+ items
- Key prop → Unique, stable keys

### Image Loading
- Placeholder → Blur hash or skeleton
- Lazy loading → Images below fold
- Caching → Expo Image with cache headers

### State Management
- Context + useReducer → For app state
- AsyncStorage → For persistence
- TanStack Query → For server data

---

## Delivery Checklist

- [ ] All buttons and links work
- [ ] Core user flows tested end-to-end
- [ ] Responsive on all device sizes
- [ ] Dark mode tested and working
- [ ] Accessibility tested (VoiceOver, text scaling)
- [ ] Performance optimized (< 3s load time)
- [ ] No console errors or warnings
- [ ] Haptics and animations working
- [ ] Offline mode graceful
- [ ] Error states handled with user-friendly messages
