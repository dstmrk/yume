-- Yume asks Google for the email address only. Paragraph 4.1 of
-- docs/architecture.md gives the rule. The users of the version before this
-- one hold the name and the photo of the Google account: this migration
-- removes them. The column `name` is not null, thus it receives an empty text.
UPDATE `user` SET `name` = '', `image` = NULL;
