import { formatPoints } from "../../lib/format.ts";

/**
 * A number on the face of a flap.
 *
 * The variant holds the classes. Do not write the classes of a variant at the
 * point of use. Refer to paragraph 5.1 of `docs/architecture.md`.
 *
 * `total` is the potential of a currency. The amber colour marks a value that
 * is a calculation, not a balance. `row` is a balance in a list.
 */
const variants = {
	total: "px-3 py-2 text-3xl text-board-amber",
	row: "px-2 py-1 text-base text-board-text",
} as const;

export function FlapNumber({
	value,
	variant = "row",
}: {
	value: number;
	variant?: keyof typeof variants;
}) {
	return (
		<span className={`flap inline-block ${variants[variant]}`}>
			{formatPoints(value)}
		</span>
	);
}
