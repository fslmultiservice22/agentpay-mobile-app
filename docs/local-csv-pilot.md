# Pilota interno: anteprima CSV sintetica locale

**Stato:** prototipo per revisione, non distribuito. La schermata usa esclusivamente due operazioni fittizie **incorporate nell’app**. Non esiste alcun selettore file, lettura da cache, collegamento bancario, pagamento, provider, saldo di conto o importazione di estratti personali in questa fase.

## Esempio fittizio e formato del parser

La stessa fixture è inclusa in [local-csv-demo.csv](local-csv-demo.csv) per verifiche tecniche. Il pulsante «Carica CSV demo sintetico» usa una costante interna con questo contenuto; **non apre il file allegato né altri file dal dispositivo**.

```csv
data;descrizione;importo;valuta
01/10/2026;Demo acquisto;-12,50;EUR
02/10/2026;Demo accredito;1450,00;EUR
```

Il parser puro interpreta un CSV UTF-8 separato da punto e virgola, con esattamente queste quattro colonne, date `GG/MM/AAAA`, importi EUR con virgola decimale e centesimi interi. Nei test sintetici tratta delimitatori fra virgolette, date non valide, duplicati, limiti di 512 KiB e 2000 righe. Queste capacità **non** rendono disponibile un percorso per leggere CSV forniti dall’utente: tale sviluppo richiederà una decisione separata dopo privacy review, progettazione del formato reale e collaudo Android.

## Attivazione confinata al profilo interno

Il pulsante compare solo se il manifest Expo incorpora `localCsvPilotBuildAllowed=true`, ottenibile dal profilo EAS **`csv-pilot`** insieme alle variabili pubbliche `EXPO_PUBLIC_AGENTPAY_CSV_PILOT=enabled` e `EXPO_PUBLIC_AGENTPAY_CSV_PILOT_PROFILE=csv-pilot-internal`. Il profilo è Android interno, eredita da `prelaunch` e non prevede submit. Tutti gli altri profili definiscono esplicitamente valori disabilitati; il gate nel manifest richiede inoltre `EAS_BUILD_PROFILE=csv-pilot`, quindi i soli valori remoti delle variabili non abilitano una build ordinaria. Anche un deep link alla pagina mostra il messaggio di indisponibilità se il gate è spento. Le variabili sono pubbliche e non costituiscono autorizzazione bancaria.

L’ambiente remoto EAS non era leggibile in questa sessione: **prima di creare qualsiasi APK** occorre controllare accesso e variabili remote, confermare versione/identità della build, ed eseguire il preflight online. Non è stato creato né distribuito un APK.

## Privacy e verifiche residue

I due movimenti demo restano solo nello stato in memoria della schermata e sono cancellati con «Elimina» oppure quando l’app va in background. Questi nuovi moduli non usano `AsyncStorage`, filesystem, backend, log di estratti o API di provider. I test coprono parser, fixture e gate; la mancanza di API di selezione file/rete è anche verificata a livello di sorgente. Restano necessari il collaudo su Android reale e la review di prodotto/privacy/sicurezza prima di progettare l’importazione di estratti veri. Le vecchie route `/spending-analysis` e `/transaction-history` restano protette.

**Riferimenti:** [Papa Parse](https://github.com/mholt/PapaParse), [profili EAS](https://docs.expo.dev/build/eas-json/), [variabili EAS nel build](https://docs.expo.dev/eas/environment-variables/usage/), [issue del pilota](https://github.com/fslmultiservice22/agentpay-mobile-app/issues/6).
