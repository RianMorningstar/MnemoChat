ALTER TABLE characters ADD COLUMN tts_provider TEXT DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE characters ADD COLUMN tts_voice TEXT DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE characters ADD COLUMN tts_settings TEXT DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE messages ADD COLUMN tts_audio_path TEXT DEFAULT NULL;
