import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { encounters } from "./core.js"
import { staffProfiles } from "./rbac.js"

export const dischargeClearances = createTable(
	"discharge_clearances",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		encounterId: t.uuid("encounter_id").notNull().references(() => encounters.id, { onDelete: "cascade" }),
		type: t.text("type").notNull().$type<"pharmacy" | "nurse" | "billing">(),
		clearedBy: t.uuid("cleared_by").references(() => staffProfiles.id, { onDelete: "set null" }),
		clearedAt: t.timestamp("cleared_at"),
		notes: t.text("notes"),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	 t => [
		index("discharge_clearances_encounter_id_idx").on(t.encounterId),
		uniqueIndex("discharge_clearances_encounter_type_uniq").on(t.encounterId, t.type),
	]
)
