/**
 * Writes the catalogue in the database. The container runs this script at the
 * start, after the migrations.
 */

import { openDatabase } from "../index.ts";
import { seedCatalogue } from "./seed.ts";

const url = process.env.DATABASE_URL ?? "./data/yume.db";
const db = openDatabase(url);
seedCatalogue(db);
db.$client.close();
console.log(`The catalogue is in ${url}.`);
