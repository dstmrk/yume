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
