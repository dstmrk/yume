CREATE TABLE `award` (
	`program_id` text NOT NULL,
	`from_zone` text NOT NULL,
	`to_zone` text NOT NULL,
	`cabin` text NOT NULL,
	`season` text NOT NULL,
	`miles` integer NOT NULL,
	`taxes_cents` integer NOT NULL,
	`valid_from` text NOT NULL,
	`valid_to` text,
	PRIMARY KEY(`program_id`, `from_zone`, `to_zone`, `cabin`, `season`, `valid_from`),
	FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `award_season` (
	`program_id` text NOT NULL,
	`from_date` text NOT NULL,
	`to_date` text NOT NULL,
	`season` text NOT NULL,
	`valid_from` text NOT NULL,
	`valid_to` text,
	PRIMARY KEY(`program_id`, `from_date`, `valid_from`),
	FOREIGN KEY (`program_id`) REFERENCES `program`(`id`) ON UPDATE no action ON DELETE no action
);
