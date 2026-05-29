CREATE TABLE `association_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`association_id` text NOT NULL,
	`business_name` text NOT NULL,
	`contact_email` text NOT NULL,
	`vertical` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`claimed_org_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`association_id`) REFERENCES `associations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `association_invites_token_unique` ON `association_invites` (`token`);--> statement-breakpoint
CREATE INDEX `invites_assoc_idx` ON `association_invites` (`association_id`);--> statement-breakpoint
CREATE INDEX `invites_token_idx` ON `association_invites` (`token`);--> statement-breakpoint
CREATE TABLE `associations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`primary_color` text,
	`logo_url` text,
	`website` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `associations_slug_unique` ON `associations` (`slug`);--> statement-breakpoint
ALTER TABLE `organizations` ADD `association_id` text;--> statement-breakpoint
CREATE INDEX `orgs_assoc_idx` ON `organizations` (`association_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `association_id` text;