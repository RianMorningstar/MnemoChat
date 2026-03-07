ALTER TABLE chat_characters ADD COLUMN talkativeness REAL NOT NULL DEFAULT 0.5;
--> statement-breakpoint
ALTER TABLE chats ADD COLUMN reply_strategy TEXT NOT NULL DEFAULT 'round_robin';
