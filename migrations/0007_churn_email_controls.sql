ALTER TABLE `organizations` ADD `churn_email_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `churn_opt_out` integer DEFAULT 0 NOT NULL;
