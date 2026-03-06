ALTER TABLE `messages` ADD COLUMN `character_id` text;
--> statement-breakpoint
CREATE TABLE `chat_characters` (
	`chat_id` text NOT NULL,
	`character_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`chat_id`, `character_id`)
);
