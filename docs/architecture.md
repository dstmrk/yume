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
| Cost | Zero. The system uses no paid service. Google is the one necessary external service, for the sign-in: refer to paragraph 4.1. The supporter account of paragraph 4.6 adds a payment service to the official instance only. |
| Deployment | One Docker container on a home server, a NAS or a Raspberry Pi with arm64. |
| Users | Open. Each person with a Google account can make an account. |
| Data input | Manual. Amex and Revolut do not give a public API for balances. The team refused the automatic collection of data from the web sites. |
| Types | TypeScript for all the code. Zod for all the data validation. |

## 2. Stack

| Layer | Decision | Reason |
|---|---|---|
| Runtime | Node 26 | Current release, LTS from October 2026. It includes `fetch`. |
| HTTP server | Hono | Small and standard. It supplies the API and the client files from one origin. |
| Client | Vite, React 19, TanStack Router, TanStack Query | Typed routes. TanStack Query controls the cache and the refresh of data. |
| User interface | Tailwind CSS v4, shadcn/ui | The repository contains the components. No external design system at runtime. |
| Database | SQLite with `better-sqlite3` | One node, few writes, backup of one file. |
| Schema and migrations | Drizzle and drizzle-kit | SQL-first. The repository contains the generated migrations. |
| Authentication | Better Auth with the Drizzle adapter, Google as the only provider | Sessions on your own server. No password and no service of email. Refer to paragraph 4.1. |
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

The public page of paragraph 5.5.1 does not change this decision. That page is one
static route, and paragraph 5.5.3 gives the text for the crawlers in the head of
`index.html`. The dashboard stays behind the sign-in, thus it needs no rendering on the
server.

The cost of TanStack Start is a smaller set of tools and a Docker build that is more
difficult to examine. Vite with Hono gives two processes in development, but only **one
process in production**. Hono supplies the files from `dist/`. You can replace each part
independently.

`src/shared/api.ts` holds the types of the requests and of the answers. The server gives
each body its type, for example `const body: PotentialResponse`. The client reads the
same type in `src/client/lib/api.ts`. Thus the two sides cannot become different. You do
not need code generation and you do not need tRPC.

The project does not use Hono RPC (`hono/client`). The inference of the client needs
each route in one chained expression. That change of `createApp` saves approximately 40
lines only.

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

The catalogue holds 26 airline programmes and 21 airline currencies. A source sends
points to 21 of those programmes, and those 21 programmes use 16 currencies. Five
programmes hold the five currencies that no source reaches. Appendix 8 gives those
programmes.

The user knows a third level: the airline. One airline credits one programme. One
programme can receive the miles of more than one airline.

| Level | Example | Where it lives |
|---|---|---|
| Airline | ITA Airways, Lufthansa, SWISS | `src/client/lib/airlines.ts` |
| Programme | Miles & More: one account, one balance | The table `program` |
| Currency | Miles & More: one card on the dashboard | The table `currency` |

Avios has six programmes, because each airline of Avios keeps its own account. Miles &
More has one programme for seven airlines, because the seven airlines credit one account.
Thus an airline is not a programme. Do not add a programme for an airline that credits an
account of the catalogue. Add the airline to the list of that programme.

The search of a new account reads the name of the programme, the names of its airlines and
the name of its currency. A user who flies ITA Airways writes "ITA" and finds Miles & More.
No query of the server reads the airlines, thus the list lives in the client.

The card of a currency shows the airlines of that currency under its name. A user who
reads "EuroBonus" then also reads "SAS". A long list shows its first names and "+3": the
button opens the full list in the card. The order of `airlines.ts` gives the first names,
thus ITA Airways comes first in the list of Miles & More.

### 3.2 Snapshots, not a record of changes

The user writes the balances manually. The user reads a balance on a screen. The user
does not know the quantity of points of each transaction.

Thus the basic record is a snapshot:

```
balance_snapshot(account_id, points, observed_at, created_at)
```

The current balance is the most recent snapshot of the account. The system calculates
the changes between two snapshots only for the display. It does not keep the changes in
the database.

The field `observed_at` holds a date with no time. The form gives the date of today, thus
a correction on the same day holds the same date. The field `created_at` holds the moment
of the write, with the milliseconds. The most recent snapshot has the latest
`observed_at`, then the latest `created_at`. Thus a snapshot of an older date that the
user writes later does not become the current balance.

The server refuses a date that does not exist, for example `2026-02-30`. It also refuses
a date after tomorrow in UTC. A future date stays the current balance, and each later
update then stays hidden. The one day is for a user in front of UTC.

Do not use the id for the order: the id is a random UUID. Do not use `rowid` as the first
key. `VACUUM` can change the `rowid` of a table with no `INTEGER PRIMARY KEY`, and the
backup of paragraph 2.3 uses `VACUUM INTO`. `rowid` is only the last key, for two writes
in one millisecond. No `VACUUM` comes between those two writes.

The true moment of a row before the migration `0008` is lost. That migration gives those
rows a moment before its own moment, in the order of `rowid`.

### 3.2.1 The expiry lots of a snapshot

A programme can give an expiry date to a part of the balance. A snapshot can hold
**expiry lots**. A lot is a quantity of points with one expiry date:

```
expiry_lot(snapshot_id, expires_on, points)
```

The point is the smallest unit, but the database keeps one row for one date. The key is
the pair of the snapshot and the date, thus one snapshot holds one lot for one date. The
lots are not necessary. They can hold a part of the balance only.

**The lots belong to the snapshot, not to the account.** A new balance can be lower than
the sum of the lots of the account. Yume does not know which lots the programme used, thus
it cannot reduce a lot. A lot of the snapshot has no such problem: the schema of the API
compares the lots with the balance of the same request.

`addSnapshotSchema` of `src/shared/api.ts` refuses these lots:

- lots with a sum above the balance;
- two lots with the same date;
- a lot that expires before `observedAt`. That lot is not in the balance;
- more than 50 lots.

The form of a new balance gives again the lots of the current balance, and the user
corrects them. The form omits a lot that expires before today.

**Yume does not change a balance at the date of a lot.** The user reads the balance on the
site of the programme. A lot with a date in the past then shows a message, and the user
writes a new balance. The calculation of the potential miles does not read the lots.

Some programmes remove the full balance after a period with no activity. The user writes
that date as one lot of the full balance.

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
dashboard must then ask for that value, and the table `user` must hold it. Yume adds that
field with that requirement, and not before it.

### 3.4 Tables

```
-- Better Auth controls these tables: user, session, account, verification
-- user also holds supporter_until? and unlimited. Refer to paragraph 4.6

currency(id, code, name, kind)        -- 'airline' | 'flexible' | 'hotel' | 'rail'
program(id, currencyId, code, name, airlineIata?, alliance?, transferable)
transfer_rule(...)                    -- refer to paragraph 3.3

user_account(id, userId, programId)
balance_snapshot(id, accountId, points, observedAt, createdAt)
expiry_lot(snapshotId, expiresOn, points)  -- the key is the pair. Refer to paragraph 3.2.1
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

Status: **accepted**. Date: 2026-11-09. This decision replaces the sign-in with a
password, the invitations and the code of the setup. The code holds none of those
functions.

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

Better Auth removes an expired session only when the browser sends its cookie. The
cookie expires with the session, thus the row stays with the IP address and the browser.
Therefore the server calls `deleteExpired` of `src/server/db/queries.ts` at the start
and then one time each day. That function removes each expired row of `session` and of
`verification`. Section 9 of the privacy policy then stays true, with a delay of one day
at most.

### 4.1 Google is the only provider

The sign-in uses Google only, with `socialProviders.google` of Better Auth. Yume holds no
password, sends no email and writes no invitation. The registration is open: the first
sign-in of a Google account makes the user.

These are the reasons:

- One provider gives one path in the code. A password needs a reset, and a reset needs a
  service of email.
- A service of email is not free. Amazon SES costs 0,10 dollars for 1.000 messages, and
  the AWS free tier gives credits for 6 months only. useSend on the server of the
  installation needs Postgres, Redis and Amazon SES.
- Google verifies the email address. Thus Yume needs no verification of the address.
- Yume asks for the scopes `openid` and `email` only. Those scopes are not sensitive,
  thus Google asks for no review of the application. Yume keeps no name and no photo of
  the Google account: the GDPR asks for the minimum of data, and no surface shows them.
  Yume gives `includeGrantedScopes: false` to Google: otherwise Google adds each scope
  that the user granted in the past, also `profile`.
- Yume keeps no token of Google: a database hook writes null in the five token columns
  of `account`. The `sub` of Google stays in `account_id`.

Sign in with Apple is not available. It needs the Apple Developer Program, for 99 dollars
for one year. Its client secret expires after six months, and Apple refuses `localhost`
also in development. Add that provider with a requirement, for example an iOS
application. The table `account` holds the provider in each row, thus a second provider
needs no change of the schema.

### 4.2 The consequences

**A user who loses the Google account loses the access to Yume.** The administrator has
no procedure of recovery. The team accepts this risk: the user can write the balances
again.

**Google accepts a redirect URI with `https` on a public domain, or on `localhost`.**
Thus a sign-in on `http://nas.local:3000` is not possible. The cookie of the session
gives the same limit: refer to paragraph 4.3. Paragraph 7 gives the three tools for the
TLS.

**An installation on the public network accepts each Google account.** The code holds no
list of addresses and no option for that list. An administrator who wants a private
installation puts Cloudflare Access, or a reverse proxy with authentication, in front of
Yume.

**Each installation needs its own OAuth client.** The administrator makes a project in
the Google Cloud Console and publishes the consent screen. Then the administrator makes a
client of the type "Web application" with this redirect URI:

```
https://<domain of the installation>/api/auth/callback/google
```

**The data of the first version goes away.** The first version held one user, the
author. A migration removes the table `invitation` and the rows of the four tables of
Better Auth. The foreign keys remove the accounts and the snapshots of that user. Then
the author makes a new account with Google. No code keeps the old path.

### 4.3 The variables of the environment

| Variable | Value |
|---|---|
| `BETTER_AUTH_SECRET` | The key of the signature of the cookies. The server stops without it. A new key removes each session. |
| `BETTER_AUTH_URL` | The origin of the application. Better Auth and the middleware `csrf` refuse a request from an other origin. The default value is `http://localhost:<PORT>`. |
| `GOOGLE_CLIENT_ID` | The id of the OAuth client of Google. The server stops without it. Refer to paragraph 4.2. |
| `GOOGLE_CLIENT_SECRET` | The secret of the OAuth client of Google. The server stops without it. |
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

The file `.env.example` holds the four variables of Docker Compose, with no value. Copy
that file to `.env` and write the values. Docker Compose reads `.env` and it writes the
values in `compose.yaml`. Node reads no `.env` file: `npm run dev:server` gives a key and
the origin of the client of Vite for development. The two variables of Google need a
real OAuth client also in development, with the redirect URI on `localhost`.

### 4.4 The protection of the routes

The first middleware of the application reads the session. Each route under `/api` needs
that session, thus a new route is closed and no person must remember the protection. Two
paths are the exceptions:

- `/api/health`, for the `HEALTHCHECK` of the container. Refer to paragraph 7.
- `/api/auth/`, because the sign-in has no session before it.

The MCP server of paragraph 4.7 is not under `/api`. The path `/mcp` reads an access
token, not the cookie of the session. The paths `/.well-known/oauth-protected-resource`
and `/.well-known/oauth-authorization-server` are public, because a client reads them
before the sign-in.

The middleware `csrf` does not apply to `/api/auth/oauth2/token` and
`/api/auth/oauth2/revoke`. The server of the client sends a form to those paths with no
header `Origin`, and the middleware refuses such a form. Those two endpoints read no
cookie: the code with PKCE or the refresh token proves the client.

Each route of the data reads the user with `c.get("userId")`. The application holds no
user with a fixed value.

The sign-up is open, thus two constants of `src/server/app.ts` limit each user. They are
technical ceilings, not the commercial limits of paragraph 4.6:

- `MAX_ACCOUNTS_PER_USER` is 100. Above it, `POST /api/accounts` gives the status 409
  with `too_many_accounts`. `GET /api/potential` reads each account in one synchronous
  loop, and one process serves each user.
- `MAX_BODY_BYTES` is 16 KB. The middleware `bodyLimit` of Hono gives the status 413
  above it, also on `/api/auth/`. `c.req.json()` reads the full body into memory.

The cookie of the session is `SameSite=Lax`. That attribute does not stop a form of an
other subdomain of the same domain, for example `jellyfin.example.com` near
`yume.example.com`. The browser sends the cookie with that form, and `c.req.json()`
reads a body of `text/plain`. Therefore the middleware `csrf` of Hono comes after the
session. It gives the status 403 to a form of an origin that is not `BETTER_AUTH_URL` or
an origin of `TRUSTED_ORIGINS`. A request with no type of body also needs that origin: a
`DELETE` has no body.

The middleware `secureHeaders` of Hono gives the security headers to each answer, also
to the files of the client. `X-Frame-Options: SAMEORIGIN` stops a page of an other site
that shows Yume in a frame. The server gives no `Strict-Transport-Security`: the default
of Hono holds `includeSubDomains`, and that value forces HTTPS on each other service of
the domain. The proxy of the TLS gives that header. The server gives no
Content-Security-Policy: the public page holds JSON-LD inline, and a policy needs its own
design.

### 4.6 The supporter account

Status: **accepted**. Date: 2026-10-06. Changed: 2026-11-09, the price. Changed:
2026-11-10, the unlimited account. The function of the level exists. No surface reads it
now.

The official instance gives three levels of account: the free account, the supporter
account and the unlimited account. The supporter account has one price: 9,99 euros for
one year. No other plan exists.

**The free account holds these limits:**

| Item | Free account | Supporter account and unlimited account |
|---|---|---|
| Amex and Revolut | No limit | No limit |
| Each other source, for example Klarna or a hotel programme | Not available | No limit |
| Airline programmes | 2 programmes | No limit |
| Expiry lots of a balance | Not available | No limit |
| The MCP server of paragraph 4.7 | Not available | Available |

Amex and Revolut stay free, because the affiliate links of Yume go to those two sources.
A limit on them stops the users that those links bring.

Klarna is the first source of that kind. It is open to each user until the code of the
supporter account exists. A user who adds Klarna before that date keeps the account,
because the end of a supporter account removes nothing.

The expiry lots of paragraph 3.2.1 are open to each user until the code of the supporter
account exists, as Klarna. After that date, the end of a supporter account removes no lot.
The lots of the current balance stay on the dashboard, and the user cannot write a new
lot.

**The limit counts the programmes, not the currencies.** The British Airways Club and
Iberia Club are two programmes, thus they use the two places of the free account. The
user sees programmes in the form, and a count of currencies gives a number that the user
cannot find. Paragraph 3.1 keeps its rule: the calculation adds the balances of each
currency.

**The end of a supporter account removes nothing.** The accounts above the limit stay on
the dashboard, and their balances stay in the potential miles. The user cannot add a new
account above the limit. A hidden account gives a potential that is too low, and a
transfer of points is permanent.

**The limits apply to the official instance only.** The code is under the licence MIT.
A variable of the environment activates the limits, and the default value is no limit.
Thus a self-hosted installation keeps each function.

**The unlimited account has no payment.** The administrator gives it by hand, for
example to a member of the family. It gives each function of the supporter account, and
it has no end.

**The database keeps two sources, not the level.** The table `user` receives two columns:

| Column | Writer | Value |
|---|---|---|
| `supporter_until` | The payment only | The end of the supporter account, or null |
| `unlimited` | The administrator only | A flag. The default value is false. |

`accountTier` of `src/shared/tier.ts` gives the level from the two columns and the clock.
The flag comes first, then the date, then the free account. The supporter account stops
at the exact instant of `supporter_until`. One column with the level is not possible: a
level `supporter` with a date in the past gives two values that do not agree. With two
columns, the payment cannot remove an unlimited account.

Better Auth does not know the two columns. Its route `update-user` writes only the
fields that it knows, thus a user cannot write the level. A test of `auth.test.ts` makes
this rule mechanical.

A second pure function in `src/shared/` reads the level, the accounts of the user and the
catalogue. It gives the operations that the user can do. Each surface reads that
function, and the application holds no other rule of the payment.

These items are open:

- The payment service.
- The name of the variable of the environment.
- The function of the operations that the user can do.
- A command that writes the flag `unlimited`. Now the administrator writes it with SQL.

### 4.7 The MCP server

Status: **accepted**. Date: 2026-11-10. The code implements sub-tasks 1, 2 and 3 of
paragraph 4.7.5 only.

Yume supplies a remote server of the Model Context Protocol (MCP). A person connects an
agent, for example Claude or Claude Code, to that server. The agent then reads the
balances and the potential miles of that person, and it can write a new snapshot.

**The reason.** The data input is manual: refer to paragraph 1. The person gives a
screenshot of the application of Amex to the agent, and the agent writes the snapshot.
Yume still reads no web site of a programme: the person gives each value. The agent
also answers a question about a transfer with the pure functions of `src/shared/`.

#### 4.7.1 The transport and the path

The server uses the transport Streamable HTTP of MCP, on the path `/mcp` of the origin
of the application. Thus the rule of one origin of paragraph 2.2 stays true, and the
container holds no second process. The class `WebStandardStreamableHTTPServerTransport`
of `@modelcontextprotocol/sdk` reads the `Request` of `c.req.raw`. Thus the project needs
no adapter between Hono and the SDK.

The server keeps no session of MCP: each request holds the full context. One process
then needs no memory between two requests, and a restart of the container breaks no
connection. The middleware `bodyLimit` of paragraph 4.4 also applies to `/mcp`.

The path `/mcp` is not under `/api`. The middleware of the session and the middleware
`csrf` thus do not apply. A request to `/mcp` holds a bearer token, and a browser sends
no such token with a form of an other site. Thus that request needs no protection
against CSRF.

The URL of the server is `${BETTER_AUTH_URL}/mcp`. The field `resource` of the metadata
of paragraph 4.7.2 must be equal to the URL that the person writes in the client.

The plugin `mcp` refuses a resource on plain HTTP, except on the machine itself. Thus an
installation on `http://nas.local:3000` starts with no MCP server: `canServeMcp` of
`src/server/auth.ts` gives that decision. The sign-in with Google is also not possible
on that origin: refer to paragraph 4.2.

#### 4.7.2 The authorisation

A remote client of MCP needs OAuth 2.1. The cookie of the session of paragraph 4 does not
go to a client on an other origin. Therefore Yume is also an authorisation server: it
gives its own access tokens. The sign-in stays with Google only, as paragraph 4.1 gives.

These plugins of Better Auth do the work:

| Plugin | Package | Task |
|---|---|---|
| `jwt` | `better-auth` | It signs the access tokens. It keeps its keys in the table `jwks`. |
| `mcp` | `@better-auth/mcp` | It is the authorisation server. It binds each token to the audience `/mcp`, and it gives the metadata of RFC 9728. |
| `cimd` | `@better-auth/cimd` | It reads the Client ID Metadata Document of the client. |

The plugin `mcp` needs `better-auth` 1.7.19 or a later version. The project holds the
version 1.7.20. Keep `better-auth` and each package `@better-auth/*` at the same version:
the plugins declare the core with a peer range.

**The registration of a client uses CIMD only.** The client gives a URL as its
`client_id`, and the server reads the metadata at that URL. Claude and Claude Code both
give such a document. Dynamic Client Registration (RFC 7591) stays off: it makes one new
row of client for each new connection, and that table then grows with no limit.
Anthropic gives the same recommendation for a server with many users.

The function that reads the document of a client is `fetchClientMetadataResource` of
`@better-auth/cimd/node`. It resolves the name one time and refuses an address that is
not public. It keeps that address for the connection, and it follows no redirect.
Without those limits a client can make the server read an address of the home network.
A wrapper of `fetch` cannot give those guarantees, thus the project writes no such
function.

**The flow.** These are the steps:

1. The client sends a request to `/mcp` with no token.
2. The server gives the status 401. The header `WWW-Authenticate` holds the URL of the
   metadata of the protected resource.
3. The client reads that metadata, then the metadata of the authorisation server.
4. The client opens the page of authorisation in the browser of the person.
5. A person with no session goes to `/login`, and then to Google.
6. After the sign-in the person reads the page `/consent`. That page shows the name of
   the client, the host of its redirect URI and the operations of the scope.
7. The person accepts. The client receives a code, and then an access token and a
   refresh token.

The page `/login` must keep the parameters of the authorisation through the sign-in
with Google. Without them, step 6 does not occur. The button of Google sends the signed query of
the address in the field `oauth_query` of the sign-in: `withOAuthQuery` of
`src/client/lib/auth.ts`. The signature covers each parameter except `sig`, thus that
function keeps the signed parameters only. After the callback of Google, the plugin goes
on with the authorisation.

The page `/consent` is a new route of the client, with its text in
`src/client/i18n/it.ts`. Add its path to `CLIENT_PATHS` of `src/shared/routes.ts`.

**The scopes.** The server gives two scopes:

- `balances`: the four tools of paragraph 4.7.3.
- `offline_access`: the refresh token.

The server gives no scope `profile` and no scope `email`. Paragraph 4.1 keeps no name and
no photo, and an agent needs no address to read the balances.

**The tokens.** The access token is a JWT with a life of one hour. The handler of `/mcp`
examines it with `requireMcpAuth` of `@better-auth/mcp`: the signature, the issuer, the
audience and the expiry. The field `sub` gives the user. By default that function reads
the keys at `BETTER_AUTH_URL`, thus the process sends a request to itself through the
proxy of the TLS. Give it the address of the process on `localhost` in `jwksUrl`. The refresh token changes at
each use, because the client is public. The tables of the plugin refer to `user` with a
foreign key, thus the removal of a user also removes the tokens.

Yume still keeps no token of Google. The tokens of the plugin are the tokens of Yume.

**The supporter account.** On the official instance the MCP server is a function of the
supporter account: refer to paragraph 4.6. The handler reads the pure function of
paragraph 4.6 at each call of a tool. For a user who is not a supporter, each tool gives
an error result with `isError: true`. The text of that error names the supporter account
and gives the URL of the page of the subscription. The end of a supporter account thus
stops the access at the next call. No data goes away: the access stops, and each balance
stays on the dashboard.

The handler gives no status 403 for that case. The sign-in, `initialize` and `tools/list`
work for each user. Claude then shows the text of the error to the person. A status 403
on the transport gives a general message of a failed connection, and the person does not
know the cause.

The code of the supporter account does not exist now. Until that code exists, the MCP
server is open to each user, as Klarna is. Unlike Klarna, a user keeps no access after
that date: the MCP server holds no data of the user to keep.

**The network.** The requests of Claude come from the servers of Anthropic, not from the
browser of the person. Their range of addresses is `160.79.104.0/21`. An installation
behind Cloudflare Access, as paragraph 4.2 gives, must let these paths pass:

- `/mcp`
- `/.well-known/oauth-protected-resource`
- `/.well-known/oauth-authorization-server/api/auth`
- `/api/auth/oauth2/token`
- `/api/auth/oauth2/revoke`

The page of authorisation goes through the browser of the person, thus Cloudflare Access
can stay on it.

#### 4.7.3 The tools

The server gives four tools:

| Tool | Operation | Annotations |
|---|---|---|
| `list_accounts` | It gives the accounts of the user and the most recent snapshot of each one, with its expiry lots. | `title`, `readOnlyHint: true` |
| `get_potential` | It gives the potential miles of each airline currency, as `GET /api/potential` does. | `title`, `readOnlyHint: true` |
| `get_catalogue` | It gives the currencies, the programmes and the transfer rules of `DEFAULT_COUNTRY` that apply today. | `title`, `readOnlyHint: true` |
| `add_snapshot` | It adds a snapshot to an account of the user. | `title`, `readOnlyHint: false`, `destructiveHint: true` |

Each tool has a `title` and a hint. The directory of Anthropic refuses a tool with no
such annotations, and Claude reads them for its permissions. Claude runs a tool with
`readOnlyHint: true` with no question. It asks the person before each call of a tool
with `destructiveHint: true`.

`add_snapshot` removes no data. It holds `destructiveHint: true` because the rules of the
directory ask for that hint on each tool that changes data. The question of Claude also
has a value: the person reads the number from the screenshot before the write.

The server gives no tool that removes an account or a snapshot. An agent reads text from
other sources, and a text can hold an instruction to the agent. A tool that removes data
then becomes a risk. A snapshot of an error is not a risk: the person removes it on the
dashboard, and a new snapshot replaces it.

**The rules of the data and of the interface also apply to the agent.** An agent shows
the result of a tool to the person. Thus each tool obeys these rules:

- `get_potential` gives a value for each currency. It gives no sum of all the currencies:
  refer to the rules of the data in `CLAUDE.md`.
- The description of `get_potential` and its result say that the potential miles are a
  calculation, not a balance.
- The result of `get_potential` also says that a transfer of points is permanent. The
  agent shows a real value of the user, thus the warning of paragraph 5.5.1 applies.
- Each quantity of points is an integer. A ratio is two integers.
- `add_snapshot` refuses a date in the future, as `POST /api/accounts/:id/snapshots`
  does.
- `add_snapshot` accepts the expiry lots of paragraph 3.2.1, with `addSnapshotSchema`.
  The lots belong to the snapshot, thus a snapshot with no lots holds no lots. The form
  of the dashboard gives the current lots again, and the tool cannot do that. Therefore
  `list_accounts` gives the lots of the current snapshot, and the description of
  `add_snapshot` states that a snapshot with no lots holds no lots.
- An error gives its cause and the correct input, for example `future_date` with the
  latest date that the server accepts. The directory refuses a general error, for
  example "Bad Request" with no detail.

**A description states the operation of the tool.** It gives no instruction to the
agent. The directory refuses a description that tells Claude how to behave, and the
rule also protects against prompt injection. Thus the two warnings above are data in the
result, in the field `notice`. They are not a sentence such as "tell the user".

**No tool moves points.** The directory refuses a connector that transfers money or
other financial assets. Yume moves no point, as paragraph 1 gives. A tool that starts a
transfer at a programme is thus not possible, also in a later version.

The text of the tools is English. The agent translates the text for the person, and the
server holds no Italian text: refer to paragraph 5.8.

**One function for two surfaces.** The route of the API and the tool must give the same
result. Therefore the examinations of the routes move into functions of the server: the
account of the user, the date in the future and the schema of `src/shared/api.ts`. The
route and the tool both call those functions. The project then holds one rule in one
place.

#### 4.7.4 The publication

A person adds the URL of an installation to Claude as a custom connector. That operation
needs no approval of Anthropic. Each installation has its own URL, thus each
installation works with no change.

The directory of the connectors of Anthropic holds a server after a review. Only the
official instance goes in the directory, with the option "Universal URL": one URL for
each user. A listing with a pattern of URLs needs the label Verified, and an installation
of a person is not a service with a review.

The design of this paragraph obeys the rules of the directory: OAuth 2.0 with CIMD, the
annotations of paragraph 4.7.3, the errors with a cause and no tool that moves points.
The submission also needs these items:

| Item | Source |
|---|---|
| The URL of the server | `https://<domain of the official instance>/mcp` |
| The privacy policy | `/privacy`, with the text of sub-task 6 |
| The public documentation | The page of sub-task 7 |
| The icon | `src/client/public/icon.svg` |
| A support contact | The address of the instance on the page `/privacy` |
| A test account | The account of sub-task 8 |

The submission states that the connector reads data and writes data. It also states the
requirement of the user: an account of Yume with a supporter account.

The rules of the review are on these pages of Anthropic. Read them again before the
submission, because they change:

- `https://claude.com/docs/connectors/building/review-criteria`
- `https://claude.com/docs/connectors/building/submission`
- `https://claude.com/docs/connectors/building/authentication`

#### 4.7.5 The sub-tasks

Each sub-task has one artefact that accepts or refuses it:

1. The update of `better-auth` to 1.7.19. The artefact: `npm test` with no other change.
2. The functions of paragraph 4.7.3 that the routes and the tools share. The artefact:
   the tests of `app.test.ts` with no change.
3. The authorisation server: the plugins, the migration, the metadata, the page
   `/consent` and the parameters of `/login`. The artefact: a test that receives a token
   through the full flow, with `sessionCookie` of `src/server/db/fixtures.ts`. That test
   is `src/server/authorisation.test.ts`. It gives its own transport of CIMD to
   `createAuth`, because no test reaches the network.
4. The path `/mcp` with the three tools that only read. The artefact: a test with the
   client of `@modelcontextprotocol/sdk`, and one connection from claude.ai.
5. The tool `add_snapshot`. The artefact: a test with the client of the SDK.
6. The privacy policy. Section 9 and the list of recipients must give the tokens of
   paragraph 4.7.2. The artefact: the text that the author accepts. The directory
   refuses a submission with no such text.
7. The public documentation: the URL of the server, the steps of the connection in
   Claude and in Claude Code, and the four tools. The artefact: a public page that the
   author accepts.
8. The test account for the reviewers of Anthropic. It is a supporter account with
   accounts and snapshots of an example. The artefact: one connection from claude.ai
   with that account, with a call of each tool.

These items are open:

- The sign-in of the reviewer. The sign-in uses Google only, thus the reviewer needs a
  Google account of the test. Google can ask for a second verification on a new device,
  and the reviewer cannot answer it.

- The text of the privacy policy. The agent sends the data of the person to the provider
  of the agent, and the person selects that provider. A professional must read the
  text.
- A surface that shows the clients with access and that removes their tokens. Without
  it, a person removes the access only with the removal of the account. Issue #97 gives
  the work.

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
| Font of the board | JetBrains Mono, regular and bold, with a free licence. The server supplies the font files. |
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
3. The best route for each source, with the result of each programme of the currency.

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
  potential that is equal to each balance. The three sources are in the middle of 25
  names in the order of the alphabet, thus `sortPrograms` reads the currencies and moves each
  source to the top.
- **Write the first balance in the form of the account.** The user made an account and
  then opened a second form in the row of that account. The form of the account now
  holds a field of the balance. That field is not necessary: an empty field makes the
  account with no snapshot. The date of that snapshot is the date of today, thus the
  form holds no field of the date. `POST /api/accounts` writes the account and the
  snapshot in one transaction. Thus an error writes no row, and a second "Salva" makes
  no second account.

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
- **Use the font of the board only for the digits and for short labels.** Use a standard
  sans font for the other text. A monospace font is difficult to read in a long sentence.
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
- **Show the numbers in the format of the language.** Use the locale of `Intl` of the
  page. Paragraph 5.8 gives the rule.

### 5.3 The font of the board

JetBrains Mono is the font of the board. The repository holds two files:
`src/client/fonts/JetBrainsMono-Regular.woff2` and
`src/client/fonts/JetBrainsMono-Bold.woff2`. The licence is the SIL Open Font License
1.1. The file `src/client/fonts/JetBrainsMono-LICENSE.txt` holds the text of the licence.

Departure Mono, the earlier font, is a pixel font: at 11 pixels its antialiased edges
blur, and that blur hurts the readability of a value more than the seam of the flap. A
real board of Solari prints smooth, bold letters, not pixel art. JetBrains Mono is a
smooth vector font and it scales with no defect of the strokes at each size of the board.

The token `--font-board` goes to the flaps and also to the titles and to the labels
around them: the class `font-board` is on each title of a panel and on the title of the
public page. Therefore each file holds the Latin characters, and not the characters of
the drum only.

An earlier version held one file with the bold weight and with the characters
`" .0123456789YUME"`. That subset gave a defect: a word of the interface took the
letters E, M, U and Y from JetBrains Mono and each other letter from the monospace font
of the system. The one face also held the weight 700, thus those four letters came in
bold beside letters in regular. The title `Quante miglia valgono i tuoi punti` then
showed a heavy U, a heavy M and a heavy E.

Each file holds the Latin characters of the range of Google Fonts: 240 characters. The
files hold no layout feature, thus the programming ligatures of JetBrains Mono do not
enter the interface. `pyftsubset` of `fonttools` makes each subset from the release 2.304
of the JetBrains Mono Project, and each file is 15 kilobytes. This command makes one
file:

```bash
pyftsubset JetBrainsMono-Bold.ttf \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,\
U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --layout-features='' --flavor=woff2 \
  --output-file=src/client/fonts/JetBrainsMono-Bold.woff2
```

The regular weight is for the text. The bold weight is for the flaps: the utility `flap`
of `src/client/styles/theme.css` gives `font-weight: 700`. The family holds two faces,
thus that surface asks for the weight. It does not receive the weight by default.

The format is WOFF2 only. Each current browser reads that format. The two `@font-face`
rules are in `src/client/styles/theme.css`, with the other tokens of the theme. Each rule
gives `font-display: swap`: the monospace font of the system shows the text for the time
of the load.

Give the property `font-variant-numeric: tabular-nums` to each number. Then a digit keeps
its width when the value changes, and the number does not move.

Each text of the board holds one of three sizes: 11 pixels for a title and for a label,
22 pixels for the name of the application and for a balance, 33 pixels for a potential.

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

Yume has one design, and that design is responsive. A large screen is not a different
design: it is the same design with more space. Therefore a desktop needs no separate
work, but it also receives no page that stays at the width of a telephone.

Obey these rules:

- **Write the styles for the small screen first.** Then add a breakpoint of Tailwind for
  a larger screen. Do not write a desktop style and then correct it for the telephone.
- **Write one tree of elements.** A breakpoint changes the appearance of an element. It
  does not give a second element for a large screen. A class `hidden md:block` with a
  second copy of a surface is a second design, and this project holds no such copy.
- **Make each control large enough for a finger.** The smallest control is 44 pixels on
  each side.
- **Use one column on a telephone.** A larger screen can hold two columns of the same
  elements, with a breakpoint.
- **Limit the width of the content.** The content stays in the centre. The column of the
  root is `max-w-board` on a telephone and `md:max-w-3xl` above 768 pixels. A line of
  text that crosses the full width of a desktop is difficult to read.
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

The letter is the glyph Y of JetBrains Mono Bold, as a path. JetBrains Mono is the font
of the board, thus the mark and the flaps of the interface show one letter. An earlier
version held the glyph Y of Departure Mono, five rectangles on a grid of pixels: the mark
then showed a letter of a pixel font beside flaps of a vector font. Paragraph 5.3 gives
the font.

A path holds no text element, thus the icon needs no font and each rasteriser gives the
same shape. The first version held `font-family: ui-monospace`, and each rasteriser then
drew a different letter.

The letter of `icon.svg` is 320 pixels high and the letter of `icon-maskable.svg` is 240
pixels high. Both letters are at the centre of the tile, and both hold the height of the
letter of the earlier version. Therefore the change of the font moves no other element of
the mark.

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

The client holds six routes: `/` for the public page, `/dashboard` for the dashboard,
`/login` for the access, `/consent` for the authorisation of an assistant (paragraph
4.7.2), `/privacy` for the policy of the personal data and `/tos` for the terms of the
service. The two legal pages are public: Google asks for their
addresses before it publishes the sign-in for each account. `LegalPage` shows the two
from the dictionary, and `robots.txt` does not block them. The build writes a static
page for each one, with its own title and canonical address. The check of Google reads
no JavaScript: with no static page, it reads the public page at `/privacy`. The tree is in
`src/client/router.tsx`, in the code. The project needs no plugin of the router and no
step of generation.

The route `/dashboard` reads the session before the load. With no session it sends the
user to `/login`, therefore the dashboard makes no request that gives the status 401. The
two other routes do the contrary operation: a user with a session reads the dashboard.

The route `/` is the only route that a visitor with no session reads. It gives the
context that the form of the access does not give: what Yume calculates, and that the
value is a calculation and not a balance. The registration is open, thus that page is
the entry of a new user.

That page does not say that a transfer of points is permanent. Yume moves no point, and
the page shows the balance of no person: the value on it is an example. The dashboard
gives that warning, because a person reads a real value there and then decides.

`start_url` of the manifest is `/dashboard`, not `/`. Thus the application on the home
screen of a telephone opens the dashboard and not the public page.

The public page shows `public/screenshot-dashboard.png`. That image comes from the
application: a browser opens the dashboard with balances of an example, and it gives the
picture of the cards of the potential miles. No program of design writes the content of
that image. A frame of a telephone holds the picture, because the dashboard is a surface
of a telephone. Take the picture again after a change of the cards.

The picture starts at the masthead of the dashboard, thus it holds also the warning of
the transfer. The public page itself gives no such warning: the warning in the picture is
a part of the dashboard, and the public page shows the balance of no person.

The background of the file is transparent, and the file holds a palette of 256 colours.
The transparent background lets the dark theme of the page pass at the round corners of
the frame. Therefore the element `img` holds no border and no radius: a rectangle of a
border cuts those corners. To remove a white background, fill from the border of the
image. Do not replace each white pixel: the status bar, the icon of the battery and the
light edge of the frame are also white, and a replacement of all the white makes a hole
in each one.

The button of the sign-in with Google is on the public page, at the end. The link
`Accedi` of the masthead goes to that button. The button opens Google with no page
between: a page with one button only adds one step. The first sign-in also makes the
account, thus the client holds no form of the sign-up.

The page of the access, `/login`, stays for two cases. After an error on the page of
Google, Better Auth opens `/login` with the parameter `error`. The page then shows one
message in its language: the server holds no Italian text. The route `/dashboard` with
no session also opens `/login`. The public page cannot do these two tasks: it is a
static file, and it reads no parameter.

The button works after the load of the bundle. The static page holds the button with no
handler, and `main.tsx` writes it again with the handler. `GoogleButton` keeps its state
with `useState`: the pre-render holds no client of TanStack Query.

The button follows the dark theme of the rules of Google: the fill, the stroke, the
text and the official mark "G". The mark is a PNG, `public/google-g.png`, cut from the
official file of Google. The SVG of Google draws its gradient with `foreignObject`, and
the project cannot examine that element in Safari on iOS. A PNG shows the same on each
browser. The three colours are tokens of the
theme, because the rules of Google give them. The rules of Google forbid a mark "G" of
one colour, thus the mark keeps its four colours.

### 5.5.3 The search engines and the assistants

Yume has no budget for advertisements. Therefore a person must find the public page in a
search engine and in the answer of an assistant.

The client is a single page application. The file `src/client/index.html` holds an empty
`div`, and React writes each element in the browser. Google executes that JavaScript. The
crawlers of the assistants read the HTML only. Therefore the public page is an empty page
for those crawlers.

The head of `index.html` holds the first answer to that problem: the title, the
description and the tags of Open Graph. That text is Italian, and it is the one exception
to the rule of `i18n/it.ts` in `CLAUDE.md`. A static file imports no module, and a value that
JavaScript writes arrives too late for a crawler.

The head holds three absolute URLs: `canonical`, `og:url` and `og:image`. The domain is
`yumemiles.com`, and `SITE_URL` of `src/client/lib/site.ts` holds the same value for the
code. A static file imports no module, thus the two cannot share one value. The test
`site.test.ts` reads `index.html` and it refuses a domain that is different: therefore
the four places move together at a change of the domain.

The canonical URL holds the domain of the official instance. An instance of another
person then gives the same value, thus that instance does not compete with the official
page in the results of a search.

`public/robots.txt` blocks `/api/`, `/dashboard` and `/login`. The dashboard needs a
session, thus a crawler receives the same HTML with no data. The page of the access holds
one button and no content for a search. The file gives no `Sitemap`: the site holds one
public page, and a search engine finds one page with no sitemap. Add that line with the
first group of pages of the catalogue.

**The order of the public page is the product, then the detail.** The masthead gives the
name and the link to the button of the access. Then the `h1` says what Yume calculates, the board of
the example shows that value, and three blocks give the three rules of the calculation.
The logos of the catalogue come after those blocks, then the picture of the dashboard.
The detail of the catalogue is in the questions at the end of the page.

The logos give the extent of the catalogue in one view, and a visitor finds a known brand.
They come after the three rules, thus they are not an opening. Paragraph 5.7 gives the
rules of the logos.

An earlier version of this paragraph asked for four blocks of the same weight, and the
second block named the six programmes of Avios. A visitor then read which airlines share
one currency before it read what the application does. The names of the programmes are an
answer to a question, not an opening.

The `h1` is the question of the person, not the name of the application. A search engine
and an assistant read the `h1` as the subject of the page, and the name alone gives no
subject. The name is on the flaps of the masthead.

The page holds a list of questions with the title `Domande frequenti`. Each answer opens
with the fact and then it gives the context: an assistant cites the paragraph that
answers, not the paragraph that introduces. That list holds the detail that the four
blocks held before: the six programmes of Avios, the quantity of the programmes of the
catalogue, the source of each ratio and the limit of the sum of two currencies.

That quantity of text is a decision of this paragraph, and it is not a decision of the
sale. The site holds one public page, thus that page carries each answer alone. The
pages of the catalogue come later, and they then take that work.

The page names the six programmes of Avios and it gives the quantity of the programmes of
the catalogue. Those values come from `src/server/db/seed/catalogue.ts`. The page gives no
ratio: a ratio needs a source, and the seed file is the only source. Refer to the rule 5
of the data in `CLAUDE.md`.

`src/client/text.test.ts` reads the seed file and the text of the page. It refuses a
quantity or a name that the two do not share. A new transfer rule changes the catalogue,
and no other test reads the Italian text: without this examination the page keeps a
number that was correct one time.

The head of `dist/index.html` holds the structured data of schema.org, in the format
JSON-LD. `src/client/lib/jsonLd.ts` writes four items: `Organization` with the subjects of
the application, `WebSite`, `SoftwareApplication` with the functions of today, and
`FAQPage` with the questions of the page. Each question of that data is on the page: data
that says one thing to a crawler and an other thing to a reader is a defect.

The builder replaces `<`, `>` and `&` with the escape of JSON. A value that holds
`</script>` closes the element before its place, and the page then holds an element that
no person wrote.

`dist/llms.txt` gives the same text in markdown, for the crawlers of the assistants
(https://llmstxt.org). `src/client/lib/llms.ts` reads `i18n/it.ts`, thus the file and the
page hold the same text and no person writes that text two times. The server supplies
`dist/` as static files, therefore that file needs no route of Hono and no path in
`CLIENT_PATHS`. The format also gives `/llms-full.txt` for a site with many pages: add
that file with the first group of pages of the catalogue.

The development server of Vite writes no such file. The pre-render is a step of the
build, thus the structured data and `llms.txt` exist in the container only. Read the
production instance to examine them, not `npm run dev:client`.

A block of the network can make this work inactive with no error. A proxy in front of the
application can refuse `GPTBot`, `OAI-SearchBot`, `ClaudeBot` or `CCBot`, and `llms.txt`
is then not available to the exact readers of that file. Read the file that the instance
gives, not the file of the repository:

```bash
curl -sS https://yumemiles.com/robots.txt
curl -sS -o /dev/null -w '%{http_code}\n' \
  -A 'ClaudeBot/1.0 (+https://www.anthropic.com/claude-bot)' \
  https://yumemiles.com/llms.txt
```

The server gives the status 404 to a path that the client does not hold. The client
controls the routes, thus the server gave `index.html` with the status 200 to each path.
A search engine then read each address of the site as a page with no content, and the
quantity of those addresses has no limit.

`NotFoundPage` of `src/client/NotFoundPage.tsx` is the page of that status. The flaps of
the code turn at the load, as the flaps of a potential value: the code is a value that
the system gives, and the person wrote no part of it. The page holds one sentence and one
link to the public page.

`CLIENT_PATHS` of `src/shared/routes.ts` holds the paths of the pages, and the pure
function `isClientPath` gives the status. The page of the status 404 is the page of the
application: the server holds no Italian text. The test of that file reads
`src/client/router.tsx` and it refuses a path that one file holds and the other file does
not hold. That examination is necessary, because the development server of Vite holds its
own fallback and it never calls Hono.

`src/client/prerender.tsx` writes the elements of the public page in `dist/index.html`.
Then a crawler that executes no JavaScript reads the four blocks, and a browser paints
them before it loads the bundle.

`npm run build` runs three commands. Vite builds the client, then Vite builds this module
for Node, then Node runs that bundle. The second build is necessary, because Node
executes no JSX. The bundle goes in `dist-ssr/`, and `.gitignore` holds that directory.

The module renders `AppShell` with `HomePage`, and it needs no context and no session:
the public page holds no element of the router. The build stops when `index.html` holds
no empty `div` of the root. Without that examination, a change of the name of the element
gives a page with no text, and the browser shows no such defect.

React writes the page again at the load, because `main.tsx` calls `createRoot`. The
elements of the two are the same, thus a person sees no change.

The same module writes the shell of the application for each language: `dist/app.html`
for the base language, `dist/en/app.html` for English. `appShellOf` of
`src/client/lib/head.ts` gives the shell. It holds the head of the language, an empty
root, no structured data and `<meta name="robots" content="noindex">`. It holds no
canonical address and no link `hreflang`, because one shell answers each path.

The server gives the shell to each path that no file matches: `/dashboard`, `/login` and
each 404. `serveStatic` gives `dist/index.html` to `/` only. With one page for each path,
the browser painted the public page on `/dashboard` before the bundle loaded. The
`start_url` of the manifest is `/dashboard`, thus each start of the installed application
showed the example board. That value then read as a balance of the person. The path
`/app.html` is public, and `noindex` keeps it out of the search engines.

The flaps give a limit to this operation. Each cell holds one card for each character of
its drum, therefore the HTML holds those characters: `Y Y Y U U U` for the name, and the
digits of each position for the number. Those elements hold `aria-hidden`, and the
correct value is in an element that is not visible. The text of the page is much larger
than that quantity of characters. The order is necessary: a pre-render of the flaps of
today writes each character of the drum in the HTML, and that text says nothing to a
reader.

### 5.5.4 The foot of the site

`src/client/components/board/SiteFooter.tsx` holds the foot, and `AppShell` gives it to
each surface. Yume names American Express, Revolut and each airline programme of the
catalogue, with their logos. Therefore each surface says that Yume belongs to none of
them, and that the names and the logos are trademarks of their owners.

The dashboard holds the same foot. That surface needs it most: a person reads the names of
the programmes there, with a real value.

The `main` holds the page and the foot is outside it: the foot belongs to the site and not
to the page. The column holds the full height of the screen and the `main` grows, thus the
foot stays at the end of a page that is shorter than the screen.

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

**The line of the axis takes no space of the character.** The two halves hold one half of
the height each, and the line comes from `::after` of the housing, above the card. An
earlier version gave `calc(50% - 1px)` to each half, and the colour of the housing then
showed in a band of 2 pixels. That band removed a part of each character: the digit 8 read
as two rings, the digit 4 lost its bar, and the letter A lost its crossbar. On a real board
the two halves of the card touch, and the reader sees a shadow: the card loses no ink.

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
- The housing holds a fixed height. Each half is one half of that value. A height from
  the line of the text gives two halves that are not equal.
- Each half holds exactly one half of the housing. A half that stops before the middle
  removes a band of the character.

### 5.7 The logos of the programmes

Each programme of the catalogue shows its logo at the left of its name. The public page
shows the logos of the sources and of the airlines in one grid. `src/client/lib/logos.ts`
holds the logos, and `src/client/components/board/ProgramLogo.tsx` shows them.

The grid shows airlines, not programmes. A visitor looks for the airline: ITA Airways, not
Miles & More. A programme with one airline gives its own logo. Miles & More and Flying
Blue give the logo of each of their airlines, from `AIRLINE_LOGOS`. Paragraph 3.1 gives
the three levels.

The grid shows the sources first. Then it shows `FEATURED_AIRLINES`, the airlines that a
visitor in Italy knows best. The other airlines follow in the order of the alphabet. The
first row thus tells the visitor that the site is for the Italian market.

| Decision | Value |
|---|---|
| Format | One SVG path in a box of 24 x 24. The longer side of the logo touches the box. |
| Colour | One colour, `currentColor`. A logo takes the colour of the text next to it. |
| Size | 20 pixels in a list of the dashboard, 32 pixels on the public page. |
| Storage | In the bundle of the client. The application operates with no internet. |

The logos have one colour for these reasons:

- The palette is dark only. A logo in dark blue, for example Delta or Klarna, does not
  show on the board.
- Thirty-nine palettes of brands break the board of Solari. One colour keeps the theme.
- One format gives one column of logos in each list.

Three sources supply the logos:

1. **Simple Icons**, with the licence CC0 1.0. The path is the path of the icon, with no
   change. Do not add the package: the bundle needs 19 of more than 3 000 icons.
2. **Wikimedia Commons**, for a programme that Simple Icons does not hold. The file must
   be in the public domain, for example as a text logo. A script draws the file, keeps
   one part of it, traces that part with `potrace` and puts it in the box. A file with
   one colour and no effect needs no trace: the script scales its paths into the box.
   The paths then stay exact. Korean Air and ANA are those files.
3. **The official file of the programme**, when the two sources above do not hold the
   logo. The same script traces it. Flying Blue is the only example: the user gave the
   address of the file on `img.static-fb.com`.

The official sites of the airlines refuse the session of the harness. Refer to the rule 5
of the data in `CLAUDE.md`. Wikimedia Commons limits the requests from the session, but
the Playwright server of `PLAYWRIGHT_URL` receives each file.

Keep the symbol of a brand when the brand has one, for example the shamrock of Aer
Lingus. Keep the full name when the brand has no symbol, for example SAS or Vueling. A
wide name is small in the box: that is the cost of one format.

The file of Flying Blue is a blue circle with the name and the line of Air France and KLM.
Yume keeps the name only: a full circle in the box of 20 pixels shows a disc with no
legible text. Miles & More shows its name, from the logo with Lufthansa: the programme
has no separate symbol.

A new programme of the catalogue needs a logo. The test of `logos.ts` compares
the keys with the catalogue, thus a programme with no entry makes the test fail. A new
airline of Miles & More or of Flying Blue also needs a logo in `AIRLINE_LOGOS`, and the
same test fails without it.

The logos are trademarks of their owners. The foot of each surface says it. Refer to
paragraph 5.5.4.

### 5.8 The languages of the interface

Status: **accepted**. Date: 2026-11-09. The interface holds one language, Italian. The
code makes a second language an addition: a file of text and one item of a list.

**The language is different from the market.** The language gives the text and the
format of the numbers and of the dates. The market gives the catalogue and the transfer
rules: the column `country` of paragraph 3.3.2. A person from Italy who lives in Spain
needs the rules of Spain and the Italian text. Thus no value of one controls the other.
This paragraph gives the language only.

**The path is the only source of the language.** The base language, Italian, has no
prefix: `/`, `/login`, `/dashboard`. Each other language has its prefix: `/en/`,
`/en/login`, `/en/dashboard`. The paths of the base language thus stay the same, and the
canonical URL of paragraph 5.5.3 does not change.

The root of a language with a prefix holds a slash at the end, `/en/`. The router writes
that address for a link to `/`, thus the canonical address and the links agree.

The server makes no redirect from the header `Accept-Language` and reads no cookie of the
language. A crawler and a link then always receive the same page for one address. Google
gives the same recommendation. A person changes the language with a selector. The
selector shows only with two languages or more.

The path `/it/login` is not a second address of `/login`. The base language has no
prefix, thus that path gives the status 404. Two addresses for one page divide the
results of a search engine.

`src/shared/locale.ts` holds the list `LOCALES`, the base language and the tags of each
language: the attribute `lang`, the locale of `Intl` and the value of `og:locale`. The
function `localeRouting` gives `localeOfPath` and `pathFor` for a list of languages. The
client and the server both use it.

**The tests examine a second language now.** The functions receive the list of the
languages as a parameter. A test gives the list `it` and `en`, with a text of the test.
Thus the routing, the pages and the format of a second language have a test before the
language exists. In production the list holds `it` only.

**Each language has a typed text.** The text of the base language gives the type. A
second text must hold each key of that type, or the typecheck fails. Yume uses no library
of translation. The language is known from the path before the render, and
`Intl.PluralRules` gives the plurals. A library adds a change of language at runtime and
a load of the text from the network: Yume needs neither.

**The format of a number follows the language.** `parsePoints` reads the separator of
the thousands from the locale of `Intl`. In Italian `1.900` is 1900. In English the same
text is a decimal number, thus the function refuses it.

Each language receives its own static page from the build: the attribute `lang`,
`og:locale`, a link `hreflang` for each language and the link `x-default` to the base
language. `lib/head.ts` writes that head from the text of the language. Each language
also receives its own `llms.txt`, near its page: `dist/llms.txt`, `dist/en/llms.txt`.

The server reads the prefix with `pageOfPath` of `src/shared/routes.ts`. It gives the
page of that language, also with the status 404. The client gives the prefix to the
router as `basepath`, thus each link and each redirect keeps the language.
`robots.txt` blocks the private pages with the prefix `/*/` also.

The test of the head gives the Italian head of `index.html` from the dictionary. Thus
the head and the dictionary cannot hold two different texts.

## 6. Repository layout

```
yume/
  src/
    client/            # React, TanStack Router, shadcn/ui
      router.tsx         # the tree of the routes, in the code
      components/ui/     # shadcn/ui. Do not change these files.
      components/board/  # the theme of the departure board
      i18n/              # the text of each language and useI18n
      lib/               # the logic of the client, with a test file
      styles/            # the tokens of the theme
      fonts/             # the font files
    server/            # the Hono application
      auth.ts          # the Better Auth instance, with the provider Google
      mcp.ts           # the MCP server and its tools
      operations.ts    # the examinations that the routes and the tools share
      db/schema.ts     # the Drizzle tables, with the Better Auth tables
      db/seed/         # the catalogue of programmes and transfer rules
    shared/            # Zod schemas, the conversion and the languages, for both sides
  drizzle/             # the generated migrations, under version control
  docs/
  Dockerfile
  compose.yaml
```

The project has one `package.json`. Do not use a monorepo tool. At this size, a monorepo
adds complexity but gives no advantage.

## 7. Deployment

The repository holds `Dockerfile`, `.dockerignore` and `compose.yaml`. The
`Dockerfile` has three stages with `node:26-bookworm-slim`: the dependencies of
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

`0000_initial.sql` holds the two migrations of the first version. The application ran on
no server before the first tag, thus the project made those two migrations into one file.
This operation was possible one time only. A migration that ran on a server is
immutable: add a new migration.

## 8. Appendix — the catalogue of programmes

The catalogue holds each airline programme that users of Yume have. Yume keeps the balance
of each programme. Yume calculates the potential miles only for a programme that a source
reaches. A programme with no source is not a defect, thus the interface gives no warning
for it.

The catalogue contains 26 airline programmes. 21 of them are the transfer partners of
Amex MR Italy, Revolut RevPoints and Klarna Cashback in October 2026. The last section of
this appendix gives the five programmes that no source reaches. Each ratio is *source :
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

Each of the other 14 programmes has its own currency: SAS EuroBonus, Singapore Airlines
KrisFlyer, Emirates Skywards, Aegean Miles+Bonus, Avianca LifeMiles, China Southern Sky
Pearl Club, Etihad Guest, Icelandair Saga Club, TAP Miles&Go, Turkish Airlines
Miles&Smiles, Cathay (Asia Miles), Delta SkyMiles, United MileagePlus and Thai Royal
Orchid Plus.

### Transfer rules — Revolut RevPoints

| Target currency | Ratio |
|---|---|
| Avios, Flying Blue, SAS EuroBonus, Aegean Miles+Bonus, Avianca LifeMiles, China Southern Sky Pearl, Etihad Guest, Icelandair Saga, TAP Miles&Go, Turkish Miles&Smiles | 1 : 1 |
| Emirates Skywards | 2 : 1 |
| Singapore Airlines KrisFlyer | 2 : 1 |
| ALL Accor points (hotel) | 2 : 1 |

### Transfer rules — Klarna Cashback

Klarna gives each ratio for 100 points of cashback. The minimum and the step are 100
points. The plan of the member changes the expiry of the cashback, not the ratio.

| Target | Points for 100 points of cashback |
|---|---|
| Finnair Plus (Avios), Thai Royal Orchid Plus | 101,43 |
| SAS EuroBonus | 132,24 |
| British Airways Club, Iberia Club, Vueling Club, Aer Lingus AerClub (Avios), Flying Blue, Turkish Miles&Smiles, Avianca LifeMiles, United MileagePlus | 80,02 |

For Avios, the route through Finnair Plus gives the largest value.

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

**Korean Air**, **ANA**, **JAL** and **Qantas** have the same status. Users of Yume hold
these balances, and no source sends points to these programmes. Each programme has its own
currency: SKYPASS, ANA Mileage Club, JAL Mileage Bank and Qantas Points.

Keep a record of these routes that do not operate. Then no person examines them again:

- Nexi ioSì gives points only to Trenitalia CartaFRECCIA. It gives no miles.
- Amex can send points to PAYBACK Italy. But PAYBACK Italy sends no points to an
  airline.
- Trenitalia CartaFRECCIA sent points to Volare at a ratio of 1 : 6. The Volare
  programme is closed. Thus this route is also closed.

Examine the ratios again before each release. The ratios are the data with the highest
risk of a change.
