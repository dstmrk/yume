-- The household of paragraph 4.10 of docs/architecture.md. drizzle-kit writes
-- the foreign key of `user_account.member_id` with no action on delete: the
-- clause `ON DELETE cascade` below is written by hand, as `schema.ts` gives.
-- The new column has no NOT NULL, thus a table with rows accepts it.
CREATE TABLE `household` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `household_owner_id_unique` ON `household` (`owner_id`);--> statement-breakpoint
CREATE TABLE `household_invite` (
	`household_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`household_id`, `email`),
	FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `household_invite_email` ON `household_invite` (`email`);--> statement-breakpoint
CREATE TABLE `household_member` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text,
	`name` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "household_member_user_or_name" CHECK("household_member"."user_id" is not null or "household_member"."name" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `household_member_user_id_unique` ON `household_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `household_member_household_id` ON `household_member` (`household_id`);--> statement-breakpoint
CREATE TABLE `household_pool` (
	`program_id` text NOT NULL,
	`country` text NOT NULL,
	`valid_from` text NOT NULL,
	`valid_to` text,
	PRIMARY KEY(`program_id`, `country`, `valid_from`),
	FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `user_account` ADD `member_id` text REFERENCES household_member(id) ON DELETE cascade;--> statement-breakpoint
CREATE INDEX `user_account_member_id` ON `user_account` (`member_id`);