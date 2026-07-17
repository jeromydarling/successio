CREATE TABLE `share_verifications` (
  `id` text PRIMARY KEY NOT NULL,
  `token_id` text NOT NULL,
  `email` text NOT NULL,
  `code_hash` text NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `expires_at` integer NOT NULL,
  `verified_at` integer,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`token_id`) REFERENCES `share_tokens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `share_verif_token_email_idx` ON `share_verifications` (`token_id`,`email`);
