import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters } from "./core.js"
import { staffProfiles } from "./rbac.js"

export const gatePasses = createTable(
	"gate_passes",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t.uuid("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
		qrToken: t.text("qr_token").notNull(),
		issuedBy: t.uuid("issued_by").references(() => staffProfiles.id, { onDelete: "set null" }),
		issuedAt: t.timestamp("issued_at").notNull().defaultNow(),
		printedAt: t.timestamp("printed_at"),
		deliveredVia: t.text("delivered_via").notNull().$type<"print" | "qr" | "both">(),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	 t => [index("gate_passes_encounter_id_idx").on(t.encounterId)]
)
