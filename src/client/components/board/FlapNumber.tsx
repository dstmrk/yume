import { formatPoints } from "../../lib/format.ts";

/**
 * A quantity of points on one face of a flap.
 *
 * This component is for a balance in a list. The potential of a currency uses
 * `SplitFlapNumber`, with one flap for each digit.
 */
export function FlapNumber({ value }: { value: number }) {
	return (
		<span className="flap inline-block px-2 py-1 text-base text-board-text">
			{formatPoints(value)}
		</span>
	);
}
