# AgentPay CSV v1 — movimenti normalizzati, non estratti bancari grezzi

**Stato:** specifica tecnica del primo MVP locale, 2 ottobre 2026. La demo attuale non apre file e usa soltanto due righe fittizie incorporate. Questa specifica **non** autorizza né abilita l'importazione di estratti personali, Open Banking, pagamenti o una build pubblica. Un CSV esportato direttamente da una banca è fuori perimetro finché un adattatore specifico non sia documentato e testato con esempi sintetici; l'utente non deve allegare estratti veri a issue o supporto.

## Codifica e struttura

L'unico formato candidato è testo **UTF-8**, con **un solo BOM facoltativo esclusivamente all'inizio**, separatore `;`, terminatori LF o CRLF (mai CR isolato) e intestazione **case-sensitive e letterale, non quotata**, nell'ordine esatto e senza spazi aggiunti:

```csv
data;descrizione;importo;valuta
01/10/2026;Demo acquisto;-12,50;EUR
02/10/2026;Demo accredito;1450,00;EUR
```

I quattro campi sono obbligatori. Non accettiamo colonne aggiuntive come IBAN, nominativo, numero di carta, identificativo conto, saldo, causale estesa o dati di un terzo. Le virgolette CSV racchiudono un campo dati contenente `;`, doppi apici o a capo; una virgoletta interna si scrive `""`. **Solo le righe fisicamente vuote sono ignorate**: righe con spazi, celle mancanti o soli delimitatori (`;;;`) fanno fallire l'intero CSV. Non accettiamo file Excel, JSON, PDF, delimitatori diversi o codifiche legacy: l'app **rifiuta** il file anziché interpretarlo per tentativi. Il limite del parser è **512 KiB di byte UTF-8** e **2.000 movimenti**; l'input deve contenere almeno un movimento. Il parser riceve oggi una *stringa*, non byte: il futuro lettore di file dovrà verificare la decodifica UTF-8 in modalità rigorosa prima di chiamarlo. Il parser rifiuta BOM non iniziali, carattere di sostituzione U+FFFD e surrogati Unicode isolati. **Non esiste ancora un lettore di file reali.**

`data` è la **data di contabilizzazione** scelta durante la normalizzazione, `GG/MM/AAAA`, tra 1900 e 2100 inclusi e valida sul calendario. Non è automaticamente la data valuta o la data di acquisto. `descrizione` è un testo breve, non vuoto, massimo **160 punti di codice Unicode** dopo trim e normalizzazione degli spazi: un'emoji semplice conta come uno, ma alcune combinazioni visive possono contare come più punti. La descrizione può comunque rivelare nomi o aspetti personali: è un dato personale potenziale, non un campo anonimo. L'utente deve controllare il testo prima dell'importazione; il software non può garantire la rimozione automatica di ogni riferimento sensibile.

`importo` è in euro con **due decimali e virgola**, senza separatori delle migliaia: `-12,50` indica un'uscita e `12,50`, `+12,50` un'entrata. `0,00`, `+0,00` e `-0,00` sono rifiutati perché non rappresentano un movimento utile. Sono ammessi al massimo nove cifre prima della virgola, senza zeri iniziali, e il parser usa **centesimi interi**. `valuta` deve essere esattamente `EUR`. Non si convertono valute, non si inferiscono saldi o titolarità del conto; rimborsi positivi contano come entrate e trasferimenti interni non vengono esclusi automaticamente. Il riepilogo mensile è puramente aritmetico, non verifica l'estratto con la banca né qualifica pagamenti.

Le righe identiche sono conservate e conteggiate entrambe: non esiste una deduplicazione affidabile senza identificativo di movimento, che qui volutamente non raccogliamo. Una riga malformata rifiuta **l'intero file**; il messaggio d'errore riporta solo il numero del *record logico* e la regola violata, mai il valore della cella o il nome del file. Con righe vuote ignorate o campi tra virgolette contenenti a capo il numero non coincide necessariamente con la linea fisica del file. Il parser non esporta CSV; se un export per fogli di calcolo sarà aggiunto, occorrerà proteggere separatamente le celle contro formule `=`, `+`, `-` e `@`.

## Verifiche e casi non supportati

I test con sole fixture fittizie coprono BOM solo iniziale, LF/CRLF senza CR isolato, header letterale non quotato, campi tra virgolette, caratteri accentati/emoji, surrogati isolati rifiutati, importi negativi e positivi, duplicati preservati, limiti in byte/righe e rifiuto di zero, valuta diversa, date impossibili, colonne aggiuntive identificative del conto, file malformati e header modificati. Una stringa simile a un identificativo inserita nella descrizione non viene automaticamente riconosciuta: è un rischio privacy da gestire prima dell'import reale. **Non** inserire dati reali in test, log, PR, ticket o build di prova. La revisione del flusso file/Android e la revisione privacy sono separatamente tracciate in [#9](https://github.com/fslmultiservice22/agentpay-mobile-app/issues/9).

Lo schema v1 è una decisione sul **formato normalizzato**, non una promessa di compatibilità con banche o paesi. Prima di supportare un export bancario specifico servono nome del formato, variante locale, regole di mapping, campioni totalmente sintetici e test dedicati; non trasformiamo automaticamente estratti non riconosciuti.
