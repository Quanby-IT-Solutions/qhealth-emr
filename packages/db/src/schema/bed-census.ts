import { index, uniqueIndex } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { facilities } from "./rbac.js"
import { wards } from "./core.js"

// DOH AHSR-compliant daily census snapshot written by the 00:05 midnight cron job.
export const bedCensusDaily = createTable(
	"bed_census_daily",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		facilityId: t
			.uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		wardId: t
			.uuid("ward_id")
			.references(() => wards.id, { onDelete: "set null" }),
		censusDate: t.date("census_date").notNull(),
		midnightCensus: t.integer("midnight_census").notNull().default(0),
		admissions: t.integer("admissions").notNull().default(0),
		discharges: t.integer("discharges").notNull().default(0),
		// DOH: deaths within 48 hours of admission → gross death rate
		deathsWithin48h: t.integer("deaths_within_48h").notNull().default(0),
		// DOH: deaths after 48 hours of admission → net death rate
		deathsAfter48h: t.integer("deaths_after_48h").notNull().default(0),
		availableBeds: t.integer("available_beds").notNull().default(0),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
	}),
	t => [
		uniqueIndex("bed_census_daily_facility_ward_date_uniq").on(t.facilityId, t.wardId, t.censusDate),
		index("bed_census_daily_facility_date_idx").on(t.facilityId, t.censusDate),
	]
)

export type BedCensusDailyRow = typeof bedCensusDaily.$inferSelect
