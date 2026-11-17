ALTER TABLE "vital_signs"
	ADD COLUMN IF NOT EXISTS "spo2_scale" text DEFAULT 'scale1' NOT NULL,
	ADD COLUMN IF NOT EXISTS "oxygen_therapy" boolean DEFAULT false NOT NULL,
	ADD COLUMN IF NOT EXISTS "oxygen_delivery_device" text,
	ADD COLUMN IF NOT EXISTS "oxygen_flow_rate" numeric(4, 1),
	ADD COLUMN IF NOT EXISTS "consciousness_level" text DEFAULT 'A' NOT NULL;
