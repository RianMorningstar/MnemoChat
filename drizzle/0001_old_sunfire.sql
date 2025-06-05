CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`portrait_url` text,
	`description` text,
	`personality` text,
	`scenario` text,
	`first_message` text,
	`alternate_greetings` text,
	`system_prompt` text,
	`post_history_instructions` text,
	`example_dialogues` text,
	`creator_notes` text,
	`tags` text,
	`content_tier` text DEFAULT 'sfw',
	`creator_name` text,
	`character_version` text,
	`source_url` text,
	`spec_version` text DEFAULT 'v2',
	`import_date` text,
	`created_at` text NOT NULL,
	`last_chatted` text,
	`token_count` integer DEFAULT 0,
	`internal_notes` text
);
--> statement-breakpoint
CREATE TABLE `lorebook_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`keywords` text,
	`content` text,
	`insertion_position` text DEFAULT 'before_character',
	`priority` integer DEFAULT 50,
	`enabled` integer DEFAULT 1
);
