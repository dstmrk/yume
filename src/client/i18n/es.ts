/**
 * The text of the user interface, in Spanish.
 *
 * The type `Messages` of `it.ts` gives the keys: a missing key fails the
 * typecheck. Paragraph 5.8 of `docs/architecture.md` gives the rules.
 *
 * The legal pages are a translation of the Italian text. Their subtitle says
 * that the Italian text prevails, by a decision of the owner (2026-11-16).
 *
 * The public pages of this language read the rules of Spain. The text names
 * the market as "España", and `es.test.ts` compares its numbers with the
 * rules of Spain.
 */
import type { Messages } from "./it.ts";

export const es: Messages = {
	appName: "Yume",
	languageName: "Español",

	homeTitle: "Cuántas millas valen tus puntos",
	homeLead:
		"La app de tu tarjeta te muestra un saldo de puntos. Yume te dice en cuántas millas se convierten, moneda por moneda, con los ratios de transferencia oficiales de hoy.",
	homeExample: "Un ejemplo. Tu saldo aparece después de iniciar sesión.",

	homeWhatTitle: "Qué hace Yume",
	homeWhat: [
		{
			title: "Un número para cada moneda",
			body: "Seis programas usan Avios: es un solo saldo, no seis. Yume calcula una fila por moneda, para no contar el mismo saldo varias veces.",
		},
		{
			title: "Ratios oficiales, cada uno con su fecha",
			body: "Cada ratio se lee en la página oficial del programa. Cuando cambia, la regla antigua queda como histórico y entra una nueva con su fecha.",
		},
		{
			title: "Es un cálculo, no un saldo",
			body: "Las millas potenciales son el máximo que obtendrías al transferir todos los puntos de esa moneda, con los ratios de hoy. Yume no mueve ningún punto.",
		},
	],

	homeLogosTitle: "Tarjetas y aerolíneas compatibles",

	homeFaqTitle: "Preguntas frecuentes",
	homeFaq: [
		{
			question: "¿Qué puntos puedo seguir con Yume?",
			answer:
				"Los saldos de 27 programas aéreos y de tres tarjetas para España: Amex Membership Rewards, los RevPoints de Revolut y el cashback de Klarna. Para los 21 programas que esas tarjetas alcanzan, Yume calcula también las millas potenciales.",
		},
		{
			question: "¿Por qué seis programas se convierten en una sola fila?",
			answer:
				"British Airways Club, Iberia Club, Aer Lingus AerClub, Finnair Plus, Qatar Airways Privilege Club y Vueling Club usan la misma moneda: Avios. Es un solo saldo. Una herramienta que calcula programa por programa cuenta los mismos puntos seis veces y muestra un total que nunca podrás obtener.",
		},
		{
			question: "¿Qué son las millas potenciales?",
			answer:
				"El máximo que obtendrías si transfirieras todos los puntos de esa moneda, con los ratios de hoy. No son millas que tengas: son un cálculo, y cambia cuando cambian los ratios.",
		},
		{
			question: "¿Puedo sumar las millas potenciales de monedas distintas?",
			answer:
				"No. Los mismos puntos solo pueden ir en una dirección, así que la suma es un número que nunca obtendrás. Lo que cuenta es la fila más alta, no el total.",
		},
		{
			question: "¿De dónde salen los ratios de transferencia?",
			answer:
				"De la página oficial de cada programa, para España. Cada regla tiene una fecha de inicio y una de fin: cuando un ratio cambia, la regla antigua queda como histórico y el cálculo usa la vigente hoy.",
		},
		{
			question: "¿Yume transfiere los puntos por mí?",
			answer:
				"No. Yume solo calcula, no toca tus cuentas. La transferencia la haces tú, desde la app de tu tarjeta o la web del programa, y es definitiva: los puntos transferidos no vuelven.",
		},
		{
			question: "¿Puedo instalar Yume en mi servidor?",
			answer: "Sí. El código es open source con licencia MIT.",
		},
		{
			question: "¿Cómo consigo una cuenta?",
			answer:
				"Inicia sesión con tu cuenta de Google: el primer acceso crea la cuenta.",
		},
	],

	notFound: "Este vuelo no sale: la página que buscas no existe.",
	notFoundLink: "Volver al panel",

	homeScreenshotTitle: "Después de iniciar sesión",
	homeScreenshotAlt:
		"El panel de Yume: una tarjeta para cada moneda, con las millas potenciales en el panel de salidas.",

	homeExploreTitle: "Ratios, calculadora y guías",
	homeExploreCalculator: "Calcula las millas de tus puntos, sin cuenta",
	homeExploreCurrencies: "Todas las monedas de millas",

	catalogue: {
		breadcrumb: "Ruta",
		home: "Yume",
		currencies: "Monedas",
		verified: "Última verificación de los ratios:",
		verifiedOn: "Verificado el",
		exampleNote:
			"Los ejemplos son un cálculo con los ratios de hoy, no un saldo.",
		routesTitle: "Ratios de transferencia",
		ratio: "Ratio",
		minimum: "Mínimo",
		increment: "Múltiplos de",
		example: (points: string) => `Cálculo con ${points} puntos`,
		points: (formatted: string, count: number) =>
			count === 1 ? `${formatted} punto` : `${formatted} puntos`,
		ratioLine: (from: string, to: string, currency: string) =>
			`${from} puntos = ${to} ${currency}`,
		calculatorLink: "Calcula con tus puntos",
		signInLink: "Sigue tus saldos en Yume",
		faqTitle: "Preguntas frecuentes",
		irreversibleQuestion: "¿Puedo anular una transferencia de puntos?",
		irreversibleAnswer:
			"No. Una transferencia de puntos es definitiva: los puntos no vuelven a la tarjeta. Primero encuentra el vuelo con puntos, luego transfiere solo los puntos necesarios.",

		currency: {
			metaTitle: (currency: string) =>
				`Convertir puntos en ${currency}: ratios en España`,
			description: (currency: string, sources: string) =>
				`Desde qué tarjetas llega ${currency} en España (${sources}): ratio, mínimo y múltiplos de cada transferencia, de las páginas oficiales.`,
			title: (currency: string) => `Cómo convertir tus puntos en ${currency}`,
			lead: (currency: string, count: number, sources: string) =>
				count === 1
					? `En España ${currency} llega desde una sola tarjeta: ${sources}. El ratio, el mínimo y los múltiplos de abajo se leen en la página oficial, con la fecha de la verificación.`
					: `En España ${currency} llega desde ${count} tarjetas: ${sources}. Los ratios, mínimos y múltiplos de abajo se leen en las páginas oficiales, con la fecha de la verificación.`,
			programsTitle: "Programas de la moneda",
			programsShared: (currency: string, count: number) =>
				`${count} programas usan ${currency}: es un solo saldo, no ${count}. Yume calcula una sola fila para la moneda y elige el programa que más rinde con tu saldo.`,
			programsOne: (currency: string, program: string) =>
				`${currency} es la moneda de ${program}.`,
			sourceQuestion: (source: string, currency: string) =>
				`¿Puedo transferir los puntos ${source} a ${currency}?`,
			sourceYes: (routes: string) =>
				`Sí, en España: ${routes}. Por debajo del mínimo el programa no acepta la transferencia.`,
			sourceNo: (source: string, currency: string) =>
				`No. Entre los socios de ${source} para España no está ${currency}.`,
			sourceRoute: (program: string, ratio: string, minimum: string) =>
				`a ${program}, ${ratio}, mínimo ${minimum}`,
		},

		source: {
			metaTitle: (source: string) =>
				`Puntos ${source}: a qué millas transferirlos`,
			description: (source: string) =>
				`Todos los programas aéreos que reciben los puntos ${source} en España, con ratio, mínimo y múltiplos leídos en las páginas oficiales.`,
			title: (source: string) => `Dónde transferir los puntos ${source}`,
			lead: (source: string, programs: number, currencies: number) =>
				`En España los puntos ${source} van a ${programs} programas aéreos, que usan ${currencies} monedas distintas. Para cada uno encontrarás el ratio, el mínimo y los múltiplos, leídos en la página oficial.`,
			unreachableTitle: "Monedas que no alcanzas",
			unreachable: (source: string) =>
				`Para España no hay ninguna regla de transferencia de ${source} a estas monedas:`,
			currencyLink: (currency: string) =>
				`Todas las tarjetas que dan ${currency}`,
			countQuestion: (source: string) =>
				`¿A cuántos programas aéreos puedo transferir los puntos ${source}?`,
			countAnswer: (programs: number, currencies: string) =>
				`A ${programs} programas, con estas monedas: ${currencies}.`,
			minimumQuestion: (source: string) =>
				`¿Cuál es el mínimo para transferir los puntos ${source}?`,
			minimumRange: (low: string, high: string) =>
				`Depende del programa: de ${low} a ${high}. Por encima del mínimo solo transfieres múltiplos del bloque del programa.`,
			minimumSame: (minimum: string) => `${minimum} para cada programa.`,
		},

		hub: {
			metaTitle: "Millas con puntos de tarjeta: todas las monedas en España",
			description:
				"Las monedas de millas que reciben puntos de Amex, Revolut y Klarna en España, y las que no reciben. Una página por moneda.",
			title: "Las monedas de millas, una a una",
			lead: (reachable: number, unreachable: number) =>
				`Yume sigue ${reachable} monedas aéreas que reciben puntos de Amex, Revolut o Klarna en España, y ${unreachable} que no reciben. Cada moneda tiene su página con los ratios oficiales.`,
			reachableTitle: "Monedas que reciben puntos",
			sourcesTitle: "Las tarjetas",
			unreachableTitle: "Monedas que ninguna tarjeta alcanza",
			unreachable:
				"Para estas monedas Yume sigue el saldo, pero en España ninguna tarjeta del catálogo les transfiere puntos:",
			from: (sources: string) => `de ${sources}`,
		},
	},

	calculator: {
		metaTitle: "Calculadora de millas: puntos Amex, Revolut y Klarna",
		description:
			"Escribe tus puntos Amex, Revolut y Klarna y mira cuántas millas valen en cada moneda, con los ratios oficiales para España. Sin cuenta.",
		title: "Calcula las millas de tus puntos",
		lead: "Escribe los puntos que tienes en cada tarjeta: la calculadora muestra el máximo de cada moneda, con los ratios oficiales de hoy para España. No hace falta una cuenta, y los números no salen de tu navegador.",
		formTitle: "Tus puntos",
		pointsError: "Escribe los puntos en números.",
		empty: "Escribe un saldo para ver las millas potenciales.",
		none: "Con estos puntos ninguna transferencia llega al mínimo.",
		noSum: "Cada fila es un máximo: los mismos puntos van a una sola moneda.",
		from: (source: string, points: string) => `de ${source} ${points}`,
		ratesLink: "Ratios",
		howTitle: "Cómo calcula",
		how: [
			"Cada tarjeta cuenta por separado: por debajo del mínimo de un programa no hay transferencia, y por encima del mínimo solo pasan los múltiplos del bloque.",
			"Si una moneda tiene varios programas, por ejemplo Avios, la calculadora elige el programa que más rinde con tus puntos.",
			"Un programa no abona fracciones de milla: el resultado se redondea a la baja.",
		],
		faq: [
			{
				question: "¿La calculadora guarda mis puntos?",
				answer:
					"No. El cálculo se hace en el navegador y la página no envía los números a ningún servidor. Para seguir los saldos en el tiempo necesitas una cuenta de Yume.",
			},
			{
				question: "¿Por qué no hay un total de millas?",
				answer:
					"Porque los mismos puntos solo pueden ir a una moneda. Cada fila es el máximo de esa moneda: si lo transfieres todo a una, las demás bajan a cero.",
			},
			{
				question: "¿Los ratios están actualizados?",
				answer:
					"La calculadora usa las reglas de hoy del catálogo de Yume: cada ratio se lee en la página oficial para España, con la fecha de la verificación.",
			},
		],
		signIn:
			"¿Quieres seguir tus saldos en el tiempo? Inicia sesión con Google: el primer acceso crea la cuenta.",
	},

	footerDisclaimer:
		"Yume es un proyecto independiente: no pertenece a American Express, a Revolut, a Klarna ni a las aerolíneas o los programas de fidelización citados. Los nombres y logotipos son marcas de sus respectivos propietarios.",
	footerSource: "Código en GitHub",
	footerPrivacy: "Privacidad",
	footerConnector: "Asistentes de IA",
	footerSupport: "Asistencia",
	footerPublisher: "© 2026 Annadermolab — P.IVA 11836750015",
	footerTos: "Términos",
	footerCalculator: "Calculadora",
	footerCurrencies: "Monedas",

	potentialTitle: "Millas potenciales",
	potentialWarning:
		"Valor calculado sobre una transferencia total. Recuerda: transferir los puntos es definitivo.",
	currentBalance: "Saldo",
	fromTransfers: "Por transferencias",
	routeDetail: "Dónde puedes transferir",
	noPotential: "Añade un saldo para ver las millas potenciales.",
	showOthers: "Mostrar las demás",
	showLess: "Mostrar menos",
	favorite: "Favorita",

	countryTitle: "Tu país",
	countryBody:
		"Las reglas de transferencia cambian de un país a otro. El país no se puede cambiar.",
	countryError: "País no guardado. Inténtalo de nuevo.",

	startTitle: "Empieza aquí",
	startBody:
		"Añade la primera cuenta con su saldo. Arriba de la lista están las tarjetas de puntos: son la fuente de las millas potenciales.",

	accountsTitle: "Tus cuentas",
	noBalance: "Sin saldo",
	observedOn: "a",

	addAccount: "Añadir cuenta",
	newAccountTitle: "Nueva cuenta",
	programLabel: "Programa",
	programPlaceholder: "Elige un programa",
	programSearch: "Programa o aerolínea",
	programNotFound: "Ningún programa encontrado.",
	airlinesMore: "Mostrar todas las aerolíneas",
	airlinesLess: "Mostrar menos aerolíneas",
	firstBalanceLabel: "Saldo (opcional)",

	updateBalance: "Actualizar saldo",
	pointsLabel: "Saldo",
	dateLabel: "Fecha",
	pointsError: "Escribe el saldo en números.",

	expiryTitle: "Caducidades (opcionales)",
	expiryPointsLabel: "Puntos",
	expiryDateLabel: "Caducidad",
	addExpiry: "Añadir caducidad",
	removeExpiry: "Quitar caducidad",
	lotIncomplete: "Completa los puntos y la fecha de cada caducidad.",
	lotPoints: "Escribe los puntos en números.",
	lotBeforeDate: "Una caducidad es anterior a la fecha del saldo.",
	lotDuplicate: "Dos caducidades tienen la misma fecha.",
	lotAboveBalance: "Las caducidades superan el saldo.",
	expiresOn: "caducan el",
	lotExpired: "Caducidad pasada: actualiza el saldo.",

	removeBalance: "Borrar saldo",
	removeBalanceQuestion: "¿Borras el saldo? Vuelve al saldo anterior.",
	removeAccount: "Quitar cuenta",
	removeAccountQuestion: "¿Quitas la cuenta y todos sus saldos?",
	removeError: "No se ha podido quitar.",
	deleteUser: "Eliminar cuenta",
	deleteUserQuestion:
		"¿Eliminas la cuenta y todos sus datos? Es definitivo, y una suscripción activa termina en el acto.",
	confirm: "Confirmar",

	connectionsTitle: "Asistentes conectados",
	revokeConnection: "Revocar",
	revokeConnectionQuestion:
		"¿Revocas el acceso? El asistente ya no leerá tus datos.",

	save: "Guardar",
	saving: "Guardando…",
	cancel: "Cancelar",
	saveError: "No se ha podido guardar.",
	tooManyAccountsError: "Has llegado al límite de cuentas.",
	freeAccountLimitError:
		"Con la cuenta gratuita puedes añadir Amex, Revolut y 2 programas aéreos.",
	freeLotsError: "Las caducidades son solo para quien apoya el proyecto.",
	supportersOnly: "Solo para quien apoya el proyecto",

	supporter: {
		title: "Apoyo",
		offer:
			"Klarna, programas aéreos sin límite, fechas de caducidad de los puntos, familia y asistentes de IA.",
		perYear: "al año",
		buy: "Apoya el proyecto",
		renewal: "Se renueva cada año. Cancela cuando quieras.",
		withdrawal: "Desistimiento en 14 días:",
		terms: "Términos del servicio",
		renews: "Apoyas el proyecto. Próxima renovación:",
		ends: "Apoyas el proyecto. Vencimiento:",
		paymentFailed: "Renovación fallida: actualiza el método de pago.",
		manage: "Gestionar suscripción",
		activating: "Pago recibido. La activación puede tardar unos minutos.",
		opening: "Abriendo…",
		already: "Ya tienes una suscripción: gestiónala desde el portal.",
		unavailable: "Pago no disponible. Inténtalo dentro de un rato.",
		link: "Apoya el proyecto",
	},

	dashboardLink: "Panel",

	household: {
		link: "Familia",
		title: "Familia",
		intro:
			"Reúne los saldos de quien vive contigo. El total aparece solo donde el programa permite juntar las millas.",
		pooledLabel: "Millas potenciales de la familia",
		notPooled: "No acumulables: cada persona usa sus propias millas.",
		noPotential: "Ninguna milla potencial en la familia.",
		create: "Crear familia",
		countryFirst: "Elige antes el país en el panel.",
		invitationFrom: "Invitación de",
		acceptNote: "Si aceptas, la familia ve tus saldos.",
		accept: "Aceptar",
		refuse: "Rechazar",
		membersTitle: "Personas",
		owner: "Titular",
		you: "tú",
		manual: "sin cuenta",
		readOnly:
			"Suscripción caducada: la familia se queda, pero no puedes añadir personas ni cuentas.",
		inviteTitle: "Invita a una persona con Yume",
		inviteNote: "Yume no envía emails: avisa tú a la persona.",
		emailLabel: "Email de Google",
		nameLabel: "Nombre",
		invite: "Invitar",
		pendingTitle: "Invitaciones pendientes",
		cancelInvite: "Cancelar",
		manualTitle: "Añade a una persona sin Yume",
		addManual: "Añadir",
		removeMember: "Quitar",
		removeMemberQuestion:
			"¿Quitas a la persona de la familia? Sus cuentas de Yume siguen siendo suyas.",
		removeManualQuestion: "¿Quitas a la persona y todos sus saldos?",
		leave: "Salir de la familia",
		leaveQuestion: "¿Sales? La familia ya no verá tus saldos.",
		remove: "Eliminar familia",
		removeQuestion:
			"¿Eliminas la familia? Las personas sin cuenta y sus saldos desaparecen.",
		errors: {
			countryMismatch: "La persona es de otro país.",
			full: "La familia ya tiene 8 personas.",
			alreadyMember: "La persona ya está en la familia.",
			alreadyInHousehold: "Ya formas parte de una familia.",
			supporterRequired: "Solo para quien apoya el proyecto.",
			invalid: "Revisa el email y el nombre.",
			general: "Operación fallida.",
		},
	},

	loading: "Cargando…",
	loadError: "Datos no disponibles.",

	signInTitle: "Iniciar sesión",
	signIn: "Iniciar sesión",
	signInWithGoogle: "Iniciar sesión con Google",
	signInNote: "El primer acceso crea tu cuenta.",
	signInError: "No se ha podido iniciar sesión con Google.",
	passwordSignInLink: "Acceso con contraseña",
	passwordSignInNote: "Solo para la cuenta de prueba de los revisores.",
	emailLabel: "Email",
	passwordLabel: "Contraseña",
	passwordSignInError: "Email o contraseña incorrectos.",
	signOut: "Salir",

	adminLink: "Administración",
	adminTitle: "Usuarios",
	adminTotal: "Total",
	adminRecent: "Últimos 30 días",
	adminSearch: "Buscar por email",
	adminAll: "Todos",
	adminEmail: "Email",
	adminJoined: "Alta",
	adminTier: "Plan",
	adminSupporterUntil: "hasta el",
	adminNoMatch: "Ningún usuario.",
	adminPrevious: "Página anterior",
	adminNext: "Página siguiente",
	adminUpdateError: "No se ha podido modificar.",
	adminBack: "Volver al panel",
	tierFree: "Free",
	tierSupporter: "Supporter",
	tierUnlimited: "Unlimited",

	guides: {
		updated: "Actualizada el",
		relatedTitle: "Otras guías",
		matrixLead: (leader: string, programs: number, others: string) =>
			`${leader} alcanza más programas aéreos: ${programs}. Le siguen ${others}.`,
		matrixOther: (source: string, programs: number) =>
			`${source} con ${programs}`,
		matrixTitle: "Quién alcanza qué",
		matrixCurrency: "Moneda",
		matrixNone: "—",
		items: [
			{
				slug: "transferir-puntos-a-millas",
				metaTitle: "Transferir puntos a millas: ratio, mínimo, múltiplos",
				description:
					"Cómo funciona la transferencia de los puntos de la tarjeta a millas aéreas: el ratio, el mínimo, los múltiplos y el redondeo. La transferencia es definitiva.",
				title: "Transferir los puntos de la tarjeta a millas: cómo funciona",
				lead: "Una transferencia convierte los puntos de la tarjeta en la moneda de un programa aéreo con un ratio fijo. Tres números deciden cuántas millas recibes: el ratio, el mínimo y los múltiplos. La transferencia es definitiva, así que se hace después de encontrar el vuelo con puntos.",
				published: "2026-11-16",
				modified: "2026-11-16",
				matrix: false,
				sections: [
					{
						title: "El ratio",
						paragraphs: [
							"El ratio dice cuántos puntos de la tarjeta hacen falta para un número de millas. Se escribe con dos números: 5 : 4 quiere decir 4 millas por cada 5 puntos, 1 : 1 quiere decir una milla por punto.",
							"El mismo programa de la tarjeta tiene ratios distintos con socios distintos, y dos tarjetas tienen ratios distintos con la misma aerolínea. Por eso Yume lee cada ratio en la página oficial, regla por regla.",
						],
						items: [],
					},
					{
						title: "El mínimo y los múltiplos",
						paragraphs: [
							"Por debajo del mínimo el programa no acepta la transferencia. Por encima del mínimo solo transfieres múltiplos del bloque del programa, y los puntos que sobran se quedan en la tarjeta.",
							"Un ejemplo con números inventados: con bloques de 400 puntos y un saldo de 1.000 puntos transfieres 800, y 200 se quedan donde están. El mismo saldo hacia un programa con bloques de 500 pasa entero.",
						],
						items: [],
					},
					{
						title: "El redondeo",
						paragraphs: [
							"Un programa no abona fracciones de milla. Yume siempre redondea a la baja, así el valor calculado nunca supera lo que recibirías.",
						],
						items: [],
					},
					{
						title: "Una moneda, varios programas",
						paragraphs: [
							"Algunas monedas tienen varios programas: seis programas usan Avios, por ejemplo. Es un solo saldo, pero cada programa tiene su ratio, su mínimo y sus múltiplos. Con el mismo saldo un programa de la moneda puede rendir más que otro.",
						],
						items: [],
					},
					{
						title: "Primero el vuelo, luego los puntos",
						paragraphs: [
							"Una transferencia no se anula. El orden que evita bloquear puntos en una moneda que no necesitas es este:",
						],
						items: [
							"Busca el vuelo con puntos y comprueba que hay plazas.",
							"Comprueba el ratio, el mínimo y los múltiplos hacia ese programa.",
							"Transfiere solo los puntos necesarios, desde la app de la tarjeta o la web del programa.",
						],
					},
				],
				faq: [
					{
						question: "¿Puedo anular una transferencia de puntos?",
						answer:
							"No. Una transferencia de puntos es definitiva: los puntos no vuelven a la tarjeta. Primero encuentra el vuelo con puntos, luego transfiere solo los puntos necesarios.",
					},
					{
						question: "¿Por qué recibo menos millas de lo previsto?",
						answer:
							"Por los múltiplos y por el redondeo. Solo pasan múltiplos del bloque del programa, y un programa no abona fracciones de milla.",
					},
					{
						question: "¿El ratio es el mismo para todos los programas?",
						answer:
							"No. Cada par de tarjeta y programa tiene su regla, también dentro de la misma moneda. Las páginas de las monedas de Yume dan cada ratio con su fecha de verificación.",
					},
				],
			},
			{
				slug: "amex-revolut-klarna-millas",
				metaTitle: "Amex, Revolut o Klarna: a qué aerolíneas llegas",
				description:
					"Qué monedas de millas reciben puntos de Amex Membership Rewards, Revolut RevPoints y Klarna Cashback en España, tarjeta por tarjeta.",
				title: "Amex, Revolut o Klarna: qué tarjeta llega a más aerolíneas",
				lead: "Las tres tarjetas llegan a monedas aéreas distintas, y solo algunas monedas reciben puntos de las tres. La tabla de abajo da, para cada moneda, las tarjetas que le transfieren puntos en España.",
				published: "2026-11-16",
				modified: "2026-11-16",
				matrix: true,
				sections: [
					{
						title: "Lo que la tabla no dice",
						paragraphs: [
							"La tabla cuenta los socios, no dice qué tarjeta conviene. Cuántos puntos ganas por cada euro gastado depende de la tarjeta y del plan, y Yume no lo calcula. Un ratio alto con pocos puntos ganados puede rendir menos que un ratio bajo con muchos puntos.",
							"También cuenta adónde quieres volar: una tarjeta con menos socios que llega a tu aerolínea vale más que una tarjeta con muchos socios que no llega.",
						],
						items: [],
					},
					{
						title: "Varias tarjetas, una moneda",
						paragraphs: [
							"Si tienes varias tarjetas, los puntos de cada una pueden acabar en la misma moneda. La calculadora de Yume suma las tarjetas dentro de una moneda y muestra el máximo de cada moneda, sin sumar monedas distintas.",
						],
						items: [],
					},
				],
				faq: [
					{
						question: "¿Qué tarjeta conviene para las millas?",
						answer:
							"Depende de cuántos puntos ganas con tu gasto y de adónde quieres volar. Yume da los socios y los ratios de cada tarjeta, no el rendimiento del gasto.",
					},
					{
						question: "¿Puedo juntar los puntos de dos tarjetas en una moneda?",
						answer:
							"Sí, si las dos transfieren a esa moneda. Cada tarjeta transfiere con su ratio y su mínimo, y luego las millas llegan al mismo saldo.",
					},
				],
			},
			{
				slug: "millas-potenciales",
				metaTitle: "Millas potenciales: qué son y por qué no se suman",
				description:
					"Las millas potenciales son el máximo que obtendrías al transferir todos los puntos a una moneda, con los ratios de hoy. Por qué no se suman entre monedas.",
				title: "Millas potenciales: qué son y por qué no se suman",
				lead: "Las millas potenciales de una moneda son el máximo que obtendrías si transfirieras a esa moneda todos los puntos de tus tarjetas, con los ratios de hoy. No son millas que tengas, y no se suman entre monedas: los mismos puntos van en una sola dirección.",
				published: "2026-11-16",
				modified: "2026-11-16",
				matrix: false,
				sections: [
					{
						title: "Una fila por moneda, no por programa",
						paragraphs: [
							"Seis programas usan Avios, y es un solo saldo. Una herramienta que calcula programa por programa cuenta los mismos puntos seis veces. Yume calcula una fila por moneda, y dentro de la moneda elige el programa que más rinde con tu saldo.",
						],
						items: [],
					},
					{
						title: "Por qué las filas no se suman",
						paragraphs: [
							"Cada fila supone que todos los puntos van a esa moneda. Si transfieres todos los puntos a Avios, la fila de Flying Blue vuelve solo al saldo de Flying Blue que ya tienes. La suma de las filas es un número que nadie puede obtener: lo que cuenta es la fila de la moneda que necesitas.",
						],
						items: [],
					},
					{
						title: "Qué cambia el número",
						paragraphs: [
							"El valor cambia cuando cambia un saldo o cuando cambia una regla. Cada regla tiene una fecha de inicio y una de fin: cuando un programa cambia el ratio, la regla antigua queda como histórico y el cálculo usa la vigente hoy.",
						],
						items: [],
					},
					{
						title: "Lo que el número no sabe",
						paragraphs: [
							"Las millas potenciales no dicen si hay plazas en el vuelo con puntos, ni cuántas millas cuesta. Solo dicen cuántas millas puedes tener en una moneda con los puntos de hoy.",
						],
						items: [],
					},
				],
				faq: [
					{
						question: "¿Las millas potenciales son un saldo?",
						answer:
							"No. Son un cálculo: el máximo que obtendrías al transferir todos los puntos a una moneda, con los ratios de hoy. El saldo es lo que ya tienes en el programa.",
					},
					{
						question:
							"¿Puedo sumar las millas potenciales de monedas distintas?",
						answer:
							"No. Los mismos puntos solo pueden ir a una moneda, así que la suma es un número que nunca obtendrás.",
					},
				],
			},
		],
	},

	consent: {
		title: "Autoriza el acceso",
		lead: "pide acceder a tu cuenta de Yume.",
		permissions: "Podrá:",
		scopes: {
			balances: "leer cuentas, saldos y millas potenciales, y añadir un saldo",
			offline_access: "seguir conectado sin volver a pedirte el acceso",
		} as Record<string, string>,
		redirect: "El código de acceso va a:",
		loopback:
			"El código va a un programa de tu ordenador. Autoriza solo si has iniciado tú la conexión.",
		accept: "Autorizar",
		deny: "Rechazar",
		invalid: "Solicitud de autorización no válida.",
		error: "No se ha podido autorizar.",
	},

	jsonLd: {
		knowsAbout: [
			"Avios",
			"Membership Rewards",
			"RevPoints",
			"Cashback de Klarna",
			"Millas aéreas",
			"Transferencia de puntos",
			"Programas de fidelización de aerolíneas",
			"Ratios de transferencia",
		],
		featureList: [
			"Cálculo de las millas potenciales de cada moneda",
			"Ratios de transferencia oficiales para España",
			"Saldos con la fecha de observación",
			"Aplicación instalable (PWA)",
		],
	},

	siteDescription:
		"Yume calcula cuántas millas puedes obtener con tus puntos. Un valor para cada moneda, con los ratios de transferencia oficiales para España.",

	llms: {
		publicPage: "Página pública",
		access:
			"Para acceder hace falta una cuenta de Google. El código es open source con licencia MIT.",
		warnings: "Advertencias",
		pages: "Páginas",
		full: "Texto completo de las páginas del catálogo y de las guías",
	},

	privacy: {
		title: "Información sobre el tratamiento de datos personales",
		description:
			"Qué datos trata Yume, por qué, con quién y durante cuánto tiempo, y cómo ejercer tus derechos.",
		subtitle:
			"conforme al Reglamento (UE) 2016/679 (RGPD) y al D.Lgs. 196/2003. Traducción del texto italiano, que prevalece en caso de discrepancia.",
		updated: "Última actualización: noviembre de 2026",
		contactLead: "Para cualquier pregunta sobre tus datos escribe a",
		sections: [
			{
				title: "1. Responsable del tratamiento",
				paragraphs: [
					"El responsable del tratamiento de la instancia oficial de Yume, yumemiles.com, es Annadermolab, empresa individual, con domicilio en Turín (TO), Italia, P.IVA 11836750015.",
					"Yume es open source. Quien lo instala en su propio servidor es responsable de los datos de esa instalación, y esta información no se aplica a ella.",
				],
				items: [],
				contact: true,
			},
			{
				title: "2. Datos personales tratados",
				paragraphs: [
					"Yume trata solo los datos necesarios para mostrarte saldos y millas potenciales.",
				],
				items: [
					"De la cuenta de Google, en el primer acceso: la dirección de email y el identificador de la cuenta. Yume no pide a Google el nombre ni la foto del perfil.",
					"Datos que introduces tú: los programas de fidelización, los saldos con su fecha y, en su caso, las caducidades de los puntos, y las monedas favoritas.",
					"Datos de la sesión: dirección IP y tipo de navegador del dispositivo desde el que accedes.",
					"Si conectas un asistente de IA (sección 4 bis): el nombre y la dirección de la aplicación que has autorizado, los permisos que le has dado, la fecha de la autorización y los códigos de acceso que Yume le entrega.",
					"Si apoyas el proyecto: los identificadores del cliente y de la suscripción en Stripe, el estado de la suscripción y la fecha de fin del periodo pagado. Yume envía a Stripe tu dirección de email.",
					"Si usas la familia: el nombre que el titular escribe para cada persona, la dirección de email de cada invitación, y los programas y los saldos que el titular introduce para una persona sin cuenta. El titular introduce los datos de esa persona solo con su consentimiento.",
					"Yume no pide ni conserva contraseñas, tarjetas de pago ni credenciales de los programas de fidelización, y no se conecta a tus cuentas. Los datos de la tarjeta los introduces en la página de Stripe, y Yume no los recibe.",
				],
				contact: false,
			},
			{
				title: "3. Finalidades y bases jurídicas",
				paragraphs: [],
				items: [
					"Acceso, gestión de la cuenta y cálculo de las millas potenciales: ejecución del contrato (art. 6(1)(b) RGPD).",
					"Conexión de un asistente de IA que eliges tú, y envío a este de los datos que te pide: ejecución del contrato (art. 6(1)(b) RGPD). La conexión es opcional y solo la activas tú.",
					"Pago y renovación de la cuenta de apoyo: ejecución del contrato (art. 6(1)(b) RGPD). Conservación de los registros de los pagos: obligación legal (art. 6(1)(c) RGPD).",
					"Seguridad de las sesiones y prevención de abusos: interés legítimo (art. 6(1)(f) RGPD).",
					"Respuesta a las autoridades en los casos previstos por la ley: obligación legal (art. 6(1)(c) RGPD).",
					"Yume no elabora perfiles ni hace publicidad, no usa servicios de analítica y no rastrea el comportamiento.",
				],
				contact: false,
			},
			{
				title: "4. Uso de los datos recibidos de Google",
				paragraphs: [
					"Yume usa la dirección de email y el identificador de la cuenta de Google solo para crear tu cuenta y permitirte el acceso. No los usa para publicidad, no los vende, no los cede a terceros y no los usa para entrenar modelos de inteligencia artificial.",
					"El uso y la transferencia a otras apps de la información recibida de las API de Google cumplen la Google API Services User Data Policy (developers.google.com/terms/api-services-user-data-policy), incluidos los requisitos de Limited Use.",
					"Yume no envía a un asistente de IA la dirección de email ni el identificador de la cuenta de Google.",
				],
				items: [],
				contact: false,
			},
			{
				title: "4 bis. Asistentes de IA conectados (conector MCP)",
				paragraphs: [
					"Puedes conectar a Yume un asistente de IA, por ejemplo Claude de Anthropic o ChatGPT o Codex de OpenAI, mediante el Model Context Protocol (MCP). La conexión es opcional y requiere la cuenta de apoyo.",
					"Cuando conectas el asistente, Yume te pide acceder con Google y te muestra una página de autorización con el nombre de la aplicación y los permisos solicitados. Solo si aceptas, Yume entrega a la aplicación un código de acceso personal.",
					"Con tu código de acceso el asistente puede leer tus programas, los saldos con las caducidades y las millas potenciales, leer el catálogo público de los programas y de las reglas de transferencia, y añadir un nuevo saldo a uno de tus programas. No puede borrar datos, no puede modificar tu cuenta y no puede transferir puntos: Yume no mueve puntos entre programas.",
					"Yume recibe del asistente solo los datos de cada solicitud, por ejemplo el programa, el saldo y la fecha de un nuevo saldo. Yume no recibe ni conserva tus conversaciones con el asistente, las imágenes que le muestras ni otros contenidos.",
					"El asistente lo eliges tú, y su proveedor trata los datos que Yume le envía como responsable autónomo, según su propia política de privacidad. Para Claude el proveedor es Anthropic: anthropic.com/legal/privacy. Para ChatGPT y Codex el proveedor es OpenAI: openai.com/policies/privacy-policy. Yume no elige el proveedor, no le envía datos por cuenta propia y no tiene con él un contrato sobre tus datos.",
					'Puedes revocar en cualquier momento el acceso de cada asistente desde la sección "Asistentes conectados" del panel. La revocación bloquea el asistente en el acto y borra sus códigos de acceso. Desconectar el conector en la app del asistente no basta para revocar el acceso en Yume. La eliminación de tu cuenta revoca también todo acceso.',
				],
				items: [],
				contact: false,
			},
			{
				title: "5. Seguridad de los datos",
				paragraphs: [],
				items: [
					"Todas las conexiones usan HTTPS.",
					"La cookie de la sesión tiene los atributos Secure y HttpOnly: solo viaja por HTTPS y los scripts de la página no la leen.",
					"Los códigos de acceso de los asistentes de IA se conservan solo cifrados con una función hash: quien leyera la base de datos no podría usarlos. Cada código vale solo para Yume y solo para los permisos que has aceptado.",
					"La base de datos no es accesible desde internet: solo la lee el servidor de Yume, y solo el responsable accede al servidor.",
				],
				contact: false,
			},
			{
				title: "6. Carácter de la comunicación de los datos",
				paragraphs: [
					"El email de la cuenta de Google es necesario: sin él no se crea la cuenta. Los programas y los saldos son opcionales, pero sin ellos Yume no calcula nada. La conexión de un asistente de IA es opcional: sin ella, Yume funciona igual. La cuenta de apoyo es opcional: para activarla hacen falta los datos de pago que pide Stripe.",
				],
				items: [],
				contact: false,
			},
			{
				title: "7. Destinatarios",
				paragraphs: [
					"Los datos no se venden ni se ceden a terceros para sus propias finalidades. Solo reciben datos:",
				],
				items: [
					"Google Ireland Ltd, que gestiona el acceso con tu cuenta de Google como responsable autónomo. Política: policies.google.com/privacy.",
					"IONOS SE (Alemania), que proporciona el servidor en el que funcionan Yume y su base de datos, como encargado del tratamiento (art. 28 RGPD). Política: ionos.it/terms-gtc/terms-privacy.",
					"Cloudflare Inc., para la red, la protección del sitio y el reenvío de los emails a la dirección de privacidad, como encargado del tratamiento (art. 28 RGPD). Política: cloudflare.com/privacypolicy.",
					"Stripe Payments Europe, Ltd (Irlanda), solo si apoyas el proyecto, para el pago, la renovación y los recibos de la suscripción. Stripe trata los datos de pago como encargado del tratamiento (art. 28 RGPD) y, para sus propias obligaciones legales y la prevención del fraude, como responsable autónomo. Política: stripe.com/privacy.",
					"El proveedor del asistente de IA que conectas tú, por ejemplo Anthropic para Claude u OpenAI para ChatGPT y Codex, solo si lo conectas y solo para los datos que el asistente pide, como responsable autónomo (sección 4 bis).",
					"Las personas de tu familia, solo si aceptas una invitación o si creas la familia: ven tus programas y tus saldos. Quien recibe una invitación ve el email del titular. Al salir de la familia, el uso compartido termina al momento.",
					"Las autoridades públicas, solo en los casos previstos por la ley.",
				],
				contact: false,
			},
			{
				title: "8. Transferencias fuera de la UE",
				paragraphs: [
					"Google, Cloudflare y Stripe pueden tratar datos en Estados Unidos. La transferencia se basa en el Marco de Privacidad de Datos UE-EE. UU. y en las Cláusulas Contractuales Tipo de la Comisión Europea (Decisión 2021/914).",
					"El proveedor de un asistente de IA puede tratar datos fuera de la Unión Europea, por ejemplo en Estados Unidos. En ese caso el envío se hace a petición tuya, cuando conectas el asistente y cuando le pides una operación, y la transferencia sigue las garantías indicadas en la política del proveedor.",
				],
				items: [],
				contact: false,
			},
			{
				title: "9. Plazo de conservación",
				paragraphs: [],
				items: [
					"Cuenta, programas y saldos: mientras exista la cuenta. Después de la eliminación de la cuenta se borran en un plazo de 30 días.",
					"Sesión, con dirección IP y navegador: mientras exista la sesión. Una sesión caduca 7 días después del último uso y se cierra en el acto con Salir.",
					"Autorización de un asistente de IA: hasta que la revoques o elimines la cuenta.",
					"Identificadores y estado de la suscripción: mientras exista la cuenta. Los registros de los pagos se conservan en Stripe y en la contabilidad del responsable durante 10 años (art. 2220 del Código Civil italiano).",
					"Códigos de acceso de un asistente de IA: un código de acceso caduca a la hora; un código de renovación caduca a los 30 días y se sustituye en cada uso. Los códigos caducados o revocados se borran en un plazo de un día.",
					'Puedes eliminar tu cuenta y todos sus datos desde el panel, con "Eliminar cuenta". Si no puedes acceder, escribe a la dirección de abajo. También puedes quitar a Yume el acceso a tu cuenta de Google en myaccount.google.com/connections.',
				],
				contact: true,
			},
			{
				title: "10. Derechos del interesado",
				paragraphs: [
					"Conforme a los arts. 15 a 22 RGPD puedes pedir el acceso a tus datos y una copia (art. 15), la rectificación (art. 16), la supresión (art. 17), la limitación (art. 18), la portabilidad en formato JSON (art. 20) y oponerte al tratamiento basado en el interés legítimo (art. 21).",
					"Puedes presentar una reclamación ante el Garante per la protezione dei dati personali (www.gpdp.it) o ante la autoridad de control del Estado miembro de tu residencia habitual, en España la Agencia Española de Protección de Datos (www.aepd.es), conforme al art. 77 RGPD.",
					"Respondemos en un plazo de 30 días desde la solicitud (art. 12 RGPD).",
				],
				items: [],
				contact: true,
			},
			{
				title: "11. Menores",
				paragraphs: [
					"Yume no está dirigido a menores de 14 años (art. 2-quinquies del D.Lgs. 196/2003). Si sabemos que una cuenta pertenece a un menor de 14 años, la borramos.",
				],
				items: [],
				contact: false,
			},
			{
				title: "12. Cookies",
				paragraphs: [
					"Yume usa solo cookies técnicas, necesarias para el acceso: la cookie de la sesión, válida 7 días desde el último uso, y una cookie temporal que protege el paso por Google. Ninguna cookie de perfilado ni de terceros: por eso la página no pide un consentimiento (Directrices del Garante italiano sobre cookies del 10 de junio de 2021). La conexión de un asistente de IA no usa cookies adicionales: el asistente se identifica con su propio código de acceso.",
				],
				items: [],
				contact: false,
			},
			{
				title: "13. Actualizaciones",
				paragraphs: [
					"La fecha de arriba indica la última modificación. Una modificación sustancial indica en esta página la nueva fecha y el cambio.",
				],
				items: [],
				contact: false,
			},
		],
	},

	connector: {
		title: "Conectar un asistente de IA a Yume",
		description:
			"Cómo conectar Claude, Claude Code, ChatGPT, Codex u otro asistente de IA a tus saldos en Yume con el conector MCP.",
		subtitle: "Conector MCP de yumemiles.com",
		updated: "Última actualización: noviembre de 2026",
		contactLead: "Para un problema con el conector escribe a",
		sections: [
			{
				title: "Qué es",
				paragraphs: [
					"Yume ofrece un servidor MCP (Model Context Protocol). Un asistente de IA conectado, por ejemplo Claude, lee tus saldos y las millas potenciales, y añade un saldo cuando se lo pides. Puedes mostrarle la captura de pantalla de la app del programa y pedirle que escriba el saldo.",
					"Hace falta una cuenta de Yume con la cuenta de apoyo. El acceso usa tu cuenta de Google, como en el sitio.",
				],
				items: [],
				contact: false,
			},
			{
				title: "Dirección del servidor",
				paragraphs: [
					"https://yumemiles.com/mcp",
					"Si has instalado Yume en tu servidor, la dirección es https://<tu dominio>/mcp.",
				],
				items: [],
				contact: false,
			},
			{
				title: "Conectar un asistente",
				paragraphs: [
					"Añade https://yumemiles.com/mcp como conector personalizado de tu asistente. Luego accede a Yume con Google y, en la página de autorización de Yume, comprueba adónde va el código: claude.ai para Claude, chatgpt.com para ChatGPT, localhost o 127.0.0.1 para Claude Code y Codex, es decir, tu ordenador. Autoriza solo si has iniciado tú la conexión.",
					"Cómo añadir un conector en Claude: support.claude.com/en/articles/11175166. Cómo añadir un servidor MCP en Claude Code: code.claude.com/docs/en/mcp.",
					"Cómo conectar un servidor MCP a ChatGPT y a Codex: learn.chatgpt.com/docs/extend/mcp.",
				],
				items: [],
				contact: false,
			},
			{
				title: "Qué puede hacer el asistente",
				paragraphs: [],
				items: [
					"list_accounts: lee tus cuentas, con el saldo más reciente y las caducidades de los puntos.",
					"get_potential: lee las millas potenciales de cada moneda de las aerolíneas.",
					"get_catalogue: lee las monedas, los programas y las reglas de transferencia vigentes.",
					"add_snapshot: añade un saldo a una de tus cuentas. Es la única herramienta que escribe.",
				],
				contact: false,
			},
			{
				title: "Ejemplos de peticiones",
				paragraphs: [],
				items: [
					"¿Cuántos Avios potenciales tengo?",
					"Actualiza el saldo de Amex: aquí tienes la captura de la app.",
					"¿Desde qué programas puedo transferir puntos a Flying Blue?",
				],
				contact: false,
			},
			{
				title: "Límites",
				paragraphs: [
					"El asistente no puede borrar cuentas ni saldos y no puede transferir puntos: Yume no mueve puntos entre programas. Las millas potenciales son un cálculo, no un saldo, y una transferencia de puntos es permanente.",
				],
				items: [],
				contact: false,
			},
			{
				title: "Revocar el acceso",
				paragraphs: [
					"En el panel de Yume, en la sección Asistentes conectados, pulsa Revocar. El asistente pierde el acceso en el acto. Quitar el conector del asistente no basta para revocar el acceso en Yume.",
				],
				items: [],
				contact: false,
			},
			{
				title: "Datos personales",
				paragraphs: [
					"La sección 4 bis de la información de privacidad, en la página /privacy, describe qué datos recibe el asistente y quién los trata.",
				],
				items: [],
				contact: true,
			},
		],
	},

	support: {
		title: "Asistencia",
		description:
			"Cómo contactar con Yume por un problema con la cuenta, con los saldos o con un asistente de IA conectado.",
		subtitle: "Asistencia de yumemiles.com",
		updated: "Última actualización: noviembre de 2026",
		contactLead: "Escribe a",
		sections: [
			{
				title: "Contacto",
				paragraphs: [
					"Para un problema con la cuenta, con un saldo, con el cálculo de las millas potenciales o con un asistente de IA conectado, escribe un email. Indica la página o el asistente, qué has hecho y qué has visto.",
					"No escribas en el email códigos de acceso ni contraseñas.",
				],
				items: [],
				contact: true,
			},
		],
	},

	tos: {
		title: "Términos del servicio",
		description:
			"Las condiciones de uso de Yume, la calculadora de millas potenciales, y de la cuenta de apoyo.",
		subtitle:
			"Condiciones de uso de yumemiles.com. Traducción del texto italiano, que prevalece en caso de discrepancia.",
		updated: "Última actualización: noviembre de 2026",
		contactLead: "Para información o reclamaciones escribe a",
		sections: [
			{
				title: "1. Objeto del servicio",
				paragraphs: [
					"Yume es un servicio de Annadermolab, empresa individual, con domicilio en Turín (TO), Italia, P.IVA 11836750015. Muestra los saldos de los programas de fidelización que introduces y calcula las millas potenciales de cada moneda, con los ratios de transferencia oficiales de tu país.",
					"La cuenta gratuita no tiene coste. La cuenta de apoyo es de pago y añade las funciones de la sección 7 bis.",
					"Yume no se conecta a tus cuentas, no lee los saldos de forma automática y no transfiere puntos. No pertenece a American Express, a Revolut, a Klarna ni a los programas de fidelización citados.",
				],
				items: [],
				contact: false,
			},
			{
				title: "2. Aceptación",
				paragraphs: [
					"El primer acceso con tu cuenta de Google crea la cuenta de Yume y supone la aceptación de estos Términos y la lectura de la Información de privacidad.",
				],
				items: [],
				contact: false,
			},
			{
				title: "3. Requisitos",
				paragraphs: [],
				items: [
					"Una cuenta de Google válida.",
					"Al menos 14 años de edad. Si tienes menos de 18 años hace falta el consentimiento de un progenitor.",
					"Uso personal y no comercial.",
				],
				contact: false,
			},
			{
				title: "4. Cuenta y seguridad",
				paragraphs: [
					"El acceso depende de tu cuenta de Google: eres tú quien la custodia. Si pierdes el acceso a la cuenta de Google, pierdes también el acceso a Yume. Si notas un acceso que no has hecho tú, sal de Yume y escríbenos.",
				],
				items: [],
				contact: true,
			},
			{
				title: "5. Naturaleza de los valores calculados",
				paragraphs: [],
				items: [
					"Las millas potenciales son un cálculo, no un saldo. Son un máximo para cada moneda: los mismos puntos no van a dos programas.",
					"Los ratios de transferencia vienen de las páginas oficiales de los programas y tienen una fecha. Los programas pueden cambiarlos sin previo aviso.",
					"Una transferencia de puntos es definitiva. Antes de transferir, comprueba el ratio, los mínimos y la disponibilidad en la web del programa.",
					"Yume no presta asesoramiento financiero y no elige por ti.",
				],
				contact: false,
			},
			{
				title: "6. Obligaciones del usuario",
				paragraphs: [],
				items: [
					"Usar el servicio respetando la ley.",
					"No intentar acceder a los datos de otros usuarios ni eludir las medidas de seguridad.",
					"No sobrecargar el servicio con peticiones automáticas.",
				],
				contact: false,
			},
			{
				title: "7. Disponibilidad del servicio",
				paragraphs: [
					"Yume se ofrece tal cual. No garantizamos continuidad ni ausencia de errores, y podemos cambiar o suspender funciones.",
					"Si cerramos Yume o quitamos una función de la cuenta de apoyo antes del final del periodo pagado, te reembolsamos la parte del precio del periodo que queda.",
				],
				items: [],
				contact: false,
			},
			{
				title: "7 bis. Cuenta de apoyo",
				paragraphs: [
					"La cuenta gratuita incluye Amex y Revolut sin límite y 2 programas aéreos. La cuenta de apoyo añade las demás fuentes de puntos del catálogo, hoy Klarna, los programas aéreos sin límite, las fechas de caducidad de los puntos, la familia y la conexión de un asistente de IA.",
				],
				items: [
					"Precio: 9,99 € al año, precio final. El pago se hace en la página de Stripe Payments Europe, Ltd: Yume no recibe los datos de la tarjeta. Stripe te envía el recibo por email.",
					"Inicio: la cuenta de apoyo se activa justo después del pago. Al aceptar estos Términos en el pago pides que el servicio empiece antes del final del periodo de desistimiento.",
					'Renovación automática: la suscripción se renueva cada año al mismo precio. Puedes cancelarla en cualquier momento con "Gestionar suscripción" en el panel: la cuenta de apoyo sigue activa hasta el final del periodo pagado y no se renueva.',
					"Derecho de desistimiento: puedes desistir en un plazo de 14 días desde el pago sin indicar el motivo (art. 52 del D.Lgs. 206/2005 italiano). Escribe a la dirección de abajo, también con el formulario de desistimiento (Anexo I, parte B, del Código del Consumo italiano). Te reembolsamos el importe completo en un plazo de 14 días con el mismo medio de pago, y la cuenta vuelve a ser gratuita.",
					"Renovación fallida: si el pago de la renovación no se completa, la cuenta vuelve a ser gratuita. Stripe reintenta el cargo durante algunos días; con el pago, la cuenta de apoyo se reanuda.",
					"Fin de la cuenta de apoyo: no pierdes datos. Las cuentas, los saldos y las caducidades se quedan, pero no puedes añadir cuentas o caducidades más allá de los límites de la cuenta gratuita.",
					"Familia: el titular la crea e invita a las personas, o las añade sin cuenta. Quien acepta una invitación muestra sus saldos a la familia. Al final de la cuenta de apoyo del titular la familia se queda, pero no se añaden personas ni cuentas.",
				],
				contact: true,
			},
			{
				title: "8. Responsabilidad",
				paragraphs: [
					"En los límites permitidos por la ley, Annadermolab no responde de pérdidas de puntos o millas, de transferencias decididas a partir de los cálculos, de cambios de los programas de fidelización ni de interrupciones debidas a servicios de terceros. Quedan a salvo la responsabilidad por dolo o culpa grave (art. 1229 del Código Civil italiano) y los derechos que el Código del Consumo italiano (D.Lgs. 206/2005) reconoce al consumidor.",
				],
				items: [],
				contact: false,
			},
			{
				title: "9. Eliminación y suspensión",
				paragraphs: [
					'Puedes eliminar tu cuenta en cualquier momento desde el panel, con "Eliminar cuenta", o escribiéndonos. Los datos se borran como se describe en la Información de privacidad. La eliminación cierra también en el acto la suscripción de la cuenta de apoyo, sin más cargos.',
					"Podemos suspender o cerrar una cuenta que incumpla estos Términos, con un aviso por email cuando sea posible.",
				],
				items: [],
				contact: true,
			},
			{
				title: "10. Propiedad intelectual",
				paragraphs: [
					"El código de Yume es open source con licencia MIT. Los nombres y logotipos de los programas de fidelización, de las tarjetas y de las aerolíneas son marcas de sus respectivos propietarios y solo sirven para identificarlos.",
				],
				items: [],
				contact: false,
			},
			{
				title: "11. Datos personales",
				paragraphs: [
					"El tratamiento de los datos personales se describe en la Información de privacidad, en la página /privacy.",
				],
				items: [],
				contact: false,
			},
			{
				title: "12. Cambios en los Términos",
				paragraphs: [
					"La fecha de arriba indica la última modificación. Un cambio sustancial se publica en esta página con un preaviso razonable antes de su entrada en vigor. Si sigues usando Yume después de esa fecha, aceptas los nuevos Términos.",
				],
				items: [],
				contact: false,
			},
			{
				title: "13. Ley aplicable y fuero competente",
				paragraphs: [
					"Estos Términos se rigen por la ley italiana. Para las controversias con un consumidor es competente el juez del lugar de residencia o domicilio del consumidor (art. 66-bis del D.Lgs. 206/2005 italiano).",
				],
				items: [],
				contact: true,
			},
		],
	},
};
