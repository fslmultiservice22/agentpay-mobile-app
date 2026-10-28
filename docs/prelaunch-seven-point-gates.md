# AgentPay — gate prelaunch in sette punti

**Stato del documento:** preparatorio, interno e non pubblicato. Non è un’approvazione di release, di servizi finanziari o di trattamento dati. Questa versione accompagna `/workspace/agentpay-integration-review-20261028` (branch `integration/prelaunch-review-2026-10-28`), derivata dalla base `01f7ab0`; non è un commit o una release. Nessun deploy o servizio è stato attivato.

## 1. Base, provenienza e status della copia

- **Base canonica pubblica:** repository GitHub [`fslmultiservice22/agentpay-mobile-app`](https://github.com/fslmultiservice22/agentpay-mobile-app), commit `01f7ab0761516eae4701461bc8c8448ea6db2b91`.
- **Input hardening locale:** `/workspace/agentpay-main`, branch `fix/local-prelaunch-hardening`, non pubblicata; patch SHA-256 dichiarato dal passaggio di consegne: `165f7fa23d70a27276d6070c4bf7e88a51c6bf941662bc126d9b8f60954a079b`.
- **Candidato integrato esaminato:** `/workspace/agentpay-integration-review-20261028`, branch `integration/prelaunch-review-2026-10-28`, base `01f7ab0`. Integra 37 percorsi staged: l’hardening locale, i delta non duplicati dei sette gate e l’anti-replay OAuth persistente con migrazione `oauth_state_reservations`. La distinta feature di login-session persistente e le modifiche locali Telegram sono escluse. Nessun commit o release.
- `README.md:3-9,57-60` definisce il prodotto come beta tecnica controllata non transazionale, con servizi finanziari e provider reali disattivati; `app.config.ts:48-53` fissa nome, owner `trading23`, versione `1.1.1`.

## 2. Confine beta: no money / no provider

**Gate: PASS come intenzione e guardia sorgente; non è una prova di release distribuita.**

- La root tecnica e la policy verificata da `scripts/verify-eas-prelaunch.mjs:45-75` devono dichiarare `financialServicesEnabled: false`, `networkRequestsAllowed: false`, `consentAllowed: false` e `registrationAllowed: false` per la policy bancaria.
- `README.md:7` vieta saldo, pagamento, trasferimento, carta, credito, Open Banking e Wallester reale. Il verifier richiede anche l’assenza di submit sul profilo `prelaunch` (`scripts/verify-eas-prelaunch.mjs:48-57`).
- Il **CSV picker è bloccato nella candidata** e non nella base pubblica/main: `app/local-csv-pilot.tsx:57-67,84-90` mostra solo un esempio incorporato e dice esplicitamente che non apre il selettore; `lib/local-csv-pilot-gate.ts:3-7` richiede contemporaneamente manifest opt-in, due variabili e profilo interno. Non confondere la demo in memoria con import di estratti.
- In `eas.json:7-58,67-75` i profili ordinari (`preview*`, `production*`, `prelaunch`) impostano CSV `disabled/ordinary`; solo `csv-pilot` (`eas.json:60-65`) è opt-in interno, senza submit. Il verifier controlla questa separazione (`scripts/verify-eas-prelaunch.mjs:58-70`).

**Testo beta pronto, non pubblicato:**
> AgentPay è una beta tecnica interna e non transazionale. In questa fase non offre né abilita pagamenti, trasferimenti, conti, saldi certificati, carte, credito, wallet operativo, Open Banking o provider finanziari. La demo CSV, quando esplicitamente inclusa in una build interna autorizzata, usa soltanto due movimenti fittizi incorporati nell’app: non apre il file picker, non legge estratti personali e non invia dati a una banca o a un provider.

## 3. Hardening locale e limiti da chiudere

Il candidato integra le protezioni proposte su callback/state OAuth, JWT/appId, origine delle richieste cookie, URL API e blocco del picker CSV reale (`app/local-expense-pilot.tsx`, oltre alla demo distinta `app/local-csv-pilot.tsx`). Le modifiche locali non sono pubblicate e richiedono approvazione prima di qualsiasi release.

In questa revisione sono rimossi import e registrazione Codego dal bootstrap `server/_core/index.ts`: le route `/api/codego/*` non vengono più montate. Il file storico `server/routes/codego.ts` resta dormiente, non un provider disponibile. Test negativi presidiano il bootstrap e il confine degli import.

È aggiunta `server/_core/oauth-server-url-policy.ts`: `OAUTH_SERVER_URL` deve essere l’origin HTTPS esatto consentito dal client esistente; host alternativi, HTTP, credenziali, porte e URL con path/query/fragment sono rifiutati. `server/_core/sdk.ts` applica il controllo prima di inviare code, access token o JWT. Una configurazione diversa da quella consentita blocca l’autenticazione invece di inviare credenziali a un host arbitrario: eventuali cambi di endpoint richiedono revisione esplicita. I log e il manifest in `/workspace/agentpay-seven-point-results/` riguardano lo snapshot precedente dei sette gate e non attestano questa integrazione.

Il client OAuth imposta inoltre `maxRedirects: 0`: una risposta di redirect non deve inoltrare automaticamente il payload a un altro endpoint. `server/tests/oauth-server-url-policy.test.ts` verifica gli URL; `server/tests/oauth-upstream-boundary.test.ts` verifica con client simulato zero POST sui tre metodi sensibili quando la configurazione non è attendibile e l’opzione anti-redirect quando è valida. Non è un login end-to-end su un servizio reale.

**Verifica locale aggiornata del candidato (28 ottobre 2026):** su Node `22.14.0` e `24.19.0`, `pnpm test:ci` ha completato 96 file: 1.077 test passati e 15 saltati; `pnpm check` è passato su entrambi i runtime. `pnpm lint` termina con exit code 0 e 38 warning, nessun errore. La migrazione `0001_oauth-state-reservations` è registrata nel journal e ha lo snapshot corrispondente. Sei test di integrazione DB sono passati su MySQL 8 temporaneo locale; le migrazioni `0000` e `0001` sono state applicate solo a quel DB usa-e-getta, poi arrestato e rimosso. Il preflight EAS online del 28 ottobre alle 08:03 confermava account `trading23`, `versionCode` 10248 e sei nomi di variabili preview prima dell’ultima modifica OAuth; il preflight non è stato ripetuto dopo tale modifica. La quota Android Free era 15/15. Non sono stati eseguiti EAS build, creati APK firmati, svolti test su dispositivo, applicate migrazioni reali, effettuati deploy o rilasci.

**Gate anti-replay OAuth aggiunta in questa candidata:** `server/_core/oauth-state.ts` usa ora la tabella `oauth_state_reservations` (migrazione `drizzle/0001_oauth-state-reservations.sql`, journal `idx: 1` e snapshot `0001_snapshot.json`). Un insert atomico su hash univoco prenota lo state; lo scambio riuscito lo marca consumato; un errore rilascia solo la reservation con l’ID del tentativo proprietario. `server/tests/oauth-state.mysql.integration.test.ts` ha superato 6/6 prove contro MySQL 8 locale effimero: replay dopo restart, concorrenza tra processi, retry dopo errore, lock dopo crash/ownership, cutoff inclusivo di pulizia a 24 ore e batch limitato a 500, e propagazione degli errori SQL durante consume/release. Le migrazioni `0000` e `0001` sono state applicate esclusivamente a quel DB disposable; server e datadir sono stati poi arrestati/rimossi. Nessuna migrazione è stata applicata a un DB reale o persistente.

**Limiti e gate aperti:** il runtime OAuth dipende obbligatoriamente dal DB e senza DB l’exchange fallisce chiuso. Dopo un crash durante lo scambio, una reservation non conclusa resta bloccata almeno fino alla scadenza dello state più 24 ore; la pulizia parte solo al successivo tentativo valido di reservation, in batch da massimo 500, quindi in un sistema inattivo il record può restare più a lungo (nessuna recovery automatica). Ogni Promise rejection dello scambio upstream è trattata come fallimento e rilascia il lock; un timeout con esito remoto ambiguo potrebbe significare che il provider ha già elaborato il code, quindi la classificazione di timeout/risposta persa resta da definire prima della produzione. Il rate limit API resta una `Map` locale e `trust proxy 1` va ancora verificato. La copertura prima aperta su cutoff inclusivo a 24 ore, batch da 500 e guasti DB durante consume/release è ora verificata da test opt-in MySQL su DB disposable; la review indipendente dei test aggiunti non ha trovato blocker. Prima di distribuire occorre decidere/provare la topologia e applicare la migrazione solo nell’ambiente scelto con autorizzazione separata.

## 4. Gate APK firmato e dispositivo EAS

**Stato: NON VERIFICATO per questa candidata.** In precedenza è stato osservato un APK interno `1.1.1`/`versionCode` 10244, creato il 5 ottobre, ma non è stato collegato alla candidata corrente. Non è stato creato o installato un APK approvato di questa candidata.

Configurazione attesa, da provare online prima della build:

- `eas.json:2-5,45-58`: EAS CLI `>=23.2.0`, version source remoto, Node `22.14.0`, ambiente `preview`, distribuzione `internal`, APK, credenziali remote e nessun submit `prelaunch`.
- `scripts/verify-eas-prelaunch.mjs:77-131` controlla manifest, account `trading23`, versionCode Android remoto minimo `10235` e variabili pubbliche `preview`; con `EAS_PREFLIGHT_OFFLINE=1` i controlli remoti sono esplicitamente saltati.
- `docs/android-physical-test.md:5-19` richiede account EAS autorizzato, `eas whoami`, credenziali di firma, variabili, versionCode e telefono fisico ADB autorizzato. Il documento registra che non erano stati provati e che la CLI può rispondere `Not logged in`.
- La prova fisica deve usare fixture sintetiche e verificare gate spento nei profili ordinari, assenza di picker/provider, ritorno da background e route finanziarie inattive (`docs/android-physical-test.md:21-25`). Un link di distribuzione interna non va pubblicato: la disponibilità del link può consentire il download a chi lo possiede.

**Limite runtime:** suite, typecheck e lint sono stati verificati su Node `22.14.0` (target dichiarato da EAS) e nuovamente su Node `24.19.0` dopo i test aggiunti. Le verifiche locali non dimostrano la build EAS né la compatibilità della release su dispositivo; i gate EAS build/APK e test fisico restano aperti.

## 5. Sito e distribuzione: allineare senza pubblicare

`README.md:9,44` indica il sito informativo `agentpay.fslditta.com`, ma in questo workspace non c’è un repository sito separato. Nessun testo, URL APK, contatore CI o claim finanziario deve essere pubblicato come conseguenza di questa review. I contatori pubblici sono snapshot e non aggiornamento automatico (`README.md:44`); i vecchi moduli con domini non verificati non vanno abilitati o condivisi (`README.md:9`).

**Copy beta pronto per approvazione owner, non pubblicato:**

- **Titolo:** `Beta tecnica interna — nessun denaro, nessun provider`
- **Descrizione:** `Accesso riservato a tester autorizzati. AgentPay non esegue pagamenti o trasferimenti e non collega banche, carte, conti, Open Banking, crypto o provider finanziari. Le schermate dimostrative usano dati sintetici locali.`
- **CSV:** `La demo CSV non apre file personali e non importa estratti bancari. Qualsiasi futuro picker richiede una decisione e una review distinta.`
- **Distribuzione:** `Questa build non è una release pubblica e non autorizza il submit negli store.`

Decisioni owner: testo finale, URL pubblico, elenco tester e controllo accesso al link EAS; approvare solo dopo gate 4 e verifica che sito, manifest e APK descrivano lo stesso perimetro.

## 6. Monitoraggio, backup e supporto: stato reale e prove richieste

**Non far passare un runbook per un servizio operativo.** Il codice dimostra un monitor tecnico locale, non SLO, alerting o presidio.

- `server/operational-monitor.ts:16-44` mantiene al massimo 12 snapshot in memoria del processo; `run()` costruisce di default `healthy` per API, runtime e policy. Non prova reachability esterna, uptime reale, alert, incident response o disponibilità di un operatore.
- `server/routes/operational-monitor.ts:7-25` espone controlli read-only e dichiara retention volatile; `lib/operational-status.ts:32-60` considera fresco uno snapshot di due minuti, ma la freschezza non equivale a servizio monitorato.
- Non risulta provato un backup/restore operativo. I backup della seed phrase presenti nei test non sono backup del servizio, del database, delle configurazioni EAS o della cronologia monitor. Prima della beta: inventario dati, cifratura/gestione chiavi, frequenza, retention, restore in ambiente isolato, RPO/RTO, prova di cancellazione e owner del runbook.
- Il supporto effettivo non è attestato come servizio: predisporre canale verificato, owner, orari/SLA se promessi, triage, escalation, gestione di log e divieto di chiedere estratti, seed, token, seriali o dati personali. `docs/csv-privacy-gate.md:16-21` vieta di inviare contenuti CSV a backend, analytics, crash report, log, supporto o clipboard.

**Checklist di evidenza prima di distribuire:**

- [ ] endpoint monitor raggiungibile da una rete di prova, con alert testato e destinatario verificato;
- [ ] topologia DB condivisa e applicazione autorizzata della migrazione per anti-replay OAuth; rate limit API ancora `Map` in memoria; proxy fidato e comportamento al riavvio;
- [ ] backup cifrato, restore riuscito e registrazione di RPO/RTO, senza dati reali nei ticket;
- [ ] canale supporto e escalation owner approvati e testati con ticket sintetico;
- [ ] prova Android di background/kill/relaunch e verifica assenza cache/egress per CSV;
- [ ] evidenza separata di CI, preflight online, firma APK, installazione e test su dispositivo.

## 7. AIS/PIS, carte e crypto: perimetri separati; Codego escluso

AIS, PIS, carte e crypto restano perimetri distinti dalla beta no-money/no-provider. Non riusare una descrizione storica di provider come prova di integrazione o autorizzazione attuale: le route e le schermate finanziarie restano protette/disattivate (`README.md:7,59`; `docs/local-csv-pilot.md:23-25`). Qualunque futura integrazione richiede gate, provider, contratto/approvazioni e test separati; questo documento non formula conclusioni legali.

| Perimetro | Valutazione preparatoria | Gate per un eventuale progetto separato |
| --- | --- | --- |
| AIS, sola lettura | Enable Banking ha descritto una sandbox sintetica; è il candidato da valutare per un primo esperimento futuro senza denaro, non una funzione della beta attuale. | Approvazione separata, dati sintetici, copertura bancaria e scopes verificati, consenso/revoca/scadenza, ruoli privacy, KYB/accordo per produzione. Nessun accesso o contratto operativo è provato da questa review. |
| PIS, disposizione pagamenti | Non è una variante di AIS. La risposta commerciale Enable Banking lo tratta separatamente e richiede che il cliente abbia una propria licenza PISP. | Definire il soggetto e il modello autorizzativo con specialisti, contratto e test dedicati. Nessun pagamento o consenso viene attivato qui. |
| Carte | Wallester ha dichiarato che il suo prodotto di test crea carte reali e usa fondi reali; non offre il sandbox sintetico/read-only richiesto dall’owner. Incompatibile con la beta no-money. | Eventuale nuova decisione di prodotto, soggetto emittente/program manager, contratti, controlli di rischio e test autorizzati; non riusare il test product per questa beta. |
| Crypto | Wallet operativo, firme, swap e trasferimenti restano esclusi; la presenza di librerie, mock o test non dimostra operatività. PPD è separato e bloccato. | Definire prima custodia/non-custodia, rete e funzione, responsabilità, sicurezza delle chiavi e perimetro normativo con professionisti. Nessun wallet o rete viene attivato. |

Fonte per le dichiarazioni dei provider: evidenze email già raccolte in `/workspace/agentpay-ecosystem-evidence-2026-10-21.md`, sezioni Enable Banking e Wallester. Sono dichiarazioni storiche, non nuove verifiche di listino, contratto o disponibilità. Nessun provider è stato contattato in questo lavoro.

**Codego è escluso da questa decisione di prodotto.** L’evidenza storica disponibile è `/workspace/agentpay-ecosystem-evidence-2026-10-21.md`; la decisione owner comunicata per questo passaggio è che Codego è chiuso e la questione contrattuale non va riaperta qui. Non usare questa frase come parere legale né come prova tecnica di integrazione: per questo prelaunch Codego non è un provider attivo e non rientra nella beta.

## Decisione di rilascio

**Non approvare né pubblicare** finché owner non registra: (a) esito della review hardening, (b) topologia/proxy e gestione dello stato condiviso, (c) preflight EAS online, firma APK e prova fisica, (d) allineamento sito/copy/distribuzione, (e) evidenze monitoraggio, backup/restore e supporto, e (f) conferma dei confini separati AIS/PIS/carte/crypto. Fino ad allora questo candidato integrato è materiale di revisione soltanto.

### Riferimenti interni principali

`README.md:3-13,33-59` · `eas.json:2-85` · `app.config.ts:5-12,48-159` · `scripts/verify-eas-prelaunch.mjs:43-153` · `lib/local-csv-pilot-gate.ts:3-7` · `app/local-csv-pilot.tsx:57-123` · `docs/csv-privacy-gate.md:3-23` · `docs/local-csv-pilot.md:1-27` · `docs/android-physical-test.md:1-27` · `server/operational-monitor.ts:16-44` · `server/routes/operational-monitor.ts:7-28` · `lib/operational-status.ts:32-62` · `.github/workflows/ci.yml`.
