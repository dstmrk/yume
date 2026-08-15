CREATE TABLE `favorite_currency` (
	`user_id` text NOT NULL,
	`currency_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `currency_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`currency_id`) REFERENCES `currency`(`id`) ON UPDATE no action ON DELETE no action
);
