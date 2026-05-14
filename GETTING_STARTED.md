# 🚀 Getting Started with AgentPay Wallet

Guida rapida per iniziare lo sviluppo di AgentPay Wallet in 5 minuti!

---

## ⚡ Quick 5-Step Setup

### Step 1: Clone & Install
```bash
git clone https://github.com/fslmultiservice22/agentpay-mobile-app.git
cd agentpay-mobile-app
pnpm install
```

### Step 2: Setup Environment
```bash
# Copy example env
cp .env.example .env.local

# Configure variables (optional for local dev):
# EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
# DATABASE_URL=mysql://user:pass@localhost/agentpay
```

### Step 3: Start Dev Server
```bash
# Web + Backend
pnpm dev

# Or mobile
pnpm ios    # or pnpm android
```

### Step 4: Open App
- **Web**: http://localhost:8081
- **Mobile**: Scan QR code with Expo Go app

### Step 5: Start Coding!
✅ You're ready to build! 🎉

---

## 📁 Project Structure (Essential)

```
agentpay-mobile-app/
│
├── app/                    # 📱 Screens
│   ├── (tabs)/index.tsx   # Home screen
│   └── oauth/callback.tsx # OAuth handler
│
├── components/             # 🎨 Reusable UI
│   ├── screen-container.tsx
│   └── ui/icon-symbol.tsx
│
├── server/                 # 🔌 Backend API
│   └── routers.ts         # tRPC endpoints
│
├── drizzle/                # 💾 Database
│   └── schema.ts          # Tables definition
│
├── constants/              # ⚙️ App Config
│   └── theme.ts           # Colors & typography
│
├── hooks/                  # 🪝 Custom Hooks
│   ├── use-colors.ts      # Theme colors
│   └── use-auth.ts        # Authentication
│
└── lib/                    # 🔧 Utilities
    └── trpc.ts            # API client
```

---

## 🎨 First Task: Polish Home Screen

**Goal**: Make the Home Screen look pixel-perfect! 

### Files to Edit
```typescript
// app/(tabs)/index.tsx
export default function HomeScreen() {
  // TODO: Import useColors for theme-aware styling
  // TODO: Add real saldo display instead of static "1,250.50"
  // TODO: Make buttons actual components with onPress handlers
  // TODO: Add loading state and error handling
  // TODO: Implement pull-to-refresh
}
```

### What to Do
```typescript
import { useColors } from "@/hooks/use-colors";

export default function HomeScreen() {
  const colors = useColors(); // ✨ Get theme colors
  
  // Style buttons with theme colors
  const buttonStyle = {
    backgroundColor: colors.primary,
    borderColor: colors.border,
  };
  
  // Add loading states
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      {/* Add your improvements here */}
    </View>
  );
}
```

---

## 🔌 Second Task: First API Endpoint

**Goal**: Create your first tRPC endpoint!

### Step 1: Add Backend Query
```typescript
// server/routers.ts
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  wallet: router({
    getBalance: publicProcedure.query(async () => {
      // TODO: Return real balance from blockchain
      return {
        usd1: "1,250.50",
        bnb: "0.85",
      };
    }),
  }),
});
```

### Step 2: Use in Frontend
```typescript
// app/(tabs)/index.tsx
import { trpc } from "@/lib/trpc";

export default function HomeScreen() {
  const { data: balance, isLoading } = trpc.wallet.getBalance.useQuery();
  
  return (
    <Text>
      {isLoading ? "Loading..." : `USD1 ${balance?.usd1}`}
    </Text>
  );
}
```

---

## 💾 Third Task: Database Setup (Optional)

**Goal**: Add wallet table to database!

### Step 1: Define Schema
```typescript
// drizzle/schema.ts
import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";

export const wallets = mysqlTable("wallets", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  address: varchar("address", { length: 42 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});
```

### Step 2: Run Migration
```bash
pnpm db:push
```

### Step 3: Add Query Helper
```typescript
// server/db.ts
export async function getUserWallet(userId: number) {
  const db = await getDb();
  return db.select().from(wallets).where(eq(wallets.userId, userId));
}
```

---

## 🧪 Fourth Task: Write First Test

**Goal**: Test your endpoint!

### Create Test File
```typescript
// tests/wallet.test.ts
import { describe, it, expect } from "vitest";
import { appRouter } from "../server/routers";

describe("Wallet API", () => {
  it("should return user balance", async () => {
    const caller = appRouter.createCaller({});
    const balance = await caller.wallet.getBalance();
    
    expect(balance).toBeDefined();
    expect(balance.usd1).toBeTruthy();
    expect(balance.bnb).toBeTruthy();
  });
});
```

### Run Test
```bash
pnpm test -- wallet.test.ts --watch
```

---

## 🔐 Fifth Task: OAuth Integration

**Goal**: Setup login!

### Step 1: Create Login Screen
```typescript
// app/login.tsx (new file)
import * as WebBrowser from "expo-web-browser";

export default function LoginScreen() {
  const handleLogin = async () => {
    // Open OAuth portal
    const result = await WebBrowser.openAuthSessionAsync(
      "YOUR_OAUTH_URL",
      "manus20260512140915://oauth/callback"
    );
    
    // Handle result
    if (result.type === "success") {
      // Extract token and save
    }
  };
  
  return (
    <Button title="Login" onPress={handleLogin} />
  );
}
```

### Step 2: Conditional Rendering
```typescript
// app/(tabs)/index.tsx
import { useAuth } from "@/hooks/use-auth";

export default function HomeScreen() {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  
  return <DashboardView />;
}
```

---

## 🏗️ Web Build for Production

### Build Server
```bash
pnpm build
```

### Run Production
```bash
NODE_ENV=production node dist/index.js
```

---

## 📱 Mobile Build

### iOS
```bash
# Simulator
pnpm ios

# Device
eas build --platform ios --device
```

### Android
```bash
# Emulator
pnpm android

# Device
eas build --platform android --device
```

---

## 🐛 Debug Tips

### React DevTools
```bash
# Inspect components in web
# Use Chrome DevTools for web debugging
```

### Console Logging
```typescript
console.log("[MODULE] Message", data);  // Good practice
console.log(data);                      // Too vague
```

### Network Debugging
```typescript
// Check tRPC requests in Network tab
// Use React Query DevTools
```

---

## 📚 Next Steps

After completing these 5 tasks:

1. **Implement Send Payment**
   - Create Send screen
   - Integrate ethers.js
   - Add transaction signing

2. **Add Transaction History**
   - Fetch blockchain transactions
   - Display in list
   - Add filters

3. **Setup CI/CD**
   - GitHub Actions workflow
   - Automated testing
   - Auto deployment

4. **Mobile Testing**
   - Test on real devices
   - Fix platform-specific issues
   - Optimize performance

---

## ✅ Checklist

- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Dev server running
- [ ] Home screen improved
- [ ] First API endpoint created
- [ ] Database schema added
- [ ] Test written
- [ ] OAuth setup started
- [ ] Ready for main development!

---

## 🚨 Common Issues

### "pnpm: command not found"
```bash
npm install -g pnpm
```

### "DATABASE_URL not set"
```bash
# Development mode doesn't require it
# Add to .env.local only if using backend DB
```

### "Cannot find module"
```bash
# Clear cache and reinstall
rm -rf node_modules .pnpm-store
pnpm install
```

### "Port 8081 already in use"
```bash
# Kill process on port 8081
lsof -i :8081 | kill -9 $(awk 'NR==2 {print $2}')
```

---

## 📞 Need Help?

- 📖 Read [README.md](./README.md) - Full documentation
- 🤝 Check [CONTRIBUTING.md](./CONTRIBUTING.md) - Developer guide
- 🎓 Study [server/README.md](./server/README.md) - Backend guide
- 💬 Open GitHub Discussion
- 🐞 Report Issues

---

## 🎉 You're Ready!

**Congratulations!** You now understand:
- ✅ Project structure
- ✅ Frontend development
- ✅ Backend API creation
- ✅ Database integration
- ✅ Testing
- ✅ Authentication

**Now build something amazing! 🚀**

---

**Questions? Issues? Feature ideas? Let's collaborate!**

Happy coding! 💻✨
