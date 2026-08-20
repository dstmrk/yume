/**
 * The comparison of the potential miles of a currency with one award.
 *
 * This function is pure. It does no I/O and it does not read the clock. The
 * caller gives the potential, the award and the programmes as parameters. The
 * caller also selects the award that is valid at the date.
 */

import type { Award, Program } from "./catalogue.ts";
import type { PotentialMiles } from "./potential.ts";

/**
 * The result of one award for one currency.
 *
 * The state `missing` holds the points that the user misses. The state
 * `no-route` says that the currency cannot pay this award.
 */
export type Goal =
	| { readonly state: "reached" }
	| { readonly state: "missing"; readonly points: number }
	| { readonly state: "no-route" };

/**
 * Compares the potential miles of one currency with one award.
 *
 * The programme of the award must use the currency of the potential. A person
 * pays an award of Iberia Club with Avios, not with Flying Blue miles. The
 * result is `no-route` for each other currency.
 *
 * The result is a calculation, not a balance. A surface that shows this result
 * must also show that a transfer of points is permanent. Paragraph 6 of the
 * skill `conversion-math` gives the three rules of the interface.
 */
export function goalFor(input: {
	potential: PotentialMiles;
	award: Award;
	programs: readonly Program[];
}): Goal {
	const { potential, award, programs } = input;
	const program = programs.find((one) => one.id === award.programId);
	if (program === undefined || program.currencyId !== potential.currencyId) {
		return { state: "no-route" };
	}
	if (potential.total >= award.miles) {
		return { state: "reached" };
	}
	return { state: "missing", points: award.miles - potential.total };
}
