# Review tecnica — pilota CRE mock offline v2

**Stato:** prototipo isolato, non incluso nel runtime mobile, nessun rilascio. Rilevazione del 6 ottobre 2026.

## Confine

Il pilota valida un payload **sintetico** del monitor tecnico, senza contattare API live e senza usare account, SDK installato, wallet, provider, blockchain, dati utente o transazioni. Il manifest CRE è dichiarativo e non è collegato all'app, ai Worker o al DNS. Nessuna funzione finanziaria viene attivata.

## Evidenza locale

- Validatore `status.ts`: **22/22** verifiche Bun su envelope, timestamp (massimo 120 secondi di età e 30 secondi di anticipo), check attesi e policy degradata.
- `callback.ts`: **12/12** verifiche con runtime fittizio; esercitano la funzione importata da `main.ts`, incluso il comportamento fail-closed per config inattesa, getter che genera un errore e logger non funzionante.
- Runner monouso `run-local-mock.ts`: restituisce `healthy / fresh_and_healthy` soltanto sulla fixture con clock fissato a `2026-10-06T00:00:20.000Z`.
- `verify-local.ts`: target e percorsi dichiarativi, whitelist degli import e assenza di file sensibili; controllo **euristico**, non prova formale di sicurezza.
- Bun ha creato un bundle **solo sintattico**, marcando `@chainlink/cre-sdk` come external: non è un typecheck contro l'SDK né una compilazione WASM.

## Gate non superati

| Oggetto | Stato | Condizione per avanzare |
| --- | --- | --- |
| Test con SDK CRE / typecheck / WASM | Non eseguiti | Revisione dipendenze e approvazione del perimetro di test. |
| `cre login` o simulazione CRE | Non eseguiti | Scelta esplicita di ambiente/account e traffico consentito. |
| Collegamenti app/Worker/DNS | Non eseguiti | Fonte e owner degli asset Worker, sicurezza, rollback, opt-in e test separati. |
| Funzioni finanziarie, provider e blockchain | Disattivati / fuori perimetro | Nessuna attivazione autorizzata da questo documento. |

**Scopo della PR documentale:** registrare il limite delle prove senza aggiungere SDK, script eseguibili, workflow di CI, release o dati sensibili. Un eventuale repository sperimentale per il codice CRE va deciso e revisionato separatamente; questa PR non autorizza merge/deploy del pilota.

**Fonti:** test e README del pacchetto locale `cre-mock-workflow-v2-2026-10-06.zip`; [Chainlink CRE project configuration](https://docs.chain.link/cre/reference/project-configuration-ts) e [workflow simulation](https://docs.chain.link/cre/guides/operations/simulating-workflows). La CI GitHub sull'eventuale PR deve essere verificata sulla sua SHA: i test qui riportati sono locali.
