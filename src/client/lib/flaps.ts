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
	/** A separator of the thousands is not a flap of the board. */
	readonly kind: "digit" | "separator";
};

/** Divides a quantity of points into one flap for each character. */
export function toFlapCells(value: number): FlapCell[] {
	return [...formatPoints(value)].map((char, position) => ({
		position,
		char,
		kind: char >= "0" && char <= "9" ? "digit" : "separator",
	}));
}
