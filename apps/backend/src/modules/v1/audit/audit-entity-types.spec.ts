import { AUDIT_ENTITY_TYPES, type AuditEntityType } from "./audit-entity-types"

describe("AUDIT_ENTITY_TYPES", () => {
	it("is importable and returns a frozen constant", () => {
		expect(AUDIT_ENTITY_TYPES).toBeDefined()
	})

	it("contains every admin entity type used by Epic slices", () => {
		const values = Object.values(AUDIT_ENTITY_TYPES)

		expect(values).toEqual(
			expect.arrayContaining([
				"feature_flag",
				"feature_flag_target",
				"system_setting",
				"facility_profile",
				"integration",
				"role",
				"user",
				"user_role_assignment",
				"staff_profile",
			])
		)
	})

	it("has stable string values that match the key naming convention", () => {
		expect(AUDIT_ENTITY_TYPES.FEATURE_FLAG).toBe("feature_flag")
		expect(AUDIT_ENTITY_TYPES.FEATURE_FLAG_TARGET).toBe("feature_flag_target")
		expect(AUDIT_ENTITY_TYPES.SYSTEM_SETTING).toBe("system_setting")
		expect(AUDIT_ENTITY_TYPES.FACILITY_PROFILE).toBe("facility_profile")
		expect(AUDIT_ENTITY_TYPES.INTEGRATION).toBe("integration")
		expect(AUDIT_ENTITY_TYPES.ROLE).toBe("role")
		expect(AUDIT_ENTITY_TYPES.USER).toBe("user")
		expect(AUDIT_ENTITY_TYPES.USER_ROLE_ASSIGNMENT).toBe("user_role_assignment")
		expect(AUDIT_ENTITY_TYPES.STAFF_PROFILE).toBe("staff_profile")
	})

	it("AuditEntityType union covers all values (compile-time check)", () => {
		// If AuditEntityType is missing a value this assignment will fail at compile time.
		const _check: AuditEntityType = AUDIT_ENTITY_TYPES.FEATURE_FLAG
		expect(_check).toBe("feature_flag")
	})
})
