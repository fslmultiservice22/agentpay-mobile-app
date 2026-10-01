# AgentPay Wallet

AgentPay Wallet è un progetto **Expo/React Native con backend Express/tRPC** mantenuto come beta tecnica controllata e non transazionale.

## Perimetro

Le funzioni di carta, credito, pagamento, saldo, trasferimento, Open Banking e integrazione Wallester reale sono disattivate. Le schermate Trading e Portafoglio espongono solo placeholder protetti; la dashboard Wallester usa esclusivamente dati mock locali.

Il sito informativo ufficiale è [agentpay.fslditta.com](https://agentpay.fslditta.com/). Gli hook legacy di **link di pagamento** e **referral** non creano né condividono URL e non simulano più premi; i controlli **aggiornamento app/OTA** non contattano host non verificati né dichiarano installazioni riuscite. Gli altri moduli legacy di notifiche, streaming e documentazione API contengono ancora riferimenti a domini non FSL: **non abilitarli né condividerne gli URL** finché non saranno sostituiti da destinazioni reali e approvate. Nessuna salvaguardia attiva funzioni finanziarie o una release Android.

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

La [CI main del 1 ottobre 2026](https://github.com/fslmultiservice22/agentpay-mobile-app/actions/runs/36850238615), sul merge commit `856d5e1`, ha prodotto **930 test superati, 9 saltati** (70 file superati, 3 saltati) con esito complessivo riuscito. Il JSON pubblico delle metriche AgentPay riporta lo stesso 930/9 ma è uno **snapshot validato prima del merge** (`2026-10-01T08:36:21Z`), non un aggiornamento automatico della CI main. Expo Doctor, build backend, lint ed export Android/web **non sono stati ripetuti in questa verifica**; la CI non sostituisce il collaudo su dispositivo.

## Build interna Android

Il profilo `prelaunch` in `eas.json` genera esclusivamente un APK interno e non configura alcun submit allo store.

```bash
pnpm eas:prelaunch:check
pnpm eas:prelaunch:build
```

Il preflight online blocca la build finché il `versionCode` remoto non è almeno `10235` e finché le variabili pubbliche richieste nell'ambiente EAS `preview` non sono presenti. Non inserire segreti nel repository.

## Sicurezza

Le route finanziarie restano deny-by-default. Qualunque attivazione finanziaria o pubblicazione negli store richiede una revisione e un'autorizzazione separate.
