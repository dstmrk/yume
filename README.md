# Yume ✈️

Yume is a private dashboard for reward points and airline miles. The name comes from the
Japanese word 夢. The word means "dream".

## What Yume does

Yume shows all your loyalty balances on one screen:

- flexible points: American Express Membership Rewards and Revolut RevPoints
- airline programmes: 19 programmes, with 14 different point currencies
- hotel programmes that can supply miles

Yume then calculates the **potential miles**. The potential miles are the miles that you
can have in one airline currency, if you transfer all your flexible points to that
currency.

Yume does not connect to your bank or to your airline account. You write the balances
manually.

## Scope

Yume is for the Italian market. It contains only the transfer partners of American
Express Italy and Revolut. Amex Italy and Revolut are the only two sources of flexible
points in Italy.

## Important

The potential miles value is a calculation, not a balance. Two limits apply:

1. The value is a maximum for each currency. You cannot send the same points to two
   different programmes.
2. A transfer of points is permanent. Find the award seat first. Then transfer the
   points.

## Status

The project is in the first stage of the development. The conversion logic, the database
schema and the catalogue are present. The API and the user interface are not present.

## Documents

- [`docs/architecture.md`](docs/architecture.md) — the stack, the data model and the
  deployment rules
- [`CLAUDE.md`](CLAUDE.md) — the rules for work in this repository

## Language

The user interface is in Italian. All documents are in ASD-STE100 Simplified Technical
English. All code, all identifiers and all commit messages are in English.

---

*Your daily expenses become your next journey.*
