---
name: seo-content
description: Use this skill for the public pages that a search engine or an assistant reads. Use it for the pages of the catalogue (src/client/CurrencyPage.tsx, SourcePage.tsx, CurrenciesPage.tsx), the calculator (CalculatorPage.tsx), the guides (GuidePage.tsx and guides.items in src/client/i18n/it.ts), the public page HomePage.tsx and the frame PublicPage.tsx. Use it for src/client/lib/catalogue.ts, content.ts, pages.ts, jsonLd.ts, llms.ts, head.ts and src/client/prerender.tsx. Use it for sitemap.xml, robots.txt, llms.txt, llms-full.txt, the structured data of schema.org, the meta robots max-snippet, metaTitle, the canonical address and the breadcrumb. Use it when you add a guide, add a page, change a title or a description, change the text of a question, or examine why an assistant does not cite the site. Use it also after a change of a transfer rule, because the pages read the seed.
---

# seo-content — the public pages for the search engines and the assistants

This skill gives the method. Paragraphs 5.5.3 and 5.5.5 to 5.5.7 of
`docs/architecture.md` give the decisions.

Yume has no budget for advertisements. Two channels bring a person: the organic results
of a search engine and the answers of an assistant. Each rule below serves those two
channels.

## 1. Write no value of the catalogue in a text

A ratio, a minimum, a step or a quantity of programmes comes from
`src/server/db/seed/catalogue.ts`. A function of the dictionary receives the value from
the page. Do not write `5 : 4` or `17 programmi` in `i18n/it.ts`.

The public page holds some quantities in its text. `src/client/i18n/it.test.ts` compares
them with the seed. Add a test of the same kind when a new text holds a quantity.

A guide holds no ratio. An example with numbers says that the numbers are an example:
"Un esempio con numeri inventati".

## 2. Write no fact that you cannot examine

The session cannot read the official pages of the programmes. Thus do not write a
procedure of a programme, a time of the credit, a fee or a promotion. Write only facts of
the catalogue and of the calculation. If a guide needs such a fact, ask the user for the
value and for the official page.

Do not promise a function that Yume does not have. Write a future function in the
conditional, or do not write it.

## 3. The answer comes first

An assistant cites the paragraph that answers, not the paragraph that introduces. Obey
these rules for each page and each section:

1. The first two sentences give the answer. The context comes after.
2. A block that an assistant can cite stays true when it stands alone. Do not start a
   paragraph with "Questo" or with a word that needs the paragraph above.
3. The first part of the page holds the best answer. Do not put it after the
   explanation.
4. Each answer of a question opens with the fact: "Sì", "No", a number.
5. A fact with a number is easier to cite than a fact with no number.

## 4. Titles and descriptions

- The `h1` is the question of the person, not the name of the application.
- The title of the head holds 60 characters or fewer. `content.test.ts` examines each
  title of a page of the catalogue. Examine a new title of a guide by hand.
- The title holds the words that a person writes in the search engine, and it gives the
  start of the answer.
- Two pages do not compete for one query. A guide and a page of the catalogue on the same
  subject have different titles and they link each other.

## 5. The questions of a page

Each page with content holds two questions or more. Google removed the rich results of
`FAQPage` on 7 May 2026, thus the value is in the text, not in the markup. The structured
data stays: it does no harm, and other readers use it. Do not add a question to obtain a
rich result. Each question of the structured data must be on the page:
`lib/content.ts` gives the two from one function.

## 6. Freshness without a false date

A page of the catalogue gives the latest `validFrom` of its rules. A guide gives
`modified`. Move `modified` only when the text changes. A review that changes nothing
keeps the date. Google names a date that moves with no change as a sign of content with
no help.

Review the guides each quarter, and immediately after a change of a rule that a guide
describes. The pages of the catalogue follow the seed with no work.

## 7. A new page must hold its own value

The pages of the catalogue come from one template. Google calls a page that changes only
a name a doorway page. Before you add a kind of page, ask: does this page deserve to
exist with no sister page? A currency with no route gets no page for this reason. The
list `/miglia` names it.

Before you add a page, ask the user. Rule 9 of `CLAUDE.md` applies.

## 8. Add a page

1. Add the text to `i18n/it.ts`.
2. Add the route to `router.tsx`. A path with no parameter goes also in `CLIENT_PATHS`
   and in the list `PUBLIC` of `src/shared/routes.test.ts`.
3. Add the page to `PAGES` of `prerender.tsx`, with its structured data.
4. Add the path to `publicPaths` of `lib/pages.ts`. The sitemap and the links of
   `llms.txt` then hold it.
5. Link the page from the public page or from a page that links it already.
6. Run `npm run build`, then read the file in `dist/`. Examine the title, the canonical
   address, the robots tag and each script `application/ld+json`.

## 9. Examine the instance, not the repository

A proxy in front of the instance can block the crawlers of the assistants with no error.
Cloudflare can also add its own block to `robots.txt`. Read what the instance gives:

```bash
curl -sS https://yumemiles.com/robots.txt
curl -sS -o /dev/null -w '%{http_code}\n' \
  -A 'ClaudeBot/1.0 (+https://www.anthropic.com/claude-bot)' \
  https://yumemiles.com/miglia/avios
curl -sS -o /dev/null -w '%{http_code}\n' \
  -A 'Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)' \
  https://yumemiles.com/miglia/avios
```

The two answers must be `200`. Do not activate AI Labyrinth of Cloudflare on this
domain: it gives false pages to the crawlers that the site needs.

Keep these differences in mind:

- `OAI-SearchBot` gives the citations of ChatGPT search. `GPTBot` is for the training.
- `Google-Extended` controls Gemini, not AI Overviews and not AI Mode. Those two read
  what Googlebot reads.
- Google Search ignores `llms.txt`. The file costs nothing, thus it stays. Do not count
  it as a method to receive citations.
- No meta tag "AI" exists. The directives of the snippet, `max-snippet` and `nosnippet`,
  control the text that the answers of AI of Google cite. `lib/head.ts` writes
  `max-snippet:-1` on each page with content.

## 10. After the merge

The person who owns the domain does these operations. A session cannot do them:

- Send `https://yumemiles.com/sitemap.xml` to Google Search Console and to Bing
  Webmaster Tools. ChatGPT search and Copilot read the index of Bing.
- Read the queries and the pages of Search Console after four weeks. Change a title only
  after you read the query and the page together.
