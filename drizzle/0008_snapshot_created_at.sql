-- The column `created_at` holds the moment of the write of a snapshot. Of two
-- snapshots with the same `observed_at`, the snapshot that the user wrote last
-- is the current balance. Paragraph 3.2 of docs/architecture.md gives the rule.
--
-- SQLite refuses `ADD COLUMN ... NOT NULL` with no default on a table with
-- rows. Thus this migration makes the table again, as drizzle-kit does for a
-- change that SQLite cannot alter.
--
-- The true moment of an old row is lost. Each old row comes before this
-- migration, thus it receives a moment before the moment of the migration, in
-- the order of `rowid`. The row with the largest `rowid` receives the moment of
-- the migration minus 1 ms. A snapshot written after the migration then comes
-- after each old row.
CREATE TABLE `__new_balance_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`points` integer NOT NULL,
	`observed_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `user_account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_balance_snapshot` (`id`, `account_id`, `points`, `observed_at`, `created_at`)
SELECT
	`id`,
	`account_id`,
	`points`,
	`observed_at`,
	strftime(
		'%Y-%m-%dT%H:%M:%fZ',
		'now',
		((rowid - (SELECT max(rowid) FROM `balance_snapshot`) - 1) / 1000.0) || ' seconds'
	)
FROM `balance_snapshot`
ORDER BY rowid;
--> statement-breakpoint
DROP TABLE `balance_snapshot`;--> statement-breakpoint
ALTER TABLE `__new_balance_snapshot` RENAME TO `balance_snapshot`;--> statement-breakpoint
CREATE INDEX `balance_snapshot_account_observed_at` ON `balance_snapshot` (`account_id`,"observed_at" desc,"created_at" desc);
