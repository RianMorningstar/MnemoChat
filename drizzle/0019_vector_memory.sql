CREATE TABLE `message_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`chat_id` text NOT NULL,
	`chunk_index` integer DEFAULT 0 NOT NULL,
	`chunk_text` text NOT NULL,
	`embedding` blob NOT NULL,
	`embedding_model` text NOT NULL,
	`dimensions` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_embeddings_chat_id` ON `message_embeddings` (`chat_id`);
--> statement-breakpoint
CREATE INDEX `idx_embeddings_message_id` ON `message_embeddings` (`message_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_embeddings_msg_model_chunk` ON `message_embeddings` (`message_id`, `embedding_model`, `chunk_index`);
