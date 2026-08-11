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

Write the extension `.ts` in a relative import: `import { x } from "./x.ts"`. Node removes
the types at runtime with `--experimental-strip-types`, and it resolves the path exactly
as you write it. An import of `./x.js` gives the error `ERR_MODULE_NOT_FOUND`, because
that file does not exist. The server needs no build step with this rule.

## Rules for the work

These rules apply to each task. The section Hooks gives the rules that a hook makes
mechanical.

1. **Ask when a requirement is not clear.** Do not write code with an assumption. The
   section Questions gives the operations that always need a question.
2. **Write the test first.** Write the test before the implementation. Each file with
   logic has a test file.
3. **Examine the edge cases after each implementation.** Make a list of the edge cases.
   Add a test for each one. Do these operations before the commit.
4. **Divide a large task.** If a task changes more than 3 files, stop. Then divide the
   task into sub-tasks.
5. **Find the cause of a correction.** If the user corrects you, find the reason for the
   error. Then prevent the same error.
6. **Keep this file and the skills correct.** If you solve a difficult problem, write the
   lesson here or in the correct skill. Do this operation without a request from the
   user.
7. **Remove an internal path that is obsolete.** Remove the call sites, the tests and the
   dead columns. Do not write a compatibility layer. Do not write an `if (legacy)`
   branch. If the removal changes more than 3 files, obey the rule 4. These three items
   are not compatibility layers:
   - A migration in `drizzle/` that ran one time. A migration is immutable. Add a new
     migration.
   - A transfer rule with a `validTo` that is not null. A closed rule is historical data.
     Keep it. Refer to the rule 4 of the data.
   - A fallback for an error at runtime.
8. **Use the packages that the project has.** Read the documents and the types of an
   installed package first. Do not assume that a package cannot do the operation.
9. **Keep the work minimal.** Write the smallest change that gives the requested result.
   Obey these limits:
   - Do not add a function for a future requirement. Add the function with the
     requirement.
   - Do not add an option, a configuration item or an abstraction that the user did not
     request.
   - Keep the text of the user interface short. One short sentence is sufficient for a
     warning.
   - Write each new idea in a list. Then ask the user. A later session can add the
     function.

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

The theme is an airport departure board with split-flap displays. The palette is dark
only. Obey these rules:

- Keep the shadcn/ui components in `src/client/components/ui/`. Do not change these
  files.
- Put the components of the theme in `src/client/components/board/`. These components
  use the components of `ui/`.
- Keep all the tokens in one CSS file. Use the `@theme` directive of Tailwind CSS v4.
- Use the theme on the display surfaces. Use standard components for the forms and for
  the dialogs.
- Keep the font files in the repository. Do not use an external CDN.
- Give `aria-hidden` to the digits that move. Put the correct value in an element that
  is not visible.
- If the user selects `prefers-reduced-motion`, show the new value immediately.
- Show all the numbers with the locale `it-IT`.

## Commands

Run these commands before each commit:

```bash
npm test          # Vitest, one time
npm run typecheck # tsc --noEmit
npm run check     # Biome, examination only
npm run fix       # Biome, it writes the corrections
```

Biome writes tab indentation. Run `npm run fix` after you add a file. Biome does not
examine `.claude/`, because that directory belongs to the harness. Biome does not examine
`drizzle/`, because drizzle-kit writes those files.

Run these commands for the database and for the server:

```bash
npm run db:generate # drizzle-kit generate, after a change to schema.ts
npm run db:migrate  # drizzle-kit migrate, it applies the migrations
npm run db:seed     # it writes the catalogue in the database
npm run dev:server  # Hono on the port 3000
npm run dev:client  # Vite on the port 5173, it sends /api to the port 3000
npm run build       # Vite writes dist/, and Hono supplies those files
```

The three commands of the database use `DATABASE_URL`. The default value is
`./data/yume.db`.

The hooks have commands. Run each test suite after a change to a hook:

```bash
bash .claude/hooks/test-block-commit-on-main.sh
bash .claude/hooks/test-block-push-to-main.sh
bash .claude/hooks/test-block-private-data-commit.sh
```

## Git

- Do work on a feature branch. Do not commit to `main`.
- Write a commit message in the imperative form. Give the reason for the change.
- Commit the generated migrations in `drizzle/`.
- Do not commit the database file, the `data/` directory or a `.env` file.

## Hooks

The directory `.claude/hooks/` holds the hooks. The file `.claude/settings.json` starts
them. A hook makes a rule of this file mechanical. Thus the rule stays active when the
context of a session becomes long.

| Hook | Effect |
|---|---|
| `block-commit-on-main.sh` | It blocks a commit on `main`. Refer to the section Git. |
| `block-push-to-main.sh` | It blocks a push to `main`. Refer to the section Git. |
| `block-private-data-commit.sh` | It blocks `git add` of the database file, of `data/` and of a `.env` file. Refer to the section Git. |

`.gitignore` is the first defence for the private files. The hook
`block-private-data-commit.sh` is the second defence. That hook also blocks
`git add --force`, because the force option makes `.gitignore` inactive.

A hook is code. Each hook has a test suite in the same directory. A hook that stops the
block must make a test fail. The section Commands gives the commands for the suites.

## Skills

The directory `.claude/skills/` holds the skills. A skill is **prescriptive**: it gives
the method for a task. `docs/architecture.md` is **descriptive**: it gives the decisions
and the catalogue.

| Skill | Subject |
|---|---|
| `conversion-math` | The calculation of the potential miles. The sequence of the steps with integers, the difference between a currency and a programme, and the selection of a versioned rule. |

The harness reads the field `description` of a skill. Then the harness starts the skill
for a task that matches. Write the names of the files and of the fields in the
description. Thus the correct task starts the skill.

## Questions

Ask the user before you do these operations:

- add a new dependency
- change a value in the catalogue of programmes or in the transfer rules
- change a decision in `docs/architecture.md`
