# CLAUDE.md

Rules for work in this repository. This file is in ASD-STE100 Simplified Technical
English.

## The project

Yume is a private dashboard for reward points and airline miles. It shows the balances
of the user. Then it calculates the **potential miles** for each airline currency.

Read [`docs/architecture.md`](docs/architecture.md) before you write code. That document
contains the stack, the data model and the deployment rules.

## Language rules

| Item | Language |
|---|---|
| Documents (`*.md`) | English. Use ASD-STE100 Simplified Technical English. |
| User interface text | Italian. |
| Code, identifiers, comments | English. |
| Commit messages, PR text | English. |

ASD-STE100 gives these rules for the documents:

- Write one instruction in one sentence.
- Keep procedural sentences to a maximum of 20 words. Keep descriptive sentences to a
  maximum of 25 words.
- Keep a maximum of 6 sentences in a descriptive paragraph.
- Use the active voice.
- Use the simple present tense when it is possible.
- Do not use the `-ing` form as a noun.
- Use the same word for the same thing. Do not use two words for one thing.
- Use `must` for a requirement. Use `can` for a possibility. Do not use `should`.
- Do not use idioms and do not use technical slang.

Keep the Italian text of the interface in one place. Do not put Italian text in the
server code.

## Stack

- Node 22 LTS, TypeScript, Zod
- Server: Hono. It supplies the API and the client files from one origin.
- Client: Vite, React 19, TanStack Router, TanStack Query
- User interface: Tailwind CSS v4, shadcn/ui, lucide-react
- Database: SQLite with `better-sqlite3`. Schema and migrations with Drizzle.
- Authentication: Better Auth with the Drizzle adapter
- Tests: Vitest. Lint and format: Biome.

The project has one `package.json`. Do not add a monorepo tool.

## Rules for the data

These rules prevent the most dangerous defects in this application:

1. **Use integers only.** Points are integers. Keep each ratio as two integers
   (`ratioNum`, `ratioDen`). Do not use a floating-point number for a ratio or for a
   balance.
2. **A currency is different from a programme.** Six programmes use Avios. Calculate the
   potential for each currency. If you calculate the potential for each programme, you
   count the same balance more than one time.
3. **Keep snapshots.** The table `balance_snapshot` holds the balance at a date. The
   current balance is the most recent snapshot. Do not keep a record of the changes.
4. **Make the transfer rules versioned.** Each rule has `validFrom`, `validTo` and
   `sourceUrl`. Do not change a rule in its place. Close the old rule and add a new
   rule.
5. **Give a source for each ratio.** Do not add a transfer rule without a `sourceUrl`.
   Do not write a ratio from memory.

The conversion logic is in `src/shared/`. The functions must be pure and must do no I/O.
Write a unit test for each new rule of the calculation.

## Rules for the user interface

- The user interface shows that the potential miles are a calculation, not a balance.
- The user interface shows that a transfer of points is permanent.
- Do not show a potential value as a sum of all the currencies. The user cannot send the
  same points to two programmes.

## Commands

The project is in the design stage. There is no application code and there are no
commands. Add the commands to this file with the first code.

## Git

- Do work on a feature branch. Do not commit to `main`.
- Write a commit message in the imperative form. Give the reason for the change.
- Commit the generated migrations in `drizzle/`.
- Do not commit the database file, the `data/` directory or a `.env` file.

## Questions

Ask the user before you do these operations:

- add a new dependency
- change a value in the catalogue of programmes or in the transfer rules
- change a decision in `docs/architecture.md`
