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
	return [...formatPoints(value)].map((char, position) => ({
		position,
		char,
	}));
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
