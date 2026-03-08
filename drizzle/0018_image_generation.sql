ALTER TABLE characters ADD COLUMN image_gen_prompt_prefix TEXT DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE characters ADD COLUMN image_gen_settings TEXT DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE messages ADD COLUMN generated_image_path TEXT DEFAULT NULL;
--> statement-breakpoint
CREATE TABLE generated_images (
  id TEXT PRIMARY KEY,
  character_id TEXT,
  chat_id TEXT,
  message_id TEXT,
  prompt TEXT NOT NULL,
  negative_prompt TEXT DEFAULT '',
  provider TEXT NOT NULL,
  settings TEXT DEFAULT '{}',
  relative_path TEXT NOT NULL,
  width INTEGER DEFAULT 512,
  height INTEGER DEFAULT 512,
  seed INTEGER,
  created_at TEXT NOT NULL
);
