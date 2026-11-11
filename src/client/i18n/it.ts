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

	// The links of the public page to the pages of the catalogue, the
	// calculator and the guides. Paragraph 5.5.5 of `docs/architecture.md`.
	homeExploreTitle: "Rapporti, calcolatore e guide",
	homeExploreCalculator: "Calcola le miglia dei tuoi punti, senza account",
	homeExploreCurrencies: "Tutte le valute delle miglia",

	// The pages of the catalogue: `/miglia`, `/miglia/<valuta>` and
	// `/punti/<fonte>`. Paragraph 5.5.5 of `docs/architecture.md`.
	//
	// No text here holds a ratio, a minimum or a quantity of the catalogue: the
	// page reads each value from the seed. A function receives the values that
	// the page already wrote with the locale of the page.
	catalogue: {
		breadcrumb: "Percorso",
		home: "Yume",
		currencies: "Valute",
		verified: "Ultima verifica dei rapporti:",
		verifiedOn: "Verificato il",
		exampleNote:
			"Gli esempi sono un calcolo ai rapporti di oggi, non un saldo.",
		routesTitle: "Rapporti di trasferimento",
		ratio: "Rapporto",
		minimum: "Minimo",
		increment: "Multipli di",
		example: (points: string) => `Calcolo con ${points} punti`,
		points: (formatted: string, count: number) =>
			count === 1 ? `${formatted} punto` : `${formatted} punti`,
		ratioLine: (from: string, to: string, currency: string) =>
			`${from} punti = ${to} ${currency}`,
		calculatorLink: "Calcola con i tuoi punti",
		signInLink: "Segui i tuoi saldi su Yume",
		faqTitle: "Domande frequenti",
		irreversibleQuestion: "Posso annullare un trasferimento di punti?",
		irreversibleAnswer:
			"No. Un trasferimento di punti è definitivo: i punti non tornano sulla carta. Prima trova il volo premio, poi trasferisci solo i punti che servono.",

		currency: {
			// 60 characters or fewer with the longest name of the catalogue.
			metaTitle: (currency: string) =>
				`Convertire punti in ${currency}: rapporti in Italia`,
			description: (currency: string, sources: string) =>
				`Da quali carte arriva ${currency} in Italia (${sources}): rapporto, minimo e multipli di ogni trasferimento, dalle pagine ufficiali.`,
			title: (currency: string) =>
				`Come convertire i tuoi punti in ${currency}`,
			// The answer opens the page: an assistant cites the paragraph that
			// answers.
			lead: (currency: string, count: number, sources: string) =>
				count === 1
					? `In Italia ${currency} arriva da una carta sola: ${sources}. Rapporto, minimo e multipli qui sotto sono letti dalla pagina ufficiale, con la data della verifica.`
					: `In Italia ${currency} arriva da ${count} carte: ${sources}. Rapporti, minimi e multipli qui sotto sono letti dalle pagine ufficiali, con la data della verifica.`,
			programsTitle: "Programmi della valuta",
			// A currency of more than one programme is one balance. Paragraph 3.1
			// of `docs/architecture.md`.
			programsShared: (currency: string, count: number) =>
				`${count} programmi usano ${currency}: è un saldo solo, non ${count}. Yume calcola una riga sola per la valuta e sceglie il programma che rende di più con il tuo saldo.`,
			programsOne: (currency: string, program: string) =>
				`${currency} è la valuta di ${program}.`,
			sourceQuestion: (source: string, currency: string) =>
				`Posso trasferire i punti ${source} in ${currency}?`,
			sourceYes: (routes: string) =>
				`Sì, in Italia: ${routes}. Sotto il minimo il programma non accetta il trasferimento.`,
			sourceNo: (source: string, currency: string) =>
				`No. Fra i partner di ${source} per l'Italia non c'è ${currency}.`,
			// One route in the answer above: the programme, the ratio and the
			// minimum.
			sourceRoute: (program: string, ratio: string, minimum: string) =>
				`verso ${program}, ${ratio}, minimo ${minimum}`,
		},

		source: {
			metaTitle: (source: string) =>
				`Punti ${source}: in quali miglia trasferirli`,
			description: (source: string) =>
				`Tutti i programmi aerei che ricevono i punti ${source} in Italia, con rapporto, minimo e multipli letti dalle pagine ufficiali.`,
			title: (source: string) => `Dove trasferire i punti ${source}`,
			lead: (source: string, programs: number, currencies: number) =>
				`In Italia i punti ${source} vanno in ${programs} programmi aerei, che usano ${currencies} valute diverse. Per ognuno trovi rapporto, minimo e multipli, letti dalla pagina ufficiale.`,
			unreachableTitle: "Valute che non raggiungi",
			unreachable: (source: string) =>
				`Per l'Italia non c'è una regola di trasferimento da ${source} verso queste valute:`,
			currencyLink: (currency: string) =>
				`Tutte le carte che danno ${currency}`,
			countQuestion: (source: string) =>
				`In quanti programmi aerei posso trasferire i punti ${source}?`,
			countAnswer: (programs: number, currencies: string) =>
				`In ${programs} programmi, con queste valute: ${currencies}.`,
			minimumQuestion: (source: string) =>
				`Qual è il minimo per trasferire i punti ${source}?`,
			minimumRange: (low: string, high: string) =>
				`Dipende dal programma: da ${low} a ${high}. Sopra il minimo trasferisci solo multipli del blocco del programma.`,
			minimumSame: (minimum: string) => `${minimum} per ogni programma.`,
		},

		hub: {
			metaTitle: "Miglia dai punti carta: tutte le valute in Italia",
			description:
				"Le valute delle miglia che ricevono punti da Amex, Revolut e Klarna in Italia, e quelle che non ne ricevono. Una pagina per valuta.",
			title: "Le valute delle miglia, una per una",
			lead: (reachable: number, unreachable: number) =>
				`Yume segue ${reachable} valute aeree che ricevono punti da Amex, Revolut o Klarna in Italia, e ${unreachable} che non ne ricevono. Ogni valuta ha la sua pagina con i rapporti ufficiali.`,
			reachableTitle: "Valute che ricevono punti",
			sourcesTitle: "Le carte",
			unreachableTitle: "Valute che nessuna carta raggiunge",
			unreachable:
				"Per queste valute Yume segue il saldo, ma in Italia nessuna carta del catalogo ci trasferisce punti:",
			from: (sources: string) => `da ${sources}`,
		},
	},

	// The page `/calcolatore`. Paragraph 5.5.6 of `docs/architecture.md`.
	calculator: {
		metaTitle: "Calcolatore miglia: punti Amex, Revolut e Klarna",
		description:
			"Scrivi i tuoi punti Amex, Revolut e Klarna e vedi quante miglia valgono in ogni valuta, ai rapporti ufficiali per l'Italia. Senza account.",
		title: "Calcola le miglia dei tuoi punti",
		lead: "Scrivi i punti che hai su ogni carta: il calcolatore mostra il massimo per ogni valuta, ai rapporti ufficiali di oggi per l'Italia. Non serve un account, e i numeri non lasciano il tuo browser.",
		formTitle: "I tuoi punti",
		pointsError: "Scrivi i punti in numeri.",
		empty: "Scrivi un saldo per vedere le miglia potenziali.",
		none: "Con questi punti nessun trasferimento raggiunge il minimo.",
		// The rows are maxima of different currencies. Their sum is a value that
		// no person can obtain.
		noSum: "Ogni riga è un massimo: gli stessi punti vanno in una valuta sola.",
		from: (source: string, points: string) => `da ${source} ${points}`,
		ratesLink: "Rapporti",
		howTitle: "Come calcola",
		how: [
			"Ogni carta conta da sola: sotto il minimo di un programma il trasferimento non c'è, e sopra il minimo passano solo i multipli del blocco.",
			"Se una valuta ha più programmi, per esempio gli Avios, il calcolatore sceglie il programma che rende di più con i tuoi punti.",
			"Un programma non accredita frazioni di miglio: il risultato è arrotondato per difetto.",
		],
		faq: [
			{
				question: "Il calcolatore salva i miei punti?",
				answer:
					"No. Il calcolo avviene nel browser e la pagina non invia i numeri a nessun server. Per seguire i saldi nel tempo serve un account Yume.",
			},
			{
				question: "Perché non c'è un totale delle miglia?",
				answer:
					"Perché gli stessi punti possono andare in una valuta sola. Ogni riga è il massimo di quella valuta: se trasferisci tutto in una, le altre scendono a zero.",
			},
			{
				question: "I rapporti sono aggiornati?",
				answer:
					"Il calcolatore usa le regole di oggi del catalogo di Yume: ogni rapporto è letto dalla pagina ufficiale per l'Italia, con la data della verifica.",
			},
		],
		signIn:
			"Vuoi seguire i saldi nel tempo? Accedi con Google: il primo accesso crea l'account.",
	},

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
	footerCalculator: "Calcolatore",
	footerCurrencies: "Valute",

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

	// The guides: `/guide/<slug>`. Paragraph 5.5.7 of `docs/architecture.md`.
	//
	// A guide holds only facts of the catalogue and of the calculation. The
	// session of the harness cannot read the official pages, thus a guide gives
	// no procedure of a programme and no time of the credit. No guide holds a
	// ratio: the table of the comparison reads the seed.
	//
	// `modified` moves only when the text changes. A date that moves with no
	// change is a false signal of freshness.
	guides: {
		updated: "Aggiornata il",
		relatedTitle: "Altre guide",
		// The answer of the table of the comparison. The page counts the
		// programmes of each source in the seed.
		matrixLead: (leader: string, programs: number, others: string) =>
			`${leader} raggiunge più programmi aerei: ${programs}. Seguono ${others}.`,
		matrixOther: (source: string, programs: number) =>
			`${source} con ${programs}`,
		matrixTitle: "Chi raggiunge cosa",
		matrixCurrency: "Valuta",
		matrixNone: "—",
		items: [
			{
				slug: "trasferire-punti-in-miglia",
				metaTitle: "Trasferire punti in miglia: rapporto, minimo, multipli",
				description:
					"Come funziona il trasferimento dei punti della carta in miglia aeree: il rapporto, il minimo, i multipli e l'arrotondamento. Il trasferimento è definitivo.",
				title: "Trasferire i punti della carta in miglia: come funziona",
				lead: "Un trasferimento converte i punti della carta nella valuta di un programma aereo a un rapporto fisso. Tre numeri decidono quante miglia ricevi: il rapporto, il minimo e i multipli. Il trasferimento è definitivo, quindi si fa dopo aver trovato il volo premio.",
				published: "2026-11-11",
				modified: "2026-11-11",
				matrix: false,
				sections: [
					{
						title: "Il rapporto",
						paragraphs: [
							"Il rapporto dice quanti punti della carta servono per un certo numero di miglia. Si scrive con due numeri: 5 : 4 vuol dire 4 miglia ogni 5 punti, 1 : 1 vuol dire un miglio per punto.",
							"Lo stesso programma della carta ha rapporti diversi verso partner diversi, e due carte hanno rapporti diversi verso la stessa compagnia. Per questo Yume legge ogni rapporto dalla pagina ufficiale, regola per regola.",
						],
						items: [],
					},
					{
						title: "Il minimo e i multipli",
						paragraphs: [
							"Sotto il minimo il programma non accetta il trasferimento. Sopra il minimo trasferisci solo multipli del blocco del programma, e i punti che avanzano restano sulla carta.",
							"Un esempio con numeri inventati: con blocchi da 400 punti e un saldo di 1.000 punti ne trasferisci 800, e 200 restano dove sono. Lo stesso saldo verso un programma con blocchi da 500 passa tutto.",
						],
						items: [],
					},
					{
						title: "L'arrotondamento",
						paragraphs: [
							"Un programma non accredita frazioni di miglio. Yume arrotonda sempre per difetto, così il valore calcolato non supera mai quello che riceveresti.",
						],
						items: [],
					},
					{
						title: "Una valuta, più programmi",
						paragraphs: [
							"Alcune valute hanno più programmi: sei programmi usano gli Avios, per esempio. È un saldo solo, ma ogni programma ha il suo rapporto, il suo minimo e i suoi multipli. Con lo stesso saldo un programma della valuta può rendere più di un altro.",
						],
						items: [],
					},
					{
						title: "Prima il volo, poi i punti",
						paragraphs: [
							"Un trasferimento non si annulla. L'ordine che evita di bloccare punti in una valuta che non ti serve è questo:",
						],
						items: [
							"Cerca il volo premio e controlla che ci sia posto.",
							"Controlla rapporto, minimo e multipli verso quel programma.",
							"Trasferisci solo i punti che servono, dall'app della carta o dal sito del programma.",
						],
					},
				],
				faq: [
					{
						question: "Posso annullare un trasferimento di punti?",
						answer:
							"No. Un trasferimento di punti è definitivo: i punti non tornano sulla carta. Prima trova il volo premio, poi trasferisci solo i punti che servono.",
					},
					{
						question: "Perché ricevo meno miglia del previsto?",
						answer:
							"Per i multipli e per l'arrotondamento. Passano solo multipli del blocco del programma, e un programma non accredita frazioni di miglio.",
					},
					{
						question: "Il rapporto è lo stesso per tutti i programmi?",
						answer:
							"No. Ogni coppia di carta e programma ha la sua regola, anche dentro la stessa valuta. Le pagine delle valute di Yume danno ogni rapporto con la sua data di verifica.",
					},
				],
			},
			{
				slug: "amex-revolut-klarna-miglia",
				metaTitle: "Amex, Revolut o Klarna: quali compagnie aeree raggiungi",
				description:
					"Quali valute delle miglia ricevono punti da Amex Membership Rewards, Revolut RevPoints e Klarna Cashback in Italia, carta per carta.",
				title:
					"Amex, Revolut o Klarna: quale carta raggiunge più compagnie aeree",
				lead: "Le tre carte arrivano a valute aeree diverse, e solo alcune valute ricevono punti da tutte e tre. La tabella qui sotto dà, per ogni valuta, le carte che ci trasferiscono punti in Italia.",
				published: "2026-11-11",
				modified: "2026-11-11",
				matrix: true,
				sections: [
					{
						title: "Cosa la tabella non dice",
						paragraphs: [
							"La tabella conta i partner, non dice quale carta conviene. Quanti punti guadagni per ogni euro speso dipende dalla carta e dal piano, e Yume non lo calcola. Un rapporto alto con pochi punti guadagnati può rendere meno di un rapporto basso con molti punti.",
							"Conta anche dove vuoi volare: una carta con meno partner che però raggiunge la tua compagnia vale più di una carta con molti partner che non la raggiunge.",
						],
						items: [],
					},
					{
						title: "Più carte, una valuta",
						paragraphs: [
							"Se hai più carte, i punti di ognuna possono finire nella stessa valuta. Il calcolatore di Yume somma le carte dentro una valuta e mostra il massimo di ogni valuta, senza sommare valute diverse.",
						],
						items: [],
					},
				],
				faq: [
					{
						question: "Quale carta conviene per le miglia?",
						answer:
							"Dipende da quanti punti guadagni con la tua spesa e da dove vuoi volare. Yume dà i partner e i rapporti di ogni carta, non il rendimento della spesa.",
					},
					{
						question: "Posso unire i punti di due carte in una valuta?",
						answer:
							"Sì, se tutte e due trasferiscono in quella valuta. Ogni carta trasferisce con il suo rapporto e il suo minimo, poi le miglia arrivano nello stesso saldo.",
					},
				],
			},
			{
				slug: "miglia-potenziali",
				metaTitle: "Miglia potenziali: cosa sono e perché non si sommano",
				description:
					"Le miglia potenziali sono il massimo che otterresti trasferendo tutti i punti in una valuta, ai rapporti di oggi. Perché non si sommano fra valute.",
				title: "Miglia potenziali: cosa sono e perché non si sommano",
				lead: "Le miglia potenziali di una valuta sono il massimo che otterresti se trasferissi in quella valuta tutti i punti delle tue carte, ai rapporti di oggi. Non sono miglia che possiedi, e non si sommano fra valute: gli stessi punti vanno in una direzione sola.",
				published: "2026-11-11",
				modified: "2026-11-11",
				matrix: false,
				sections: [
					{
						title: "Una riga per valuta, non per programma",
						paragraphs: [
							"Sei programmi usano gli Avios, ed è un saldo solo. Uno strumento che calcola programma per programma conta gli stessi punti sei volte. Yume calcola una riga per valuta, e dentro la valuta sceglie il programma che rende di più con il tuo saldo.",
						],
						items: [],
					},
					{
						title: "Perché le righe non si sommano",
						paragraphs: [
							"Ogni riga suppone che tutti i punti vadano in quella valuta. Se trasferisci tutti i punti in Avios, la riga Flying Blue torna al solo saldo Flying Blue che hai già. La somma delle righe è un numero che nessuno può ottenere: quello che conta è la riga della valuta che ti serve.",
						],
						items: [],
					},
					{
						title: "Cosa cambia il numero",
						paragraphs: [
							"Il valore cambia quando cambia un saldo o quando cambia una regola. Ogni regola ha una data di inizio e una di fine: quando un programma cambia il rapporto, la regola vecchia resta come storico e il calcolo usa quella valida oggi.",
						],
						items: [],
					},
					{
						title: "Cosa il numero non sa",
						paragraphs: [
							"Le miglia potenziali non dicono se c'è posto sul volo premio, né quante miglia costa. Dicono solo quante miglia puoi avere in una valuta con i punti di oggi.",
						],
						items: [],
					},
				],
				faq: [
					{
						question: "Le miglia potenziali sono un saldo?",
						answer:
							"No. Sono un calcolo: il massimo che otterresti trasferendo tutti i punti in una valuta, ai rapporti di oggi. Il saldo è quello che hai già nel programma.",
					},
					{
						question: "Posso sommare le miglia potenziali di valute diverse?",
						answer:
							"No. Gli stessi punti possono andare in una valuta sola, quindi la somma è un numero che non otterrai mai.",
					},
				],
			},
		],
	},

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
		pages: "Pagine",
		full: "Testo completo delle pagine del catalogo e delle guide",
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
					"Yume non chiede né conserva password, carte di pagamento o credenziali dei programmi fedeltà, e non si collega ai tuoi conti.",
				],
				contact: false,
			},
			{
				title: "3. Finalità e basi giuridiche",
				paragraphs: [],
				items: [
					"Accesso, gestione dell'account e calcolo delle miglia potenziali: esecuzione del contratto (art. 6(1)(b) GDPR).",
					"Collegamento di un assistente AI che scegli tu, e invio a esso dei dati che ti richiede: esecuzione del contratto (art. 6(1)(b) GDPR). Il collegamento è facoltativo e lo attivi solo tu.",
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
					"L'email dell'account Google è necessaria: senza, l'account non si crea. Programmi e saldi sono facoltativi, ma senza di essi Yume non calcola nulla. Il collegamento di un assistente AI è facoltativo: senza, Yume funziona allo stesso modo.",
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
					"Il fornitore dell'assistente AI che colleghi tu, per esempio Anthropic per Claude o OpenAI per ChatGPT e Codex, solo se lo colleghi e solo per i dati che l'assistente richiede, come titolare autonomo (sezione 4-bis).",
					"Le autorità pubbliche, solo nei casi previsti dalla legge.",
				],
				contact: false,
			},
			{
				title: "8. Trasferimenti extra-UE",
				paragraphs: [
					"Google e Cloudflare possono trattare dati negli Stati Uniti. Il trasferimento si basa sul Data Privacy Framework UE-USA e sulle Clausole Contrattuali Standard della Commissione europea (decisione 2021/914).",
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
			"Le condizioni d'uso di Yume, il calcolatore gratuito delle miglia potenziali.",
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
