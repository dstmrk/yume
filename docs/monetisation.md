# Yume — The plan for a paid service

Status: **accepted**. Date: 2026-08-16. No code implements this plan now.

The owner accepted the decisions of paragraph 10. But the application of today holds none
of them. `docs/architecture.md` holds the decisions of the code that exists, and the team
writes each decision of this plan in that document at the step of that decision.
Paragraph 7 gives the steps.

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

### 3.1.4 No API gives this data

The team examined the sources of an award. No API is possible for a paid product:

| Source | Result |
|---|---|
| seats.aero | It holds the data of more than 20 programmes. Its terms refuse the commercial use of the API without a written agreement. |
| Amadeus, Duffel, Kiwi | They give the price in cash. They give no award. |
| ExpertFlyer | It gives the class of the reservation. It gives no quantity of miles. |
| The airlines | They publish no API of the awards. |

Yume is a paid product. Therefore the API of seats.aero needs a written agreement, and
Yume is a product of the same kind. This plan holds no such agreement.

### 3.1.5 The maintenance of the catalogue

The team examined two ways to remove the manual work. One way is bad and one way is good.

**A scraper of a chart is more work, not less.** A chart changes one time or two times in
one year. The page of that chart changes more often. Thus the team maintains one scraper
for each programme in the place of one table for each programme. A scraper that breaks
writes a value that is not correct, or it writes nothing and no person sees the error. The
user pays for a catalogue that is correct.

**A watcher of a page is small and it gives much.** A script reads some official pages one
time in one day. It calculates the hash of each page. The hash changes, and the script
sends a message to the owner. The owner then reads the page and writes the new value by
hand.

The assistant can write the pull request of that change. That request holds the new value,
the link of the official page and the difference of the catalogue. **But the owner
approves each request.** An assistant reads a table of an award and it can give a value
that is not correct. The user pays for a catalogue that is correct, and a transfer of
points is permanent. Paragraph 6.1 gives that division of the work.

The watcher holds no parser. Therefore the page can change its form, and the watcher
continues to operate. One request in one day also obeys the terms of each site.

The watcher gives the transfer bonus of the block 3.2 with no more work. The page of the
partners of Amex changes at the start of a bonus.

Yume thus automates the vigilance and it does not automate the value. A person writes each
number, and each number holds its link and its date.

**Yume reads no page of an airline with a program.** The pages of the availability of an
award refuse the automatic access, and Yume sells its answer. That risk is too large for
this project.

### 3.1.6 A range for a dynamic programme

A dynamic programme gives no quantity of miles. A range of two numbers is possible, but
only from data that a person observed.

The table follows the rule 3 of the section Rules for the data of `CLAUDE.md`: Yume keeps
an observation at a date, and it keeps no record of the changes.

```
award_observation(
  programId, fromAirport, toAirport, cabin,
  miles,        -- the quantity that the programme asked on that day
  observedAt,   -- the date of the observation
  source        -- the person or the page of the observation
)
```

A pure function reads those rows and one window of time. It gives the smallest value, the
middle value and the largest value. The table starts with no row, and it grows each month.

A paid user can write an observation. That user already searches those flights. Thus the
data grows with the quantity of the users, and no API gives that data. A group with an
invitation also knows each person who writes a row.

**A range gives no green state.** The state of a dynamic programme is `not determinable`.
It is never `reached`. A transfer of points is permanent: a user who reads 25 000, and
who then finds 60 000 only, loses those points. A range looks exact, therefore it is more
dangerous than the word `dynamic`.

Until the table holds a sufficient quantity of rows, the card shows the floor of an
official page. Flying Blue publishes its Promo Rewards each month, and that page gives a
floor for the routes of that promotion. The card then shows the value, the date and the
word `dynamic`.

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
| Registration only with an invitation. | The registration becomes open. |
| The data of one small group. | Yume becomes the controller of the data of each user. |

A subscription needs a quantity of users that an invitation cannot give. Paragraph 6
gives that quantity.

The invitation stays for one operation only: a user who invites a friend. Thus the
invitation becomes a mark of trust and it is no more a gate. Paragraph 4.2 of
`docs/architecture.md` gives the limit of two invitations, and the open registration
removes the effect of that limit on the growth.

SQLite stays. One node with SQLite is sufficient for some thousands of users, and the
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

A registered user is different from a paid user. That difference controls each number of
this paragraph. A tool of this kind moves 1 to 5 users of 100 to a paid account. This
plan uses 3 of 100. That value is a value of the market and not a measurement of Yume.

| Registered users | Paid accounts at 3 of 100 | Income in one year |
|---|---|---|
| 1 000 | About 30 | 870 euros |
| 3 000 | About 90 | 2 600 euros |
| 10 000 | About 300 | 8 700 euros |

The costs stay small at each of those three quantities. SQLite on one node holds them
all. Refer to paragraph 2.3 of `docs/architecture.md`.

| Item | Value in one year, with 90 paid accounts |
|---|---|
| Income, 90 accounts at 29 euros | 2 610 euros |
| The VPS, at 5 euros in one month | −60 euros |
| The name of the domain | −15 euros |
| Resend, above 100 messages in one day | −220 euros |
| Stripe, about 1,5 per cent and 0,25 euros for each payment | −62 euros |
| **Result before the tax** | **About 2 253 euros** |

The partita IVA already exists. Therefore the plan adds no fixed cost of the
administration, and the first paid account gives a positive result.

3 000 registered users need 18 months to 30 months of constant work. The result of the
first year is thus near to 870 euros, and not near to 2 600 euros. The plan gives a small
quantity of money at the year two or at the year three.

### 6.1 The acquisition of the users

The open registration removes a brake. It adds no motor. A registration with no user
gives each obligation of a paid service and no income. That state is the worst state of
the plan.

The channel of this market is the content: a guide of a programme, a route with a good
value, and an answer to the question of a person with 100 000 points. The competitor
holds a section Academy for that reason. That section is its motor of acquisition and it
is not an extra.

The content is manual work of each month. But the division of the work is good here, and
it is the contrary of the division of the catalogue:

| Item | Who writes it | Who decides | Reason |
|---|---|---|---|
| A number of the catalogue | The assistant, in a pull request with the link and the difference | **The owner** | An error costs the points of a user, and a transfer is permanent. |
| An article of the blog | The assistant, as a draft in Italian | **The owner** | An error costs one more reading. |

The rate of error of the assistant is the central problem of a number. It is a small
problem of a text. Therefore the assistant takes the work of a large volume and of a
small risk, and the owner keeps the work of a small volume and of a large risk.

Each draft must take the voice of the owner before its publication. Yume sells the
sentence "our numbers are exact". A text that reads as an automatic text removes that
position.

### 6.2 The time of each month

The plan asks for this quantity of time:

| Item | Time in one month |
|---|---|
| The pull requests of the catalogue | About 30 minutes |
| The correction of the drafts of the blog | 30 minutes to 60 minutes |
| The support of the users | 15 minutes, and more above 100 paid accounts |

The total is 1 hour to 2 hours in one month. It goes to 3 hours or 4 hours above 100 paid
accounts, and the income of that quantity pays for those hours.

The owner accepts that quantity. A project with less time than that quantity must take
the decision of paragraph 8.1 and ask for donations.

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
5. **The watcher of the official pages.** The hash of each page and the message to the
   owner. Paragraph 3.1.5 gives the rules. This step needs the step 13.
6. **The positions of the airports.** The table of the airports of the two lists, and the
   pure function of the distance.
7. **The charts of distance.** The programmes of Avios, with the bands of distance.
8. **The calendar of the seasons.** The table `award_season` and its pure function.
9. **The transfer bonus.** The mark on the card. The rules of the bonus enter the
   catalogue.
10. **The hosted instance.** The VPS, the TLS, the backup and the page of the privacy
    policy.
11. **The open registration.** The registration with no code. The invitation stays for a
    user who invites a friend. Paragraph 4 gives the rule.
12. **The payment.** Stripe, the webhook, the two fields and the pure function. The month
    of a goal then becomes a function of the paid account.
13. **The message of the bonus.** Resend and the message to each paid user.
14. **The content.** The first articles of the blog. Paragraph 6.1 gives the division of
    the work. This step then continues each month.
15. **The observations of an award.** The table `award_observation` and the pure function
    of the range. Paragraph 3.1.6 gives the rules.

The steps 1 to 4 and 6 to 9 need no external service. Therefore the team builds the value
before it takes one decision of cost. The step 5 needs the email of the step 13, thus the
owner can move the step 13 before the step 5.

The step 14 starts late in this list, but it is the step that decides the result.
Paragraph 6.1 gives the reason. The owner can start that step at any moment after the
step 4, because an article needs no payment and no open registration.

The step 2 comes before the step 7, because a region chart needs a smaller quantity of
data. But Avios is the first currency of a user of Amex Italia. Therefore the steps 6 and
7 must not wait for a long time.

The step 15 is the last step, because the table starts with no row. The value of that
table grows with the time and with the quantity of the users.

## 8. The decisions that this plan refuses

**Yume shows no link of affiliation.** A commission on a credit card changes the answer
of the tool. Yume shows a warning in the place of an advertisement, and that behaviour is
the reason of the trust. Refer to paragraph 5 of the section Rules for the user interface
of `CLAUDE.md`.

**Yume reads no price in cash.** A price of a flight needs an external service with a
cost for each request. The value in euros of one point is thus outside this plan.

**Yume collects no data from a web site of a bank.** Paragraph 1 of
`docs/architecture.md` gives that decision, and this plan keeps it.

**Yume collects no data from a web site of an airline.** Those pages refuse the automatic
access, and Yume sells its answer. Paragraph 3.1.5 gives the reason.

**Yume writes no scraper of a chart.** A chart changes less often than its page. Thus a
scraper is more work than a table, and it can write a value that is not correct.
Paragraph 3.1.5 gives the reason.

**Yume shows no range that a person did not observe.** A range from a blog or from an
opinion looks exact, and the user then makes a decision that is permanent. Paragraph
3.1.6 gives the rule.

### 8.1 The decision that the plan refused: the donations

The team examined the donations as the model. The result of that model is near to zero
euros. A group of some tens of persons gives 1 donor to 3 donors, and some tens of euros
in one year.

But the donations hold one large advantage: they give no obligation. A subscription is a
promise. A person who takes 29 euros and then stops the work of each month sells a thing
that person does not give.

Therefore the decision of the subscription needs the time of paragraph 6.2. The owner
gives that time. A project with less time than that quantity must take the donations, and
it must keep each function free.

This paragraph stays in the plan. A person who reads this document in one year can find
that the time is not sufficient. The donations are then the way back, and this paragraph
gives it.

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

The owner took these decisions on the 15 August 2026 and on the 16 August 2026:

1. **The awards start with Italy.** The routes from the Italian airports enter the
   catalogue first. Paragraph 3.1.3 gives the method of the source.
2. **The month of a goal is a function of the paid account.** The free account shows the
   two seasons. Paragraph 3.1.2 gives the rule.
3. **The catalogue can hold each zone,** but the zone belongs to one chart. Paragraph 9
   gives that risk.
4. **The registration becomes open.** An invitation cannot give the quantity of users of
   paragraph 6. The invitation stays for a user who invites a friend.
5. **The owner gives 1 hour to 2 hours in one month.** Paragraph 6.2 gives that time.
   Therefore the plan takes the subscription and not the donations. Paragraph 8.1 holds
   the way back.
6. **The assistant writes, and the owner approves.** That rule applies to a number of the
   catalogue and to an article of the blog. Paragraph 6.1 gives the reason.

### 10.1 The correction of a number of this plan

The first version of this document held an error. It gave the income of 300 users to 500
users as 5 000 euros to 10 000 euros in one year. That calculation read each registered
user as a paid user.

A registered user is different from a paid user. 300 paid accounts need about 10 000
registered users at 3 of 100. Paragraph 6 holds the correct calculation.

The error moved the result of the first year by about ten times. This paragraph keeps a
record of it, because the owner took the decision 5 on that number.
