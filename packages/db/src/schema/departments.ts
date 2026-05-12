import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { facilities } from "./rbac.js"

export const departments = createTable(
	"departments",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		name: t.text("name").notNull(),
		code: t.text("code"),
		description: t.text("description"),
		isActive: t.boolean("is_active").notNull().default(true),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("departments_facility_id_idx").on(t.facilityId),
		uniqueIndex("departments_facility_name_uniq").on(t.facilityId, t.name),
	]
)

export type DepartmentRow = typeof departments.$inferSelect
