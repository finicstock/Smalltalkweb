CREATE TABLE `telegram_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviteLink` varchar(500) NOT NULL,
	`channelName` varchar(200),
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `chat_messages`;--> statement-breakpoint
DROP TABLE `chat_sessions`;--> statement-breakpoint
DROP TABLE `newsletter_subscribers`;--> statement-breakpoint
DROP TABLE `newsletters`;--> statement-breakpoint
ALTER TABLE `contents` ADD `tags` text;