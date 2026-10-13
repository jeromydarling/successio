ALTER TABLE `organizations` ADD `plan` text DEFAULT 'free' NOT NULL;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `billing_mode` text;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `plan_paid_at` integer;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `plan_paid_in_full_at` integer;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `installments_paid` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `stripe_customer_id` text;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `stripe_subscription_id` text;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `last_payment_failed_at` integer;
--> statement-breakpoint
CREATE INDEX `orgs_stripe_customer_idx` ON `organizations` (`stripe_customer_id`);
--> statement-breakpoint
CREATE TABLE `stripe_events` (
  `id` text PRIMARY KEY NOT NULL,
  `type` text NOT NULL,
  `processed_at` integer DEFAULT (unixepoch()) NOT NULL
);
