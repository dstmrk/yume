# Yume — Architecture Decision Record

Status: **accepted** · Date: 2026-08-11

This document records the architecture decided before any code was written. It is
written in English to match the rest of the repository.

---

## 1. Context

Yume is a private dashboard that aggregates reward-point balances (American Express
Membership Rewards, Revolut RevPoints) and airline loyalty balances, and computes the
**potential miles** obtainable in each airline currency by simulating transfers.

Operating constraints, all deliberate:

| Constraint | Decision |
|---|---|
| Cost | Zero. No paid service, no mandatory third-party dependency. |
| Deployment | A single Docker container, self-hosted on a homelab / NAS / Raspberry Pi (arm64). |
| Users | Small, closed group. **Invite-only** registration, no open sign-up. |
| Data ingestion | **Manual entry.** Neither Amex nor Revolut expose a public balance API, and scraping was explicitly rejected. |
| Language | TypeScript end to end, validated with Zod. |

## 2. Stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node 22 LTS | Boring, LTS, native `fetch`. |
| HTTP server | Hono | Tiny, standards-based, serves both the API and the built SPA from one origin. |
| Client | Vite + React 19 + TanStack Router + TanStack Query | Typed routing, caching and invalidation handled by Query. No SSR needed. |
| UI | Tailwind CSS v4 + shadcn/ui + lucide-react | Owned components, no runtime dependency on a design-system package. |
| Database | SQLite via `better-sqlite3` | Single-node, low write volume, file-based backups. |
| ORM + migrations | Drizzle + drizzle-kit | SQL-first, generated migrations checked into git. |
| Auth | Better Auth (Drizzle adapter) | Self-hosted sessions, no external identity provider. |
| Validation | Zod, plus `drizzle-zod` to derive schemas from tables | One source of truth for shapes. |
| Tests | Vitest | |
| Lint/format | Biome | Single binary, replaces ESLint + Prettier. |

### 2.1 Why not TanStack Start

TanStack Start's server functions would remove the API layer, but they bring SSR that
this app does not need: it is a private, authenticated dashboard with no SEO surface.
The cost is a younger ecosystem and a more opaque Docker build. Vite + Hono gives two
processes in development and **one process in production** (Hono serves `dist/`), with
every piece independently replaceable.

End-to-end type safety is preserved through **Hono RPC** (`hc<AppType>`): route types
reach the client by inference, with no code generation and no tRPC layer.

### 2.2 Why one origin

Serving the SPA and the API from the same Hono process means session cookies work with
no CORS configuration, no `sameSite: 'none'`, and no cross-domain credentials. This is
the main reason the client is not a separate container.

### 2.3 Why SQLite

Write volume is a handful of rows per user per month. SQLite is the correct size of
tool. Required configuration at connection time:

```ts
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');    // off by default in SQLite
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL'); // safe under WAL
```

The database file lives on a mounted volume (`/data`), never inside the image. Backups
use `VACUUM INTO '/data/backup/yume-<timestamp>.db'`, which is consistent against a live
database and needs no downtime.

## 3. Data model

Three decisions drive the schema.

### 3.1 Currency is not program

Avios is a single currency shared by six programmes (British Airways Club, Iberia Club,
Aer Lingus AerClub, Finnair Plus, Qatar Airways Privilege Club, Vueling Club), freely
movable between them. Potential is therefore computed **per currency**, not per
programme — otherwise the same balance is counted six times.

19 airline programmes map onto 14 distinct currencies.

### 3.2 Snapshots, not a delta ledger

Because balances are entered by hand, the natural primitive is *"on this date the
balance read X"*, not *"I earned 500 points"*. The table is therefore a snapshot log:

```
balance_snapshot(account_id, points, observed_at, note)
```

Current balance = the most recent snapshot per account. History and charts come for
free, and the model matches how the data actually arrives. Deltas are derived for
display, never stored.

### 3.3 Integers only, never floats

Points are integers; conversion ratios are rationals. Ratios are stored as two integers
plus the granularity of the transfer:

```ts
transfer_rule {
  fromCurrencyId, toCurrencyId,
  ratioNum, ratioDen,        // Amex 5 MR -> 4 Avios  =>  num 4, den 5
  minTransfer, increment,
  validFrom, validTo,        // nullable => currently active
  sourceUrl
}
```

and the computation is pure integer arithmetic:

```ts
const transferable = Math.floor(balance / increment) * increment;
const converted = transferable >= minTransfer
  ? Math.floor((transferable * ratioNum) / ratioDen)
  : 0;
```

A `0.8` stored as a float silently produces balances that are wrong by a mile or two,
with no way to trace the error.

Rules are **versioned** via `validFrom` / `validTo`. Ratios change — Amex dropped ITA
Volare and Finnair Plus from its partner list in recent years — and historical snapshots
must stay reproducible.

### 3.4 Tables

```
-- Better Auth owns: user, session, account, verification

invitation(id, code, createdByUserId, email?, expiresAt, usedAt, usedByUserId)

currency(id, code, name, kind)                    -- 'airline' | 'flexible' | 'hotel' | 'rail'
program(id, currencyId, code, name, airlineIata?, alliance?, transferable)
transfer_rule(...)                                -- see 3.3

user_account(id, userId, programId, membershipRef?, nickname?)
balance_snapshot(id, accountId, points, observedAt, note?)
```

`currency`, `program` and `transfer_rule` are **application data, not user data**: they
live in a typed TypeScript file under `src/server/db/seed/`, applied idempotently at
container start. They belong under version control, not in a hand-filled admin form.

### 3.5 The potential-miles calculation

For a target currency *C*:

```
potential(C) = currentBalance(C)
             + Σ over each flexible source S:  convert(balance(S), rule(S → C))
```

Two properties must be surfaced in the UI, not hidden:

- The figure is a **per-currency maximum**, not additive across currencies: the same
  Membership Rewards points cannot go to two programmes at once.
- Transfers are **irreversible**. The number is a simulation; it must never be presented
  as an owned balance.

This function lives in `src/shared/`, is pure, has no I/O, and is unit-tested. It is the
only non-trivial logic in the app and both client and server import the same copy.

## 4. Authentication

Better Auth with email + password, sessions in SQLite via the Drizzle adapter. Its CLI
generates the auth tables, which are then committed into the Drizzle schema so
migrations remain a single pipeline.

Invite-only is enforced by requiring an `inviteCode` field at sign-up and validating it
in a Better Auth `before` hook: unknown, expired or already-used codes reject the
request; a successful sign-up marks the invitation consumed in the same transaction.

Consequences of the closed model:

- Email verification is **disabled** — there is no SMTP dependency, and therefore no
  self-service password reset. Recovery is an administrative action.
- The first user is created by a seed script, not through the UI.

## 5. Repository layout

```
yume/
  src/
    client/            # React, TanStack Router, shadcn/ui
    server/            # Hono app
      auth.ts          # Better Auth instance
      db/schema.ts     # Drizzle tables (Better Auth tables included)
      db/seed/         # programme + transfer-rule catalogue
      routes/
    shared/            # Zod schemas + conversion logic, imported by both sides
  drizzle/             # generated migrations, committed
  docs/architecture.md
  Dockerfile
  compose.yaml
```

A single `package.json`. No monorepo tooling: at this size, workspaces add complexity
with no return.

## 6. Deployment

Multi-stage `Dockerfile` on `node:22-bookworm-slim`, non-root user, `HEALTHCHECK`,
`drizzle-kit migrate` on start. Compose mounts `./data:/data`.

Homelab-specific notes:

- **Use Debian slim, not Alpine.** `better-sqlite3` is a native module; musl means
  building from source and losing time. The build stage needs `python3 make g++`.
- **Run a 64-bit OS.** On a Raspberry Pi, arm64 has prebuilt binaries; 32-bit armv7 does
  not, and compiling on-device is slow and memory-hungry. Build with
  `docker buildx --platform linux/arm64`, or build on the device itself.
- **Cookies and TLS.** Better Auth issues `secure` session cookies, which browsers drop
  over plain HTTP. Reaching the app at `http://nas.local:3000` therefore breaks login.
  Either terminate TLS (Caddy with a local certificate, or a Cloudflare Tunnel), or
  expose it through Tailscale, which provides HTTPS. Disabling `secure` is the wrong
  fix.
- Backups: a cron running `VACUUM INTO` into the mounted volume, rotated.

## 7. Appendix — programme catalogue

19 airline programmes, being the union of the Amex MR Italy and Revolut RevPoints
transfer partners as of August 2026. Ratios are expressed as *source : target*.

### Shared currencies

| Currency | Programmes |
|---|---|
| Avios | British Airways Club, Iberia Club, Aer Lingus AerClub, Finnair Plus, Qatar Airways Privilege Club, Vueling Club |
| Flying Blue miles | Flying Blue (Air France, KLM, Transavia) |

The remaining 12 programmes each have their own currency: SAS EuroBonus, Singapore
Airlines KrisFlyer, Emirates Skywards, Aegean Miles+Bonus, Avianca LifeMiles, China
Southern Sky Pearl Club, Etihad Guest, Icelandair Saga Club, TAP Miles&Go, Turkish
Airlines Miles&Smiles, Cathay (Asia Miles), Delta SkyMiles.

### Transfer rules — Revolut RevPoints

| Target currency | Ratio |
|---|---|
| Avios, Flying Blue, SAS EuroBonus, Aegean Miles+Bonus, Avianca LifeMiles, China Southern Sky Pearl, Etihad Guest, Icelandair Saga, TAP Miles&Go, Turkish Miles&Smiles | 1 : 1 |
| Emirates Skywards | 2 : 1 |
| Singapore Airlines KrisFlyer | 2 : 1 |
| ALL Accor points (hotel) | 2 : 1 |

### Transfer rules — Amex Membership Rewards (Italy)

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

### Tracked but not transferable

**Miles & More** is ITA Airways' programme since 1 April 2026, when Volare closed and
ITA joined Star Alliance. Neither Amex Italy nor Revolut transfers into it. It is
modelled as a normal programme with `transferable = false`: the most likely balance for
an Italian user, and the one for which the answer is "no source can top this up".

Dead ends worth recording so they are not re-investigated: Nexi ioSì converts only to
Trenitalia CartaFRECCIA, not to miles; PAYBACK Italy can be fed from Amex but no longer
converts out to any airline; Trenitalia CartaFRECCIA's 1:6 route into Volare died with
Volare itself.

Ratios must be re-verified against the issuers before each release — they are the part
of this system most likely to drift.
