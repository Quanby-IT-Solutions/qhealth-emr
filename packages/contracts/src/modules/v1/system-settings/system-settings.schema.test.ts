import { describe, expect, it } from "vitest"

import {
	ArtaSlaSchema,
	ExportDefaultsSchema,
	OfflineModeSchema,
	PolicySectionsSchema,
	PrivacyConsentSchema,
	SystemSettingsSchema,
	OfflineSummarySnapshotSchema,
	UpdateSystemSettingsSchema,
} from "./system-settings.schema"

// ── PolicySections sub-schemas ────────────────────────────────────────────────

describe("ArtaSlaSchema", () => {
	it("accepts valid targetMinutes", () => {
		expect(ArtaSlaSchema.parse({ targetMinutes: 20 })).toEqual({ targetMinutes: 20 })
	})

	it("accepts empty object (all fields optional)", () => {
		expect(ArtaSlaSchema.parse({})).toEqual({})
	})

	it("rejects non-integer targetMinutes", () => {
		expect(() => ArtaSlaSchema.parse({ targetMinutes: "fast" })).toThrow()
	})

	it("rejects negative targetMinutes", () => {
		expect(() => ArtaSlaSchema.parse({ targetMinutes: -5 })).toThrow()
	})
})

describe("ExportDefaultsSchema", () => {
	it("accepts valid scheduleWindow and defaultFormat", () => {
		expect(
			ExportDefaultsSchema.parse({ scheduleWindow: "daily-02:00", defaultFormat: "ndjson" })
		).toEqual({ scheduleWindow: "daily-02:00", defaultFormat: "ndjson" })
	})

	it("rejects unknown defaultFormat value", () => {
		expect(() => ExportDefaultsSchema.parse({ defaultFormat: "pdf" })).toThrow()
	})
})

describe("OfflineModeSchema", () => {
	it("accepts cacheActivePatients and maxOfflineDays", () => {
		expect(OfflineModeSchema.parse({ cacheActivePatients: true, maxOfflineDays: 7 })).toEqual({
			cacheActivePatients: true,
			maxOfflineDays: 7,
		})
	})

	it("rejects maxOfflineDays > 30", () => {
		expect(() => OfflineModeSchema.parse({ maxOfflineDays: 31 })).toThrow()
	})

	it("rejects maxOfflineDays < 1", () => {
		expect(() => OfflineModeSchema.parse({ maxOfflineDays: 0 })).toThrow()
	})
})

describe("PrivacyConsentSchema", () => {
	it("accepts valid shape", () => {
		expect(PrivacyConsentSchema.parse({ consentVersion: "v1.0", enforceOnLogin: true })).toEqual({
			consentVersion: "v1.0",
			enforceOnLogin: true,
		})
	})
})

describe("PolicySectionsSchema (strict — rejects unknown top-level keys)", () => {
	it("accepts all four known sections", () => {
		const input = {
			artaSla: { targetMinutes: 30 },
			exportDefaults: { scheduleWindow: "weekly", defaultFormat: "ndjson" },
			offlineMode: { cacheActivePatients: true },
			privacyConsent: { enforceOnLogin: true },
		}
		expect(PolicySectionsSchema.parse(input)).toEqual(input)
	})

	it("accepts empty object", () => {
		expect(PolicySectionsSchema.parse({})).toEqual({})
	})

	it("rejects unknown top-level key", () => {
		expect(() => PolicySectionsSchema.parse({ unknownSection: { foo: true } })).toThrow()
	})

	it("rejects nested invalid shape in artaSla", () => {
		expect(() =>
			PolicySectionsSchema.parse({ artaSla: { targetMinutes: "string-value" } })
		).toThrow()
	})
})

// ── UpdateSystemSettingsSchema ────────────────────────────────────────────────

describe("UpdateSystemSettingsSchema", () => {
	it("accepts a full valid update", () => {
		const input = {
			timezone: "Asia/Manila",
			chartRetentionYears: 7,
			supportMailbox: "support@hospital.local",
			serviceDeskHotline: "+63 2 8123 4567",
			breakGlassRequiresReason: true,
			autoFreezeChargesOnDischarge: true,
			requireDpaConsentBeforeExport: true,
			enableOfflineSummaryCache: true,
			policySections: {
				artaSla: { targetMinutes: 15 },
			},
		}
		const result = UpdateSystemSettingsSchema.parse(input)
		expect(result.timezone).toBe("Asia/Manila")
		expect(result.chartRetentionYears).toBe(7)
		expect(result.policySections?.artaSla?.targetMinutes).toBe(15)
	})

	it("accepts partial update (only timezone)", () => {
		expect(UpdateSystemSettingsSchema.parse({ timezone: "UTC" })).toEqual({ timezone: "UTC" })
	})

	it("accepts empty object (no fields required)", () => {
		expect(UpdateSystemSettingsSchema.parse({})).toEqual({})
	})

	it("rejects invalid email in supportMailbox", () => {
		expect(() => UpdateSystemSettingsSchema.parse({ supportMailbox: "not-an-email" })).toThrow()
	})

	it("rejects unknown top-level field in policySections", () => {
		expect(() =>
			UpdateSystemSettingsSchema.parse({
				policySections: { unknownKey: { something: true } },
			})
		).toThrow()
	})

	it("rejects invalid sub-shape in policySections.artaSla", () => {
		expect(() =>
			UpdateSystemSettingsSchema.parse({
				policySections: { artaSla: { targetMinutes: -1 } },
			})
		).toThrow()
	})

	it("allows null for nullable fields", () => {
		const result = UpdateSystemSettingsSchema.parse({
			supportMailbox: null,
			serviceDeskHotline: null,
		})
		expect(result.supportMailbox).toBeNull()
		expect(result.serviceDeskHotline).toBeNull()
	})
})

// ── SystemSettingsSchema (response shape) ─────────────────────────────────────

describe("SystemSettingsSchema", () => {
	it("parses a complete server response", () => {
		const row = {
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			timezone: "Asia/Manila",
			chartRetentionYears: 10,
			supportMailbox: null,
			serviceDeskHotline: null,
			breakGlassRequiresReason: true,
			autoFreezeChargesOnDischarge: true,
			requireDpaConsentBeforeExport: true,
			enableOfflineSummaryCache: false,
			policySections: {},
			updatedAt: null,
		}
		const result = SystemSettingsSchema.parse(row)
		expect(result.facilityId).toBe("550e8400-e29b-41d4-a716-446655440000")
		expect(result.timezone).toBe("Asia/Manila")
	})

	it("coerces string updatedAt to Date", () => {
		const row = {
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			timezone: "Asia/Manila",
			chartRetentionYears: 10,
			supportMailbox: null,
			serviceDeskHotline: null,
			breakGlassRequiresReason: true,
			autoFreezeChargesOnDischarge: true,
			requireDpaConsentBeforeExport: true,
			enableOfflineSummaryCache: false,
			policySections: {},
			updatedAt: "2025-01-01T00:00:00.000Z",
		}
		const result = SystemSettingsSchema.parse(row)
		expect(result.updatedAt).toBeInstanceOf(Date)
	})
})

describe("OfflineSummarySnapshotSchema", () => {
	it("parses a prepared offline patient summary snapshot", () => {
		const preparedAt = "2026-05-14T00:00:00.000Z"
		const result = OfflineSummarySnapshotSchema.parse({
			schemaVersion: 1,
			facilityId: "550e8400-e29b-41d4-a716-446655440000",
			preparedAt,
			patientCount: 1,
			summaries: [
				{
					schemaVersion: 1,
					facilityId: "550e8400-e29b-41d4-a716-446655440000",
					preparedAt,
					sourceJobId: "660e8400-e29b-41d4-a716-446655440000",
					patient: {
						id: "770e8400-e29b-41d4-a716-446655440000",
						mrn: "MRN-20260514-0001",
						firstName: "Ana",
						middleName: null,
						lastName: "Santos",
						dateOfBirth: "1980-01-01",
						sex: "female",
						isActive: true,
					},
					encounterSummary: {
						encounter: {
							id: "880e8400-e29b-41d4-a716-446655440000",
							facilityId: "550e8400-e29b-41d4-a716-446655440000",
							patientId: "770e8400-e29b-41d4-a716-446655440000",
							patientName: "Santos, Ana",
							patientMrn: "MRN-20260514-0001",
							patientDateOfBirth: "1980-01-01",
							patientSex: "female",
							encounterType: "inpatient",
							status: "active",
							chiefComplaint: "Fever",
							admissionDatetime: preparedAt,
							dischargeDatetime: null,
							disposition: null,
							admittingStaffName: null,
							attendingStaffName: "Dr. Reyes",
							wardName: "Ward A",
							bedNumber: "12",
							oecbEligible: false,
							transfers: [],
						},
						latestVitals: null,
						activeProblems: [],
						activeAllergies: [],
						activeMedications: [],
						activeProblemCount: 0,
						activeAllergyCount: 0,
						hasSevereAllergies: false,
					},
				},
			],
		})

		expect(result.patientCount).toBe(1)
		expect(result.summaries[0]!.patient.mrn).toBe("MRN-20260514-0001")
	})
})
