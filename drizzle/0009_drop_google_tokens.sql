-- Yume keeps no token of Google. Paragraph 4.1 of docs/architecture.md gives
-- the rule. The version before this one kept the tokens of each sign-in, and
-- the id_token of an early user can hold the name and the photo. The column
-- account_id holds the sub of Google and stays.
UPDATE `account` SET `access_token` = NULL, `refresh_token` = NULL, `id_token` = NULL, `access_token_expires_at` = NULL, `refresh_token_expires_at` = NULL;
