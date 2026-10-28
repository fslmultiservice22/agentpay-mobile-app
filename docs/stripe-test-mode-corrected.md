# Stripe in modalità test: stato corretto

## Cosa c’era nel baseline di PR #23

Il punto di partenza è il commit `99162c1fbadad3b14208fe579621620f0203d6af` sul ramo `integration/prelaunch-review-2026-10-28`. In quel commit **non** risultano un client Stripe lato server, l’SDK Stripe, la lettura delle variabili `STRIPE_*`, un `.env.example` o `tests/stripe-test-mode.test.ts`. La precedente descrizione che dava queste aggiunte per già presenti non era corretta.

Nel progetto esistono invece elementi legacy che non costituiscono un’integrazione Stripe: un widget non collegato a un flusso server e un hook generico che simula pagamenti e può marcarli come completati localmente. Non sono una verifica né un pagamento processato da Stripe.

Il server applica inoltre `express.json()` globalmente prima di registrare le route (`server/_core/index.ts`). Non esiste un endpoint webhook in questo scaffold; quando se ne progetterà uno, la gestione del corpo raw e la verifica della firma dovranno essere impostate prima del parser JSON globale.

## Cosa aggiunge questo ramo locale

Il ramo `local/stripe-test-mode-scaffold-20261028`, creato separatamente dal commit sopra, aggiunge un solo factory server-side in `server/stripe/client.ts` e l’SDK Stripe come dipendenza runtime. Il factory è disabilitato per impostazione predefinita: crea il client solo con `STRIPE_MODE=test` e una chiave sintatticamente compatibile con `sk_test_` o `rk_test_`; rifiuta modalità diverse, chiavi live/pubbliche, valori mancanti o malformati. Se la costruzione fallisce, restituisce `null` senza propagare o registrare l’errore. Il controllo del formato è locale: non verifica l’autenticità della chiave tramite Stripe.

`tests/stripe-test-mode.test.ts` usa un factory stub/spia per verificare i casi consentiti e negati, senza chiamate API. L’unico aggiornamento al test di confine consente l’import Stripe esclusivamente nel nuovo modulo server. Non è stato aggiunto `.env.example` e il factory non è montato nel server né invocato da UI.

## Cosa resta fuori

Non sono stati aggiunti webhook, prodotti, prezzi, clienti, Checkout, pagamenti, route o schermate; non è stato abilitato il live mode. Non sono stati creati né modificati account o impostazioni Stripe.

**Non è stato usato alcun account Stripe o alcuna chiave API. Non sono state effettuate chiamate esterne a Stripe.** L’SDK è presente solo per rendere possibile la costruzione server-side futura; i test iniettano uno stub e non costruiscono il client reale.

## Verifiche eseguite

- Test unitari mirati, inclusa la regola di confine: **15 superati** (`pnpm exec vitest run tests/stripe-test-mode.test.ts tests/financial-import-boundary.test.ts`).
- Typecheck: **superato** (`pnpm check`).
- Lint dei file modificati: **superato** (`pnpm exec eslint server/stripe/client.ts tests/stripe-test-mode.test.ts tests/financial-import-boundary.test.ts`).
