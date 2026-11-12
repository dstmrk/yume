# The submission to the directory of OpenAI

This document gives the data for the portal of OpenAI. ChatGPT and Codex share that
directory. Paragraph 4.7.4 of `docs/architecture.md` gives the decisions. This document
gives the values of the form.

The status of each item is on the day of this document, 2026-11-12. No item is submitted.
No review occurred. No recording exists. Section 8 separates the work that is complete
from the steps that need a person.

## 1. The configuration of the MCP server

| Field | Value |
|---|---|
| Endpoint | `https://yumemiles.com/mcp` |
| Configuration | Universal URL: one URL for each user |
| Transport | Streamable HTTP, with JSON answers and no session of MCP |
| Authentication | OAuth 2.1, with PKCE `S256` |
| Registration of the client | Client ID Metadata Document (CIMD). Dynamic Client Registration is off. |
| Authentication at the token endpoint | `none` or `private_key_jwt` |
| Scope of each tool | `balances` |
| Refresh token | The scope `offline_access`. It is not a permission of a tool. |
| Metadata of the resource | `https://yumemiles.com/.well-known/oauth-protected-resource/mcp` |
| Metadata of the authorisation server | `https://yumemiles.com/.well-known/oauth-authorization-server/api/auth` |

Do not change the endpoint. The directory of Anthropic reads the same URL.

### 1.1 The access to the MCP server

This section gives the product at the launch. Paragraphs 4.6 and 4.6.1 of
`docs/architecture.md` give the decisions.

| Level | Source | MCP server |
|---|---|---|
| Free account | Each registered user | Not available |
| Supporter account | An annual subscription of 9,99 euros, with an automatic renewal | Available |
| Unlimited account | The administrator gives it by hand on `/admin`. No person can buy it. | Available |

- The free account keeps Amex, Revolut and 2 airline programmes. The other sources of
  the catalogue, today Klarna, the expiry lots and the MCP server need a supporter
  account or an unlimited account.
- The person buys the supporter account outside ChatGPT and Codex. The dashboard of
  `yumemiles.com` opens Stripe Checkout. The customer portal of Stripe gives the change
  of the card, the invoices and the end of the renewal.
- ChatGPT and Codex give no purchase, no checkout and no upgrade. No tool, no
  description and no error gives a price, a plan, a URL of a payment or a request to buy.
- The MCP server needs an existing supporter account or an unlimited account. For a free
  account, each tool gives an error with `isError: true` and this text: "The MCP server
  of Yume needs a supporter account. This account is a free account."

On 2026-11-12 the official instance has no active payment and no active
`FREE_ACCOUNT_LIMITS`. Thus each registered user can use each function today. That state
is temporary. This document gives the product of the launch, not that state.

## 2. The justification of each hint

The portal asks for a reason for each value. The server holds no reason in the
annotations: the object of the annotations holds the standard fields only.

### `list_accounts`

| Hint | Value | Reason |
|---|---|---|
| `readOnlyHint` | `true` | The tool reads the accounts and the most recent balance of the user. It writes nothing. |
| `openWorldHint` | `false` | The tool reads the database of Yume only, for the user of the token. It reads no public system and no web page. |
| `destructiveHint` | `false` | The tool changes no data. |

### `get_potential`

| Hint | Value | Reason |
|---|---|---|
| `readOnlyHint` | `true` | The tool calculates the potential miles from the balances and the transfer rules. It writes nothing and it moves no point. |
| `openWorldHint` | `false` | The tool reads the database of Yume only. The transfer rules are a catalogue in that database, not a request to a programme. |
| `destructiveHint` | `false` | The tool changes no data. |

### `get_catalogue`

| Hint | Value | Reason |
|---|---|---|
| `readOnlyHint` | `true` | The tool reads the currencies, the programmes and the transfer rules that apply today. It writes nothing. |
| `openWorldHint` | `false` | The catalogue is a fixed table of Yume. The tool sends no request to an airline or to a bank. |
| `destructiveHint` | `false` | The tool changes no data. |

### `add_snapshot`

| Hint | Value | Reason |
|---|---|---|
| `readOnlyHint` | `false` | The tool writes a new balance in an account of the user. |
| `openWorldHint` | `false` | The tool writes in the database of Yume only, in an account of the user of the token. It writes to no third party and it moves no point. |
| `destructiveHint` | `true` | The tool removes no record: each earlier balance stays. But the new balance becomes the current balance, and the potential miles change with it. A person decides a transfer of points from that value, and a transfer is permanent. Thus the client must ask the person before each write. The directory of Anthropic also asks for this hint on each tool that changes data, and the two directories read one server. |

## 3. The account of the reviewers

Paragraph 4.1.1 of `docs/architecture.md` gives the account. It signs in with an email
address and a password. It needs no Google account, no MFA, no SMS, no verification of
the email and no private network.

Use a different address for OpenAI and for Anthropic. Then a new password for one
directory stops no session of the other directory.

Do these steps on the official instance:

1. Run the script in the container:

   ```
   docker compose exec yume node --experimental-strip-types src/server/db/reviewer-run.ts <address>
   ```

2. Copy the password that the script shows. The script shows it one time.
3. Sign in as the administrator and open `/admin`.
4. Give the unlimited account to the address of step 1: write the address in the field
   of the search, then turn on the switch in the column "Unlimited".
5. Examine the level: the column "Piano" of that row must show "Unlimited". Do this
   step before each test of the MCP server. Without the unlimited account, each tool
   gives the error of section 1.1 after the activation of the limits.
6. Sign in with the address and the password of step 1. Use the link under the button of
   Google on `/login`.
7. On the dashboard, add these four accounts with these balances:

   | Programme | Balance | Date |
   |---|---|---|
   | Amex | 120.000 | 2026-11-10 |
   | Revolut | 30.000 | 2026-11-10 |
   | Iberia | 15.000 | 2026-11-10 |
   | Flying Blue | 8.000 | 2026-11-10 |

8. Write the address and the password in the form of the portal only.

Do not write the address or the password in the repository, in a pull request or in a
public page. The script writes no account of a person: it refuses the address of a user
of Google.

Before each new review, run the script again. Then remove the balances that the earlier
reviewer added on the dashboard, and add the balances of step 7 again.

## 4. The test cases

The portal asks for five positive cases and three negative cases. Each case uses the
unlimited account of section 3. The values of the results come from `potentialOf` of `src/server/operations.ts` with the catalogue of
2026-11-12 and the balances of step 7. The calculation of 2026-11-12 gives the values of
this section. A new rule of the catalogue changes them:
calculate them again before the submission.

### Positive case 1: the balances

- **Prompt:** "What are my loyalty balances in Yume?"
- **Tools:** `list_accounts`, with no argument.
- **Result:** four accounts. Each account has `accountId`, `programId`, `programName`,
  `currencyId`, `points`, `observedAt` and `lots`. The balances are Amex 120000, Revolut
  30000, Iberia 15000 and Flying Blue 8000, each at 2026-11-10, with an empty `lots`.
- **Fixture:** step 7 of section 3.

### Positive case 2: the potential miles

- **Prompt:** "How many potential miles do I have in each airline currency?"
- **Tools:** `get_potential`, with no argument.
- **Result:** one entry for each airline currency, with `current`, `fromTransfers`,
  `total` and `routes`, and the field `notice`. The result holds no sum of the
  currencies. These are the currencies with a total above 0:

  | Currency | Current | From transfers | Total |
  |---|---|---|---|
  | `avios` | 15000 | 126000 | 141000 |
  | `eurobonus` | 0 | 126000 | 126000 |
  | `flying-blue` | 8000 | 110000 | 118000 |
  | `asia-miles` | 0 | 96000 | 96000 |
  | `krisflyer` | 0 | 95000 | 95000 |
  | `skymiles` | 0 | 80000 | 80000 |
  | `skywards` | 0 | 63000 | 63000 |

  Seven other currencies have a total of 30000, from Revolut only: `etihad-guest`,
  `lifemiles`, `miles-and-bonus`, `miles-and-go`, `miles-and-smiles`, `saga-points` and
  `sky-pearl`.
- **Behaviour:** the assistant shows a value for each currency, and it says that the
  value is a calculation and that a transfer is permanent. That text is the field
  `notice`.
- **Fixture:** step 7 of section 3.

### Positive case 3: the catalogue

- **Prompt:** "Which programmes can transfer points to Iberia Avios in Yume, and at which
  ratio?"
- **Tools:** `get_catalogue`, with no argument.
- **Result:** the field `country` is `IT`. The rules with `toProgramId` equal to
  `iberia-club` are these three:

  | From | Ratio | Minimum | Step |
  |---|---|---|---|
  | `amex-mr` | 4 for 5 | 500 | 500 |
  | `revolut` | 1 for 1 | 1 | 1 |
  | `klarna` | 8002 for 10000 | 100 | 100 |

- **Fixture:** none. The catalogue is the same for each user.

### Positive case 4: a new balance

- **Prompt:** "Set my Iberia balance in Yume to 16,500 Avios as of today."
- **Tools:** `list_accounts`, then `add_snapshot` with these values:
  - `accountId`: the id of the account with `programId` equal to `iberia-club`.
  - `points`: `16500`.
  - `observedAt`: the date of the day, in the format `YYYY-MM-DD`.
- **Behaviour:** the client asks the person before the write, because of
  `destructiveHint: true`.
- **Result:** `snapshotId`, `accountId`, `points` 16500, `observedAt` and an empty
  `lots`. The dashboard then shows 16.500 for Iberia.
- **Fixture:** step 7 of section 3.

### Positive case 5: a new balance and the potential miles

- **Prompt:** "My Flying Blue account now shows 9,200 miles. Update Yume and tell me my
  new potential Flying Blue miles."
- **Tools:** `list_accounts`, then `add_snapshot` with the id of the account with
  `programId` equal to `flying-blue`, `points` 9200 and the date of the day. Then
  `get_potential`.
- **Result:** the entry `flying-blue` of `get_potential` has `current` 9200,
  `fromTransfers` 110000 and `total` 119200.
- **Fixture:** step 7 of section 3, with no change of case 4 to Flying Blue.

### Negative case 1: a transfer of points

- **Prompt:** "Transfer 50,000 of my Amex points to Flying Blue."
- **Expected behaviour:** the assistant says that Yume cannot transfer points, and that
  the person must do the transfer at the programme. The assistant calls no tool that
  writes, and it does not say that a transfer occurred. It can call `get_potential` to
  show the result of such a transfer.
- **Reason:** no tool moves points. Paragraph 4.7.3 of `docs/architecture.md`.

### Negative case 2: a removal

- **Prompt:** "Delete my Revolut account and all its old balances from Yume."
- **Expected behaviour:** the assistant says that it cannot remove an account or a
  balance, and that the person can do it on the dashboard of Yume. It calls no tool that
  writes, and it does not say that a removal occurred.
- **Reason:** the server gives no tool that removes data. Paragraph 4.7.3.

### Negative case 3: an unknown account id

- **Prompt:** "Add 10,000 points to the Yume account with id
  00000000-0000-0000-0000-000000000000."
- **Expected behaviour:** if the assistant calls `add_snapshot`, the tool gives an error
  with `isError: true` and this text: "No account of the user has the id
  00000000-0000-0000-0000-000000000000. list_accounts gives the ids of the accounts."
  The server writes nothing. The assistant does not say that the balance changed.
- **Reason:** no account has that id. This case proves the refusal of an unknown id
  only. It does not prove the isolation of the accounts: the reviewer knows no id of an
  account of an other user.
- **The isolation of the accounts:** each tool reads the user from the token.
  `recordSnapshot` of `src/server/operations.ts` examines the account first, thus an
  account of an other user gives the same error as an unknown id. Two tests of
  `src/server/mcp.test.ts` hold a second user: "gives no account of an other user" and
  "refuses an account of an other user and writes nothing".

## 5. The starter prompts

Each prompt has a maximum of 128 characters.

1. "How many potential Avios can I get from my Yume balances?"
2. "Update my Amex balance in Yume from this screenshot."
3. "Which of my programmes can transfer points to Flying Blue, and at which ratio?"

## 6. The script of the recording

The portal asks for a URL of a video. A reviewer must be able to open it. Record the
video with the account of section 3 in ChatGPT:

1. Show the dashboard of Yume with the four balances of step 7.
2. In ChatGPT, add the app with the URL of section 1.
3. Show the page `/login` of Yume, the sign-in with the password and the page `/consent`.
   Show the host of the redirect on that page.
4. Ask the prompt of positive case 1. Show the four balances.
5. Ask the prompt of positive case 2. Show the value of each currency and the notice.
6. Ask the prompt of positive case 4. Show the question of ChatGPT before the write.
7. Show the new balance on the dashboard of Yume.
8. On the dashboard, open "Assistenti collegati" and revoke ChatGPT. Ask a new question,
   and show that ChatGPT asks for a new sign-in.

## 7. The listing

| Field | Value | Status on 2026-11-12 |
|---|---|---|
| Name | YumeMiles | |
| Category | Travel | |
| Website | `https://yumemiles.com` | Status 200 |
| MCP endpoint | `https://yumemiles.com/mcp` | Status 401 with no token, as expected |
| Privacy policy | `https://yumemiles.com/privacy` | Status 200 |
| Terms of service | `https://yumemiles.com/tos` | Status 200 |
| Support | `https://yumemiles.com/support` | Status 200. The address of the contact is not in the HTML: refer to section 9. |
| Connector documentation | `https://yumemiles.com/connector` | Status 200 |
| Verification of the domain | `https://yumemiles.com/.well-known/openai-apps-challenge` | Status 404 `text/plain`: `OPENAI_APPS_CHALLENGE_TOKEN` has no value. With a value, the route gives the exact token as plain text, with no space around it. |
| Product availability | A free account, and an optional supporter account for 9,99 euros each year. The person buys and manages it outside ChatGPT and Codex, from `yumemiles.com` with Stripe Checkout and the customer portal of Stripe. | |
| Access to the MCP server | An existing supporter account or an unlimited account. The administrator gives the unlimited account: it is not a plan. | |
| Payments or purchases | None in ChatGPT and in Codex | |
| Icon | `src/client/public/icon.svg` | |

The publisher in `/tos` and `/privacy` is the owner of the instance. The identity in the
portal must be the identity of the account of the developer at OpenAI. The author must
confirm that the two identities agree.

## 8. The work and the manual steps

### 8.1 The work that is complete

- The release v0.7.0 holds the page `/support`, the route of the verification, the
  hints, `_meta.securitySchemes` and the output schemas of the tools.
- The tests of the repository examine the challenge of the domain, the hints, the
  schemes, the output schemas, the error of a free account and the isolation of the
  accounts.
- The production URLs of section 7 give the status of that table on 2026-11-12.

### 8.2 The steps that need a person

No session of the harness can do these steps.

1. In the dashboard of Cloudflare, turn off Email Address Obfuscation for
   `yumemiles.com`. Then examine the raw HTML of `/support`, `/privacy` and `/tos` with
   `curl`: it must hold `privacy@yumemiles.com` and no `/cdn-cgi/l/email-protection`.
2. Make the account of section 3.
3. In the portal, start the submission. Copy the token of the verification.
4. Write the token in `OPENAI_APPS_CHALLENGE_TOKEN` in `.env`. Then run
   `docker compose up -d` again.
5. Open `https://yumemiles.com/.well-known/openai-apps-challenge`. The page must show the
   token only.
6. If Cloudflare Access protects the instance, let the requests of OpenAI pass on the
   paths of paragraph 4.7.2 and on the path of step 5.
7. Connect ChatGPT and Codex to the server with the account of section 3. Call each tool
   one time.
8. Record the video of section 6.
9. Write the data of sections 1, 2, 4, 5 and 7 in the portal. Then submit.
10. Activate the payment and `FREE_ACCOUNT_LIMITS` on the official instance before the
    publication of the listing. Without the payment, the listing names an MCP server for
    supporters, and no person can become a supporter. The review can start before this
    step: the unlimited account gives the same result with and without the limits.

## 9. The open items

- **The privacy policy.** Section 4-bis of `/privacy` names OpenAI as the provider of
  ChatGPT and Codex, with the address `openai.com/policies/privacy-policy`. The session
  cannot read that page: the server gives the status 403. A person must read it. A
  professional must also confirm the role of OpenAI and the transfers out of the EU.
- **The terms of the service.** Section 7-bis of `/tos` gives the supporter account
  and its price. A professional must read it before the launch: paragraph 4.6.1.
- **The supporter account.** The directory of OpenAI refuses a text that promotes an
  upgrade. The error of a free account names the supporter account, with no price and
  no URL. Do not add a URL of a payment to that error.
- **The address of the contact.** On 2026-11-12, Cloudflare Email Address Obfuscation
  changes `privacy@yumemiles.com` on `/support`, `/privacy` and `/tos` into a link to
  `/cdn-cgi/l/email-protection`. Only JavaScript reads it. A browser shows the address,
  but a client with no JavaScript reads a support page with no contact. Step 1 of section
  8.2 removes the defect. The defect is open until a person examines the raw HTML.
- **The text of the sale.** On 2026-11-12 the tools, their descriptions and their
  errors hold no price, no plan, no URL of a payment and no request to buy. The two
  errors name the supporter account only. Keep that rule with each change of a tool.
- **The addresses of the servers of OpenAI.** Paragraph 4.7.2 gives the range of
  Anthropic. Read the range of OpenAI in its documentation before step 6 of section 8.2.
