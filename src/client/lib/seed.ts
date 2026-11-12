/**
 * The catalogue of the seed, for the public pages and the calculator.
 *
 * The container writes the seed in the database at each start, thus the
 * database and this file hold the same rules. The public pages read this file:
 * the build writes them with no database, and the calculator makes no request
 * to the server. Paragraph 5.5.5 of `docs/architecture.md` gives the reason.
 *
 * The file of the seed holds data and types only. It imports no module of the
 * server.
 */

import {
	currencies,
	programs,
	transferRules,
} from "../../server/db/seed/catalogue.ts";
import type { Catalogue } from "./catalogue.ts";

export const SEED: Catalogue = {
	currencies,
	programs,
	rules: transferRules,
};
