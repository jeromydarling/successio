ALTER TABLE `users` ADD `totp_secret` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `totp_enabled_at` integer;
--> statement-breakpoint
ALTER TABLE `users` ADD `recovery_codes` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `password_changed_at` integer;
--> statement-breakpoint
ALTER TABLE `sessions` ADD `jti` text;
--> statement-breakpoint
ALTER TABLE `sessions` ADD `user_agent` text;
--> statement-breakpoint
ALTER TABLE `sessions` ADD `ip_hash` text;
--> statement-breakpoint
ALTER TABLE `sessions` ADD `last_seen_at` integer;
--> statement-breakpoint
ALTER TABLE `sessions` ADD `revoked_at` integer;
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_jti_idx` ON `sessions` (`jti`);
--> statement-breakpoint
CREATE TABLE `security_events` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text,
  `org_id` text,
  `type` text NOT NULL,
  `ip_hash` text,
  `user_agent` text,
  `meta` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `security_events_user_idx` ON `security_events` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `security_events_org_idx` ON `security_events` (`org_id`,`created_at`);
