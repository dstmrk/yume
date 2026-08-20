import type { Db } from "../index.ts";
import { currency, program, transferRule } from "../schema.ts";
import { currencies, programs, transferRules } from "./catalogue.ts";

/**
 * Writes the catalogue in the database.
 *
 * The function makes no duplicate record. It writes a row one time, and then it
 * gives the new values to that row. Thus the container can start many times.
 *
 * The function removes no row. A rule that is not in the catalogue file is
 * historical data of a user. Refer to rule 4 of the data in `CLAUDE.md`.
 */
export function seedCatalogue(db: Db): void {
	db.transaction((tx) => {
		for (const row of currencies) {
			tx.insert(currency)
				.values(row)
				.onConflictDoUpdate({
					target: currency.id,
					set: { code: row.code, name: row.name, kind: row.kind },
				})
				.run();
		}

		for (const row of programs) {
			tx.insert(program)
				.values(row)
				.onConflictDoUpdate({
					target: program.id,
					set: {
						currencyId: row.currencyId,
						code: row.code,
						name: row.name,
						transferable: row.transferable,
						chartKind: row.chartKind ?? null,
					},
				})
				.run();
		}

		for (const row of transferRules) {
			tx.insert(transferRule)
				.values(row)
				.onConflictDoUpdate({
					target: [
						transferRule.fromProgramId,
						transferRule.toProgramId,
						transferRule.country,
						transferRule.validFrom,
					],
					set: {
						ratioNum: row.ratioNum,
						ratioDen: row.ratioDen,
						minTransfer: row.minTransfer,
						increment: row.increment,
						validTo: row.validTo,
					},
				})
				.run();
		}
	});
}
