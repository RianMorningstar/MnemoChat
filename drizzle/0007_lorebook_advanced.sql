ALTER TABLE lorebook_entries ADD COLUMN logic TEXT NOT NULL DEFAULT 'AND_ANY';
--> statement-breakpoint
ALTER TABLE lorebook_entries ADD COLUMN probability INTEGER NOT NULL DEFAULT 100;
--> statement-breakpoint
ALTER TABLE lorebook_entries ADD COLUMN scan_depth INTEGER NOT NULL DEFAULT 0;
