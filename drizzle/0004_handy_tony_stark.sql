CREATE TABLE `content_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`scene_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`bookmark_label` text DEFAULT '',
	`speaker` text DEFAULT '',
	`hidden` integer DEFAULT 0,
	`source_message_id` text DEFAULT '',
	`text` text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE `project_characters` (
	`project_id` text NOT NULL,
	`character_id` text NOT NULL,
	PRIMARY KEY(`project_id`, `character_id`)
);
--> statement-breakpoint
CREATE TABLE `project_lorebooks` (
	`project_id` text NOT NULL,
	`lorebook_id` text NOT NULL,
	PRIMARY KEY(`project_id`, `lorebook_id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`status` text DEFAULT 'drafting' NOT NULL,
	`cover_image` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`word_count` integer DEFAULT 0,
	`scene_count` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`source_chat_id` text,
	`word_count` integer DEFAULT 0,
	`status` text DEFAULT 'draft' NOT NULL,
	`scene_notes` text DEFAULT '',
	`block_count` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
