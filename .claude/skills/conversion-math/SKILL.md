---
name: conversion-math
description: Use this skill for the conversion of points and for the potential miles. Use it for the pure functions in src/shared/ and for the catalogue in src/server/db/seed/. Use it for the tables transfer_rule, currency, program, user_account and balance_snapshot. Use it for the fields ratioNum, ratioDen, minTransfer, increment, country, validFrom and validTo. Use it when you add a transfer rule, when you change a ratio, when you add a country, or when you close a rule that is not valid. Use it when you write or change the function that calculates the potential miles of a currency. Use it for a currency that more than one programme uses, for example Avios or Flying Blue miles. Use it when the user interface shows a potential value, a balance or a conversion.
---

# conversion-math — the calculation of the potential miles

This skill gives the method. `docs/architecture.md` gives the decisions and the
catalogue.

## The rule in one line

Calculate with integers only. Calculate for each currency, not for each
programme.

---

## 1. Integers only

Points are integers. A ratio is a fraction of two integers, `ratioNum` and
`ratioDen`. Do not use a floating-point number for a ratio. Do not use a
floating-point number for a balance.

A floating-point number gives an error of one or two miles. The user sees a
value that is not correct, but the user cannot find the cause.

### The canonical function

```ts
const transferable = Math.floor(balance / increment) * increment;
const converted =
  transferable >= minTransfer
    ? Math.floor((transferable * ratioNum) / ratioDen)
    : 0;
```

The three steps are in this sequence. Do not change the sequence:

1. **Decrease the balance to a multiple of `increment`.** A programme accepts
   only a multiple of the step. The remainder stays in the source account.
2. **Compare the result with `minTransfer`.** Make the comparison after step 1,
   not before it. A balance above the minimum can fall below the minimum after
   the shift to the step.
3. **Multiply first, then divide.** `transferable * ratioNum` stays an integer.
   A division before the multiplication loses the precision.

**Always use `Math.floor`.** Do not use `Math.round` and do not use
`Math.ceil`. A programme does not give a partial mile. A value that is too high
gives the user an expectation that is not correct.

---

## 2. A currency is different from a programme

Six programmes use Avios. The 19 airline programmes use 14 currencies.

**Calculate the potential for each currency.** If you calculate the potential
for each programme, you count the same balance six times.

A `user_account` refers to a `program`. A `transfer_rule` refers to two
programmes, because the minimum quantity and the step belong to the pair of
programmes. Refer to paragraph 3.3.1 of `docs/architecture.md`.

For the balance of a currency, add the current balance of each account with a
programme of that currency.

### The best route

One currency can have more than one route from the same source. Amex sends
points to Avios through The British Airways Club, with a minimum of 800 and a
step of 400. Amex also sends points to Avios through Iberia Club, with a minimum
of 500 and a step of 500.

**Select the largest result.** For each source account, calculate the conversion
to each programme of the target currency. Then keep the largest value. A balance
of 700 Membership Rewards points gives 400 Avios through Iberia Club, but 0
Avios through The British Airways Club.

**Two equal results keep the smallest minimum.** A balance of 2 000 Membership
Rewards points gives 1 600 Avios through each of the two routes. The function
then keeps Iberia Club, because its minimum is 500 and the minimum of The
British Airways Club is 800. That route also operates with a balance that is
smaller.

### One account at a time

Calculate each source account independently. The minimum quantity applies to one
account. Two accounts of 400 points each give 0. Do not add the two balances
first.

---

## 3. The transfer rules have versions

Each rule has `validFrom` and `validTo`. An active rule has `validTo = null`.

### To select a rule

Select the rule where `country` is equal, where `validFrom <= at` and where
`validTo` is null or `validTo > at`. Give the country and the date to the
function as parameters.

```ts
findRule(rules, fromProgramId, toProgramId, country, at);
```

### The country

Each rule applies to one country. The field `country` holds a country in the ISO
3166-1 alpha-2 format, for example `IT`. The partners and the ratios change with
the country: Amex Italia and Amex France give a different list.

**Compare the country exactly.** A rule of an other country must give no value to
this country. The application holds no rule that is valid in each country.

**Write the rules of the new country in the catalogue.** Do this operation also
when the ratio is equal to the ratio of an other country. Read the official page
of that country.

The catalogue holds the rules of Italy only. The server gives the constant
`DEFAULT_COUNTRY` of `src/shared/catalogue.ts` to the calculation, because no
surface selects a country. Paragraph 3.3.2 of `docs/architecture.md` gives the
rule for a second country.

### To change a ratio

Do not change a rule in its place. Do these two operations in one transaction:

1. Write the date of the change in the `validTo` field of the old rule.
2. Add a new rule with a new `validFrom` and with the link of the new source in a
   comment.

**A closed rule is not dead code. Do not remove it.** An old snapshot needs the
rule of its date. This is not compatibility with an old version of the code. It
is historical data of the application.

### The source

Read the official page. Do not write a ratio from memory. Write the link of that
page in a comment above the rule, in `src/server/db/seed/catalogue.ts`. The
database keeps no link: the source is a note for the author of the catalogue,
and no surface shows it. Ask the user before you change a value in the catalogue
or in the rules. This instruction is in `CLAUDE.md`, in the section Questions.

---

## 4. Purity

The conversion functions are in `src/shared/`. The client and the server use the
same functions.

- The functions must be pure. The functions must do no I/O.
- Do not call `Date.now()` in a function. Give the date as a parameter. Then a
  test can fix the date and examine a rule that is not active now.
- Do not read the database in a function. Give the rules and the balances as
  parameters.

---

## 5. Tests

Write a unit test for each new rule of the calculation. Each test of the
conversion must contain these cases:

| Case | Expected result |
|---|---|
| The balance is below `minTransfer`. | 0 |
| The balance is not a multiple of `increment`. | The function uses the lower multiple. |
| The balance is above `minTransfer`, but it falls below the minimum after step 1. | 0 |
| The ratio does not divide exactly. | The function gives the lower integer. |
| The currency has more than one programme. | The function counts the balance one time. |
| The rule is not valid at the date. | The function does not use the rule. |
| The rule belongs to an other country. | The function does not use the rule. |
| The balance is 0. | 0 |
| Two routes go to the same currency. | The function keeps the largest result. |
| Two routes give the same result. | The function keeps the smallest minimum. |
| Two accounts use the same source programme. | The function converts each account alone. |

Use a real ratio from the catalogue in a test. Example: Amex gives 4 Avios for 5
Membership Rewards points, with a minimum of 800 for British Airways Club.

---

## 6. The user interface

The result of this calculation is not a balance. The user interface must obey
these three rules:

- **Show that the value is a calculation.** It is not a quantity of points in an
  account.
- **Show that a transfer is permanent.** The user cannot cancel a transfer.
- **Do not show a total of all the currencies.** The user cannot send the same
  points to two programmes. A sum gives a value that is not possible.

Show all the numbers with the locale `it-IT`. The text of the interface is in
Italian, and it stays in one place.
