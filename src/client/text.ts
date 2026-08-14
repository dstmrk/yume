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

	homeTagline:
		"Tutti i tuoi punti su una schermata. Yume calcola quante miglia puoi avere in ogni valuta.",
	homeExample: "Un esempio. Il tuo saldo appare dopo l'accesso.",
	homeHowTitle: "Come funziona",
	homeHow: "Scrivi i saldi a mano. Yume li converte valuta per valuta.",
	homeLimitsTitle: "I limiti",
	homeLimits:
		"Il valore è calcolato, non un saldo. Il trasferimento è definitivo.",
	homeScopeTitle: "Cosa copre",
	homeScope:
		"I partner di trasferimento di American Express Italia e di Revolut.",
	homeScreenshotTitle: "Dopo l'accesso",
	homeScreenshotAlt:
		"La dashboard di Yume: una scheda per ogni valuta, con le miglia potenziali sul tabellone.",

	potentialTitle: "Miglia potenziali",
	potentialWarning:
		"Valore calcolato, non un saldo. Il trasferimento è definitivo.",
	currentBalance: "Saldo",
	fromTransfers: "Dai trasferimenti",
	routeDetail: "Dove puoi trasferire",
	noPotential: "Aggiungi un saldo per vedere le miglia potenziali.",
	showOthers: "Mostra le altre",
	showLess: "Mostra meno",

	accountsTitle: "I tuoi conti",
	noAccounts: "Nessun conto.",
	noBalance: "Nessun saldo",
	observedOn: "al",

	addAccount: "Aggiungi conto",
	newAccountTitle: "Nuovo conto",
	programLabel: "Programma",
	programPlaceholder: "Scegli un programma",
	nicknameLabel: "Nome (facoltativo)",
	membershipLabel: "Numero tessera (facoltativo)",

	updateBalance: "Aggiorna saldo",
	pointsLabel: "Saldo",
	dateLabel: "Data",
	noteLabel: "Nota (facoltativo)",
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
