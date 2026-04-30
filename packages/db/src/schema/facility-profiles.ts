import { createTable } from "../utils/table.js"
import { facilities } from "./rbac.js"

export const facilityProfiles = createTable("facility_profiles", t => ({
	facilityId: t
		.uuid("facility_id")
		.primaryKey()
		.references(() => facilities.id, { onDelete: "cascade" }),

	// Short code used in reports and exports (e.g., "QH-MAIN")
	facilityCode: t.text("facility_code").unique(),

	// Governing authority (e.g., "DOH Region IV-A")
	governingAuthority: t.text("governing_authority"),

	// Address
	addressLine1: t.text("address_line1"),
	addressLine2: t.text("address_line2"),
	city: t.text("city"),
	province: t.text("province"),
	zipCode: t.text("zip_code"),

	// Contact
	telephone: t.text("telephone"),
	email: t.text("email"),

	// Administrator contact
	adminContactName: t.text("admin_contact_name"),
	adminContactEmail: t.text("admin_contact_email"),

	updatedAt: t.timestamp("updated_at"),
}))

export type FacilityProfileRow = typeof facilityProfiles.$inferSelect
