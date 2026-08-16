/**
 * The text of the user interface, in Italian.
 *
 * This file is the only place with Italian text. The server code and the shared
 * code hold no Italian text. Refer to the section Language rules in `CLAUDE.md`.
 *
 * Keep each item short. One short sentence is sufficient for a warning.
 */
export const text = {
	appName: "Yume",

	// The title of the page. It is the `h1`, and it holds the words of the
	// question that a person writes in a search engine. The name of the
	// application is on the flaps of the masthead, not here.
	homeTitle: "Quante miglia valgono i tuoi punti",
	homeLead:
		"L'app della tua banca ti mostra un saldo di punti. Yume ti dice quante miglia diventano, valuta per valuta, ai rapporti di trasferimento ufficiali di oggi.",
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
			title: "Rapporti ufficiali, non a memoria",
			body: "Ogni rapporto è letto dalla pagina ufficiale del programma. Quando cambia, la regola vecchia resta come storico e ne entra una nuova con la sua data.",
		},
		{
			title: "È un calcolo, non un saldo",
			body: "Le miglia potenziali sono il massimo che otterresti trasferendo tutti i punti di quella valuta, ai rapporti di oggi. Yume non muove nessun punto.",
		},
	],

	// The mark and the text of a function that the application does not hold.
	// The text is in the future: a function that no code gives must never
	// arrive in the present tense. Paragraph 5.5.4 of `docs/architecture.md`
	// gives the rule.
	homeSoonBadge: "Presto",
	homeSoonTitle: "Dove puoi volare",
	homeSoon:
		"Oggi Yume risponde a quanto valgono i tuoi punti. Il passo dopo sarà la domanda opposta: dato un obiettivo, Yume dirà se il tuo potenziale ci arriva e con quale programma.",

	homeFaqTitle: "Domande frequenti",
	// The details of the catalogue live here, below the product. A visitor reads
	// what Yume does first: the six programmes of Avios are an answer, not an
	// opening. Each answer opens with the fact.
	homeFaq: [
		{
			question: "Quali punti posso seguire con Yume?",
			answer:
				"I punti Amex Membership Rewards e i RevPoints di Revolut, per l'Italia. Da lì il catalogo raggiunge 19 programmi aerei. C'è anche Miles & More, il programma di ITA Airways, che oggi nessuna delle due fonti raggiunge.",
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
				"Dalla pagina ufficiale di ogni programma, mai a memoria. Ogni regola ha una data di inizio e una di fine: quando un rapporto cambia, la regola vecchia resta come storico e il calcolo usa quella valida oggi.",
		},
		{
			question: "Yume trasferisce i punti al posto mio?",
			answer:
				"No. Yume calcola e basta, non tocca i tuoi conti. Il trasferimento lo fai tu sul sito della banca o del programma, ed è definitivo: i punti trasferiti non tornano indietro.",
		},
		{
			question: "Yume guadagna sui trasferimenti che consiglia?",
			answer:
				"No. Yume non mostra link di affiliazione e non prende commissioni. Il codice è open source con licenza MIT, quindi puoi installarlo sul tuo server.",
		},
		{
			question: "Come ottengo un account?",
			answer:
				"Solo con un invito di chi usa già Yume. Ogni utente ha due inviti e ogni codice vale 24 ore.",
		},
	],

	notFound: "Questo volo non è in partenza: la pagina che cerchi non esiste.",
	notFoundLink: "Torna al tabellone",

	homeScreenshotTitle: "Dopo l'accesso",
	homeScreenshotAlt:
		"La dashboard di Yume: una scheda per ogni valuta, con le miglia potenziali sul tabellone.",

	// The footer of each surface. Yume names American Express, Revolut and each
	// airline programme of the catalogue, therefore it must say that it belongs
	// to none of them.
	footerDisclaimer:
		"Yume non è affiliato ad American Express, a Revolut, alle compagnie aeree o ai programmi fedeltà citati. Tutti i marchi appartengono ai rispettivi proprietari.",
	footerIndependence:
		"Nessun link di affiliazione: Yume non guadagna sui trasferimenti che calcola.",
	footerSource: "Codice su GitHub",

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

	invitesTitle: "Inviti",
	invitesBody: "Puoi invitare 2 persone. Ogni codice vale 24 ore.",
	newInvite: "Crea invito",
	invitesNoneLeft: "Hai usato tutti i tuoi inviti.",
	inviteValidUntil: "Valido fino al",
	inviteUsedState: "Usato",
	inviteExpiredState: "Scaduto",
	inviteLinkLabel: "Link di invito",
	copy: "Copia",
	copied: "Copiato",

	save: "Salva",
	saving: "Salvataggio…",
	cancel: "Annulla",
	saveError: "Salvataggio non riuscito.",

	loading: "Caricamento…",
	loadError: "Dati non disponibili.",

	signInTitle: "Accedi",
	signUpTitle: "Crea il tuo account",
	emailLabel: "Email",
	passwordLabel: "Password",
	nameLabel: "Nome",
	inviteCodeLabel: "Codice di invito",
	signIn: "Accedi",
	signUp: "Crea account",
	signOut: "Esci",
	toSignUp: "Ho un codice di invito",
	toSignIn: "Ho già un account",
	inviteOnly: "Puoi registrarti solo con un invito.",

	signInError: "Email o password non corretti.",
	inviteRequiredError: "Serve un codice di invito.",
	inviteUnknownError: "Codice non valido.",
	inviteExpiredError: "Codice scaduto.",
	inviteUsedError: "Codice già usato.",
	emailInUseError: "Email già registrata.",
	passwordShortError: "Password troppo corta.",
	authError: "Operazione non riuscita.",
} as const;
