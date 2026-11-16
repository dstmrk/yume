-- The country of the transfer rules of the user. A new user has no country
-- after the first sign-in: the dashboard asks for it. The users before this
-- migration read the rules of Italy, thus they receive `IT`. Paragraph 3.3.2 of
-- docs/architecture.md gives the rule.
ALTER TABLE `user` ADD `country` text;--> statement-breakpoint
UPDATE `user` SET `country` = 'IT';
