ALTER TABLE `organizations` ADD `lat` real;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `lng` real;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `churn_email_sent_at` integer;
--> statement-breakpoint
CREATE TABLE `admin_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`content` text NOT NULL,
	`author` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `admin_notes_org_idx` ON `admin_notes` (`org_id`);
