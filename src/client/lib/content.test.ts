import { describe, expect, it } from "vitest";
import { i18nOf } from "../i18n/messages.ts";
import { currencyPages, SOURCE_SLUGS, sourcePages } from "./catalogue.ts";
import {
	currencySourceNames,
	currencyText,
	matrixLead,
	pointsText,
	sourceMatrix,
	sourceText,
} from "./content.ts";
import { SEED } from "./seed.ts";

const IT = i18nOf("it");
const AT = "2026-11-11";
const currencies = currencyPages(SEED, "IT", AT);
const sources = sourcePages(SEED, "IT", AT, SOURCE_SLUGS);
const page = (id: string) => {
	const found = currencies.find((item) => item.currency.id === id);
	if (found === undefined) {
		throw new Error(`No page ${id}.`);
	}
	return found;
};

describe("pointsText", () => {
	it("gives the plural of Italian", () => {
		expect(pointsText(1, IT)).toBe("1 punto");
		expect(pointsText(800, IT)).toBe("800 punti");
		expect(pointsText(1500, IT)).toBe("1.500 punti");
	});
});

describe("currencyText", () => {
	const avios = currencyText(page("avios"), sources, IT);

	it("names the currency in the title of the head", () => {
		expect(avios.metaTitle).toContain("Avios");
	});

	// A search engine cuts a longer title.
	it("keeps each title of the head to 60 characters", () => {
		for (const item of currencies) {
			const text = currencyText(item, sources, IT);
			expect(text.metaTitle.length, text.metaTitle).toBeLessThanOrEqual(60);
		}
	});

	it("names each source of the currency in the answer", () => {
		expect(avios.lead).toContain("Amex Membership Rewards");
		expect(avios.lead).toContain("Revolut RevPoints");
		expect(avios.lead).toContain("Klarna Cashback");
	});

	it("gives one question for each source and the question of the transfer", () => {
		expect(avios.faq).toHaveLength(sources.length + 1);
	});

	it("answers yes with the ratio and the minimum of each programme", () => {
		const amex = avios.faq[0];

		expect(amex?.question).toBe(
			"Posso trasferire i punti Amex Membership Rewards in Avios?",
		);
		expect(amex?.answer).toContain("verso British Airways, 5 punti = 4 Avios");
		expect(amex?.answer).toContain("minimo 800 punti");
		expect(amex?.answer).toContain("verso Iberia");
	});

	it("answers no for a source that does not reach the currency", () => {
		const delta = currencyText(page("skymiles"), sources, IT);
		const revolut = delta.faq.find((item) => item.question.includes("Revolut"));

		expect(revolut?.answer).toMatch(/^No\./);
	});

	it("gives the lead of one source", () => {
		const delta = currencyText(page("skymiles"), sources, IT);

		expect(delta.lead).toContain("da una carta sola: Amex Membership Rewards");
	});
});

describe("sourceText", () => {
	const amex = sourceText(sources[0] as (typeof sources)[number], IT);

	it("keeps each title of the head to 60 characters", () => {
		for (const item of sources) {
			const text = sourceText(item, IT);
			expect(text.metaTitle.length, text.metaTitle).toBeLessThanOrEqual(60);
		}
	});

	it("gives the range of the minimums", () => {
		const minimum = amex.faq[1];

		expect(minimum?.answer).toMatch(/^Dipende dal programma: da 3 punti a /);
	});

	it("gives one minimum when each programme has the same", () => {
		const revolut = sourceText(sources[1] as (typeof sources)[number], IT);

		expect(revolut.faq[1]?.answer).toBe("1 punto per ogni programma.");
	});

	it("counts the programmes and names the currencies", () => {
		const count = amex.faq[0];
		const programs = (sources[0]?.groups ?? []).flatMap((g) => g.routes).length;

		expect(count?.answer).toContain(`In ${programs} programmi`);
		expect(count?.answer).toContain("Avios");
	});
});

describe("sourceMatrix", () => {
	const rows = sourceMatrix(currencies, sources, IT.intl);

	it("gives one row for each currency and one cell for each source", () => {
		expect(rows).toHaveLength(currencies.length);
		for (const row of rows) {
			expect(row.cells).toHaveLength(sources.length);
		}
	});

	it("gives each different ratio one time", () => {
		const avios = rows.find((row) => row.currency.id === "avios");

		// Amex sends points to British Airways and to Iberia at 5 : 4.
		expect(avios?.cells[0]).toBe("5 : 4");
		// Klarna gives two ratios: Finnair holds its own.
		expect(avios?.cells[2]).toBe("100 : 80,02 / 100 : 101,43");
	});

	it("gives null to a source with no route", () => {
		const skymiles = rows.find((row) => row.currency.id === "skymiles");

		expect(skymiles?.cells[1]).toBeNull();
	});
});

describe("matrixLead", () => {
	it("names first the source with the most programmes", () => {
		const counts = sources.map((source) =>
			source.groups.reduce((sum, group) => sum + group.routes.length, 0),
		);
		const most = Math.max(...counts);

		expect(matrixLead(sources, IT)).toContain(`più programmi aerei: ${most}.`);
	});

	it("gives an empty text with no source", () => {
		expect(matrixLead([], IT)).toBe("");
	});
});

describe("currencySourceNames", () => {
	it("gives each source of the currency one time", () => {
		expect(currencySourceNames(page("avios"))).toStrictEqual([
			"Amex Membership Rewards",
			"Revolut RevPoints",
			"Klarna Cashback",
		]);
	});
});
