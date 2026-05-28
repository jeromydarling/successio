CREATE UNIQUE INDEX `customers_dedup_idx` ON `customers` (`org_id`,`source_document_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_dedup_idx` ON `employees` (`org_id`,`source_document_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_dedup_idx` ON `equipment` (`org_id`,`source_document_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `financials_dedup_idx` ON `financials` (`org_id`,`source_document_id`,`year`);--> statement-breakpoint
CREATE UNIQUE INDEX `milestones_dedup_idx` ON `org_milestones` (`org_id`,`source_document_id`,`year`,`title`);--> statement-breakpoint
CREATE UNIQUE INDEX `processes_dedup_idx` ON `processes` (`org_id`,`source_document_id`,`title`);