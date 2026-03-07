ALTER TABLE messages ADD COLUMN expression TEXT;
--> statement-breakpoint
ALTER TABLE characters ADD COLUMN default_expression TEXT DEFAULT 'neutral';
