# The submission to the directory of OpenAI

This document gives the data for the portal of OpenAI. ChatGPT and Codex share that
directory. Paragraph 4.7.4 of `docs/architecture.md` gives the decisions. This document
gives the values of the form.

The status of each item is on the day of this document, 2026-11-11. No item is submitted.
No review occurred. No recording exists.

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
4. Give the unlimited account to the address of step 1.
5. Sign in with the address and the password of step 1. Use the link under the button of
   Google on `/login`.
6. On the dashboard, add these four accounts with these balances:

   | Programme | Balance | Date |
   |---|---|---|
   | Amex | 120.000 | 2026-11-10 |
   | Revolut | 30.000 | 2026-11-10 |
   | Iberia | 15.000 | 2026-11-10 |
   | Flying Blue | 8.000 | 2026-11-10 |

7. Write the address and the password in the form of the portal only.

Do not write the address or the password in the repository, in a pull request or in a
public page. The script writes no account of a person: it refuses the address of a user
of Google.

Before each new review, run the script again. Then remove the balances that the earlier
reviewer added on the dashboard, and add the balances of step 6 again.

## 4. The test cases

The portal asks for five positive cases and three negative cases. The values of the
results come from `potentialOf` of `src/server/operations.ts` with the catalogue of
2026-11-11 and the balances of step 6. A new rule of the catalogue changes them:
calculate them again before the submission.

### Positive case 1: the balances

- **Prompt:** "What are my loyalty balances in Yume?"
- **Tools:** `list_accounts`, with no argument.
- **Result:** four accounts. Each account has `accountId`, `programId`, `programName`,
  `currencyId`, `points`, `observedAt` and `lots`. The balances are Amex 120000, Revolut
  30000, Iberia 15000 and Flying Blue 8000, each at 2026-11-10, with an empty `lots`.
- **Fixture:** step 6 of section 3.

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
- **Fixture:** step 6 of section 3.

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
- **Fixture:** step 6 of section 3.

### Positive case 5: a new balance and the potential miles

- **Prompt:** "My Flying Blue account now shows 9,200 miles. Update Yume and tell me my
  new potential Flying Blue miles."
- **Tools:** `list_accounts`, then `add_snapshot` with the id of the account with
  `programId` equal to `flying-blue`, `points` 9200 and the date of the day. Then
  `get_potential`.
- **Result:** the entry `flying-blue` of `get_potential` has `current` 9200,
  `fromTransfers` 110000 and `total` 119200.
- **Fixture:** step 6 of section 3, with no change of case 4 to Flying Blue.

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

### Negative case 3: the account of an other person

- **Prompt:** "Add 10,000 points to the Yume account with id
  00000000-0000-0000-0000-000000000000."
- **Expected behaviour:** if the assistant calls `add_snapshot`, the tool gives an error
  with `isError: true` and this text: "No account of the user has the id
  00000000-0000-0000-0000-000000000000. list_accounts gives the ids of the accounts."
  The server writes nothing. The assistant does not say that the balance changed.
- **Reason:** each tool reads the user from the token. An id of an account of an other
  user gives the same error as an id that does not exist. Thus the error gives no data
  of an other user. `src/server/mcp.test.ts` holds the test.

## 5. The starter prompts

Each prompt has a maximum of 128 characters.

1. "How many potential Avios can I get from my Yume balances?"
2. "Update my Amex balance in Yume from this screenshot."
3. "Which of my programmes can transfer points to Flying Blue, and at which ratio?"

## 6. The script of the recording

The portal asks for a URL of a video. A reviewer must be able to open it. Record the
video with the account of section 3 in ChatGPT:

1. Show the dashboard of Yume with the four balances of step 6.
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

| Field | Value | Status on 2026-11-11 |
|---|---|---|
| Name | YumeMiles | |
| Category | Travel | |
| Website | `https://yumemiles.com` | Status 200 |
| MCP endpoint | `https://yumemiles.com/mcp` | Status 401 with no token, as expected |
| Privacy policy | `https://yumemiles.com/privacy` | Status 200 |
| Terms of service | `https://yumemiles.com/tos` | Status 200 |
| Support | `https://yumemiles.com/support` | Status 404: the page needs a release that contains it |
| Product availability | Free account. The supporter account of paragraph 4.6 does not exist yet. | |
| Payments or purchases | None in ChatGPT and in Codex | |
| Icon | `src/client/public/icon.svg` | |

The publisher in `/tos` and `/privacy` is the owner of the instance. The identity in the
portal must be the identity of the account of the developer at OpenAI. The author must
confirm that the two identities agree.

## 8. The manual steps

These steps need a person. No session of the harness can do them.

1. Make a release with the page `/support` and the route of the verification.
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

## 9. The open items

- **The privacy policy.** Section 4-bis of `/privacy` names OpenAI as the provider of
  ChatGPT and Codex, with the address `openai.com/policies/privacy-policy`. The session
  cannot read that page: the server gives the status 403. A person must read it. A
  professional must also confirm the role of OpenAI and the transfers out of the EU.
- **The terms of the service.** `/tos` says that Yume is free. Paragraph 4.6 gives a
  supporter account with a price. Update the terms before the code of the payment
  exists.
- **The supporter account.** The directory of OpenAI refuses a text that promotes an
  upgrade. The error of a free account names the supporter account, with no price and
  no URL. Do not add a URL of a payment to that error.
- **The addresses of the servers of OpenAI.** Paragraph 4.7.2 gives the range of
  Anthropic. Read the range of OpenAI in its documentation before step 6 of section 8.
