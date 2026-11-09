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

	removeBalance: "Cancella saldo",
	removeBalanceQuestion: "Cancelli il saldo? Torna al saldo precedente.",
	removeAccount: "Rimuovi conto",
	removeAccountQuestion: "Rimuovi il conto e tutti i suoi saldi?",
	removeError: "Rimozione non riuscita.",
	confirm: "Conferma",

	save: "Salva",
	saving: "Salvataggio…",
	cancel: "Annulla",
	saveError: "Salvataggio non riuscito.",

	loading: "Caricamento…",
	loadError: "Dati non disponibili.",

	signInTitle: "Accedi",
	signIn: "Accedi",
	signInWithGoogle: "Accedi con Google",
	signInNote: "Il primo accesso crea il tuo account.",
	signInError: "Accesso con Google non riuscito.",
	homeSignInNote: "Ti basta un account Google.",
	signOut: "Esci",

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
					"Dall'account Google, al primo accesso: nome, indirizzo email, immagine del profilo e identificativo dell'account. Yume conserva anche i token che Google restituisce all'accesso.",
					"Dati che inserisci tu: i programmi fedeltà, i saldi con la loro data e le valute preferite.",
					"Dati della sessione: indirizzo IP e tipo di browser del dispositivo da cui accedi.",
					"Yume non chiede né conserva password, carte di pagamento o credenziali dei programmi fedeltà, e non si collega ai tuoi conti.",
				],
				contact: false,
			},
			{
				title: "3. Finalità e basi giuridiche",
				paragraphs: [],
				items: [
					"Accesso, gestione dell'account e calcolo delle miglia potenziali: esecuzione del contratto (art. 6(1)(b) GDPR).",
					"Sicurezza delle sessioni e prevenzione degli abusi: legittimo interesse (art. 6(1)(f) GDPR).",
					"Risposta alle autorità nei casi previsti dalla legge: obbligo di legge (art. 6(1)(c) GDPR).",
					"Yume non fa profilazione né pubblicità, non usa servizi di analisi e non traccia il comportamento.",
				],
				contact: false,
			},
			{
				title: "4. Natura del conferimento",
				paragraphs: [
					"Nome ed email dell'account Google sono necessari: senza, l'account non si crea. Programmi e saldi sono facoltativi, ma senza di essi Yume non calcola nulla.",
				],
				items: [],
				contact: false,
			},
			{
				title: "5. Destinatari",
				paragraphs: [
					"I dati non sono venduti né ceduti a terzi per loro finalità. Ricevono dati solo:",
				],
				items: [
					"Google Ireland Ltd, che gestisce l'accesso con il tuo account Google come titolare autonomo. Informativa: policies.google.com/privacy.",
					"IONOS SE (Germania), che fornisce il server su cui girano Yume e il suo database, come responsabile del trattamento (art. 28 GDPR). Informativa: ionos.it/terms-gtc/terms-privacy.",
					"Cloudflare Inc., per la rete, la protezione del sito e l'inoltro delle email all'indirizzo della privacy, come responsabile del trattamento (art. 28 GDPR). Informativa: cloudflare.com/privacypolicy.",
					"Le autorità pubbliche, solo nei casi previsti dalla legge.",
				],
				contact: false,
			},
			{
				title: "6. Trasferimenti extra-UE",
				paragraphs: [
					"Google e Cloudflare possono trattare dati negli Stati Uniti. Il trasferimento si basa sul Data Privacy Framework UE-USA e sulle Clausole Contrattuali Standard della Commissione europea (decisione 2021/914).",
				],
				items: [],
				contact: false,
			},
			{
				title: "7. Periodo di conservazione",
				paragraphs: [],
				items: [
					"Account, programmi e saldi: finché l'account esiste. Dopo una richiesta di cancellazione sono eliminati entro 30 giorni.",
					"Sessione, con indirizzo IP e browser: finché la sessione esiste. Una sessione scade 7 giorni dopo l'ultimo uso e si chiude subito con Esci.",
				],
				contact: false,
			},
			{
				title: "8. Diritti dell'interessato",
				paragraphs: [
					"Ai sensi degli artt. 15–22 GDPR puoi chiedere l'accesso ai tuoi dati e una copia (art. 15), la rettifica (art. 16), la cancellazione (art. 17), la limitazione (art. 18), la portabilità in formato JSON (art. 20) e opporti al trattamento basato sul legittimo interesse (art. 21).",
					"Puoi proporre reclamo al Garante per la protezione dei dati personali (www.gpdp.it), ai sensi dell'art. 77 GDPR.",
					"Rispondiamo entro 30 giorni dalla richiesta (art. 12 GDPR).",
				],
				items: [],
				contact: true,
			},
			{
				title: "9. Minori",
				paragraphs: [
					"Yume non è rivolto a chi ha meno di 14 anni (art. 2-quinquies D.Lgs. 196/2003). Se veniamo a sapere che un account appartiene a un minore di 14 anni, lo cancelliamo.",
				],
				items: [],
				contact: false,
			},
			{
				title: "10. Cookie",
				paragraphs: [
					"Yume usa solo cookie tecnici, necessari all'accesso: il cookie della sessione, valido 7 giorni dall'ultimo uso, e un cookie temporaneo che protegge il passaggio da Google. Nessun cookie di profilazione o di terze parti: per questo la pagina non chiede un consenso (Linee guida del Garante sui cookie del 10 giugno 2021).",
				],
				items: [],
				contact: false,
			},
			{
				title: "11. Aggiornamenti",
				paragraphs: [
					"La data in alto indica l'ultima modifica. Una modifica sostanziale riporta in questa pagina la nuova data e il cambiamento.",
				],
				items: [],
				contact: false,
			},
		],
	},

	// The page `/tos`. The structure follows the terms of ScontrinoZero. Yume
	// is for private persons, not for professionals: thus the Code of the
	// consumer applies, and the court is the court of the consumer.
	tos: {
		title: "Termini del servizio",
		subtitle: "Condizioni d'uso di yumemiles.com",
		updated: "Ultimo aggiornamento: novembre 2026",
		contactLead: "Per informazioni o reclami scrivi a",
		sections: [
			{
				title: "1. Oggetto del servizio",
				paragraphs: [
					"Yume è un servizio gratuito di Annadermolab, ditta individuale, con sede in Torino (TO), P.IVA 11836750015. Mostra i saldi dei programmi fedeltà che inserisci e calcola le miglia potenziali per ogni valuta, ai rapporti di trasferimento ufficiali per l'Italia.",
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
					"Yume è gratuito e fornito così com'è. Non garantiamo continuità né assenza di errori, e possiamo cambiare o sospendere funzioni.",
				],
				items: [],
				contact: false,
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
					"Puoi chiedere la cancellazione del tuo account in ogni momento scrivendoci. I dati sono rimossi come descritto nell'Informativa privacy.",
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
