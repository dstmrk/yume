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

The catalogue receives a new table. The shape follows `transfer_rule`: integers only, and
the two fields of the version.

```
award(
  programId,            -- the programme that gives the award
  fromZone, toZone,     -- the two zones of the route. Refer to 3.1.1
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

### 3.1.1 Three kinds of programme

A programme does not always publish an award chart. The catalogue holds three kinds, and
each kind needs a different quantity of data:

| Kind | Examples | The data of the chart |
|---|---|---|
| Region | Turkish Miles&Smiles, Emirates Skywards, Aegean Miles+Bonus | A table of pairs of regions. The programme publishes it. |
| Distance | The programmes of Avios | A table of bands of distance. It also needs the position of each airport. |
| Dynamic | Flying Blue, Delta SkyMiles, British Airways on its own flights | No chart. The price follows the demand of each day. |

**A dynamic programme holds no award in the catalogue.** Yume shows the state `dynamic`
and it shows no quantity of miles. A number of an example is a number that is not true,
and the user makes a decision on it.

This rule is the same rule of the potential miles: Yume shows a value that it can defend,
and it shows a warning in each other case. Refer to paragraph 8.

A chart of distance needs the distance of the route. Therefore the catalogue also needs
the position of each airport of the two lists. That table is a step of its own in
paragraph 7. The programmes of Avios use that kind, and Avios is the first currency of a
user of Amex Italia. Thus that step comes early.

### 3.1.2 The season and the month

A programme with a chart also publishes a calendar of the seasons. The catalogue holds
that calendar:

```
award_season(programId, fromDate, toDate, season, validFrom, validTo)
```

The month is then no second source of data. A pure function reads the calendar and one
date, and it gives the season of that date.

The two accounts show a different quantity of precision:

- The free account shows the two values, peak and off-peak.
- The paid account asks for a month. The calendar then gives the season, and the answer
  holds one value.

One month can hold the two seasons. The answer then gives the dates of the off-peak days.
It gives no mean value of the two seasons.

The free account thus shows a value that is true, but it is less exact. A paid function
that hides a correct value takes the trust of the user away.

### 3.1.3 The source of each award

The rule 5 of the section Rules for the data of `CLAUDE.md` applies to an award. Obey
these five rules:

1. Read the official page of the programme. A blog of miles is not a source.
2. Write the link of that page in a comment above the award, in the seed file.
3. Write the date of the examination.
4. Write no award for a dynamic programme.
5. Read each official page again before a release.

A blog of miles can show a route with a good value. Then read the official page of that
route and write the number from that page.

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
| The data of one small group. | Yume becomes the controller of the data of each user. |

The registration with an invitation stays. The owner wants a group that grows slowly.
Therefore Yume needs no open registration, and a paid account also comes with an
invitation.

The limit of two invitations for each user is now the limit of the growth. Paragraph 4.2
of `docs/architecture.md` gives that limit. The owner can need a quantity of invitations
that is not limited, for the growth of the group. This plan makes no change of that
limit: the owner takes that decision at the moment of the need.

SQLite stays. One node with SQLite is sufficient for some hundreds of users, and the
backup is one file. Paragraph 2.3 of `docs/architecture.md` keeps its reason. The tables
already hold `userId`, therefore the application needs no new model for more than one
user.

### 4.1 The email

The service is **Resend**. The two candidates give the same free account: 3 000 messages
in one month, a maximum of 100 messages in one day, and one domain.

| Item | Resend | useSend |
|---|---|---|
| Free account | 3 000 in one month, 100 in one day | 3 000 in one month, 100 in one day |
| First paid account | 20 dollars in one month | 10 dollars in one month |
| Installation of your own | No | Yes, but it needs Amazon SES |

The free accounts are equal, therefore the price decides nothing now. The advantage of
useSend is the installation of your own, and that advantage arrives above 100 users. A
group that grows with an invitation reaches that quantity slowly.

That installation is also not simple. useSend sends each message with Amazon SES, thus it
needs an account of AWS, one more container and one more database. Resend needs one key.

Therefore Resend is the decision. The server holds **one module for the email**, and that
module holds the name of the service. Thus a change of the service touches one file.

The maximum of 100 messages in one day is the limit that decides the next step. One
message of a transfer bonus goes to each user on the same day. Above 100 paid users, Yume
moves to a paid account.

The self-hosted installation sends no message. The block 3.2 then shows the mark of the
bonus on the card, and it sends no email. Thus a person who installs Yume alone needs no
account of Resend.

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
| Free | 0 | The balances, the potential miles and a goal with the two seasons. |
| Paid | About 29 euros in one year | The month of a goal, the transfer bonuses and the history. |

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
| Resend, the free account | 0 |
| **Result before the tax** | **About 774 euros** |

The partita IVA already exists. Therefore the plan adds no fixed cost of the
administration, and the first user gives a positive result. A project with no partita IVA
needs about 30 accounts only to pay that fixed cost.

The result is small. It matches the request: a hobby that earns a small quantity of
money.

## 7. The sequence of the work

Each step obeys the rule 4 of `CLAUDE.md`: a step that changes more than 3 files becomes
two steps. Each step obeys the rule 2: the test comes before the implementation.

1. **The types of the award.** The types of the chart, of the zone and of the season, with
   the kind of each programme. No award enters the catalogue in this step.
2. **The first region chart.** Turkish Miles&Smiles, from the official page, with the
   tests of the seed. A region chart needs no position of an airport.
3. **The function of the goal.** The pure function in `src/shared/`, with its tests. It
   reads the potential of a currency and one award.
4. **The surface of the goal.** The form of the route and the card of the result. The
   card shows the state `dynamic` for a programme with no chart.
5. **The positions of the airports.** The table of the airports of the two lists, and the
   pure function of the distance.
6. **The charts of distance.** The programmes of Avios, with the bands of distance.
7. **The calendar of the seasons.** The table `award_season` and its pure function.
8. **The transfer bonus.** The mark on the card. The rules of the bonus enter the
   catalogue.
9. **The hosted instance.** The VPS, the TLS, the backup and the page of the privacy
   policy.
10. **The payment.** Stripe, the webhook, the two fields and the pure function. The month
    of a goal then becomes a function of the paid account.
11. **The message of the bonus.** Resend and the message to each paid user.

The steps 1 to 8 need no external service. Therefore the team builds the value before it
takes one decision of cost.

The step 2 comes before the step 6, because a region chart needs a smaller quantity of
data. But Avios is the first currency of a user of Amex Italia. Therefore the steps 5 and
6 must not wait for a long time.

## 8. The decisions that this plan refuses

**Yume shows no link of affiliation.** A commission on a credit card changes the answer
of the tool. Yume shows a warning in the place of an advertisement, and that behaviour is
the reason of the trust. Refer to paragraph 5 of the section Rules for the user interface
of `CLAUDE.md`.

**Yume reads no price in cash.** A price of a flight needs an external service with a
cost for each request. The value in euros of one point is thus outside this plan.

**Yume collects no data from a web site of a bank.** Paragraph 1 of
`docs/architecture.md` gives that decision, and this plan keeps it.

## 9. The risk of the zones

Each programme uses its own map of the zones. Turkish Miles&Smiles and Emirates Skywards
give a different name and a different limit to the zone of Europe. A programme of
distance uses no zone of a map: it uses a band of distance.

**Therefore a zone belongs to the chart of one programme. A zone of the application does
not exist.** A common map of the zones is more simple, and it gives a value that is not
correct.

This risk is the risk of the paragraph 3.1 of `docs/architecture.md`, one level above. A
currency is different from a programme, and a zone of a programme is different from a
zone of an other programme. The two errors give a number that looks correct.

The catalogue holds each zone with the identifier of its chart. A route of a user holds
two airports, and each chart gives its own zone to an airport. Thus one route gives a
different pair of zones for each programme.

## 10. The decisions of this plan

The owner took these four decisions on the 15 August 2026:

1. **The awards start with Italy.** The routes from the Italian airports enter the
   catalogue first. Paragraph 3.1.3 gives the method of the source.
2. **The month of a goal is a function of the paid account.** The free account shows the
   two seasons. Paragraph 3.1.2 gives the rule.
3. **The registration keeps the invitation.** The group grows slowly. Paragraph 4 gives
   the limit of two invitations.
4. **The catalogue can hold each zone,** but the zone belongs to one chart. Paragraph 9
   gives that risk.
