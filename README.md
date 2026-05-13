# 🏦 AgentPay Wallet - Mobile App

[![Expo](https://img.shields.io/badge/Expo-54.0.29-black?style=flat-square&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61dafb?style=flat-square&logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**AgentPay Wallet** è un'applicazione mobile innovativa per la gestione di pagamenti tramite agenti AI. Permette agli utenti di gestire un wallet self-custodial su blockchain EVM, impostare policy di spesa e approvare transazioni tramite agenti intelligenti.

---

## 📱 Caratteristiche Principali

### 🏠 Dashboard
- Visualizzazione saldi USD1 e BNB in tempo reale
- Ultimi 5 trasferimenti recenti
- Pulsanti azione rapida (Send, Receive, History)
- Pull-to-refresh per aggiornamento

### 💳 Gestione Wallet
- **Creazione** nuovo wallet con seed phrase
- **Importazione** da seed phrase (12/24 parole)
- **Backup** seed phrase protetto
- **Password protection** multi-layer

### 📤 Invia Pagamenti
- Invio a indirizzi specifici
- Supporto multi-token (USD1, BNB, etc.)
- Selezione rete (BSC, Ethereum)
- Stima gas fee in tempo reale
- Firma locale transazioni

### 📥 Ricevi Fondi
- Indirizzo wallet copiabile
- QR code generato
- Istruzioni di finanziamento

### 📊 Cronologia Transazioni
- Lista completa transazioni
- Filtro sent/received
- Ricerca per indirizzo
- Link Block Explorer

### ⚙️ Policy Management
- Limite giornaliero/settimanale
- Soglia approvazione manuale
- Whitelist/Blacklist indirizzi
- Visualizzazione spesa vs limite

### ✅ Approvazioni Manuali
- Lista approvazioni in sospeso
- Approve/Reject transazioni
- Notifiche di completamento

---

## 🛠️ Tech Stack

### Frontend
```
React Native 0.81.5         # Cross-platform mobile
Expo 54.0.29                # Build & deployment
Expo Router 6.0             # File-based routing
NativeWind 4.2.1            # Tailwind CSS for RN
TypeScript 5.9.3            # Type safety
```

### Backend
```
tRPC 11.7.2                 # Type-safe API
Express 4.22.1              # Server framework
Drizzle ORM 0.44.7          # Database abstraction
MySQL 3.16.0                # Database driver
```

### Blockchain
```
ethers.js 6.16.0            # Ethereum interactions
Web3 integration            # Smart contracts
```

### UI/UX
```
React Navigation            # Native navigation
Tailwind CSS 3.4.17         # Styling
NativeWind                  # Tw for React Native
Expo Vector Icons           # Icon library
```

---

## 📋 Requisiti

- **Node.js** >= 18.0
- **pnpm** >= 9.12.0
- **Expo CLI** latest
- **iOS**: Xcode 15+ (per compilazione)
- **Android**: Android Studio (per compilazione)

---

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/fslmultiservice22/agentpay-mobile-app.git
cd agentpay-mobile-app
```

### 2. Installa Dipendenze
```bash
pnpm install
```

### 3. Setup Variabili Ambiente
```bash
cp .env.example .env.local
# Configura le tue variabili in .env.local
```

### 4. Avvia Development Server
```bash
# Web
pnpm dev

# iOS
pnpm ios

# Android
pnpm android
```

---

## 📁 Struttura Progetto

```
agentpay-mobile-app/
├── app/                     # Screens (Expo Router)
│   ├── _layout.tsx         # Root layout + providers
│   ├── (tabs)/             # Tab navigation
│   │   ├── _layout.tsx     # Tab config
│   │   └── index.tsx       # Home screen
│   └── oauth/
│       └── callback.tsx    # OAuth handler
│
├── components/             # React components
│   ├── screen-container.tsx
│   ├── theme-provider.tsx
│   └── ui/                 # UI library
│
├── server/                 # Backend tRPC
│   ├── routers.ts          # API endpoints
│   ├── db.ts               # Database queries
│   ├── storage.ts          # S3 storage
│   └── _core/              # Framework internals
│
├── drizzle/                # ORM & Database
│   ├── schema.ts           # Table definitions
│   └── migrations/         # Auto-generated
│
├── shared/                 # Shared code
│   ├── types.ts            # Shared types
│   └── const.ts            # Shared constants
│
├── lib/                    # Utilities
│   ├── trpc.ts             # tRPC client
│   ├── theme-provider.tsx
│   └── utils.ts            # Helpers
│
├── hooks/                  # Custom hooks
│   ├── use-colors.ts
│   ├── use-auth.ts
│   └── use-color-scheme.ts
│
├── constants/              # App constants
│   └── theme.ts            # Color palette
│
├── assets/                 # Images & icons
├── tests/                  # Test suites
│
├── design.md               # UI/UX documentation
├── todo.md                 # Project checklist
├── package.json
├── tsconfig.json
└── app.config.ts           # Expo configuration
```

---

## 🔧 Available Scripts

```bash
# Development
pnpm dev                    # Run dev server (web + server)
pnpm dev:server             # Only backend
pnpm dev:metro              # Only frontend (web)

# Build
pnpm build                  # Build server bundle
pnpm start                  # Run production server

# Quality
pnpm check                  # Type check
pnpm lint                   # ESLint check
pnpm format                 # Format code (Prettier)
pnpm test                   # Run tests (Vitest)

# Database
pnpm db:push                # Generate + migrate schema

# Mobile
pnpm ios                    # Build iOS simulator
pnpm android                # Build Android emulator
pnpm qr                     # Generate QR code

# Platform-specific
cross-env NODE_ENV=production node dist/index.js  # Prod
```

---

## 🎨 Design System

### Colori

**Light Mode:**
```
Primary:     #0a7ea4 (Blu acceso - azioni)
Background: #ffffff (Bianco)
Surface:    #f5f5f5 (Grigio chiaro)
Foreground: #11181C (Nero)
Success:    #22C55E (Verde)
Warning:    #F59E0B (Arancione)
Error:      #EF4444 (Rosso)
Muted:      #687076 (Grigio)
```

**Dark Mode:**
```
Primary:     #0a7ea4
Background: #151718
Surface:    #1e2022
Foreground: #ECEDEE
Success:    #22C55E
Warning:    #F59E0B
Error:      #EF4444
Muted:      #9BA1A6
```

### Typography
```
Heading 1:  Bold 32px
Heading 2:  Bold 24px
Body:       Regular 16px
Caption:    Regular 12px
```

---

## 🔐 Authentication

### OAuth Flow

**Native (iOS/Android):**
1. Utente tocca Login
2. App apre browser OAuth
3. Utente autenticato
4. Deep link a callback
5. Token salvato in SecureStore
6. Redirect home

**Web:**
1. Utente clicca Login
2. Redirect OAuth
3. Utente autenticato
4. Cookie HTTP-only salvato
5. Redirect home

### Utilizzo
```tsx
import { useAuth } from "@/hooks/use-auth";

export function MyComponent() {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return <ActivityIndicator />;
  if (!isAuthenticated) return <LoginButton />;
  
  return <Text>Benvenuto {user.name}</Text>;
}
```

---

## 💾 Database

### Schema Setup

**Aggiungere nuove tabelle in `drizzle/schema.ts`:**
```typescript
import { mysqlTable, varchar, int, timestamp } from "drizzle-orm/mysql-core";

export const wallets = mysqlTable("wallets", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  address: varchar("address", { length: 42 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});
```

**Migrare database:**
```bash
pnpm db:push
```

---

## 🌐 tRPC API

### Creare Endpoint

**In `server/routers.ts`:**
```typescript
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
  wallet: router({
    getBalance: publicProcedure
      .input(z.string())
      .query(({ input }) => {
        // Implementa logica
        return { balance: "1000" };
      }),
    
    sendPayment: protectedProcedure
      .input(z.object({
        to: z.string(),
        amount: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Implementa logica
        return { txHash: "0x..." };
      }),
  }),
});
```

**Usare nel frontend:**
```tsx
import { trpc } from "@/lib/trpc";

export function WalletView() {
  const { data: balance } = trpc.wallet.getBalance.useQuery("0x...");
  const sendMutation = trpc.wallet.sendPayment.useMutation();
  
  return (
    <>
      <Text>Balance: {balance?.balance}</Text>
      <Button onPress={() => sendMutation.mutate({...})} />
    </>
  );
}
```

---

## 🔗 Blockchain Integration

### Utilizzo ethers.js

```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.bnbchain.org");

// Leggi saldo
const balance = await provider.getBalance("0x...");

// Firma transazione
const signer = await provider.getSigner();
const tx = await signer.sendTransaction({
  to: "0x...",
  value: ethers.parseEther("1.0"),
});
```

---

## 🧪 Testing

### Scrivere Test

```typescript
// tests/wallet.test.ts
import { describe, it, expect } from "vitest";
import { appRouter } from "../server/routers";

describe("Wallet", () => {
  it("should get balance", async () => {
    const result = await appRouter.createCaller({
      user: { id: 1 },
    }).wallet.getBalance("0x...");
    
    expect(result).toBeDefined();
  });
});
```

**Eseguire test:**
```bash
pnpm test
```

---

## 📖 Documentazione

- [Design System](./design.md) - UI/UX guidelines
- [Project Checklist](./todo.md) - Task list
- [Backend Guide](./server/README.md) - API documentation

---

## 🐛 Troubleshooting

### Metro Cache
```bash
pnpm dev -- --reset-cache
```

### Database Connection Error
```bash
# Verifica DATABASE_URL in .env.local
# Ensure MySQL service is running
```

### OAuth Redirect
```bash
# Verifica deep link scheme in app.config.ts
# Configura redirect URI nel provider OAuth
```

---

## 📞 Support

Per aiuto e supporto:
- 📧 Email: dev@agentpay.io
- 💬 Discord: [Join Community](https://discord.gg/agentpay)
- 🐞 Issues: [GitHub Issues](https://github.com/fslmultiservice22/agentpay-mobile-app/issues)

---

## 📄 License

MIT License - vedi [LICENSE](LICENSE) per dettagli

---

## 🙌 Contributi

Contribuzioni ben accette! Per favore:

1. Fork il repository
2. Crea un feature branch (`git checkout -b feature/amazing-feature`)
3. Commit cambamenti (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Apri una Pull Request

---

**Built with ❤️ by AgentPay Team**
