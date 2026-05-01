CREATE TABLE "feature_flag_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"flag_id" uuid NOT NULL,
	"previous_value" boolean,
	"new_value" boolean NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE INDEX "ffh_flag_id_idx" ON "feature_flag_history" ("flag_id");--> statement-breakpoint
CREATE INDEX "ffh_changed_at_idx" ON "feature_flag_history" ("changed_at");--> statement-breakpoint
ALTER TABLE "feature_flag_history" ADD CONSTRAINT "feature_flag_history_flag_id_feature_flags_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "feature_flag_history" ADD CONSTRAINT "feature_flag_history_changed_by_staff_profiles_id_fkey" FOREIGN KEY ("changed_by") REFERENCES "staff_profiles"("id") ON DELETE SET NULL;