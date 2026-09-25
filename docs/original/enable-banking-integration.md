# Nota archiviata — integrazione Enable Banking

Questo documento storico è stato **ritirato dalla configurazione operativa**.

Nel perimetro AgentPay corrente, Enable Banking e ogni funzione Open Banking sono disattivati. Il backend pubblico espone soltanto una risposta tecnica non transazionale che non legge parametri di autorizzazione, non avvia consensi, non registra applicazioni, non firma JWT e non effettua richieste al provider.

Il repository non deve contenere identificativi di applicazioni production, istituti, redirect legacy, percorsi locali, chiavi private o istruzioni per creare flussi bancari. Qualunque futura valutazione dovrà partire da un ambiente sandbox separato, con nuova documentazione, gestione segreti server-side, revisione legale e di sicurezza e autorizzazione esplicita distinta.

**Stato obbligatorio:** `enabled=false`, `networkRequestsAllowed=false`, `consentAllowed=false`, `registrationAllowed=false`.
