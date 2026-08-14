import { formatPoints } from "./format.ts";

/**
 * One flap of the board.
 *
 * A board has one flap for each character. `position` is the place of the flap
 * on the board, and it is the identity of that flap: the flap in the third
 * place stays the same flap when the value changes. React uses it as the key.
 */
export type FlapCell = {
	readonly position: number;
	readonly char: string;
};

/**
 * Divides a quantity of points into one flap for each character.
 *
 * The separator of the thousands receives a flap. A board of Solari holds one
 * flap for each position, and each flap has the same size.
 */
export function toFlapCells(value: number): FlapCell[] {
	return toCells(formatPoints(value));
}

/**
 * Divides a word into one flap for each letter.
 *
 * The board holds capital letters, thus this function gives capital letters.
 * A space also receives a flap: a board of Solari holds one flap for each
 * position.
 */
export function toWordCells(word: string): FlapCell[] {
	return toCells(word.toUpperCase());
}

/** Gives one flap to each character of a text. */
function toCells(text: string): FlapCell[] {
	return [...text].map((char, position) => ({
		position,
		char,
	}));
}

/**
 * One turn of a flap: the character that falls and the character that arrives.
 *
 * A flap of Solari is a card with two halves. At one turn, the top half of
 * `from` falls forward, and the bottom half of `to` falls after it. Thus the
 * two halves of one turn show two different characters.
 *
 * `step` is the place of the turn in the sequence. The animation gives a delay
 * of that quantity of steps, thus the flap turns one time after the other.
 */
export type FlapFold = {
	readonly step: number;
	readonly from: string;
	readonly to: string;
};

/**
 * The two halves of a flap at rest, and each turn from the start to the value.
 *
 * `top` is the character of the top half after the last turn. `bottom` is the
 * character of the bottom half before the first turn. The folds cover the two
 * halves while the flap turns.
 */
export type FlapTurn = {
	readonly top: string;
	readonly bottom: string;
	readonly folds: FlapFold[];
};

/**
 * The drum of a flap: the empty position, the separator of the thousands, then
 * the digits.
 *
 * A flap turns through each character of the drum: it cannot arrive at a
 * character with one turn. The empty position is the first one, thus a board at
 * the start shows no character, as a board with no data.
 *
 * The drum holds no letter. The board shows a letter in the name of the
 * application only, and that name does not turn. Refer to paragraph 5.6 of
 * `docs/architecture.md`.
 */
const DRUM = " .0123456789";

/** The first position of the drum. Each flap starts at that character. */
const REST = " ";

/**
 * Gives the turns of one flap, from the first position of the drum to a
 * character.
 *
 * A board of Solari turns the drum of each flap until the correct character
 * arrives. The user sees the characters before it. Therefore this function
 * gives one fold for each character of the drum, and the animation shows them
 * one after the other.
 *
 * These two flaps receive no fold, and their two halves hold the character:
 *
 * - A flap that does not move. Refer to paragraph 5.2 of
 *   `docs/architecture.md`.
 * - A flap at the empty position, and a flap with a character that the drum
 *   does not hold. Such a flap is already at its place.
 */
export function toFlapTurn(char: string, moves: boolean): FlapTurn {
	const end = DRUM.indexOf(char);
	if (!moves || end <= 0) {
		return { top: char, bottom: char, folds: [] };
	}

	let previous = REST;
	const folds = [...DRUM].slice(1, end + 1).map((to, step) => {
		const fold = { step, from: previous, to };
		previous = to;
		return fold;
	});

	// The bottom half stays at the first position: the first fold covers it.
	return { top: char, bottom: REST, folds };
}

/** The size of the flaps of a potential. */
export type FlapSize = "lg" | "md";

/** The smallest value of seven digits. */
const SEVEN_DIGITS = 1_000_000;

/**
 * Gives the size of the flaps of a potential.
 *
 * A board of six digits at the large size is 243 pixels wide, and the panel
 * gives 294 pixels on a screen of 360 pixels. A board of seven digits is 313
 * pixels: the panel cuts the last flap, and the user reads a value that is not
 * correct. Therefore a value of seven digits receives the medium size, and then
 * the board is 250 pixels. Refer to paragraph 5.3 of `docs/architecture.md`.
 */
export function flapSize(value: number): FlapSize {
	return value < SEVEN_DIGITS ? "lg" : "md";
}
