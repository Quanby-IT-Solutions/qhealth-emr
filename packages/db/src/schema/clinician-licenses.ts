import { index } from "drizzle-orm/pg-core"

import { createTable } from "../utils/table.js"
import { staffProfiles } from "./rbac.js"

export type LicenseType = "PRC" | "PTR" | "S2"
export type LicenseStatus = "pending" | "verified" | "expired"

export const clinicianLicenses = createTable(
	"clinician_licenses",
	t => ({
		id: t.uuid("id").primaryKey().defaultRandom(),
		staffProfileId: t
			.uuid("staff_profile_id")
			.notNull()
			.references(() => staffProfiles.id, { onDelete: "cascade" }),
		licenseType: t.text("license_type").notNull().$type<LicenseType>(),
		licenseNumber: t.text("license_number").notNull(),
		issueDate: t.date("issue_date"),
		expiryDate: t.date("expiry_date"),
		documentUri: t.text("document_uri"),
		status: t.text("status").notNull().default("pending").$type<LicenseStatus>(),
		verificationProof: t.jsonb("verification_proof"),
		verifiedAt: t.timestamp("verified_at", { withTimezone: true }),
		createdAt: t.timestamp("created_at").notNull().defaultNow(),
		updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
	}),
	t => [
		index("clinician_licenses_staff_profile_id_idx").on(t.staffProfileId),
		index("clinician_licenses_license_type_idx").on(t.licenseType),
		index("clinician_licenses_status_idx").on(t.status),
		index("clinician_licenses_expiry_date_idx").on(t.expiryDate),
	]
)

export type ClinicianLicenseRow = typeof clinicianLicenses.$inferSelect
