# AgentPay Wallet - Mobile App Design

## Overview

AgentPay Wallet è un'app mobile per la gestione di pagamenti tramite agenti AI. L'app consente agli utenti di gestire un wallet self-custodial su blockchain EVM, impostare policy di spesa e autorizzare transazioni in stablecoin (USD1) e token nativi.

## Screen List

1. **Onboarding / Wallet Setup** - Creazione o importazione del wallet
2. **Home / Dashboard** - Visualizzazione saldo, transazioni recenti, azioni rapide
3. **Send Payment** - Invio di pagamenti a indirizzi specifici
4. **Receive** - Visualizzazione indirizzo wallet e QR code
5. **Transactions History** - Elenco di tutte le transazioni
6. **Policy Settings** - Configurazione limiti di spesa giornalieri/settimanali
7. **Manual Approvals** - Gestione approvazioni manuali per transazioni grandi
8. **Settings** - Impostazioni generali, tema, valuta di visualizzazione

## Primary Content and Functionality

### 1. Onboarding / Wallet Setup
- **Content**: Form per creazione nuovo wallet o importazione da seed phrase
- **Functionality**: 
  - Generazione nuovo wallet con password
  - Importazione da seed phrase (12/24 parole)
  - Backup del seed phrase
  - Conferma password

### 2. Home / Dashboard
- **Content**: 
  - Saldo USD1 prominente (grande numero)
  - Saldo BNB per gas
  - Ultimi 5 trasferimenti
  - Pulsanti azione rapida (Send, Receive, History)
- **Functionality**:
  - Pull-to-refresh per aggiornare saldi
  - Tap su transazione per dettagli
  - Copia indirizzo wallet

### 3. Send Payment
- **Content**:
  - Campo indirizzo destinatario
  - Campo importo
  - Selezione token (USD1, BNB, altri)
  - Selezione rete (BSC, Ethereum)
  - Stima gas fee
  - Pulsante "Review & Sign"
- **Functionality**:
  - Validazione indirizzo
  - Controllo saldo disponibile
  - Calcolo gas fee in tempo reale
  - Firma transazione localmente
  - Broadcast su blockchain

### 4. Receive
- **Content**:
  - Indirizzo wallet copiabile
  - QR code dell'indirizzo
  - Istruzioni di finanziamento
- **Functionality**:
  - Copia indirizzo negli appunti
  - Condivisione QR code

### 5. Transactions History
- **Content**:
  - Lista di tutte le transazioni con:
    - Indirizzo destinatario/mittente
    - Importo
    - Data/ora
    - Status (Pending, Confirmed, Failed)
    - Hash transazione
- **Functionality**:
  - Filtro per tipo (sent/received)
  - Ricerca per indirizzo
  - Tap per visualizzare dettagli completi
  - Link a block explorer

### 6. Policy Settings
- **Content**:
  - Limite giornaliero USD1
  - Limite settimanale USD1
  - Soglia approvazione manuale
  - Indirizzi whitelist/blacklist
- **Functionality**:
  - Modifica limiti
  - Salvataggio policy localmente
  - Visualizzazione spesa corrente vs limite

### 7. Manual Approvals
- **Content**:
  - Lista approvazioni in sospeso
  - Dettagli transazione (importo, destinatario, motivo)
  - Pulsanti Approve/Reject
- **Functionality**:
  - Approvazione transazione
  - Rifiuto transazione
  - Notifica di completamento

### 8. Settings
- **Content**:
  - Toggle tema (light/dark)
  - Selezione valuta di visualizzazione
  - Informazioni app
  - Logout / Reset wallet
- **Functionality**:
  - Cambio tema in tempo reale
  - Reset wallet con conferma

## Key User Flows

### Flow 1: Primo accesso - Creazione wallet
1. Utente apre app → Onboarding
2. Sceglie "Create New Wallet"
3. Inserisce password
4. Visualizza seed phrase
5. Conferma seed phrase (scrivendo 3 parole casuali)
6. Wallet creato → Home screen

### Flow 2: Invio pagamento
1. Utente tocca "Send" da Home
2. Inserisce indirizzo destinatario
3. Inserisce importo USD1
4. Visualizza stima gas fee
5. Tocca "Review & Sign"
6. Conferma transazione
7. Transazione firmata e broadcastata
8. Visualizza hash transazione
9. Torna a Home

### Flow 3: Approvazione transazione grande
1. Utente richiede transazione > limite manuale
2. App mostra "Awaiting Approval"
3. Utente va a "Manual Approvals"
4. Visualizza dettagli transazione
5. Tocca "Approve"
6. Transazione completata
7. Notifica di successo

## Color Choices

- **Primary**: #0a7ea4 (Blu acceso - azione principale)
- **Background**: #ffffff (light) / #151718 (dark)
- **Surface**: #f5f5f5 (light) / #1e2022 (dark)
- **Foreground**: #11181C (light) / #ECEDEE (dark)
- **Success**: #22C55E (verde - transazione confermata)
- **Warning**: #F59E0B (arancione - approvazione richiesta)
- **Error**: #EF4444 (rosso - transazione fallita)
- **Muted**: #687076 (light) / #9BA1A6 (dark) - testo secondario

## Design Principles

- **Mobile-first**: Orientamento portrait (9:16), utilizzo a una mano
- **Apple HIG**: Design coerente con iOS standard
- **Security-focused**: Nessun dato sensibile visibile per default
- **Clear feedback**: Ogni azione ha feedback visivo immediato
- **Minimalist**: Interfaccia pulita e focalizzata su azioni principali
