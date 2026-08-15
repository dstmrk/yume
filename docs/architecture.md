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
| User interface | Tailwind CSS v4, shadcn/ui | The repository contains the components. No external design system at runtime. |
| Database | SQLite with `better-sqlite3` | One node, few writes, backup of one file. |
| Schema and migrations | Drizzle and drizzle-kit | SQL-first. The repository contains the generated migrations. |
| Authentication | Better Auth with the Drizzle adapter | Sessions on your own server. No external identity provider. |
| Validation | Zod | `src/shared/api.ts` holds one schema for each shape, and both sides read it. |
| Tests | Vitest | |
| Lint and format | Biome | One tool in the place of ESLint and Prettier. |

This table gives the packages that the project holds. An earlier version of this table
also gave `lucide-react` and `drizzle-zod`. The project installed neither package and it
imports no name of them: the interface shows the text of a letter in the place of an
icon, and `src/shared/api.ts` writes each schema of Zod by hand. Rule 9 of the section
Rules for the work in `CLAUDE.md` asks for the smallest change, thus the project adds a
package with the requirement of that package and not before it.

### 2.1 Why not TanStack Start

TanStack Start has server functions. These functions can remove the API layer. But
TanStack Start also adds server-side rendering. Yume does not need server-side
rendering, because Yume is a private dashboard behind a login. Search engines do not
read it.

The public page of paragraph 5.5.1 does not change this decision. Yume gives an account
only with an invitation, thus a position in the results of a search engine has no value.

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

The catalogue holds 20 airline programmes and 15 airline currencies. A source sends
points to 19 of those programmes, and those 19 programmes use 14 currencies. The
programme Miles & More holds the currency that no source reaches. Appendix 8 gives that
programme.

### 3.2 Snapshots, not a record of changes

The user writes the balances manually. The user reads a balance on a screen. The user
does not know the quantity of points of each transaction.

Thus the basic record is a snapshot:

```
balance_snapshot(account_id, points, observed_at)
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
  country,                   // refer to paragraph 3.3.2
  ratioNum, ratioDen,        // Amex: 5 MR gives 4 Avios  =>  num 4, den 5
  minTransfer, increment,
  validFrom, validTo         // validTo is null for an active rule
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

### 3.3.2 A rule applies to one country

The partners and the ratios change with the country. Amex Italia sends points to Iberia
Club at the ratio 5 : 4. Amex France gives an other list of partners. A rule with no
country thus gives a value that is not correct to a user of an other country.

Therefore `transfer_rule` holds the column `country`, in the ISO 3166-1 alpha-2 format.
The key of the table holds that column. Thus two countries can hold a different rule for
the same pair of programmes on the same day.

The column is not null: a rule with no country does not exist. A second country writes
its own rules in the catalogue, also when the ratio is the same. The application holds no
rule that is valid in each country, because such a rule needs an order of precedence in
the selection.

`findRule` compares the country exactly. A rule of an other country gives no value to
this country.

The catalogue holds the rules of Italy only. No surface selects a country, therefore the
server gives the constant `DEFAULT_COUNTRY` of `src/shared/catalogue.ts` to the
calculation. A second country in the catalogue needs the country of the user: the
sign-up must then ask for that value, and the table `user` must hold it. Yume adds that
field with that requirement, and not before it.

### 3.4 Tables

```
-- Better Auth controls these tables: user, session, account, verification

invitation(id, code, createdByUserId, email?, expiresAt, usedAt, usedByUserId)

currency(id, code, name, kind)        -- 'airline' | 'flexible' | 'hotel' | 'rail'
program(id, currencyId, code, name, airlineIata?, alliance?, transferable)
transfer_rule(...)                    -- refer to paragraph 3.3

user_account(id, userId, programId)
balance_snapshot(id, accountId, points, observedAt)
favorite_currency(userId, currencyId)  -- the key is the pair. Refer to paragraph 5.0.2
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
adapter. The tables `user`, `session`, `account` and `verification` are in
`src/server/db/schema.ts`, with the tables of the application. Then one pipeline controls
all the migrations.

The name of each property of those four tables is the name of the field of Better Auth,
because the Drizzle adapter finds a column with that name. The name of the column keeps
the form of the other tables. The test `src/server/db/schema.test.ts` reads the fields
from `getAuthTables` of the library. Thus a new version with a new field breaks the test,
and no user finds the defect at the sign-in.

Those four tables hold a `Date`, therefore those columns are integers of seconds. The
other tables of the application hold text in the ISO 8601 format.

Registration is possible only with an invitation. The sign-up request must include the
field `inviteCode`. Two hooks control the operation:

1. A `before` hook of the request examines the code. The pure function
   `invitationState` of `src/server/invitation.ts` gives the state. The hook refuses an
   unknown code, an expired code and a used code.
2. A hook of the database, after the creation of the user, marks the invitation. This
   hook is the second one, because the id of the user does not exist before the
   creation. The condition of the update holds `used_at is null`.

A sign-up that stops between the two hooks keeps the code free. Example: an address that
an other user has.

Email verification is OFF. There is no SMTP dependency. Thus the user cannot change a
forgotten password without help. The administrator must do this operation.

### 4.1 The first user

The first user needs an invitation, and an invitation needs a user. Therefore the server
makes a code of the setup at the start, but only while the table `user` holds no row. It
writes that code in the log with the link of the sign-up:

```
The database holds no user. Open http://localhost:3000/signup?code=XK47DYTNP2 to make
the first user.
```

The administrator reads the log with `docker compose logs`, opens the link and writes the
address and the password. Thus a self-hosted installation needs no shell of the server.

The code is not a fixed value of the image. Many self-hosted applications give a default
user and a default password. Yume is on the public network and its image is public, thus
a person who reads the repository knows that value and makes the first user before the
administrator. A code that the server makes at each start has no such risk.

The hook `before` reads the quantity of users at each request. Therefore the code of the
setup dies with the first user, also in the same process. A start with a user in the
database makes no code.

The setup writes no row in `invitation`: no user wrote that code.

### 4.2 The invitations of a user

Each user holds two slots of invitation. An invitation that a person used holds its slot
forever, thus one user brings a maximum of two users. An invitation that expires with no
use gives its slot back. The pure function `heldSlots` of `src/server/invitation.ts`
counts the slots, and `createInvitationForUser` refuses a code above the limit.

The examination at the moment of the creation is sufficient: a used invitation never
gives its slot back. Therefore the sign-up needs no second examination of the limit.

Each code is valid for 24 hours. A code travels in a message, thus a short time keeps the
risk small. The user writes a new code after the end of the old one.

Each code holds 10 characters. The alphabet holds 32 characters and no character that a
person reads in a wrong way: no `I`, no `O`, no `0` and no `1`. One byte gives 8 values
for each character, thus no character is more frequent.

The user writes an invitation from the dashboard with `POST /api/invitations`, and the
panel shows the link of each code that is valid. The administrator has the same operation
on the machine of the server:

```bash
npm run auth:invite -- <email of the user who invites> [email]
```

The image of the container holds no npm. Run the script in the container with node:

```bash
docker compose exec yume node --experimental-strip-types \
  src/server/scripts/invite.ts <email of the user who invites>
```

### 4.3 The variables of the environment

| Variable | Value |
|---|---|
| `BETTER_AUTH_SECRET` | The key of the signature of the cookies. The server stops without it. A new key removes each session. |
| `BETTER_AUTH_URL` | The origin of the application. Better Auth refuses a request from an other origin. The default value is `http://localhost:<PORT>`. |
| `TRUSTED_ORIGINS` | The other origins, separated with a comma. In development the client of Vite is on the port 5173. |

A default value of the key in the code gives no security. Therefore the server writes a
message and stops. Make a key with `openssl rand -base64 32`.

`BETTER_AUTH_URL` also controls the attribute `secure` of the cookie of the session.
Better Auth reads the protocol of that value, and it gives the attribute to an origin
with `https` only. An installation on `http://nas.local:3000` thus sent the session of
each user in clear text on the network of the home, and no message told that to the
administrator.

Therefore the function `needsSecureCookies` of `src/server/auth.ts` gives that attribute
to each origin that is not the machine itself, and `advanced.useSecureCookies` of Better
Auth receives that value. A browser then removes the cookie on a plain HTTP connection,
and the sign-in is not possible. Paragraph 7 gives the three tools for the TLS.

The machine itself is the exception: a browser accepts a `secure` cookie from
`localhost`, from `127.0.0.1` and from `[::1]` on a plain HTTP connection. Thus
`npm run dev:server` needs no certificate. A value that the function cannot read gives
the attribute: a defect in the variable must not remove the protection.

The file `.env.example` holds the two variables of Docker Compose, with no value. Copy
that file to `.env` and write the values. Docker Compose reads `.env` and it writes the
values in `compose.yaml`. Node reads no `.env` file: `npm run dev:server` gives a key and
the origin of the client of Vite for development.

### 4.4 The protection of the routes

The first middleware of the application reads the session. Each route under `/api` needs
that session, thus a new route is closed and no person must remember the protection. Two
paths are the exceptions:

- `/api/health`, for the `HEALTHCHECK` of the container. Refer to paragraph 7.
- `/api/auth/`, because the sign-in has no session before it.

Each route of the data reads the user with `c.get("userId")`. The application holds no
user with a fixed value.

### 4.5 The peer dependency of Better Auth

Better Auth declares `better-sqlite3` in `peerDependencies` with the version 12, and the
project holds the version 13. That peer is optional: the library imports it only with its
own adapter of SQLite. This project uses the Drizzle adapter, thus Drizzle imports the
module. An `overrides` in `package.json` gives the version of the project to npm.

## 5. User interface

The visual theme of Yume is an airport departure board with split-flap displays. Solari
di Udine made the first of these boards. The theme is thus correct for an Italian
product.

| Decision | Value |
|---|---|
| Extent of the theme | The display surfaces only: the dashboard, the cards of the potential miles and the lists. |
| Forms and dialogs | Standard shadcn/ui with the dark palette. |
| Animation | The flaps of a value turn at the load of the page, through the drum of the digits. Refer to paragraph 5.6. |
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

1. The total potential of the currency. This is the large number. Its label is above it,
   thus the board holds the full width of the card. The board starts at the left, with
   the label and with the names of the list below it.
2. The balance of each account of the currency. Example: British Airways 1 000 and
   Iberia 500.
3. The best route for each source. Example: Amex MR, through Iberia Club, gives 400.

The card shows the balance and the potential as two different values. Refer to paragraph
3.5.

### 5.0.1 The first access

A new user has no account. The dashboard then holds an empty list of cards and an empty
panel of the accounts. Therefore, with no account, the dashboard shows one instruction
and the form of a new account. That form is already open. The page shows no card and no
panel.

The quantity of the accounts is the signal of that state. Thus the database keeps no
flag of the onboarding, and the block goes away with the first account. Yume has no
route of onboarding and no tour of the screens. The public page of paragraph 5.5.1 gives
the context before the sign-in.

The block shows no value of the user, thus it gives no warning of the transfer. The
public page obeys the same rule.

Two rules make the first entry of the data short:

- **Put the sources first in the list of the programmes.** A source is a programme of a
  currency with the kind `flexible`. The potential of a currency grows only with a
  source. Refer to paragraph 3.5. A user who adds only airline programmes reads a
  potential that is equal to each balance. The two sources are in the middle of 22 names
  in the order of the alphabet, thus `sortPrograms` reads the currencies and moves each
  source to the top.
- **Write the first balance in the form of the account.** The user made an account and
  then opened a second form in the row of that account. The form of the account now
  holds a field of the balance. That field is not necessary: an empty field makes the
  account with no snapshot. The date of that snapshot is the date of today, thus the
  form holds no field of the date. The two requests are not one transaction, therefore
  the lists refresh also after an error of the second request. Then the user reads that
  account and writes the balance again.

### 5.0.2 The sequence of the cards

Each card holds a heart at the right of its title. The user taps that heart, and the
currency of the card becomes a favourite. The dashboard then shows the favourites first,
then the other currencies. Each of the two groups goes from the largest value to the
smallest one.

The mark holds a currency, and not a programme. One card shows one currency, thus a mark
of a programme gives six marks for the card of Avios. Refer to paragraph 3.1. The table
`favorite_currency` holds the pair of the user and the currency as its key. Therefore a
second tap of the heart changes no row, and two devices give one mark.

The first view holds the first three cards of that sequence. A favourite with a small
value takes the place of a larger currency: that result is the reason of the mark. A
currency with a potential of 0 shows no card, also with a mark. Refer to paragraph 5.4.

The client writes the answer in its cache before the request arrives. Thus the heart and
the sequence of the cards change with the tap. An error puts back the state of before.
The two requests of the mark are idempotent: `PUT` writes the mark and `DELETE` removes
it, and both give the status 204.

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
- **Give one flap to one position.** A board of Solari holds one flap for each position,
  and each flap has the same size. A number on one large flap is not a board. Therefore
  each number on a flap surface uses `SplitFlapNumber`. The separator of the thousands
  holds a position, thus it is also a flap: then the line of the axis crosses the full
  number. The component gives the variant `potential` in amber and the variant
  `balance` in the colour of the text.
- **Give the border of a control a contrast of 3:1.** A field, a select and a button with
  an outline use `--color-board-control`. A separator and the border of a panel use
  `--color-board-line`, a colour that is more dark. The WCAG 2.2 ask for that contrast
  for the limits of a control, but not for decoration.
- **Move the flaps of the potential only.** The potential is the value of the card, thus
  its flaps turn at the load of the page. The list of the accounts holds many numbers. The
  movement of all those flaps is noise, thus the variant `balance` does not move. The name
  of the application does not move: a name is not data.
- **Make the animation accessible.** Give the attribute `aria-hidden` to the digits that
  move. Put the correct value in a second element. That element is not visible, but a
  screen reader finds it.
- **Obey `prefers-reduced-motion`.** If the user selects this option, show the new value
  immediately. Do not animate the digits.
- **Show the numbers in the Italian format.** Use the locale `it-IT`.

### 5.3 The font of the digits

Departure Mono is the font of the board. The repository holds one file:
`src/client/fonts/DepartureMono-Regular.woff2`, version 1.500. The licence is the SIL
Open Font License 1.1. The file `src/client/fonts/DepartureMono-LICENSE.txt` holds the
text of the licence.

The format is WOFF2 only. Each current browser reads that format, and the file is 22
kilobytes. The `@font-face` rule is in `src/client/styles/theme.css`, with the other
tokens of the theme. The rule gives `font-display: swap`: the monospace font of the
system shows the text for the time of the load.

Give the property `font-variant-numeric: tabular-nums` to each number. Then a digit keeps
its width when the value changes, and the number does not move.

Departure Mono is a pixel font. The author gives a font size of a multiple of 11 pixels
for an exact result. Therefore each text of the board holds a size of that grid: 11
pixels for a title and for a label, 22 pixels for the name of the application and for a
balance, 33 pixels for a potential. A different size makes the strokes of the digits
unequal.

Write the size as an arbitrary value: `text-[33px]`. Do not make a token `--text-flap-lg`
in the `@theme` directive. The class `text-flap-lg` and the class `text-board-amber` have
the same shape, thus `tailwind-merge` reads the two as a colour and removes the size. A
class with a length in the brackets has no such defect.

Paragraph 5.4 gives the width of the screen. On a screen of 360 pixels, the panel gives
294 pixels to the board. The label of the potential is above the board, thus the board
holds all those pixels.

At 33 pixels, a potential of six digits is 243 pixels wide and it enters. A potential of
seven digits is 313 pixels wide and it does not enter. The panel holds `overflow-hidden`,
thus it cuts the last flap and it shows no bar. The user then reads a value that is not
correct.

Therefore the function `flapSize` of `src/client/lib/flaps.ts` gives the size of the
flaps of a potential. Above six digits it gives 22 pixels in the place of 33 pixels. The
board of seven digits is then 250 pixels, and the board of eight digits is 278 pixels.
Both enter the panel. A value of nine digits does not enter, but no user of Yume holds
that quantity of points.

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
- The icon of 180 pixels for `apple-touch-icon`. iOS asks for that size and it applies
  its own mask, thus that file comes from the maskable SVG, which holds no rounded
  corner.
- The meta element `viewport` with `viewport-fit=cover`, and the padding of the safe area
  on iOS. The status bar of iOS is translucent, thus the page starts at the top of the
  screen. The root of the router holds `pt-safe` and `pb-safe`, which add
  `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`. Without the top padding
  the masthead stays below the time of the system.

### 5.5.2 The mark

The mark of Yume is one flap of the departure board: the tile holds the gradient of a
flap, the seam crosses the full width and the letter Y is on it. A flap of Solari is a
full card with the seam at the middle. An earlier version put a small panel inside a
frame, and that composition became noise at 16 pixels.

The letter is the glyph Y of Departure Mono, as a path. That glyph is five rectangles on
a grid of pixels. A path holds no text element, thus the icon needs no font and each
rasteriser gives the same shape. The first version held `font-family: ui-monospace`, and
each rasteriser then drew a different letter.

`src/client/public/icon.svg` and `src/client/public/icon-maskable.svg` are the source of
the mark. The files `icon-180.png`, `icon-192.png`, `icon-512.png` and
`icon-maskable-512.png` come from those two files. The project has no command for that
step: a rasteriser of SVG is a large dependency, and the mark changes rarely. Draw the
PNG files again after each change of an SVG.

`icon.svg` is also the favicon of the page. A browser that reads no SVG icon takes
`icon-192.png`.

The mark with the letter Y is only for a surface that asks for one square image: the icon
of the tab and the icon of the home screen. The interface shows the full name instead,
with one flap for each letter: `SplitFlapWord` in
`src/client/components/board/SplitFlapWord.tsx`. The masthead of `AppTitle` and the title
of the public page hold that component. A mark with one letter near the same name is the
same letter two times.

The flaps of the name do not turn at the load. A flap turns when new data arrives, and a
name is not data. The name keeps the two halves of a card, thus the flap of a letter and
the flap of a digit hold the same appearance. Refer to paragraph 5.6.

Yume has no service worker now, thus Yume does not operate without a connection. A later
session can add that file. A service worker that supplies old files is the most frequent
defect of a progressive web application. Therefore Yume adds it only with a plan for the
update.

A browser installs an application from an origin with TLS only. Paragraph 7 gives the
rules for TLS.

### 5.5.1 The routes of the client

The client holds four routes: `/` for the public page, `/dashboard` for the dashboard,
`/login` for the access and `/signup` for the link of an invitation. The tree is in
`src/client/router.tsx`, in the code. The project needs no plugin of the router and no
step of generation.

The route `/dashboard` reads the session before the load. With no session it sends the
user to `/login`, therefore the dashboard makes no request that gives the status 401. The
three other routes do the contrary operation: a user with a session reads the dashboard.

The route `/signup` reads the parameter `code` and gives that value to the form of the
sign-up. Thus the person who receives the link writes only the address and the password.
The pure function `inviteCodeOf` of `src/client/lib/invite.ts` examines the parameter,
and `inviteLink` writes the link of a code in the dashboard.

The route `/` is the only route that a visitor with no session reads. It gives the
context that the form of the access does not give: what Yume calculates, and that the
value is a calculation and not a balance. Yume gives an account only with an invitation,
thus that page sells nothing.

That page does not say that a transfer of points is permanent. Yume moves no point, and
the page shows the balance of no person: the value on it is an example. The dashboard
gives that warning, because a person reads a real value there and then decides.

`start_url` of the manifest is `/dashboard`, not `/`. Thus the application on the home
screen of a telephone opens the dashboard and not the public page.

The public page shows `public/screenshot-dashboard.png`. That image comes from the
application: a browser opens the dashboard with balances of an example, and it gives the
picture of the cards of the potential miles. No program of design writes that image. Take
the picture again after a change of the cards.

The picture starts at the first card. The header of the dashboard holds the warning of
the transfer, and the public page does not give that warning.

The form of the access holds the sign-in and the sign-up. The sign-up needs the code of
the invitation. The server holds no Italian text: it gives the field `code` of the error,
and the pure function `authMessage` of `src/client/lib/auth.ts` gives the message.

### 5.6 The movement of the flaps

A board turns its flaps when new data arrives. The page load is that moment for Yume.
Therefore the flaps of a potential value turn at the load, one after the other, from the
left. A change of a value turns no flap: the animation is in the CSS file and it holds no
state.

**A flap is a card with two halves.** The card turns on an axis at the middle of its
housing. The top half of the character that goes away falls toward the reader. Then the
bottom half of the character that arrives falls from the same axis. Thus the two halves
show two different characters while the card turns. A surface that turns one time, with
one character, is not a Solari.

**A flap turns through its drum.** The drum holds the empty position, then the separator
of the thousands, then the digits from 0 to 9. The flap starts at the empty position and
it turns until the correct digit arrives, thus the user sees each digit before it. An
earlier version showed the correct digit with one movement, and the board then read as a
card that appears, not as a board of Solari.

The board at the load shows empty flaps, because a board with no data shows no character.
The flap of a separator turns one time: that character is the second position of the
drum.

**The drum holds no letter.** The board shows a letter in the name of the application
only, and that name does not turn. Refer to paragraph 5.5.2. A drum of the letters gives
26 cards for one flap, and the name is the same word at each load.

The pure function `toFlapTurn` of `src/client/lib/flaps.ts` gives the two halves at rest
and one fold for each turn. The component `SplitFlapCell` of
`src/client/components/board/` gives one element for each half of each card. The file
`src/client/styles/theme.css` gives the delay of each card: `--flap-index` is the place of
the flap on the board and `--flap-step` is the place of the card in the drum.

The animation obeys these limits:

- The animation is present only inside `@media (prefers-reduced-motion: no-preference)`.
  The state of a card with no animation is its state at the end of the turn. Thus a user
  who refuses the movement sees the value immediately, and the animation needs no second
  rule for that user.
- The flaps hold `aria-hidden`. A screen reader reads the value from an element that is
  not visible, and it reads it one time.
- The number of flaps comes from the last value. Therefore no flap enters or leaves
  during the animation, and the page does not move.
- The housing holds a fixed height, in the grid of 11 pixels. Each half is one half of
  that value. A height from the line of the text gives two halves that are not equal.

## 6. Repository layout

```
yume/
  src/
    client/            # React, TanStack Router, shadcn/ui
      router.tsx         # the tree of the routes, in the code
      components/ui/     # shadcn/ui. Do not change these files.
      components/board/  # the theme of the departure board
      lib/               # the logic of the client, with a test file
      styles/            # the tokens of the theme
      fonts/             # the font files
    server/            # the Hono application
      auth.ts          # the Better Auth instance, with the hooks of the invitation
      invitation.ts    # the pure rules of a code: the state, the limit and the time
      scripts/         # the script of the administrator: the invitation
      db/schema.ts     # the Drizzle tables, with the Better Auth tables
      db/seed/         # the catalogue of programmes and transfer rules
    shared/            # Zod schemas and the conversion logic. Both sides use them.
  drizzle/             # the generated migrations, under version control
  docs/
  Dockerfile
  compose.yaml
```

The project has one `package.json`. Do not use a monorepo tool. At this size, a monorepo
adds complexity but gives no advantage.

## 7. Deployment

The repository holds `Dockerfile`, `.dockerignore` and `compose.yaml`. The
`Dockerfile` has three stages with `node:22-bookworm-slim`: the dependencies of
production, the build of the client, and the image of runtime. The image runs as the user
`node`, and it holds a `HEALTHCHECK` on `GET /api/health`. `compose.yaml` mounts
`./data` on `/data`.

The container applies the migrations, writes the catalogue and then starts the server.
The two scripts make no change on a second start, thus the container can start many
times.

### 7.0 The image on the registry

The workflow publishes the image on `ghcr.io/dstmrk/yume` after a push of a tag `v*`
only. The job `publish` needs the job of the tests and the job of the container: an
image with a test that fails must not arrive on the registry.

A merge on `main` publishes no image. A release is a decision of a person. The home
server holds the data of the user, therefore an update must arrive at a moment that the
person selects, and not at each merge. To make a release, write a tag on `main`:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

The two jobs of the examination run again on the tag. Thus the publication examines the
exact commit of the release.

The job `image` also builds the image, and that build takes minutes. Therefore that job
runs on a tag `v*` and on a pull request that changes `Dockerfile`, `.dockerignore`,
`package.json` or `package-lock.json`. A push to `main` builds no image: the pull request
of that commit gave the same result. The job `changes` reads the names of the files of
the pull request and gives that decision. Add a file to the list of `changes` when the
`Dockerfile` copies a new path.

Therefore `compose.yaml` holds `image:` and it holds no `build:`. The installation
on a home server needs that file and `.env` only, and it needs no clone of the
repository:

```bash
mkdir -p data && sudo chown 1000:1000 data
cp .env.example .env      # then write the values
docker compose up -d
```

The first command is necessary. Docker makes `./data` with the owner `root` when that
directory is absent. The image runs as the user 1000, thus that user then writes no file
in `/data`, and SQLite gives the error `SQLITE_CANTOPEN`. `openDatabase` in
`src/server/db/index.ts` reads that error and writes the command of the correction. The
same error arrives when the owner of `./data` is an other user, for example after a copy
of the directory.

The job publishes two platforms, `linux/amd64` and `linux/arm64`, with QEMU. The build
compiles nothing, because each `npm ci` of the `Dockerfile` holds `--ignore-scripts` and
`better-sqlite3` holds the binary of each platform. Thus the emulation only writes the
files of the client with Vite.

The job writes two tags: `latest` for `compose.yaml`, and the name of the git tag, for
example `v0.1.0`. A person can then go back to the image of the release before a defect
with `image: ghcr.io/dstmrk/yume:v0.1.0`.

A package of GHCR that a workflow publishes with `GITHUB_TOKEN` takes the visibility of
the repository. This repository is public, therefore `docker compose up` needs no
`docker login`. Examine that visibility after the first publication, in Settings, on the
page of the package.

To build the image of your own change on the machine, use this command. Docker Compose
then finds that image and it pulls no other image:

```bash
docker build -t ghcr.io/dstmrk/yume:latest .
```

Obey these rules on a home server with arm64:

- **Use Debian slim.** `better-sqlite3` holds the compiled binary of each platform in
  `prebuilds/`, for glibc and for musl. Therefore Alpine also operates. Debian stays the
  decision, because the image of Node with Debian is the standard image.
- **Give `--ignore-scripts` to each call of `npm ci`.** The package holds a
  `binding.gyp`, thus npm calls `node-gyp rebuild`. That command needs `python3`, and
  the image of Node holds no `python3`. The command also compiles nothing: it finds the
  binary in `prebuilds/`. Without this option, the build stops.
- **Use a 64-bit operating system.** `prebuilds/` holds `linux-arm64.node`, but it holds
  no binary for 32-bit armv7. On armv7, the installation compiles the module. This
  operation is slow and it needs much memory. Build the image with
  `docker buildx --platform linux/arm64`, or build the image on the device.
- **Use TLS.** Yume sends the session cookie with the `secure` attribute. A browser
  removes that cookie on a plain HTTP connection. Thus a login at
  `http://nas.local:3000` is not possible, and the browser shows no error message. Use
  Caddy with a local certificate, or a Cloudflare Tunnel, or Tailscale. Tailscale
  supplies HTTPS. Do not set `secure` to false. `compose.yaml` holds no service for the
  TLS: it gives the port to the local machine only, thus one of these three tools
  supplies the access from the network. Paragraph 4.3 gives the rule of that attribute.
- **Make backups.** Use `VACUUM INTO` in a cron job. Write the file to the mounted
  volume. Remove the old files.

### 7.1 The migrations of the container

The container applies the migrations with the migrator of `drizzle-orm`. It does not use
`drizzle-kit`. The script is `src/server/db/migrate.ts`, and `npm run db:migrate` also
calls that script.

`drizzle-kit` is a dependency of development. With `drizzle-kit`, the image of runtime
needs the tools of development, and the image becomes large on an arm64 device.
`drizzle-orm` is a dependency of production and it holds the same migrator. The
migrations in `drizzle/` stay the same. `drizzle-kit` stays for `npm run db:generate`.

The image of runtime holds `drizzle/`, because the migrator reads
`drizzle/meta/_journal.json` and the SQL files. The migrator also keeps a table of the
migrations that ran. Therefore a second start applies no migration again.

`drizzle/` holds one migration, `0000_initial.sql`. The application ran on no server
before the first tag, thus no database held the two migrations of the first version. The
project made those two migrations into one file. This operation is possible one time
only: a migration that ran on a server is immutable. Add a new migration.

## 8. Appendix — the catalogue of programmes

The catalogue contains 20 airline programmes. 19 of them are the transfer partners of
Amex MR Italy and Revolut RevPoints in August 2026. The last section of this appendix
gives Miles & More, the programme that no source reaches. Each ratio is *source :
target*. Each rule holds the country `IT`. Paragraph 3.3.2 gives the rule for an other
country.

This appendix is a summary. The seed file in `src/server/db/seed/` is the source of
truth. That file holds the step of each transfer and, in a comment, the official page of
each rule. This appendix gives no step. Do not copy a value from this appendix into the
seed file. Read the official page again and write the link in the comment.

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

A dash in the column Minimum shows that the catalogue holds no rule for that target. The
seed file holds the hotel partners and the rail partners of no country now.

| Target | Ratio | Minimum |
|---|---|---|
| Flying Blue | 3 : 2 | 750 |
| British Airways Club (Avios) | 5 : 4 | 800 |
| Iberia Club (Avios) | 5 : 4 | 500 |
| SAS EuroBonus | 5 : 4 | 500 |
| Cathay (Asia Miles) | 5 : 4 | 1 000 |
| Delta SkyMiles | 3 : 2 | 3 |
| Singapore KrisFlyer | 3 : 2 | 1 500 |
| Emirates Skywards | 5 : 2 (5 : 4 for Centurion) | 500 |
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
