CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connection_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'ollama' NOT NULL,
	`endpoint` text NOT NULL,
	`is_active` integer DEFAULT 0 NOT NULL,
	`default_model` text,
	`content_tier` text,
	`created_at` text NOT NULL,
	`last_used` text
);
