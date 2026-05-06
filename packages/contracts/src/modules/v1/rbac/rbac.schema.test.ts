import { describe, expect, it } from "vitest"

import { RbacModuleEnum } from "./rbac.schema"

/**
 * The Drizzle $type<> union on rolePermissions.module must be kept in sync
 * with RbacModuleEnum. This test captures the contract enum values as a
 * snapshot so any divergence is caught at CI time.
 *
 * When adding new modules:
 *   1. Add the value to RbacModuleEnum in rbac.schema.ts
 *   2. Add the value to the $type<> union in packages/db/src/schema/rbac.ts
 *   3. Update the snapshot below (or run `vitest --update-snapshot`)
 */

const EXPECTED_MODULES = [
	"adt",
	"clinical_docs",
	"orders",
	"nursing",
	"billing",
	"billing.charges",
	"billing.invoices",
	"billing.payments",
	"billing.cf4",
	"billing.drg",
	"billing.cf5",
	"billing.esoa",
	"billing.cews",
	"billing.konsulta",
	"formulary",
	"reporting",
	"notifications",
	"audit",
	"admin",
	"admin.users",
	"admin.feature-flags",
	"admin.licenses",
	"admin.bor",
	"admin.fhir",
	"admin.terminology",
	"admin.sla",
	"admin.master-data",
	"admin.integrations",
	"admin.facility",
	"admin.auth",
	"surgical",
	"opd",
	"nutrition",
	"laboratory",
	"radiology",
	"scheduling",
	"nbs",
	"consent",
	"fhir",
	"msw",
	"telemedicine",
	"ed",
	"death_reporting",
	"feature_flags",
	"system_settings",
	"facility_profile",
	"integration_registry",
	"civil_registry",
	"medical_records",
	"him.deficiencies",
	"him.coding",
	"him.records",
	"him.hai",
	"patients",
] as const

describe("RbacModuleEnum", () => {
	it("contains exactly the expected module values", () => {
		const enumValues = RbacModuleEnum.options

		// Sorted comparison so insertion order does not cause false failures
		expect([...enumValues].sort()).toEqual([...EXPECTED_MODULES].sort())
	})

	it("matches snapshot — update when adding new modules", () => {
		expect(RbacModuleEnum.options).toMatchInlineSnapshot(`
			[
			  "adt",
			  "clinical_docs",
			  "orders",
			  "nursing",
			  "billing",
			  "billing.charges",
			  "billing.invoices",
			  "billing.payments",
			  "billing.cf4",
			  "billing.drg",
			  "billing.cf5",
			  "billing.esoa",
			  "billing.cews",
			  "billing.konsulta",
			  "formulary",
			  "reporting",
			  "notifications",
			  "audit",
			  "admin",
			  "admin.users",
			  "admin.feature-flags",
			  "admin.licenses",
			  "admin.bor",
			  "admin.fhir",
			  "admin.terminology",
			  "admin.sla",
			  "admin.master-data",
			  "admin.integrations",
			  "admin.facility",
			  "admin.auth",
			  "surgical",
			  "opd",
			  "nutrition",
			  "laboratory",
			  "radiology",
			  "scheduling",
			  "nbs",
			  "consent",
			  "fhir",
			  "msw",
			  "telemedicine",
			  "ed",
			  "death_reporting",
			  "feature_flags",
			  "system_settings",
			  "facility_profile",
			  "integration_registry",
			  "civil_registry",
			  "medical_records",
			  "him.deficiencies",
			  "him.coding",
			  "him.records",
			  "him.hai",
			  "patients",
			]
		`)
	})
})
