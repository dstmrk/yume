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

	homeTagline: "Quante miglia puoi ottenere dai tuoi punti, valuta per valuta.",
	homeExample: "Un esempio. Il tuo saldo appare dopo l'accesso.",

	homeQuestionTitle: "La domanda",
	homeQuestion:
		"L'app della tua banca ti mostra un saldo di punti. Non ti dice quante miglia diventano, né presso quale compagnia. La risposta cambia a seconda di dove li mandi, e cambia nel tempo. Yume calcola quel numero, e lo rifà quando i rapporti cambiano.",

	homeCurrencyTitle: "Una valuta, sei programmi",
	homeCurrency:
		"British Airways Club, Iberia Club, Aer Lingus AerClub, Finnair Plus, Qatar Airways Privilege Club e Vueling Club usano la stessa valuta: gli Avios. È un saldo solo, non sei. Uno strumento che calcola programma per programma conta gli stessi punti sei volte, e ti mostra un totale che non potrai mai ottenere. Yume calcola una riga per valuta.",

	homeCalculationTitle: "È un calcolo, non un saldo",
	homeCalculation:
		"Le miglia potenziali sono il massimo che otterresti se trasferissi tutti i punti di quella valuta, ai rapporti di oggi. Non sono miglia che possiedi, e Yume non muove nessun punto. Non sommare le valute tra loro: gli stessi punti possono andare in una direzione sola. Quello che conta è la riga più alta, non il totale.",

	homeScopeTitle: "Cosa copre oggi",
	homeScope:
		"I partner di trasferimento di American Express Italia e di Revolut: 19 programmi aerei raggiungibili. Nel catalogo c'è anche Miles & More, il programma di ITA Airways, che oggi nessuna delle due fonti raggiunge. Ogni rapporto è letto dalla pagina ufficiale del programma, mai a memoria.",

	homeScreenshotTitle: "Dopo l'accesso",
	homeScreenshotAlt:
		"La dashboard di Yume: una scheda per ogni valuta, con le miglia potenziali sul tabellone.",

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
