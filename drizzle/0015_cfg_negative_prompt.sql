ALTER TABLE generation_presets ADD COLUMN negative_prompt TEXT DEFAULT '';
--> statement-breakpoint
ALTER TABLE generation_presets ADD COLUMN guidance_scale REAL DEFAULT 1.0;
