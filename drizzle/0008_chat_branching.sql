ALTER TABLE messages ADD COLUMN parent_id TEXT DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE messages ADD COLUMN branch_position INTEGER DEFAULT 0;
--> statement-breakpoint
ALTER TABLE chats ADD COLUMN active_leaf_id TEXT DEFAULT NULL;
