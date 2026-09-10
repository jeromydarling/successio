CREATE TABLE `concierge_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `phone` text,
  `business_name` text NOT NULL,
  `vertical` text NOT NULL,
  `location` text,
  `has_paper` integer DEFAULT 0 NOT NULL,
  `has_digital` integer DEFAULT 0 NOT NULL,
  `has_quickbooks` integer DEFAULT 0 NOT NULL,
  `timeline` text NOT NULL,
  `notes` text,
  `status` text DEFAULT 'new' NOT NULL,
  `assignee` text,
  `internal_notes` text,
  `scheduled_for` text,
  `delivered_at` integer,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `concierge_status_idx` ON `concierge_requests` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `concierge_email_idx` ON `concierge_requests` (`email`);
