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

	potentialTitle: "Miglia potenziali",
	potentialWarning:
		"Valore calcolato, non un saldo. Il trasferimento è definitivo.",
	currentBalance: "Saldo",
	fromTransfers: "Dai trasferimenti",
	via: "via",

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

	save: "Salva",
	saving: "Salvataggio…",
	cancel: "Annulla",
	saveError: "Salvataggio non riuscito.",

	loading: "Caricamento…",
	loadError: "Dati non disponibili.",
} as const;
