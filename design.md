# AgentPay Wallet - Design & Architecture

## Overview

AgentPay Wallet è un'app mobile moderna per la gestione di pagamenti e transazioni blockchain. L'app consente agli utenti di connettere il loro wallet, visualizzare i saldi, inviare/ricevere pagamenti e gestire le transazioni con un'interfaccia intuitiva e moderna.

## Screen List

1. **Splash Screen** - Logo e animazione di caricamento
2. **Onboarding** - Benvenuto e spiegazione funzionalità
3. **Wallet Connection** - MetaMask, WalletConnect, Import seed
4. **Dashboard (Home)** - Saldo, transazioni recenti, azioni rapide
5. **Send Payment** - Indirizzo, token, importo, stima gas
6. **Receive Payment** - QR code, indirizzo, condivisione
7. **Transaction History** - Lista con filtri e ricerca
8. **Transaction Detail** - Dettagli completi transazione
9. **Settings** - Profilo, tema, sicurezza, logout
10. **Biometric Lock** - Face ID / Fingerprint

## Color Palette

- **Primary**: #0066FF (Blu vibrante)
- **Secondary**: #00D4FF (Ciano)
- **Success**: #00C853 (Verde)
- **Warning**: #FFA500 (Arancione)
- **Error**: #FF3B30 (Rosso)
- **Background Light**: #FFFFFF
- **Background Dark**: #0F1419
- **Text Primary Light**: #111827
- **Text Primary Dark**: #F9FAFB

## Design Principles

1. **Mobile-First**: Portrait 9:16, uso a una mano
2. **Accessibility**: Contrasto sufficiente, testi leggibili
3. **Performance**: Animazioni smooth 60fps
4. **Security**: Nessun dato sensibile in memoria
5. **Intuitività**: Icone chiare, flussi lineari

## Technical Stack

- **Framework**: React Native + Expo SDK 54
- **Styling**: NativeWind (Tailwind CSS)
- **State**: React Context + useReducer
- **Blockchain**: ethers.js + wagmi
- **Wallet**: WalletConnect v2
- **Animations**: React Native Reanimated
- **Icons**: Expo Vector Icons
