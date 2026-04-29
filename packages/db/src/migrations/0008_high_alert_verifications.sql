-- =============================================================================
-- High-Alert Dual Verification
--
-- drizzle-kit generate is not producing SQL reliably in this workspace, so this
-- migration is checked in manually to keep the schema change versioned and
-- runnable through the existing migration pipeline.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "high_alert_verifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "medication_order_id" uuid NOT NULL,
    "requesting_staff_id" uuid NOT NULL,
    "verifying_staff_id" uuid NOT NULL,
    "verified_at" timestamp NOT NULL DEFAULT now(),
    "notes" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "high_alert_verifications_medication_order_id_medication_orders_id_fk"
        FOREIGN KEY ("medication_order_id") REFERENCES "public"."medication_orders"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "high_alert_verifications_requesting_staff_id_staff_profiles_id_fk"
        FOREIGN KEY ("requesting_staff_id") REFERENCES "public"."staff_profiles"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "high_alert_verifications_verifying_staff_id_staff_profiles_id_fk"
        FOREIGN KEY ("verifying_staff_id") REFERENCES "public"."staff_profiles"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "high_alert_verifications_medication_order_id_idx"
    ON "high_alert_verifications" ("medication_order_id");

CREATE INDEX IF NOT EXISTS "high_alert_verifications_verifying_staff_id_idx"
    ON "high_alert_verifications" ("verifying_staff_id");
