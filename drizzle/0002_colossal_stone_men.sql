CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`chat_id` text NOT NULL,
	`label` text DEFAULT '',
	`color` text DEFAULT 'indigo',
	`message_index` integer DEFAULT 0,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT '',
	`character_id` text NOT NULL,
	`persona_name` text DEFAULT '',
	`model_id` text NOT NULL,
	`model_name` text NOT NULL,
	`created_at` text NOT NULL,
	`last_message_at` text,
	`message_count` integer DEFAULT 0,
	`bookmark_count` integer DEFAULT 0,
	`word_count` integer DEFAULT 0,
	`tags` text DEFAULT '[]'
);
--> statement-breakpoint
CREATE TABLE `generation_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`temperature` real DEFAULT 1,
	`repetition_penalty` real DEFAULT 1.1,
	`top_p` real DEFAULT 0.95,
	`top_p_enabled` integer DEFAULT 1,
	`top_k` integer DEFAULT 40,
	`top_k_enabled` integer DEFAULT 0,
	`max_new_tokens` integer DEFAULT 512,
	`stop_sequences` text DEFAULT '[]'
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text DEFAULT '',
	`timestamp` text NOT NULL,
	`token_count` integer DEFAULT 0,
	`is_system_message` integer DEFAULT 0,
	`model` text,
	`generation_time_ms` integer,
	`swipe_index` integer,
	`swipe_count` integer
);
--> statement-breakpoint
CREATE TABLE `scene_directions` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`text` text DEFAULT '',
	`injection_depth` integer DEFAULT 4,
	`enabled` integer DEFAULT 0,
	`token_count` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scene_directions_chat_id_unique` ON `scene_directions` (`chat_id`);--> statement-breakpoint
CREATE TABLE `swipe_alternatives` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`index` integer NOT NULL,
	`content` text DEFAULT '',
	`token_count` integer DEFAULT 0,
	`generation_time_ms` integer DEFAULT 0,
	`model` text NOT NULL
);
