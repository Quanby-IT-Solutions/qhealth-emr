ALTER TABLE "telemedicine_appointments"
	ADD COLUMN IF NOT EXISTS "livekit_room_name" text;
--> statement-breakpoint
ALTER TABLE "telemedicine_appointments"
	ADD COLUMN IF NOT EXISTS "livekit_session_started_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "telemedicine_appointments"
	ADD COLUMN IF NOT EXISTS "livekit_session_ended_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "telemedicine_appointments"
	ADD COLUMN IF NOT EXISTS "patient_invite_token_hash" text;
--> statement-breakpoint
ALTER TABLE "telemedicine_appointments"
	ADD COLUMN IF NOT EXISTS "patient_invite_expires_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "telemedicine_appointments"
	ADD COLUMN IF NOT EXISTS "patient_invite_revoked_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "telemedicine_appointments"
	ADD COLUMN IF NOT EXISTS "patient_invite_last_used_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "telemedicine_appointments"
	ADD COLUMN IF NOT EXISTS "patient_joined_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "telemedicine_appointments"
	ALTER COLUMN "platform" SET DEFAULT 'livekit';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "telemedicine_appts_patient_invite_hash_uniq"
	ON "telemedicine_appointments" ("patient_invite_token_hash");
