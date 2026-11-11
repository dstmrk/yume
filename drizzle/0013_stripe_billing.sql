CREATE TABLE `stripe_customer` (
	`user_id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`subscription_id` text,
	`status` text,
	`cancels` integer DEFAULT false NOT NULL,
	`last_event_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_customer_customer_id_unique` ON `stripe_customer` (`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_customer_subscription_id_unique` ON `stripe_customer` (`subscription_id`);--> statement-breakpoint
CREATE TABLE `stripe_event` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`received_at` text NOT NULL
);
