# Collaudo Android fisico — demo CSV sintetica

**Preparato il 2 ottobre 2026; non eseguito su un telefono.** Il profilo EAS esistente `csv-pilot` eredita da `prelaunch`: distribuzione `internal`, APK Android, firma remota, senza submit. I sei profili ordinari restano esplicitamente disabilitati per il CSV e il manifest Expo consente la demo soltanto con `EAS_BUILD_PROFILE=csv-pilot`. La build contiene solo **due movimenti fittizi incorporati**, non un picker o una importazione bancaria reale. Package Android attuale: `space.manus.agentpay.mobile.app.t20260512140915`; un APK con lo **stesso package può sostituire** una installazione già presente. Usare un telefono di test o effettuare il backup dell'installazione esistente prima di un'eventuale installazione, senza usare dati bancari personali per questo test.

## Prerequisiti e verifiche senza build

Occorrono un computer autorizzato con Android platform-tools (`adb`), un telefono Android fisico collegato via USB e sbloccato, opzioni sviluppatore e debug USB attivi e **autorizzazione RSA concessa sul telefono**. Eseguire nella copia aggiornata del repository:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm android:device:check
EAS_PREFLIGHT_OFFLINE=1 pnpm eas:prelaunch:check
```

Lo script `android:device:check` è **solo diagnostico**: richiede un unico dispositivo fisico con stato `device`, verifica che non sia un emulatore e stampa solo la versione Android, non il seriale. Se ADB manca o il telefono risulta `unauthorized`/`offline`, fermarsi e risolvere la connessione sul computer che ha il telefono. In Windows PowerShell usare `$env:EAS_PREFLIGHT_OFFLINE='1'; pnpm eas:prelaunch:check`; non copiare nel ticket codici RSA, seriali del dispositivo o screenshot contenenti notifiche private. Il laptop Manus attualmente offline non può essere controllato dal sandbox; il Cloud Computer non ha un telefono USB attestato.

Prima di **qualsiasi** build EAS interna, il proprietario deve accedere con il proprio account Expo autorizzato e verificare `eas whoami`, il proprietario `trading23`, il package, il versionCode remoto, le variabili dell'ambiente `preview` e le credenziali di firma. Il preflight online `pnpm eas:prelaunch:check` verifica alcune di queste condizioni ma richiede una sessione EAS: oggi la CLI nel sandbox risponde `Not logged in`. Controllare anche nell'interfaccia Expo che gli URL delle build interne richiedano autenticazione dei soli tester autorizzati: [Expo avverte](https://docs.expo.dev/build/internal-distribution/) che, per impostazione predefinita, **chiunque possieda il link può scaricare l'APK**. Non pubblicare un URL interno in un ticket pubblico.

Solo dopo queste verifiche e con accesso Expo autorizzato, una build della **demo** si può preparare con `eas build --platform android --profile csv-pilot --non-interactive`. Questo documento non avvia la build e non autorizza il submit o una release. Non usare `production-apk` o `production` per il pilota.

## Protocollo sul telefono per la demo

Registrare soltanto versione Android, identificativo del run CI, versione/versionCode dell'APK, stato dei test e osservazioni **senza nomi/estratti reali**. Aprire l'app, accedere alla schermata «Analisi spese — demo locale», caricare le due righe fittizie, controllare anteprima, conferma, totale ottobre (**entrate €1.450,00; uscite €12,50**), «Elimina», rotazione/navigazione, ritorno dal background e deep link con gate spento in un profilo ordinario. Verificare che non compaiano picker, richiesta accesso ai file o messaggi che presentino conti/pagamenti come attivi. L'app deve mantenere inattive le route finanziarie legacy.

Il futuro test **dell'import reale**, distinto dalla demo, richiederà un'altra PR dopo [specifica](csv-format-v1.md), [verifica privacy](csv-privacy-gate.md) e informativa aggiornata. Solo con fixture sintetiche verificare picker, permessi, annullamento, file oltre limiti, ritorno dal background, kill/relaunch, assenza di copie cache e assenza di payload nei log/network. Una build della demo non convalida questi percorsi, poiché oggi non sono implementati.

Fonti: [Expo EAS Internal distribution](https://docs.expo.dev/build/internal-distribution/) e [Android Developers adb](https://developer.android.com/tools/adb).
