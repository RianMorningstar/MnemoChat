CREATE TABLE `character_collections` (
	`character_id` text NOT NULL,
	`collection_id` text NOT NULL,
	PRIMARY KEY(`character_id`, `collection_id`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`cover_url` text DEFAULT '',
	`sort_order` integer DEFAULT 0,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `discover_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`portrait_url` text DEFAULT '',
	`tags` text DEFAULT '[]',
	`content_tier` text DEFAULT 'sfw',
	`creator_name` text NOT NULL,
	`creator_avatar_url` text DEFAULT '',
	`description_preview` text DEFAULT '',
	`like_count` integer DEFAULT 0,
	`import_count` integer DEFAULT 0,
	`lorebook_entry_count` integer DEFAULT 0,
	`spec_version` text DEFAULT 'v2',
	`published_at` text,
	`has_update` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `discover_follows` (
	`creator_name` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `discover_likes` (
	`card_id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lorebook_characters` (
	`lorebook_id` text NOT NULL,
	`character_id` text NOT NULL,
	PRIMARY KEY(`lorebook_id`, `character_id`)
);
--> statement-breakpoint
CREATE TABLE `lorebooks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tags` text DEFAULT '[]',
	`cover_color` text DEFAULT 'zinc',
	`last_modified` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`avatar_url` text DEFAULT '',
	`is_default` integer DEFAULT 0,
	`last_used` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `source` text DEFAULT 'local';--> statement-breakpoint
ALTER TABLE `characters` ADD `community_ref_json` text;--> statement-breakpoint
ALTER TABLE `lorebook_entries` ADD `lorebook_id` text;