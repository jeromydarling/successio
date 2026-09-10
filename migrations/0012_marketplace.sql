CREATE TABLE `marketplace_listings` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `profile_id` text NOT NULL,
  `share_token_id` text NOT NULL,
  `headline` text NOT NULL,
  `teaser` text NOT NULL,
  `vertical` text NOT NULL,
  `region` text NOT NULL,
  `revenue_band` text NOT NULL,
  `employee_band` text NOT NULL,
  `readiness_band` text NOT NULL,
  `founded` integer,
  `status` text DEFAULT 'live' NOT NULL,
  `published_at` integer,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketplace_org_idx` ON `marketplace_listings` (`org_id`);
--> statement-breakpoint
CREATE INDEX `marketplace_status_idx` ON `marketplace_listings` (`status`,`published_at`);
