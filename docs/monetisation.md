# Yume — The plan for a paid service

Status: **proposed**. Date: 2026-08-15.

This document gives a plan. It changes no code and it changes no decision.
`docs/architecture.md` holds the decisions of the application of today. The team writes
the decisions of this plan in that document when the work starts.

The document is in ASD-STE100 Simplified Technical English.

---

## 1. The problem

Yume calculates the potential miles. That number answers a question of supply: how many
miles can the user hold? The user reads a balance in the application of the bank.
Therefore that number alone sells nothing.

ilgeniodellemiglia.com answers a different question. The user gives a destination, and
the tool names the programme and the quantity of miles. That question is a question of
demand: what can the user do with the points?

A person pays for the second answer. Therefore Yume must build the bridge between the two
questions.

Yume holds one advantage for that bridge. It calculates the potential **for each
currency**, with integers and with versioned rules. Paragraph 3.1 of
`docs/architecture.md` gives that decision. Thus Yume can say that Iberia Club reaches an
award and that The British Airways Club does not reach the same award. A tool that
calculates the potential for each programme cannot give that answer.

## 2. The model: open core on the data

The code stays under the MIT licence. A person installs Yume on a home server at no cost.
That installation keeps each function that needs no external service.

Yume sells two items:

1. **The hosted instance.** The person writes no command of Docker and keeps no backup.
2. **The catalogue that a person maintains.** The award charts and the transfer bonuses
   come from the official pages.

The value is the work of each month, not the code. A ratio changes, a transfer bonus
opens and an award chart moves. The subscription pays for that work.

This model keeps the honesty of the product. Yume gives no advice that a commission pays.
Paragraph 8 gives the reason.

## 3. The three blocks of function

### 3.1 Goals and award charts

This block is the bridge of paragraph 1. It is the first block of the work.

The catalogue receives a new table. The shape follows `transfer_rule`: integers only, one
country, and the two fields of the version.

```
award(
  programId,            -- the programme that gives the award
  fromRegion, toRegion, -- the two regions of the route
  cabin,                -- 'economy' | 'premium' | 'business' | 'first'
  season,               -- 'peak' | 'off-peak' | 'all'
  miles,                -- an integer
  taxesCents,           -- the taxes and the charges, in cents
  validFrom, validTo    -- validTo is null for an active award
)
```

A new pure function in `src/shared/` reads the potential of a currency and one award. It
gives one of three states: the user reaches the award, the user misses a quantity of
points, or no route exists. The function is pure and it does no I/O.

The dashboard then shows a sentence with a value:

> Milano to New York, business. Iberia Club off-peak asks for 34 000 Avios. Your
> potential is 41 200 Avios. A transfer of 9 000 Membership Rewards points to Iberia Club
> reaches that award.

This block needs no external service. Therefore the self-hosted installation also holds
it, with the catalogue of the repository.

### 3.2 The transfer bonus

The current model of the data holds this function with no change of the schema. A bonus
of 25 per cent from Amex to Flying Blue until the 30 September **is** a `transfer_rule`
with `validFrom`, `validTo` and a different `ratioNum`. The potential then grows for the
time of the bonus, and the card of the currency shows a mark.

This block is the motor of a payment of each month. A person must read the official pages
and write each new rule. The user pays for that work.

The block also sends a message to the user. Paragraph 4.1 gives the service of the email.

### 3.3 The history

The table `balance_snapshot` already holds the data. Therefore a graph of the balance in
the time is a small quantity of work.

This block gives no reason for a payment. It is a function of the paid account, but it is
not the first block of the work.

Yume calculates no value in euros for one point. That calculation needs the price in cash
of a flight, and that price needs an external service with a cost. Yume can hold a value
of reference for each programme, in the catalogue, with the other data.

## 4. What the plan changes

The plan breaks four constraints of `docs/architecture.md`:

| Constraint of today | The plan |
|---|---|
| Cost zero. No external service. | A VPS, a service of email and a service of payment. |
| One container on a home server. | The data of other people needs a VPS, not a home server. |
| Registration only with an invitation. | The registration is open. The invitation can stay as a mark of trust. |
| The data of one small group. | Yume becomes the controller of the data of each user. |

SQLite stays. One node with SQLite is sufficient for some hundreds of users, and the
backup is one file. Paragraph 2.3 of `docs/architecture.md` keeps its reason. The tables
already hold `userId`, therefore the application needs no new model for more than one
user.

### 4.1 The email

The service is **useSend**. It is open source, and a person can install it on the same
machine. Its free account gives 3 000 messages in one month, but a maximum of 100
messages in one day.

That maximum of one day is the limit that decides. One message of a transfer bonus goes
to each user on the same day. Therefore the free account is sufficient until 100 paid
users. Above that quantity, Yume moves to the paid account or to its own installation.

useSend sends each message with Amazon SES. Thus an installation of useSend also needs an
account of AWS. SES costs about 0,10 dollars for 1 000 messages, but the account is a
second external service.

The self-hosted installation sends no message. The block 3.2 then shows the mark of the
bonus on the card, and it sends no email. A person who installs Yume alone needs no
account of AWS.

### 4.2 The payment

The owner holds a partita IVA. Therefore Stripe is the direct decision, and Yume needs no
merchant of record. A merchant of record costs more, and its advantage is the declaration
of the VAT of the European Union.

Yume keeps the model of the entitlement small:

- The table `user` receives two fields: the level of the account and the date of the end.
- A webhook of Stripe writes those two fields.
- A pure function in `src/shared/` reads the two fields and a date. It gives the state of
  the account.

Each surface then reads that function. The application holds no other rule of the
payment.

The threshold of 10 000 euros of the European Union applies to the sales to other
countries. Below that value, the seller applies the VAT of Italy. Ask the accountant
before the first sale: this document gives no advice of tax.

### 4.3 The data of other people

Today each user holds the data on the machine of that user. With the hosted instance,
Yume becomes the controller of that data. That change adds these obligations:

- A page of the privacy policy, with the list of the external services.
- A contract with the supplier of the machine and with each other supplier.
- A command that removes the account and each row of that user.
- A backup with a cypher, outside the machine of the application.

The data holds no number of a credit card. Stripe holds that data, and Yume holds the
identifier of the customer only. Therefore the obligations stay small.

## 5. The price

The competitor asks for 5,99 euros in one month for its middle account, and 12,99 euros
for its large account. Yume holds one paid account only. Two accounts to maintain give no
advantage to a project of one person.

| Account | Price | Function |
|---|---|---|
| Free | 0 | The balances and the potential miles: the application of today. |
| Paid | About 29 euros in one year | The goals, the transfer bonuses and the history. |

The price of one year is the first price. A payment of one year removes the work of the
churn, and it gives one commission of Stripe in the place of twelve.

The free account keeps each function of today with no limit. Yume charges for the new
work, and it takes nothing away from the user of today.

## 6. The numbers

This table gives the result with 30 paid accounts:

| Item | Value in one year |
|---|---|
| Income, 30 accounts at 29 euros | 870 euros |
| The VPS, at 5 euros in one month | −60 euros |
| The name of the domain | −15 euros |
| Stripe, about 1,5 per cent and 0,25 euros for each payment | −21 euros |
| useSend, the free account | 0 |
| **Result before the tax** | **About 774 euros** |

The partita IVA already exists. Therefore the plan adds no fixed cost of the
administration, and the first user gives a positive result. A project with no partita IVA
needs about 30 accounts only to pay that fixed cost.

The result is small. It matches the request: a hobby that earns a small quantity of
money.

## 7. The sequence of the work

Each step obeys the rule 4 of `CLAUDE.md`: a step that changes more than 3 files becomes
two steps. Each step obeys the rule 2: the test comes before the implementation.

1. **The award charts in the catalogue.** The types, the seed of a small set of awards,
   and the tests. The set holds Avios, Flying Blue and Miles&Smiles first.
2. **The function of the goal.** The pure function in `src/shared/`, with its tests.
3. **The surface of the goal.** The form of the destination and the card of the result.
4. **The transfer bonus.** The mark on the card. The rules of the bonus enter the
   catalogue.
5. **The hosted instance.** The VPS, the TLS, the backup and the page of the privacy
   policy.
6. **The open registration.** The registration with no invitation, and the free account.
7. **The payment.** Stripe, the webhook, the two fields and the pure function.
8. **The message of the bonus.** useSend and the message to each paid user.

The steps 1 to 4 need no external service. Therefore the team can build the value before
it takes one decision of cost.

## 8. The decisions that this plan refuses

**Yume shows no link of affiliation.** A commission on a credit card changes the answer
of the tool. Yume shows a warning in the place of an advertisement, and that behaviour is
the reason of the trust. Refer to paragraph 5 of the section Rules for the user interface
of `CLAUDE.md`.

**Yume reads no price in cash.** A price of a flight needs an external service with a
cost for each request. The value in euros of one point is thus outside this plan.

**Yume collects no data from a web site of a bank.** Paragraph 1 of
`docs/architecture.md` gives that decision, and this plan keeps it.

## 9. The questions that stay open

The team must answer these questions before the step 1:

1. **Which awards enter the catalogue first?** The work of the catalogue is large. A
   small set of routes from Italy is the first candidate.
2. **Does a goal hold a date?** The cost of an award changes with the season. A goal with
   no date shows the two values, peak and off-peak. A goal with a date shows one value,
   but the form then asks for more data.
3. **Does the invitation stay?** The registration becomes open, but the invitation can
   stay as a mark of trust or as a free month.
4. **Which regions does the award chart hold?** Each programme uses its own map of the
   regions. A common map is more simple, but it gives a value that is not correct.
