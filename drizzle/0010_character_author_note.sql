ALTER TABLE characters ADD COLUMN author_note TEXT DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE characters ADD COLUMN author_note_depth INTEGER DEFAULT 4;
