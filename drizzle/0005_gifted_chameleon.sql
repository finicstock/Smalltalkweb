CREATE TABLE `content_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`body` text,
	`excerpt` text,
	`versionNumber` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contents` ADD `metaTitle` varchar(200);--> statement-breakpoint
ALTER TABLE `contents` ADD `metaDescription` text;--> statement-breakpoint
ALTER TABLE `contents` ADD `ogImageUrl` text;--> statement-breakpoint
ALTER TABLE `contents` ADD `previewToken` varchar(64);