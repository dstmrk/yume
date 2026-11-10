import type { TransferRule } from "../../../shared/catalogue.ts";

/**
 * Examines the versions of each pair of programmes in each country.
 *
 * `isValidAt` reads `validFrom <= at < validTo`. Thus the `validTo` of a
 * version must be equal to the `validFrom` of the next version. A date before
 * it gives a day with no valid rule, and the route then gives 0. A date after it
 * gives two valid rules on one day.
 *
 * It gives one text for each error. An empty list means that the versions are
 * correct.
 */
export function continuityErrors(rules: readonly TransferRule[]): string[] {
	const byKey = new Map<string, TransferRule[]>();
	for (const rule of rules) {
		const key = `${rule.fromProgramId}->${rule.toProgramId}@${rule.country}`;
		byKey.set(key, [...(byKey.get(key) ?? []), rule]);
	}

	const errors: string[] = [];
	for (const [key, versions] of byKey) {
		// An active version goes after a closed version with the same start. Thus
		// the order, and the text of the error, do not change with the order of
		// the file.
		const sorted = [...versions].sort(
			(a, b) =>
				a.validFrom.localeCompare(b.validFrom) ||
				(a.validTo ?? "￿").localeCompare(b.validTo ?? "￿"),
		);
		for (const version of sorted) {
			if (version.validTo !== null && version.validTo <= version.validFrom) {
				errors.push(
					`${key}: empty version from ${version.validFrom} to ${version.validTo}`,
				);
			}
		}
		for (let index = 1; index < sorted.length; index++) {
			const before = sorted[index - 1] as TransferRule;
			const after = sorted[index] as TransferRule;
			if (before.validTo === null) {
				errors.push(`${key}: overlap from ${after.validFrom}`);
			} else if (before.validTo < after.validFrom) {
				errors.push(`${key}: gap from ${before.validTo} to ${after.validFrom}`);
			} else if (before.validTo > after.validFrom) {
				errors.push(
					`${key}: overlap from ${after.validFrom} to ${before.validTo}`,
				);
			}
		}
	}
	return errors;
}
