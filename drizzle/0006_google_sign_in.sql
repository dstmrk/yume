-- Google is the only provider of the sign-in. Paragraph 4.2 of
-- docs/architecture.md gives the decision: the table of the invitations goes
-- away, and the users of the first version go away with their data. The
-- catalogue is application data and it stays.
DROP TABLE `invitation`;--> statement-breakpoint
DELETE FROM `balance_snapshot`;--> statement-breakpoint
DELETE FROM `user_account`;--> statement-breakpoint
DELETE FROM `favorite_currency`;--> statement-breakpoint
DELETE FROM `session`;--> statement-breakpoint
DELETE FROM `account`;--> statement-breakpoint
DELETE FROM `verification`;--> statement-breakpoint
DELETE FROM `user`;
