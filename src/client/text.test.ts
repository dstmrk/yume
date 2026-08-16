import { describe, expect, it } from "vitest";
import {
	currencies,
	programs,
	transferRules,
} from "../server/db/seed/catalogue.ts";
import { text } from "./text.ts";

/**
 * The public page names a quantity of programmes and a list of names. Those
 * values also live in the catalogue, therefore they can move apart in silence:
 * a new transfer rule changes the catalogue and no test reads the text.
 *
 * These tests join the two. A change of the catalogue that the copy does not
 * follow makes a test fail, and the message names the value to correct.
 */

const airlineCurrencyIds = new Set(
	currencies.filter((currency) => currency.kind === "airline").map((c) => c.id),
);

/** A rule with no `validTo` is a rule of today. Refer to the rule 4 of the data. */
const activeRules = transferRules.filter((rule) => rule.validTo === null);
const reachable = new Set(activeRules.map((rule) => rule.toProgramId));

const airlinePrograms = programs.filter((program) =>
	airlineCurrencyIds.has(program.currencyId),
);

/** The answer that gives the numbers of the catalogue. */
const scopeAnswer = text.homeFaq.find((item) =>
	item.answer.includes("programmi aerei"),
)?.answer;

/** The answer that names the programmes of Avios. */
const aviosAnswer = text.homeFaq.find((item) =>
	item.answer.includes("Avios"),
)?.answer;

describe("the copy of the public page and the catalogue", () => {
	it("gives the quantity of the airline programmes that a source reaches", () => {
		const count = airlinePrograms.filter((program) =>
			reachable.has(program.id),
		).length;

		expect(scopeAnswer).toBeDefined();
		expect(scopeAnswer).toContain(`${count} programmi aerei`);
	});

	it("names each airline programme that no source reaches", () => {
		for (const program of airlinePrograms) {
			if (!reachable.has(program.id)) {
				expect(scopeAnswer).toContain(program.name);
			}
		}
	});

	it("names each source of the catalogue", () => {
		const sources = new Set(activeRules.map((rule) => rule.fromProgramId));

		for (const id of sources) {
			const program = programs.find((item) => item.id === id);
			expect(program).toBeDefined();
			expect(scopeAnswer).toContain(program?.name ?? "");
		}
	});

	it("names each programme that uses Avios", () => {
		const avios = programs.filter((program) => program.currencyId === "avios");

		expect(avios).toHaveLength(6);
		for (const program of avios) {
			expect(aviosAnswer).toContain(program.name);
		}
	});

	/**
	 * The blocks say "sei programmi" and the answer says "sei volte". A seventh
	 * programme of Avios makes those two words wrong, and this test then fails
	 * with the block that holds the word.
	 */
	it("keeps the word of the quantity of the programmes of Avios", () => {
		const avios = programs.filter((program) => program.currencyId === "avios");
		const word = ["zero", "un", "due", "tre", "quattro", "cinque", "sei"][
			avios.length
		];

		expect(word).toBeDefined();
		// The block opens the sentence with that word, thus it holds a capital.
		expect(text.homeWhat[0]?.body.toLowerCase()).toContain(`${word} programmi`);
		expect(aviosAnswer).toContain(`${word} volte`);
	});
});

describe("the copy of a function that arrives later", () => {
	/**
	 * A function that no code gives must never arrive in the present tense.
	 * The text of that block uses the future. Refer to paragraph 5.5.4 of
	 * `docs/architecture.md`.
	 */
	it("writes the function of the future with a verb of the future", () => {
		expect(text.homeSoon).toContain("sarà");
		expect(text.homeSoon).toContain("dirà");
	});

	it("gives a mark to that block", () => {
		expect(text.homeSoonBadge).not.toBe("");
	});
});
