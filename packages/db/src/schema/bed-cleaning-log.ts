import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { beds, encounters } from "./core.js"
import { staffProfiles } from "./rbac.js"

export const bedCleaningLog = createTable(
	"bed_cleaning_log",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		bedId: t.uuid("bed_id").notNull().references(() => beds.id, { onDelete: "cascade" }),
		dirtiedAt: t.timestamp("dirtied_at").notNull().defaultNow(),
		dirtiedByEncounterId: t.uuid("dirtied_by_encounter_id").references(() => encounters.id, { onDelete: "set null" }),
		cleanedAt: t.timestamp("cleaned_at"),
		cleanedBy: t.uuid("cleaned_by").references(() => staffProfiles.id, { onDelete: "set null" }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	 t => [index("bed_cleaning_log_bed_id_idx").on(t.bedId)]
)
