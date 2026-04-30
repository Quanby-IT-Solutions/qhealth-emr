import { describe, expect, it } from "vitest"

import { FacilityProfileSchema, UpdateFacilityProfileSchema } from "./facility-profile.schema"

const FACILITY_ID = "550e8400-e29b-41d4-a716-446655440000"

const validProfile = {
	facilityId: FACILITY_ID,
	name: "Quanby General Hospital",
	facilityType: "tertiary",
	dohLicenseNumber: "DOH-2026-001",
	philhealthAccreditationId: "PHIC-2026-001",
	facilityCode: "QH-MAIN",
	governingAuthority: "DOH Region IV-A",
	addressLine1: "123 Health St",
	addressLine2: null,
	city: "Makati",
	province: "Metro Manila",
	zipCode: "1234",
	telephone: "+63 2 8123 0000",
	email: "info@qhealth.local",
	adminContactName: "A. Cruz",
	adminContactEmail: "admin@qhealth.local",
	updatedAt: null,
}

describe("FacilityProfileSchema", () => {
	it("accepts a fully populated profile", () => {
		const result = FacilityProfileSchema.safeParse(validProfile)
		expect(result.success).toBe(true)
	})

	it("accepts a minimal profile with all nulls", () => {
		const minimal = {
			facilityId: FACILITY_ID,
			name: "Quanby Community Clinic",
			facilityType: "community",
			dohLicenseNumber: null,
			philhealthAccreditationId: null,
			facilityCode: null,
			governingAuthority: null,
			addressLine1: null,
			addressLine2: null,
			city: null,
			province: null,
			zipCode: null,
			telephone: null,
			email: null,
			adminContactName: null,
			adminContactEmail: null,
			updatedAt: null,
		}
		const result = FacilityProfileSchema.safeParse(minimal)
		expect(result.success).toBe(true)
	})

	it("rejects invalid email", () => {
		const result = FacilityProfileSchema.safeParse({
			...validProfile,
			email: "not-an-email",
		})
		expect(result.success).toBe(false)
	})

	it("rejects invalid adminContactEmail", () => {
		const result = FacilityProfileSchema.safeParse({
			...validProfile,
			adminContactEmail: "bad-email",
		})
		expect(result.success).toBe(false)
	})

	it("rejects non-uuid facilityId", () => {
		const result = FacilityProfileSchema.safeParse({
			...validProfile,
			facilityId: "not-a-uuid",
		})
		expect(result.success).toBe(false)
	})

	it("coerces string updatedAt to Date", () => {
		const result = FacilityProfileSchema.safeParse({
			...validProfile,
			updatedAt: "2024-01-15T08:00:00.000Z",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.updatedAt).toBeInstanceOf(Date)
		}
	})
})

describe("UpdateFacilityProfileSchema", () => {
	it("accepts empty object (no-op update)", () => {
		const result = UpdateFacilityProfileSchema.safeParse({})
		expect(result.success).toBe(true)
	})

	it("accepts a partial update with only telephone", () => {
		const result = UpdateFacilityProfileSchema.safeParse({
			telephone: "+63 2 8123 9999",
		})
		expect(result.success).toBe(true)
	})

	it("accepts valid facilityCode format", () => {
		const result = UpdateFacilityProfileSchema.safeParse({ facilityCode: "QH-MAIN" })
		expect(result.success).toBe(true)
	})

	it("rejects facilityCode with lowercase letters", () => {
		const result = UpdateFacilityProfileSchema.safeParse({ facilityCode: "qh-main" })
		expect(result.success).toBe(false)
	})

	it("rejects invalid email in update", () => {
		const result = UpdateFacilityProfileSchema.safeParse({ email: "not-an-email" })
		expect(result.success).toBe(false)
	})

	it("accepts null values for nullable fields", () => {
		const result = UpdateFacilityProfileSchema.safeParse({
			governingAuthority: null,
			addressLine1: null,
			telephone: null,
		})
		expect(result.success).toBe(true)
	})

	it("accepts a full update payload", () => {
		const result = UpdateFacilityProfileSchema.safeParse({
			facilityCode: "DOH-R4A",
			governingAuthority: "DOH Region IV-A",
			addressLine1: "123 Health St",
			addressLine2: null,
			city: "Makati",
			province: "Metro Manila",
			zipCode: "1234",
			telephone: "+63 2 8123 0000",
			email: "info@qhealth.local",
			adminContactName: "A. Cruz",
			adminContactEmail: "admin@qhealth.local",
		})
		expect(result.success).toBe(true)
	})
})
