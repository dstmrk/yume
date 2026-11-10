CREATE TABLE `expiry_lot` (
	`snapshot_id` text NOT NULL,
	`expires_on` text NOT NULL,
	`points` integer NOT NULL,
	PRIMARY KEY(`snapshot_id`, `expires_on`),
	FOREIGN KEY (`snapshot_id`) REFERENCES `balance_snapshot`(`id`) ON UPDATE no action ON DELETE cascade
);
