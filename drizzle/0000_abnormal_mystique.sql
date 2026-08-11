CREATE TABLE `balance_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`points` integer NOT NULL,
	`observed_at` text NOT NULL,
	`note` text,
	FOREIGN KEY (`account_id`) REFERENCES `user_account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `balance_snapshot_account_observed_at` ON `balance_snapshot` (`account_id`,"observed_at" desc);--> statement-breakpoint
CREATE TABLE `currency` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `currency_code_unique` ON `currency` (`code`);--> statement-breakpoint
CREATE TABLE `program` (
	`id` text PRIMARY KEY NOT NULL,
	`currency_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`transferable` integer NOT NULL,
	FOREIGN KEY (`currency_id`) REFERENCES `currency`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `program_code_unique` ON `program` (`code`);--> statement-breakpoint
CREATE TABLE `transfer_rule` (
	`from_program_id` text NOT NULL,
	`to_program_id` text NOT NULL,
	`ratio_num` integer NOT NULL,
	`ratio_den` integer NOT NULL,
	`min_transfer` integer NOT NULL,
	`increment` integer NOT NULL,
	`valid_from` text NOT NULL,
	`valid_to` text,
	`source_url` text NOT NULL,
	PRIMARY KEY(`from_program_id`, `to_program_id`, `valid_from`),
	FOREIGN KEY (`from_program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`program_id` text NOT NULL,
	`membership_ref` text,
	`nickname` text,
	FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action
);
