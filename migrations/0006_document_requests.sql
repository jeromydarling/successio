CREATE TABLE `document_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL,
  `token_id` text NOT NULL,
  `requester_name` text NOT NULL,
  `requester_email` text NOT NULL,
  `request_text` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `resolved_at` integer,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`token_id`) REFERENCES `share_tokens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `doc_requests_org_idx` ON `document_requests` (`org_id`);
--> statement-breakpoint
CREATE INDEX `doc_requests_token_idx` ON `document_requests` (`token_id`);
