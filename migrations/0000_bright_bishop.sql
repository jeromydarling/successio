CREATE TABLE `business_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`pdf_r2_key` text,
	`is_draft` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `profiles_org_idx` ON `business_profiles` (`org_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`revenue_share` real,
	`contract_status` text,
	`notes` text,
	`source_document_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `customers_org_idx` ON `customers` (`org_id`);--> statement-breakpoint
CREATE TABLE `document_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`org_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`text` text NOT NULL,
	`vector_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chunks_doc_idx` ON `document_chunks` (`document_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`r2_key` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`file_type` text,
	`document_type` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`error_message` text,
	`ocr_text` text,
	`ocr_confidence` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `documents_org_idx` ON `documents` (`org_id`);--> statement-breakpoint
CREATE INDEX `documents_status_idx` ON `documents` (`status`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`tenure_years` real,
	`is_key_person` integer DEFAULT false,
	`notes` text,
	`source_document_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `employees_org_idx` ON `employees` (`org_id`);--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`manufacturer` text,
	`model` text,
	`year_installed` integer,
	`condition` text,
	`estimated_value` real,
	`source_document_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `equipment_org_idx` ON `equipment` (`org_id`);--> statement-breakpoint
CREATE TABLE `extracted_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`org_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`data` text NOT NULL,
	`confidence` real NOT NULL,
	`needs_review` integer DEFAULT false NOT NULL,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entities_org_idx` ON `extracted_entities` (`org_id`);--> statement-breakpoint
CREATE INDEX `entities_type_idx` ON `extracted_entities` (`entity_type`);--> statement-breakpoint
CREATE INDEX `entities_review_idx` ON `extracted_entities` (`needs_review`);--> statement-breakpoint
CREATE TABLE `financials` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`year` integer NOT NULL,
	`revenue` real,
	`gross_profit` real,
	`ebitda` real,
	`owner_compensation` real,
	`source_document_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `financials_org_idx` ON `financials` (`org_id`);--> statement-breakpoint
CREATE TABLE `org_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`year` integer NOT NULL,
	`period` text,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`metric_label` text,
	`metric_value` text,
	`source` text,
	`source_document_id` text,
	`is_manual` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `milestones_org_idx` ON `org_milestones` (`org_id`);--> statement-breakpoint
CREATE INDEX `milestones_year_idx` ON `org_milestones` (`year`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`vertical` text NOT NULL,
	`location` text,
	`founded` integer,
	`employee_count` integer,
	`annual_revenue` real,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `processes` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`title` text NOT NULL,
	`steps` text NOT NULL,
	`owner` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`source_document_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `processes_org_idx` ON `processes` (`org_id`);--> statement-breakpoint
CREATE TABLE `readiness_checklist` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`vertical` text NOT NULL,
	`category` text NOT NULL,
	`item_key` text NOT NULL,
	`label` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `checklist_org_idx` ON `readiness_checklist` (`org_id`);--> statement-breakpoint
CREATE TABLE `readiness_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`score` integer NOT NULL,
	`breakdown` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scores_org_idx` ON `readiness_scores` (`org_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `share_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`org_id` text NOT NULL,
	`tier` text NOT NULL,
	`expires_at` integer,
	`view_count` integer DEFAULT 0 NOT NULL,
	`max_views` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `business_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tokens_profile_idx` ON `share_tokens` (`profile_id`);--> statement-breakpoint
CREATE TABLE `share_views` (
	`id` text PRIMARY KEY NOT NULL,
	`token_id` text NOT NULL,
	`org_id` text NOT NULL,
	`viewer_name` text,
	`viewer_email` text,
	`ip_hash` text,
	`sections_viewed` text,
	`duration_seconds` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`token_id`) REFERENCES `share_tokens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `views_token_idx` ON `share_views` (`token_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'owner' NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_org_idx` ON `users` (`org_id`);