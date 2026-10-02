# AgentPay Wallet

AgentPay Wallet è un progetto **Expo/React Native con backend Express/tRPC** mantenuto come beta tecnica controllata e non transazionale.

## Perimetro

Le funzioni di carta, credito, pagamento, saldo, trasferimento, Open Banking e integrazione Wallester reale sono disattivate. Le schermate Trading e Portafoglio espongono solo placeholder protetti; la dashboard Wallester usa esclusivamente dati mock locali.

Il sito informativo ufficiale è [agentpay.fslditta.com](https://agentpay.fslditta.com/). Gli hook legacy di **link di pagamento** e **referral** non creano né condividono URL e non simulano più premi; i controlli **aggiornamento app/OTA** non contattano host non verificati né dichiarano installazioni riuscite. Gli altri moduli legacy di notifiche, streaming e documentazione API contengono ancora riferimenti a domini non FSL: **non abilitarli né condividerne gli URL** finché non saranno sostituiti da destinazioni reali e approvate. Nessuna salvaguardia attiva funzioni finanziarie o una release Android.

## Pilota locale CSV (spento per default)

Il nuovo percorso `/local-csv-pilot` consente a una **build interna opt-in** di mostrare un riepilogo in memoria basato esclusivamente su due movimenti sintetici incorporati. Il [CSV demo](docs/local-csv-demo.csv) è un esempio per i revisori, **non** viene letto dall’app: non esiste un selettore per file personali o estratti bancari reali. Il manifest Expo richiede il profilo EAS `csv-pilot` e due variabili pubbliche opt-in; tutti i profili ordinari dichiarano valori disabilitati. L’ambiente remoto EAS va comunque verificato prima di creare un APK. Il pilota non collega banche e non modifica le route finanziarie protette. Formato e condizioni da soddisfare prima di una futura importazione reale sono descritti in [docs/local-csv-pilot.md](docs/local-csv-pilot.md).

## Toolchain

| Componente | Versione |
|---|---:|
| Expo SDK | 57.0.25 |
| React Native | 0.86.3 |
| Node.js EAS | 22.14.0 |
| Package manager | pnpm 9.12.0 |

## Avvio locale

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Il backend usa normalmente la porta `3000`; Metro usa la porta `8081`.

## Gate di qualità

```bash
pnpm eas:prelaunch:check
pnpm check
pnpm test:ci
pnpm build
pnpm lint
```

I risultati aggiornati della [CI mobile](https://github.com/fslmultiservice22/agentpay-mobile-app/actions) vanno verificati per commit: i contatori pubblici del sito AgentPay sono **snapshot**, non un aggiornamento automatico. TypeScript, suite di test, lint, export Android/web e collaudo su dispositivo sono controlli distinti; una CI verde non dimostra un’operazione finanziaria reale.

## Build interna Android

Il profilo `prelaunch` in `eas.json` genera esclusivamente un APK interno e non configura alcun submit allo store.

```bash
pnpm eas:prelaunch:check
pnpm eas:prelaunch:build
```

Il preflight online blocca la build finché il `versionCode` remoto non è almeno `10235` e finché le variabili pubbliche richieste nell'ambiente EAS `preview` non sono presenti. Non inserire segreti nel repository.

## Sicurezza

Le route finanziarie restano deny-by-default. Qualunque attivazione finanziaria o pubblicazione negli store richiede una revisione e un'autorizzazione separate.
