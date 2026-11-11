/**
 * The text of the user interface, in Italian, the base language.
 *
 * This file is the only place with Italian text. The server code and the shared
 * code hold no Italian text. Refer to the section Language rules in `CLAUDE.md`.
 *
 * This text gives the type `Messages`. The text of a second language must hold
 * each key of that type, or the typecheck fails. Paragraph 5.8 of
 * `docs/architecture.md` gives the rule.
 *
 * Keep each item short. One short sentence is sufficient for a warning.
 */
export const it = {
	appName: "Yume",

	// The title of the page. It is the `h1`, and it holds the words of the
	// question that a person writes in a search engine. The name of the
	// application is on the flaps of the masthead, not here.
	homeTitle: "Quante miglia valgono i tuoi punti",
	homeLead:
		"L'app della tua carta ti mostra un saldo di punti. Yume ti dice quante miglia diventano, valuta per valuta, ai rapporti di trasferimento ufficiali di oggi.",
	homeExample: "Un esempio. Il tuo saldo appare dopo l'accesso.",

	homeWhatTitle: "Cosa fa Yume",
	// Each block opens with the answer, then it gives the detail. An assistant
	// cites the paragraph that answers, not the paragraph that introduces.
	homeWhat: [
		{
			title: "Un numero per ogni valuta",
			body: "Sei programmi usano gli Avios: è un saldo solo, non sei. Yume calcola una riga per valuta, così lo stesso saldo non viene contato più volte.",
		},
		{
			title: "Rapporti ufficiali, ognuno con la sua data",
			body: "Ogni rapporto è letto dalla pagina ufficiale del programma. Quando cambia, la regola vecchia resta come storico e ne entra una nuova con la sua data.",
		},
		{
			title: "È un calcolo, non un saldo",
			body: "Le miglia potenziali sono il massimo che otterresti trasferendo tutti i punti di quella valuta, ai rapporti di oggi. Yume non muove nessun punto.",
		},
	],

	homeLogosTitle: "Carte e compagnie aeree supportate",

	homeFaqTitle: "Domande frequenti",
	// The details of the catalogue live here, below the product. A visitor reads
	// what Yume does first: the six programmes of Avios are an answer, not an
	// opening. Each answer opens with the fact.
	homeFaq: [
		{
			question: "Quali punti posso seguire con Yume?",
			answer:
				"I saldi di 26 programmi aerei e di tre carte per l'Italia: Amex Membership Rewards, i RevPoints di Revolut e il cashback di Klarna. Per i 21 programmi che quelle carte raggiungono, Yume calcola anche le miglia potenziali.",
		},
		{
			question: "Perché sei programmi diventano una riga sola?",
			answer:
				"British Airways Club, Iberia Club, Aer Lingus AerClub, Finnair Plus, Qatar Airways Privilege Club e Vueling Club usano la stessa valuta: gli Avios. È un saldo solo. Uno strumento che calcola programma per programma conta gli stessi punti sei volte, e mostra un totale che non potrai mai ottenere.",
		},
		{
			question: "Cosa sono le miglia potenziali?",
			answer:
				"Il massimo che otterresti se trasferissi tutti i punti di quella valuta, ai rapporti di oggi. Non sono miglia che possiedi: sono un calcolo, e cambia quando cambiano i rapporti.",
		},
		{
			question: "Posso sommare le miglia potenziali di valute diverse?",
			answer:
				"No. Gli stessi punti possono andare in una direzione sola, quindi la somma è un numero che non otterrai mai. Quello che conta è la riga più alta, non il totale.",
		},
		{
			question: "Da dove arrivano i rapporti di trasferimento?",
			answer:
				"Dalla pagina ufficiale di ogni programma, per l'Italia. Ogni regola ha una data di inizio e una di fine: quando un rapporto cambia, la regola vecchia resta come storico e il calcolo usa quella valida oggi.",
		},
		{
			question: "Yume trasferisce i punti al posto mio?",
			answer:
				"No. Yume calcola e basta, non tocca i tuoi conti. Il trasferimento lo fai tu, dall'app della tua carta o dal sito del programma, ed è definitivo: i punti trasferiti non tornano indietro.",
		},
		{
			question: "Posso installare Yume sul mio server?",
			answer: "Sì. Il codice è open source con licenza MIT.",
		},
		{
			question: "Come ottengo un account?",
			answer:
				"Accedi con il tuo account Google: il primo accesso crea l'account.",
		},
	],

	notFound: "Questo volo non è in partenza: la pagina che cerchi non esiste.",
	notFoundLink: "Torna al tabellone",

	homeScreenshotTitle: "Dopo l'accesso",
	homeScreenshotAlt:
		"La dashboard di Yume: una scheda per ogni valuta, con le miglia potenziali sul tabellone.",

	// The footer of each surface. Yume names American Express, Revolut, Klarna
	// and each airline programme of the catalogue, therefore it must say that it
	// belongs to none of them. The text does not say "affiliato": an affiliate
	// link to a source does not make it false.
	footerDisclaimer:
		"Yume è un progetto indipendente: non appartiene ad American Express, a Revolut, a Klarna né alle compagnie aeree o ai programmi fedeltà citati. Nomi e loghi sono marchi dei rispettivi proprietari.",
	footerSource: "Codice su GitHub",
	footerPrivacy: "Privacy",
	footerConnector: "Assistenti AI",
	footerSupport: "Assistenza",
	footerTos: "Termini",

	potentialTitle: "Miglia potenziali",
	potentialWarning:
		"Valore calcolato su un trasferimento totale. Ricorda: trasferire i punti è definitivo.",
	currentBalance: "Saldo",
	fromTransfers: "Dai trasferimenti",
	routeDetail: "Dove puoi trasferire",
	noPotential: "Aggiungi un saldo per vedere le miglia potenziali.",
	showOthers: "Mostra le altre",
	showLess: "Mostra meno",
	favorite: "Preferito",

	startTitle: "Inizia da qui",
	startBody:
		"Aggiungi il primo conto con il suo saldo. In cima alla lista trovi le carte punti: sono la fonte delle miglia potenziali.",

	accountsTitle: "I tuoi conti",
	noBalance: "Nessun saldo",
	observedOn: "al",

	addAccount: "Aggiungi conto",
	newAccountTitle: "Nuovo conto",
	programLabel: "Programma",
	programPlaceholder: "Scegli un programma",
	programSearch: "Programma o compagnia aerea",
	programNotFound: "Nessun programma trovato.",
	airlinesMore: "Mostra tutte le compagnie",
	airlinesLess: "Mostra meno compagnie",
	firstBalanceLabel: "Saldo (facoltativo)",

	updateBalance: "Aggiorna saldo",
	pointsLabel: "Saldo",
	dateLabel: "Data",
	pointsError: "Scrivi il saldo in numeri.",

	expiryTitle: "Scadenze (facoltative)",
	expiryPointsLabel: "Punti",
	expiryDateLabel: "Scadenza",
	addExpiry: "Aggiungi scadenza",
	removeExpiry: "Rimuovi scadenza",
	lotIncomplete: "Completa punti e data di ogni scadenza.",
	lotPoints: "Scrivi i punti in numeri.",
	lotBeforeDate: "Una scadenza è prima della data del saldo.",
	lotDuplicate: "Due scadenze hanno la stessa data.",
	lotAboveBalance: "Le scadenze superano il saldo.",
	expiresOn: "in scadenza il",
	lotExpired: "Scadenza passata: aggiorna il saldo.",

	removeBalance: "Cancella saldo",
	removeBalanceQuestion: "Cancelli il saldo? Torna al saldo precedente.",
	removeAccount: "Rimuovi conto",
	removeAccountQuestion: "Rimuovi il conto e tutti i suoi saldi?",
	removeError: "Rimozione non riuscita.",
	confirm: "Conferma",

	// The assistants connected to the MCP server. Paragraph 4.7.2 of
	// `docs/architecture.md`.
	connectionsTitle: "Assistenti collegati",
	revokeConnection: "Revoca",
	revokeConnectionQuestion:
		"Revochi l'accesso? L'assistente non leggerà più i tuoi dati.",

	save: "Salva",
	saving: "Salvataggio…",
	cancel: "Annulla",
	saveError: "Salvataggio non riuscito.",
	tooManyAccountsError: "Hai raggiunto il limite di conti.",
	freeAccountLimitError:
		"Con l'account gratuito puoi aggiungere Amex, Revolut e 2 programmi aerei.",
	freeLotsError: "Le scadenze sono riservate ai sostenitori.",
	supportersOnly: "Riservato ai sostenitori",

	// The section of the supporter account on the dashboard. Paragraph 4.6.1
	// of `docs/architecture.md`.
	supporter: {
		title: "Sostenitore",
		offer:
			"Klarna, hotel, programmi aerei senza limiti, scadenze e assistenti AI.",
		perYear: "all'anno",
		buy: "Diventa sostenitore",
		renewal: "Si rinnova ogni anno. Disdici quando vuoi.",
		withdrawal: "Recesso entro 14 giorni:",
		terms: "Termini del servizio",
		// The date follows a colon: "il" and "al" change before 1, 8 and 11.
		renews: "Sei sostenitore. Prossimo rinnovo:",
		ends: "Sei sostenitore. Scadenza:",
		paymentFailed: "Rinnovo non riuscito: aggiorna il metodo di pagamento.",
		manage: "Gestisci abbonamento",
		activating:
			"Pagamento ricevuto. L'attivazione può richiedere qualche minuto.",
		opening: "Apertura…",
		already: "Hai già un abbonamento: gestiscilo dal portale.",
		unavailable: "Pagamento non disponibile. Riprova tra poco.",
		link: "Diventa sostenitore",
	},

	loading: "Caricamento…",
	loadError: "Dati non disponibili.",

	signInTitle: "Accedi",
	signIn: "Accedi",
	signInWithGoogle: "Accedi con Google",
	signInNote: "Il primo accesso crea il tuo account.",
	signInError: "Accesso con Google non riuscito.",
	// The account of the reviewers of Anthropic. Paragraph 4.1.1 of
	// `docs/architecture.md`.
	passwordSignInLink: "Accesso con password",
	passwordSignInNote: "Solo per l'account di prova dei revisori.",
	emailLabel: "Email",
	passwordLabel: "Password",
	passwordSignInError: "Email o password non corretti.",
	signOut: "Esci",

	// The page of the administrator. Paragraph 4.8 of `docs/architecture.md`.
	// The names of the levels are the names of the plans.
	adminLink: "Amministrazione",
	adminTitle: "Utenti",
	adminTotal: "Totale",
	adminRecent: "Ultimi 30 giorni",
	adminSearch: "Cerca per email",
	adminAll: "Tutti",
	adminEmail: "Email",
	adminJoined: "Iscrizione",
	adminTier: "Piano",
	adminSupporterUntil: "fino al",
	adminNoMatch: "Nessun utente.",
	adminPrevious: "Pagina precedente",
	adminNext: "Pagina successiva",
	adminUpdateError: "Modifica non riuscita.",
	adminBack: "Torna al tabellone",
	tierFree: "Free",
	tierSupporter: "Supporter",
	tierUnlimited: "Unlimited",

	// The page `/consent`: the authorisation of an assistant, for example
	// Claude, on the MCP server. Paragraph 4.7.2 of `docs/architecture.md`.
	consent: {
		title: "Autorizza l'accesso",
		lead: "chiede di accedere al tuo account Yume.",
		permissions: "Potrà:",
		scopes: {
			balances:
				"leggere conti, saldi e miglia potenziali, e aggiungere un saldo",
			offline_access: "restare collegato senza chiederti di nuovo l'accesso",
		} as Record<string, string>,
		redirect: "Il codice di accesso va a:",
		loopback:
			"Il codice va a un programma sul tuo computer. Autorizza solo se hai avviato tu il collegamento.",
		accept: "Autorizza",
		deny: "Rifiuta",
		invalid: "Richiesta di autorizzazione non valida.",
		error: "Autorizzazione non riuscita.",
	},

	// The structured data of the public page. Refer to `lib/jsonLd.ts`.
	jsonLd: {
		// The subjects of the application. Each item is a subject that the page
		// covers with a text, not a function of the product.
		knowsAbout: [
			"Avios",
			"Membership Rewards",
			"RevPoints",
			"Cashback Klarna",
			"Miglia aeree",
			"Trasferimento punti",
			"Programmi fedeltà aerei",
			"Rapporti di trasferimento",
		],
		// The functions that the application gives today.
		featureList: [
			"Calcolo delle miglia potenziali per ogni valuta",
			"Rapporti di trasferimento ufficiali per l'Italia",
			"Saldi con la data di osservazione",
			"Applicazione installabile (PWA)",
		],
	},

	// The description of the application. It is the description of
	// `index.html`, of the structured data and the summary of `llms.txt`.
	siteDescription:
		"Yume calcola quante miglia puoi ottenere dai tuoi punti. Un valore per ogni valuta, con i rapporti di trasferimento ufficiali per l'Italia.",

	// The lines of `llms.txt` that the page does not hold. Refer to
	// `lib/llms.ts`.
	llms: {
		publicPage: "Pagina pubblica",
		access:
			"Per accedere serve un account Google. Il codice è open source con licenza MIT.",
		warnings: "Avvertenze",
	},

	// The page `/privacy`. The structure follows the policy of ScontrinoZero:
	// articles 13 and 14 of the GDPR. Each section holds paragraphs, a list,
	// or both. A section with `contact` ends with the address of the instance.
	// `tos` below has the same shape, thus `LegalPage` shows the two.
	privacy: {
		title: "Informativa sul trattamento dei dati personali",
		description:
			"Quali dati tratta Yume, perché, con chi e per quanto tempo, e come esercitare i tuoi diritti.",
		subtitle:
			"ai sensi del Regolamento UE 2016/679 (GDPR) e del D.Lgs. 196/2003",
		updated: "Ultimo aggiornamento: novembre 2026",
		contactLead: "Per ogni domanda sui tuoi dati scrivi a",
		sections: [
			{
				title: "1. Titolare del trattamento",
				paragraphs: [
					"Il titolare del trattamento per l'istanza ufficiale di Yume, yumemiles.com, è Annadermolab, ditta individuale, con sede in Torino (TO), P.IVA 11836750015.",
					"Yume è open source. Chi lo installa sul proprio server è titolare dei dati di quella installazione, e questa informativa non vale per essa.",
				],
				items: [],
				contact: true,
			},
			{
				title: "2. Dati personali trattati",
				paragraphs: [
					"Yume tratta solo i dati che servono a mostrarti saldi e miglia potenziali.",
				],
				items: [
					"Dall'account Google, al primo accesso: l'indirizzo email e l'identificativo dell'account. Yume non chiede a Google il nome né la foto del profilo.",
					"Dati che inserisci tu: i programmi fedeltà, i saldi con la loro data e le eventuali scadenze dei punti, e le valute preferite.",
					"Dati della sessione: indirizzo IP e tipo di browser del dispositivo da cui accedi.",
					"Se colleghi un assistente AI (sezione 4-bis): il nome e l'indirizzo dell'applicazione che hai autorizzato, i permessi che le hai dato, la data dell'autorizzazione e i codici di accesso che Yume le rilascia.",
					"Se diventi sostenitore: gli identificativi del cliente e dell'abbonamento presso Stripe, lo stato dell'abbonamento e la data di fine del periodo pagato. Yume invia a Stripe il tuo indirizzo email.",
					"Yume non chiede né conserva password, carte di pagamento o credenziali dei programmi fedeltà, e non si collega ai tuoi conti. I dati della carta li inserisci sulla pagina di Stripe, e Yume non li riceve.",
				],
				contact: false,
			},
			{
				title: "3. Finalità e basi giuridiche",
				paragraphs: [],
				items: [
					"Accesso, gestione dell'account e calcolo delle miglia potenziali: esecuzione del contratto (art. 6(1)(b) GDPR).",
					"Collegamento di un assistente AI che scegli tu, e invio a esso dei dati che ti richiede: esecuzione del contratto (art. 6(1)(b) GDPR). Il collegamento è facoltativo e lo attivi solo tu.",
					"Pagamento e rinnovo dell'account sostenitore: esecuzione del contratto (art. 6(1)(b) GDPR). Conservazione delle registrazioni dei pagamenti: obbligo di legge (art. 6(1)(c) GDPR).",
					"Sicurezza delle sessioni e prevenzione degli abusi: legittimo interesse (art. 6(1)(f) GDPR).",
					"Risposta alle autorità nei casi previsti dalla legge: obbligo di legge (art. 6(1)(c) GDPR).",
					"Yume non fa profilazione né pubblicità, non usa servizi di analisi e non traccia il comportamento.",
				],
				contact: false,
			},
			{
				title: "4. Uso dei dati ricevuti da Google",
				paragraphs: [
					"Yume usa l'indirizzo email e l'identificativo dell'account Google solo per creare il tuo account e farti accedere. Non li usa per pubblicità, non li vende, non li cede a terzi e non li usa per addestrare modelli di intelligenza artificiale.",
					"L'uso e il trasferimento ad altre app delle informazioni ricevute dalle API di Google rispettano le Google API Services User Data Policy (developers.google.com/terms/api-services-user-data-policy), inclusi i requisiti di Limited Use.",
					"Yume non invia a un assistente AI l'indirizzo email né l'identificativo dell'account Google.",
				],
				items: [],
				contact: false,
			},
			{
				title: "4-bis. Assistenti AI collegati (connettore MCP)",
				paragraphs: [
					"Puoi collegare a Yume un assistente AI, per esempio Claude di Anthropic oppure ChatGPT o Codex di OpenAI, tramite il Model Context Protocol (MCP). Il collegamento è facoltativo e richiede l'account sostenitore.",
					"Quando colleghi l'assistente, Yume ti chiede di accedere con Google e ti mostra una pagina di autorizzazione con il nome dell'applicazione e i permessi richiesti. Solo se accetti, Yume rilascia all'applicazione un codice di accesso personale.",
					"Con il tuo codice di accesso l'assistente può leggere i tuoi programmi, i saldi con le scadenze e le miglia potenziali, leggere il catalogo pubblico dei programmi e delle regole di trasferimento, e aggiungere un nuovo saldo a un tuo programma. Non può cancellare dati, non può modificare il tuo account e non può trasferire punti: Yume non muove punti tra programmi.",
					"Yume riceve dall'assistente solo i dati di ogni richiesta, per esempio il programma, il saldo e la data di un nuovo saldo. Yume non riceve né conserva le tue conversazioni con l'assistente, le immagini che gli mostri o altri contenuti.",
					"L'assistente lo scegli tu, e il suo fornitore tratta i dati che Yume gli invia come titolare autonomo, secondo la propria informativa. Per Claude il fornitore è Anthropic: anthropic.com/legal/privacy. Per ChatGPT e Codex il fornitore è OpenAI: openai.com/policies/privacy-policy. Yume non sceglie il fornitore, non gli invia dati per conto proprio e non ha con esso un contratto per i tuoi dati.",
					"Puoi revocare in ogni momento l'accesso di ogni assistente dalla sezione \"Assistenti collegati\" della dashboard. La revoca blocca subito l'assistente e cancella i suoi codici di accesso. Scollegare il connettore nell'app dell'assistente non basta a revocare l'accesso su Yume. La cancellazione del tuo account revoca anche ogni accesso.",
				],
				items: [],
				contact: false,
			},
			{
				title: "5. Sicurezza dei dati",
				paragraphs: [],
				items: [
					"Tutte le connessioni usano HTTPS.",
					"Il cookie della sessione ha gli attributi Secure e HttpOnly: viaggia solo su HTTPS e gli script della pagina non lo leggono.",
					"I codici di accesso degli assistenti AI sono conservati solo in forma cifrata con una funzione di hash: chi leggesse il database non potrebbe usarli. Ogni codice vale solo per Yume e solo per i permessi che hai accettato.",
					"Il database non è raggiungibile da internet: lo legge solo il server di Yume, e solo il titolare accede al server.",
				],
				contact: false,
			},
			{
				title: "6. Natura del conferimento",
				paragraphs: [
					"L'email dell'account Google è necessaria: senza, l'account non si crea. Programmi e saldi sono facoltativi, ma senza di essi Yume non calcola nulla. Il collegamento di un assistente AI è facoltativo: senza, Yume funziona allo stesso modo. L'account sostenitore è facoltativo: per attivarlo servono i dati di pagamento che chiede Stripe.",
				],
				items: [],
				contact: false,
			},
			{
				title: "7. Destinatari",
				paragraphs: [
					"I dati non sono venduti né ceduti a terzi per loro finalità. Ricevono dati solo:",
				],
				items: [
					"Google Ireland Ltd, che gestisce l'accesso con il tuo account Google come titolare autonomo. Informativa: policies.google.com/privacy.",
					"IONOS SE (Germania), che fornisce il server su cui girano Yume e il suo database, come responsabile del trattamento (art. 28 GDPR). Informativa: ionos.it/terms-gtc/terms-privacy.",
					"Cloudflare Inc., per la rete, la protezione del sito e l'inoltro delle email all'indirizzo della privacy, come responsabile del trattamento (art. 28 GDPR). Informativa: cloudflare.com/privacypolicy.",
					"Stripe Payments Europe, Ltd (Irlanda), solo se diventi sostenitore, per il pagamento, il rinnovo e le ricevute dell'abbonamento. Stripe tratta i dati di pagamento come responsabile del trattamento (art. 28 GDPR) e, per i propri obblighi di legge e la prevenzione delle frodi, come titolare autonomo. Informativa: stripe.com/privacy.",
					"Il fornitore dell'assistente AI che colleghi tu, per esempio Anthropic per Claude o OpenAI per ChatGPT e Codex, solo se lo colleghi e solo per i dati che l'assistente richiede, come titolare autonomo (sezione 4-bis).",
					"Le autorità pubbliche, solo nei casi previsti dalla legge.",
				],
				contact: false,
			},
			{
				title: "8. Trasferimenti extra-UE",
				paragraphs: [
					"Google, Cloudflare e Stripe possono trattare dati negli Stati Uniti. Il trasferimento si basa sul Data Privacy Framework UE-USA e sulle Clausole Contrattuali Standard della Commissione europea (decisione 2021/914).",
					"Il fornitore di un assistente AI può trattare dati fuori dall'Unione europea, per esempio negli Stati Uniti. In quel caso l'invio avviene su tua richiesta, quando colleghi l'assistente e quando gli chiedi un'operazione, e il trasferimento segue le garanzie indicate nell'informativa del fornitore.",
				],
				items: [],
				contact: false,
			},
			{
				title: "9. Periodo di conservazione",
				paragraphs: [],
				items: [
					"Account, programmi e saldi: finché l'account esiste. Dopo una richiesta di cancellazione sono eliminati entro 30 giorni.",
					"Sessione, con indirizzo IP e browser: finché la sessione esiste. Una sessione scade 7 giorni dopo l'ultimo uso e si chiude subito con Esci.",
					"Autorizzazione di un assistente AI: finché non la revochi o non cancelli l'account.",
					"Identificativi e stato dell'abbonamento: finché l'account esiste. Le registrazioni dei pagamenti restano presso Stripe e nella contabilità del titolare per 10 anni (art. 2220 c.c.).",
					"Codici di accesso di un assistente AI: un codice di accesso scade dopo 1 ora; un codice di rinnovo scade dopo 30 giorni ed è sostituito a ogni uso. I codici scaduti o revocati sono eliminati entro un giorno.",
					"Per chiedere la cancellazione del tuo account e di tutti i suoi dati, scrivi all'indirizzo qui sotto. Puoi anche togliere a Yume l'accesso al tuo account Google da myaccount.google.com/connections.",
				],
				contact: true,
			},
			{
				title: "10. Diritti dell'interessato",
				paragraphs: [
					"Ai sensi degli artt. 15–22 GDPR puoi chiedere l'accesso ai tuoi dati e una copia (art. 15), la rettifica (art. 16), la cancellazione (art. 17), la limitazione (art. 18), la portabilità in formato JSON (art. 20) e opporti al trattamento basato sul legittimo interesse (art. 21).",
					"Puoi proporre reclamo al Garante per la protezione dei dati personali (www.gpdp.it), ai sensi dell'art. 77 GDPR.",
					"Rispondiamo entro 30 giorni dalla richiesta (art. 12 GDPR).",
				],
				items: [],
				contact: true,
			},
			{
				title: "11. Minori",
				paragraphs: [
					"Yume non è rivolto a chi ha meno di 14 anni (art. 2-quinquies D.Lgs. 196/2003). Se veniamo a sapere che un account appartiene a un minore di 14 anni, lo cancelliamo.",
				],
				items: [],
				contact: false,
			},
			{
				title: "12. Cookie",
				paragraphs: [
					"Yume usa solo cookie tecnici, necessari all'accesso: il cookie della sessione, valido 7 giorni dall'ultimo uso, e un cookie temporaneo che protegge il passaggio da Google. Nessun cookie di profilazione o di terze parti: per questo la pagina non chiede un consenso (Linee guida del Garante sui cookie del 10 giugno 2021). Il collegamento di un assistente AI non usa cookie aggiuntivi: l'assistente si identifica con il proprio codice di accesso.",
				],
				items: [],
				contact: false,
			},
			{
				title: "13. Aggiornamenti",
				paragraphs: [
					"La data in alto indica l'ultima modifica. Una modifica sostanziale riporta in questa pagina la nuova data e il cambiamento.",
				],
				items: [],
				contact: false,
			},
		],
	},

	// The page `/connector`: the public documentation of the MCP server, with
	// the shape of a legal page. Paragraph 4.7.4 of `docs/architecture.md`.
	connector: {
		title: "Collegare un assistente AI a Yume",
		description:
			"Come collegare Claude, Claude Code, ChatGPT, Codex o un altro assistente AI ai tuoi saldi su Yume con il connettore MCP.",
		subtitle: "Connettore MCP di yumemiles.com",
		updated: "Ultimo aggiornamento: novembre 2026",
		contactLead: "Per un problema con il connettore scrivi a",
		sections: [
			{
				title: "Cos'è",
				paragraphs: [
					"Yume offre un server MCP (Model Context Protocol). Un assistente AI collegato, per esempio Claude, legge i tuoi saldi e le miglia potenziali, e aggiunge un saldo quando glielo chiedi. Puoi mostrargli lo screenshot dell'app del programma e fargli scrivere il saldo.",
					"Serve un account Yume con l'account sostenitore. L'accesso usa il tuo account Google, come sul sito.",
				],
				items: [],
				contact: false,
			},
			{
				title: "Indirizzo del server",
				paragraphs: [
					"https://yumemiles.com/mcp",
					"Se hai installato Yume sul tuo server, l'indirizzo è https://<il tuo dominio>/mcp.",
				],
				items: [],
				contact: false,
			},
			{
				title: "Collegare un assistente",
				paragraphs: [
					"Aggiungi https://yumemiles.com/mcp come connettore personalizzato del tuo assistente. Poi accedi a Yume con Google e, nella pagina di autorizzazione di Yume, controlla dove va il codice: claude.ai per Claude, chatgpt.com per ChatGPT, localhost o 127.0.0.1 per Claude Code e Codex, cioè il tuo computer. Autorizza solo se hai avviato tu il collegamento.",
					"Come aggiungere un connettore in Claude: support.claude.com/en/articles/11175166. Come aggiungere un server MCP in Claude Code: code.claude.com/docs/en/mcp.",
					"Come collegare un server MCP a ChatGPT e a Codex: learn.chatgpt.com/docs/extend/mcp.",
				],
				items: [],
				contact: false,
			},
			{
				title: "Cosa può fare l'assistente",
				paragraphs: [],
				items: [
					"list_accounts: legge i tuoi conti, con il saldo più recente e le scadenze dei punti.",
					"get_potential: legge le miglia potenziali di ogni valuta delle compagnie aeree.",
					"get_catalogue: legge le valute, i programmi e le regole di trasferimento in vigore.",
					"add_snapshot: aggiunge un saldo a un tuo conto. È l'unico strumento che scrive.",
				],
				contact: false,
			},
			{
				title: "Esempi di richieste",
				paragraphs: [],
				items: [
					"Quante miglia Avios potenziali ho?",
					"Aggiorna il saldo Amex: ecco lo screenshot dell'app.",
					"Da quali programmi posso trasferire punti a Flying Blue?",
				],
				contact: false,
			},
			{
				title: "Limiti",
				paragraphs: [
					"L'assistente non può cancellare conti o saldi e non può trasferire punti: Yume non muove punti tra programmi. Le miglia potenziali sono un calcolo, non un saldo, e un trasferimento di punti è permanente.",
				],
				items: [],
				contact: false,
			},
			{
				title: "Revocare l'accesso",
				paragraphs: [
					"Nella dashboard di Yume, nella sezione Assistenti collegati, premi Revoca. L'assistente perde l'accesso subito. Rimuovere il connettore dall'assistente non basta a revocare l'accesso su Yume.",
				],
				items: [],
				contact: false,
			},
			{
				title: "Dati personali",
				paragraphs: [
					"La sezione 4-bis dell'informativa privacy, alla pagina /privacy, descrive quali dati riceve l'assistente e chi li tratta.",
				],
				items: [],
				contact: true,
			},
		],
	},

	// The page `/support`: the contact of the service. The directories of the
	// assistants ask for a public page of support. Paragraph 4.7.4 of
	// `docs/architecture.md`.
	support: {
		title: "Assistenza",
		description:
			"Come contattare Yume per un problema con l'account, con i saldi o con un assistente AI collegato.",
		subtitle: "Assistenza di yumemiles.com",
		updated: "Ultimo aggiornamento: novembre 2026",
		contactLead: "Scrivi a",
		sections: [
			{
				title: "Contatti",
				paragraphs: [
					"Per un problema con l'account, con un saldo, con il calcolo delle miglia potenziali o con un assistente AI collegato, scrivi una email. Indica la pagina o l'assistente, cosa hai fatto e cosa hai visto.",
					"Non scrivere nell'email codici di accesso o password.",
				],
				items: [],
				contact: true,
			},
		],
	},

	// The page `/tos`. The structure follows the terms of ScontrinoZero. Yume
	// is for private persons, not for professionals: thus the Code of the
	// consumer applies, and the court is the court of the consumer.
	tos: {
		title: "Termini del servizio",
		description:
			"Le condizioni d'uso di Yume, il calcolatore delle miglia potenziali, e dell'account sostenitore.",
		subtitle: "Condizioni d'uso di yumemiles.com",
		updated: "Ultimo aggiornamento: novembre 2026",
		contactLead: "Per informazioni o reclami scrivi a",
		sections: [
			{
				title: "1. Oggetto del servizio",
				paragraphs: [
					"Yume è un servizio di Annadermolab, ditta individuale, con sede in Torino (TO), P.IVA 11836750015. Mostra i saldi dei programmi fedeltà che inserisci e calcola le miglia potenziali per ogni valuta, ai rapporti di trasferimento ufficiali per l'Italia.",
					"L'account gratuito non ha costi. L'account sostenitore è a pagamento e aggiunge le funzioni della sezione 7-bis.",
					"Yume non si collega ai tuoi conti, non legge i saldi in automatico e non trasferisce punti. Non appartiene ad American Express, a Revolut, a Klarna né ai programmi fedeltà citati.",
				],
				items: [],
				contact: false,
			},
			{
				title: "2. Accettazione",
				paragraphs: [
					"Il primo accesso con il tuo account Google crea l'account Yume e comporta l'accettazione di questi Termini e la presa visione dell'Informativa privacy.",
				],
				items: [],
				contact: false,
			},
			{
				title: "3. Requisiti",
				paragraphs: [],
				items: [
					"Un account Google valido.",
					"Almeno 14 anni di età. Se hai meno di 18 anni serve il consenso di un genitore.",
					"Uso personale e non commerciale.",
				],
				contact: false,
			},
			{
				title: "4. Account e sicurezza",
				paragraphs: [
					"L'accesso dipende dal tuo account Google: sei tu a custodirlo. Se perdi l'accesso all'account Google, perdi anche l'accesso a Yume. Se noti un accesso che non hai fatto tu, esci da Yume e scrivici.",
				],
				items: [],
				contact: true,
			},
			{
				title: "5. Natura dei valori calcolati",
				paragraphs: [],
				items: [
					"Le miglia potenziali sono un calcolo, non un saldo. Sono un massimo per ogni valuta: gli stessi punti non vanno su due programmi.",
					"I rapporti di trasferimento vengono dalle pagine ufficiali dei programmi e hanno una data. I programmi possono cambiarli senza preavviso.",
					"Un trasferimento di punti è definitivo. Prima di trasferire, verifica rapporto, minimi e disponibilità sul sito del programma.",
					"Yume non fornisce consulenza finanziaria e non sceglie per te.",
				],
				contact: false,
			},
			{
				title: "6. Obblighi dell'utente",
				paragraphs: [],
				items: [
					"Usare il servizio nel rispetto della legge.",
					"Non tentare di accedere ai dati di altri utenti né di aggirare le misure di sicurezza.",
					"Non sovraccaricare il servizio con richieste automatiche.",
				],
				contact: false,
			},
			{
				title: "7. Disponibilità del servizio",
				paragraphs: [
					"Yume è fornito così com'è. Non garantiamo continuità né assenza di errori, e possiamo cambiare o sospendere funzioni.",
					"Se chiudiamo Yume o togliamo una funzione dell'account sostenitore prima della fine del periodo pagato, ti rimborsiamo la parte del prezzo del periodo che resta.",
				],
				items: [],
				contact: false,
			},
			{
				title: "7-bis. Account sostenitore",
				paragraphs: [
					"L'account gratuito comprende Amex e Revolut senza limiti e 2 programmi aerei. L'account sostenitore aggiunge le altre fonti di punti, per esempio Klarna e i programmi alberghieri, i programmi aerei senza limiti, le scadenze dei punti e il collegamento di un assistente AI.",
				],
				items: [
					"Prezzo: 9,99 € all'anno, prezzo finale. Il pagamento avviene sulla pagina di Stripe Payments Europe, Ltd: Yume non riceve i dati della carta. Stripe ti invia la ricevuta via email.",
					"Inizio: l'account sostenitore si attiva subito dopo il pagamento. Accettando questi Termini al pagamento chiedi che il servizio inizi prima della fine del periodo di recesso.",
					"Rinnovo automatico: l'abbonamento si rinnova ogni anno allo stesso prezzo. Puoi disdire in ogni momento con \"Gestisci abbonamento\" nella dashboard: l'account sostenitore resta attivo fino alla fine del periodo pagato e non si rinnova.",
					"Diritto di recesso: puoi recedere entro 14 giorni dal pagamento senza indicare un motivo (art. 52 D.Lgs. 206/2005). Scrivi all'indirizzo qui sotto, anche con il modulo tipo di recesso (Allegato I, parte B, del Codice del Consumo). Ti rimborsiamo l'intero importo entro 14 giorni con lo stesso mezzo di pagamento, e l'account torna gratuito.",
					"Rinnovo non riuscito: se il pagamento del rinnovo non va a buon fine l'account torna gratuito. Stripe ritenta l'addebito per alcuni giorni; con il pagamento l'account sostenitore riprende.",
					"Fine dell'account sostenitore: non perdi dati. Conti, saldi e scadenze restano, ma non puoi aggiungere conti o scadenze oltre i limiti dell'account gratuito.",
				],
				contact: true,
			},
			{
				title: "8. Responsabilità",
				paragraphs: [
					"Nei limiti consentiti dalla legge, Annadermolab non risponde di perdite di punti o miglia, di trasferimenti decisi in base ai calcoli, di modifiche dei programmi fedeltà o di interruzioni dovute a servizi di terzi. Restano salve la responsabilità per dolo o colpa grave (art. 1229 c.c.) e i diritti che il Codice del Consumo (D.Lgs. 206/2005) riconosce al consumatore.",
				],
				items: [],
				contact: false,
			},
			{
				title: "9. Cancellazione e sospensione",
				paragraphs: [
					"Puoi chiedere la cancellazione del tuo account in ogni momento scrivendoci. I dati sono rimossi come descritto nell'Informativa privacy. La cancellazione chiude anche l'abbonamento dell'account sostenitore, senza altri addebiti.",
					"Possiamo sospendere o chiudere un account che viola questi Termini, con un avviso via email quando è possibile.",
				],
				items: [],
				contact: true,
			},
			{
				title: "10. Proprietà intellettuale",
				paragraphs: [
					"Il codice di Yume è open source con licenza MIT. I nomi e i loghi dei programmi fedeltà, delle carte e delle compagnie aeree sono marchi dei rispettivi proprietari e servono solo a identificarli.",
				],
				items: [],
				contact: false,
			},
			{
				title: "11. Dati personali",
				paragraphs: [
					"Il trattamento dei dati personali è descritto nell'Informativa privacy, alla pagina /privacy.",
				],
				items: [],
				contact: false,
			},
			{
				title: "12. Modifiche ai Termini",
				paragraphs: [
					"La data in alto indica l'ultima modifica. Una modifica sostanziale è pubblicata su questa pagina con un preavviso ragionevole prima dell'entrata in vigore. Se continui a usare Yume dopo quella data, accetti i nuovi Termini.",
				],
				items: [],
				contact: false,
			},
			{
				title: "13. Legge applicabile e foro competente",
				paragraphs: [
					"Questi Termini sono regolati dalla legge italiana. Per le controversie con un consumatore è competente il foro del luogo di residenza o domicilio del consumatore (art. 66-bis D.Lgs. 206/2005).",
				],
				items: [],
				contact: true,
			},
		],
	},
};

/** The shape of the text of each language. The base language gives it. */
export type Messages = typeof it;
