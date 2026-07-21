ALTER TABLE `organizations` ADD `view_digest_sent_at` integer;
--> statement-breakpoint
ALTER TABLE `organizations` ADD `view_digest_opt_out` integer DEFAULT 0 NOT NULL;
