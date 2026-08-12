# Yume — Architecture Decision Record

Status: **accepted**. Date: 2026-08-11.

This document records the architecture decisions. The team made these decisions before
the start of the code. The document is in ASD-STE100 Simplified Technical English.

---

## 1. Context

Yume is a private dashboard. It collects the balances of reward points and airline
miles. Then it calculates the **potential miles** for each airline currency.

These constraints control all the decisions in this document:

| Constraint | Decision |
|---|---|
| Cost | Zero. The system uses no paid service and no necessary external service. |
| Deployment | One Docker container on a home server, a NAS or a Raspberry Pi with arm64. |
| Users | A small, closed group. Registration is possible only with an invitation. |
| Data input | Manual. Amex and Revolut do not give a public API for balances. The team refused the automatic collection of data from the web sites. |
| Types | TypeScript for all the code. Zod for all the data validation. |

## 2. Stack

| Layer | Decision | Reason |
|---|---|---|
| Runtime | Node 22 LTS | Long-term support. It includes `fetch`. |
| HTTP server | Hono | Small and standard. It supplies the API and the client files from one origin. |
| Client | Vite, React 19, TanStack Router, TanStack Query | Typed routes. TanStack Query controls the cache and the refresh of data. |
| User interface | Tailwind CSS v4, shadcn/ui, lucide-react | The repository contains the components. No external design system at runtime. |
| Database | SQLite with `better-sqlite3` | One node, few writes, backup of one file. |
| Schema and migrations | Drizzle and drizzle-kit | SQL-first. The repository contains the generated migrations. |
| Authentication | Better Auth with the Drizzle adapter | Sessions on your own server. No external identity provider. |
| Validation | Zod, and `drizzle-zod` for the schemas of the tables | One source of truth for each data shape. |
| Tests | Vitest | |
| Lint and format | Biome | One tool in the place of ESLint and Prettier. |

### 2.1 Why not TanStack Start

TanStack Start has server functions. These functions can remove the API layer. But
TanStack Start also adds server-side rendering. Yume does not need server-side
rendering, because Yume is a private dashboard behind a login. Search engines do not
read it.

The cost of TanStack Start is a smaller set of tools and a Docker build that is more
difficult to examine. Vite with Hono gives two processes in development, but only **one
process in production**. Hono supplies the files from `dist/`. You can replace each part
independently.

Hono RPC keeps the types safe from end to end. The client receives the types of the
routes by inference. You do not need code generation and you do not need tRPC.

### 2.2 Why one origin

Hono supplies the client and the API from the same origin. Thus the session cookies
operate correctly. You do not need a CORS configuration. You do not need
`sameSite: 'none'`. This is the primary reason for one container.

### 2.3 Why SQLite

Each user writes only some rows in one month. SQLite is sufficient for this quantity of
data. Set these pragmas when you open the connection:

```ts
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');    // SQLite sets this to OFF by default
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL'); // safe with WAL
```

Keep the database file on a mounted volume (`/data`). Do not put the database file in
the image. For a backup, use this command:

```sql
VACUUM INTO '/data/backup/yume-<timestamp>.db';
```

This command is safe on a live database. You do not have to stop the application.

## 3. Data model

Three decisions control the schema.

### 3.1 A currency is different from a programme

Avios is one currency. Six programmes use it: British Airways Club, Iberia Club, Aer
Lingus AerClub, Finnair Plus, Qatar Airways Privilege Club and Vueling Club. A member
can move Avios between these programmes at no cost.

Thus the system calculates the potential **for each currency**, not for each programme.
If the system calculates the potential for each programme, it counts the same balance
six times.

The 19 airline programmes use 14 different currencies.

### 3.2 Snapshots, not a record of changes

The user writes the balances manually. The user reads a balance on a screen. The user
does not know the quantity of points of each transaction.

Thus the basic record is a snapshot:

```
balance_snapshot(account_id, points, observed_at, note)
```

The current balance is the most recent snapshot of the account. The system calculates
the changes between two snapshots only for the display. It does not keep the changes in
the database.

### 3.3 Integers only. No floating-point numbers

Points are integers. Transfer ratios are fractions. Keep each ratio as two integers.
Also keep the minimum quantity and the step of the transfer:

```ts
transfer_rule {
  fromProgramId, toProgramId, // refer to paragraph 3.3.1
  ratioNum, ratioDen,        // Amex: 5 MR gives 4 Avios  =>  num 4, den 5
  minTransfer, increment,
  validFrom, validTo,        // validTo is null for an active rule
  sourceUrl
}
```

Then calculate with integers only:

```ts
const transferable = Math.floor(balance / increment) * increment;
const converted = transferable >= minTransfer
  ? Math.floor((transferable * ratioNum) / ratioDen)
  : 0;
```

A floating-point number gives an incorrect result of one or two miles. The user cannot
find the cause of this error.

Each rule has the fields `validFrom` and `validTo`. The ratios change. For example, Amex
removed ITA Volare and Finnair Plus from its list of partners. Old snapshots must stay
correct after a change of the ratios.

### 3.3.1 A rule refers to a programme, not to a currency

A transfer enters an account of a programme. The minimum quantity and the step belong to
the pair of programmes. Two routes to the same currency can have different values. Amex
gives these two routes to Avios:

| Route | Ratio | Minimum | Step |
|---|---|---|---|
| Amex MR to The British Airways Club | 5 : 4 | 800 | 400 |
| Amex MR to Iberia Club | 5 : 4 | 500 | 500 |

A balance of 700 Membership Rewards points gives 400 Avios through Iberia Club. The same
balance gives 0 Avios through The British Airways Club, because 400 is below the minimum
of 800.

Therefore `transfer_rule` refers to `fromProgramId` and `toProgramId`. A rule between two
currencies cannot hold these two different limits.

The currency stays necessary for the total. Avios from Iberia Club and Avios from The
British Airways Club are the same currency. Paragraph 3.5 gives the calculation.

### 3.4 Tables

```
-- Better Auth controls these tables: user, session, account, verification

invitation(id, code, createdByUserId, email?, expiresAt, usedAt, usedByUserId)

currency(id, code, name, kind)        -- 'airline' | 'flexible' | 'hotel' | 'rail'
program(id, currencyId, code, name, airlineIata?, alliance?, transferable)
transfer_rule(...)                    -- refer to paragraph 3.3

user_account(id, userId, programId, membershipRef?, nickname?)
balance_snapshot(id, accountId, points, observedAt, note?)
```

The tables `currency`, `program` and `transfer_rule` contain application data, not user
data. Keep this data in a typed TypeScript file in `src/server/db/seed/`. A script
writes the data at the start of the container. The script does not make duplicate
records. Keep this data under version control. Do not put this data in an admin form.

### 3.5 The calculation of the potential miles

For a target currency *C*:

```
potential(C) = currentBalance(C)
             + the sum, for each source account S, of bestRoute(S, C)

bestRoute(S, C) = the largest value of convert(balance(S), rule(S → P))
                  for each programme P that uses the currency C
```

The calculation obeys these four rules:

1. **Add the balance of each account of the currency.** Avios from Iberia Club and Avios
   from The British Airways Club are one balance.
2. **Select the best route for each source account.** Paragraph 3.3.1 gives the reason.
3. **Calculate each source account independently.** The minimum quantity applies to one
   account. Two accounts of 400 points each give 0. They do not give the result of 800
   points.
4. **Do not add a source that uses the currency C.** Its balance is already in the
   current balance.

The user interface must show these two limits:

- The value is a maximum for one currency. The user cannot send the same Membership
  Rewards points to two programmes.
- A transfer is permanent. The value is a calculation. It is not a balance.

Put this function in `src/shared/`. The function must be pure and must do no I/O. Write
unit tests for the function. This is the only complex logic in the application. The
client and the server use the same function.

## 4. Authentication

Better Auth controls the sessions. It keeps the sessions in SQLite with the Drizzle
adapter. The Better Auth CLI makes the tables for the authentication. Put these tables
in the Drizzle schema. Then one pipeline controls all the migrations.

Registration is possible only with an invitation. The sign-up request must include the
field `inviteCode`. A `before` hook of Better Auth examines the code. The hook refuses an
unknown code, an expired code and a used code. If the code is correct, the same
transaction marks the invitation as used.

The closed model has two results:

- Email verification is OFF. There is no SMTP dependency. Thus the user cannot change a
  forgotten password without help. The administrator must do this operation.
- A seed script makes the first user. The user interface does not make the first user.

## 5. User interface

The visual theme of Yume is an airport departure board with split-flap displays. Solari
di Udine made the first of these boards. The theme is thus correct for an Italian
product.

| Decision | Value |
|---|---|
| Extent of the theme | The display surfaces only: the dashboard, the cards of the potential miles and the lists. |
| Forms and dialogs | Standard shadcn/ui with the dark palette. |
| Animation | The flaps turn when the page loads and when a value changes. Refer to paragraph 5.6. |
| Palette | Dark only. There is no light theme. |
| Font of the digits | Departure Mono, with a free licence. The server supplies the font file. |
| Screen | Mobile first. Refer to paragraph 5.4. |
| Installation | A progressive web application. Refer to paragraph 5.5. |

### 5.0 One card for each currency

The dashboard shows one card for each currency. The card does not show one value for
each programme.

The reason is the Avios family. A member moves Avios between the six programmes at no
cost, at a ratio of 1 : 1. Therefore the potential in The British Airways Club and the
potential in Iberia Club are the same number. Six cards with the same number invite the
user to add them. That sum is not possible.

Each card holds three parts:

1. The total potential of the currency. This is the large number.
2. The balance of each account of the currency. Example: British Airways 1 000 and
   Iberia 500.
3. The best route for each source. Example: Amex MR, through Iberia Club, gives 400.

The card shows the balance and the potential as two different values. Refer to paragraph
3.5.

### 5.1 Two layers of components

The directory `src/client/components/ui/` holds the shadcn/ui components. Do not change
these files. If you change them, a future update from shadcn/ui becomes difficult.

The directory `src/client/components/board/` holds the theme. These components use the
components of `ui/`. Examples: `BoardPanel`, `BoardRow`, `SplitFlapNumber`, `FlapBadge`.

One CSS file holds all the tokens. Tailwind CSS v4 gives the `@theme` directive for this
file. The file does two operations:

1. It gives new values to the tokens of shadcn/ui: `--background`, `--card`,
   `--primary`, `--muted`.
2. It adds the tokens of the theme: `--flap-face`, `--flap-edge`, `--board-amber`.

Thus the standard components receive the theme, but their code stays the same. Declare
each variant with CVA. Do not write the classes of a variant at the point of use.

### 5.2 Rules for the theme

- **Keep the font files in the repository.** Do not use an external CDN for a font. The
  application must operate on a home network with no connection to the internet.
- **Use the pixel font only for the digits and for short labels.** Use a standard sans
  font for the other text. A pixel font is difficult to read in a long sentence.
- **Make the animation accessible.** Give the attribute `aria-hidden` to the digits that
  move. Put the correct value in a second element. That element is not visible, but a
  screen reader finds it.
- **Obey `prefers-reduced-motion`.** If the user selects this option, show the new value
  immediately. Do not animate the digits.
- **Show the numbers in the Italian format.** Use the locale `it-IT`.

### 5.3 The font of the digits

Departure Mono is the font of the decision. The repository does not hold that file now.
Until a session adds the file, the digits use the monospace font of the system.

Give the property `font-variant-numeric: tabular-nums` to each number. Then a digit keeps
its width when the value changes, and the number does not move.

### 5.4 Mobile first

The user reads a balance on a telephone. The user then writes that balance in Yume on the
same telephone. Therefore the telephone is the first screen, not the second.

Obey these rules:

- **Write the styles for the small screen first.** Then add a breakpoint of Tailwind for
  a larger screen. Do not write a desktop style and then correct it for the telephone.
- **Make each control large enough for a finger.** The smallest control is 44 pixels on
  each side.
- **Use one column.** The cards are one above the other.
- **Limit the width of the content on a large screen.** The content stays in the centre.
  Yume has no separate design for a desktop.
- **Do not make the page move sideways.** A long name breaks into two lines. It does not
  make a horizontal bar.

### 5.5 A progressive web application

The user installs Yume on the home screen of the telephone. Then Yume starts without the
bar of the browser.

The first step gives only the installation:

- A file `manifest.webmanifest` with the name, the icons, `display: standalone`, the
  colour of the theme and `start_url`.
- The icons of 192 and 512 pixels, and one icon with the purpose `maskable`.
- The meta element `viewport` with `viewport-fit=cover`, and the padding of the safe area
  on iOS.

Yume has no service worker now, thus Yume does not operate without a connection. A later
session can add that file. A service worker that supplies old files is the most frequent
defect of a progressive web application. Therefore Yume adds it only with a plan for the
update.

A browser installs an application from an origin with TLS only. Paragraph 7 gives the
rules for TLS.

### 5.6 The movement of the flaps

A board turns its flaps when new data arrives. The page load is that moment for Yume.
Therefore the flaps of a potential value fall into their place at the load, one after the
other, from the left.

**A flap does not show a digit that is not correct.** The flap arrives with the correct
digit. Some boards show other digits first, but this page shows a balance. Digits that
change at random read as data that is not correct.

The animation obeys these limits:

- The animation is present only inside `@media (prefers-reduced-motion: no-preference)`.
  Thus a user who refuses the movement sees the value immediately.
- The flaps hold `aria-hidden`. A screen reader reads the value from an element that is
  not visible, and it reads it one time.
- The number of flaps comes from the last value. Therefore no flap enters or leaves
  during the animation, and the page does not move.

## 6. Repository layout

```
yume/
  src/
    client/            # React, TanStack Router, shadcn/ui
      components/ui/     # shadcn/ui. Do not change these files.
      components/board/  # the theme of the departure board
      styles/            # the tokens of the theme
      fonts/             # the font files
    server/            # the Hono application
      auth.ts          # the Better Auth instance
      db/schema.ts     # the Drizzle tables, with the Better Auth tables
      db/seed/         # the catalogue of programmes and transfer rules
      routes/
    shared/            # Zod schemas and the conversion logic. Both sides use them.
  drizzle/             # the generated migrations, under version control
  docs/
  Dockerfile
  compose.yaml
```

The project has one `package.json`. Do not use a monorepo tool. At this size, a monorepo
adds complexity but gives no advantage.

## 7. Deployment

Use a multi-stage `Dockerfile` with `node:22-bookworm-slim`. Use a user that is not
root. Add a `HEALTHCHECK`. Start the container with `drizzle-kit migrate`. In
`compose.yaml`, mount `./data` on `/data`.

Obey these rules on a home server with arm64:

- **Use Debian slim. Do not use Alpine.** `better-sqlite3` is a native module. With musl,
  the build stage must compile the module from the source code. This operation is slow.
  The build stage needs `python3`, `make` and `g++`.
- **Use a 64-bit operating system.** For arm64, compiled binaries are available. For
  32-bit armv7, they are not available. A Raspberry Pi then compiles the module locally.
  This operation is slow and it needs much memory. Build the image with
  `docker buildx --platform linux/arm64`, or build the image on the device.
- **Use TLS.** Better Auth sends session cookies with the `secure` attribute. A browser
  removes these cookies on a plain HTTP connection. Thus a login at
  `http://nas.local:3000` is not possible, and the browser shows no error message. Use
  Caddy with a local certificate, or a Cloudflare Tunnel, or Tailscale. Tailscale
  supplies HTTPS. Do not set `secure` to false.
- **Make backups.** Use `VACUUM INTO` in a cron job. Write the file to the mounted
  volume. Remove the old files.

## 8. Appendix — the catalogue of programmes

The catalogue contains 19 airline programmes. These are the transfer partners of Amex MR
Italy and Revolut RevPoints in August 2026. Each ratio is *source : target*.

This appendix is a summary. The seed file in `src/server/db/seed/` is the source of
truth. That file holds the step of each transfer and a `sourceUrl` for each rule. This
appendix gives no step. Do not copy a value from this appendix into the seed file. Read
the official page again and write the link.

### Shared currencies

| Currency | Programmes |
|---|---|
| Avios | British Airways Club, Iberia Club, Aer Lingus AerClub, Finnair Plus, Qatar Airways Privilege Club, Vueling Club |
| Flying Blue miles | Flying Blue (Air France, KLM, Transavia) |

Each of the other 12 programmes has its own currency: SAS EuroBonus, Singapore Airlines
KrisFlyer, Emirates Skywards, Aegean Miles+Bonus, Avianca LifeMiles, China Southern Sky
Pearl Club, Etihad Guest, Icelandair Saga Club, TAP Miles&Go, Turkish Airlines
Miles&Smiles, Cathay (Asia Miles) and Delta SkyMiles.

### Transfer rules — Revolut RevPoints

| Target currency | Ratio |
|---|---|
| Avios, Flying Blue, SAS EuroBonus, Aegean Miles+Bonus, Avianca LifeMiles, China Southern Sky Pearl, Etihad Guest, Icelandair Saga, TAP Miles&Go, Turkish Miles&Smiles | 1 : 1 |
| Emirates Skywards | 2 : 1 |
| Singapore Airlines KrisFlyer | 2 : 1 |
| ALL Accor points (hotel) | 2 : 1 |

### Transfer rules — Amex Membership Rewards Italy

| Target | Ratio | Minimum |
|---|---|---|
| Flying Blue | 3 : 2 | 750 |
| British Airways Club (Avios) | 5 : 4 | 800 |
| Iberia Club (Avios) | 5 : 4 | 500 |
| SAS EuroBonus | 5 : 4 | 500 |
| Cathay (Asia Miles) | 5 : 4 | 1 000 |
| Delta SkyMiles | 3 : 2 | 3 |
| Singapore KrisFlyer | 3 : 2 | 1 500 |
| Emirates Skywards | 5 : 2 (5 : 4 for Centurion) | — |
| Hilton Honors | 1 : 1 | — |
| Marriott Bonvoy | 5 : 4 | — |
| Radisson Rewards | 2 : 5 | — |
| Italo Più | 5 : 1 | — |
| PAYBACK | 1 : 1 | — |

### Programmes with no transfer source

**Miles & More** is the programme of ITA Airways from 1 April 2026. On that date, ITA
Airways closed the Volare programme and became a member of Star Alliance. Amex Italy
and Revolut cannot transfer points to Miles & More.

Keep Miles & More in the catalogue with `transferable = false`. Many Italian users have
this balance. For these users, the answer is clear: no source can increase it.

Keep a record of these routes that do not operate. Then no person examines them again:

- Nexi ioSì gives points only to Trenitalia CartaFRECCIA. It gives no miles.
- Amex can send points to PAYBACK Italy. But PAYBACK Italy sends no points to an
  airline.
- Trenitalia CartaFRECCIA sent points to Volare at a ratio of 1 : 6. The Volare
  programme is closed. Thus this route is also closed.

Examine the ratios again before each release. The ratios are the data with the highest
risk of a change.
