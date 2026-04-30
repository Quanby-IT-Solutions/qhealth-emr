import { describe, expect, it } from "vitest"

import {
	CreateIntegrationSchema,
	CredentialStatusEnum,
	IntegrationIdSchema,
	IntegrationKindEnum,
	IntegrationSchema,
	UpdateIntegrationSchema,
} from "./integration-registry.schema"

// ---------------------------------------------------------------------------
// IntegrationKindEnum
// ---------------------------------------------------------------------------

describe("IntegrationKindEnum", () => {
	it("accepts all valid kinds", () => {
		expect(IntegrationKindEnum.parse("fhir")).toBe("fhir")
		expect(IntegrationKindEnum.parse("civil_registry")).toBe("civil_registry")
		expect(IntegrationKindEnum.parse("hai")).toBe("hai")
		expect(IntegrationKindEnum.parse("philhealth")).toBe("philhealth")
		expect(IntegrationKindEnum.parse("custom")).toBe("custom")
	})

	it("rejects unknown kind", () => {
		expect(() => IntegrationKindEnum.parse("unknown")).toThrow()
	})
})

// ---------------------------------------------------------------------------
// CredentialStatusEnum
// ---------------------------------------------------------------------------

describe("CredentialStatusEnum", () => {
	it("accepts all 4 values", () => {
		expect(CredentialStatusEnum.parse("ok")).toBe("ok")
		expect(CredentialStatusEnum.parse("missing_in_env")).toBe("missing_in_env")
		expect(CredentialStatusEnum.parse("not_in_whitelist")).toBe("not_in_whitelist")
		expect(CredentialStatusEnum.parse("unset")).toBe("unset")
	})

	it("rejects unknown status", () => {
		expect(() => CredentialStatusEnum.parse("partial")).toThrow()
	})
})

// ---------------------------------------------------------------------------
// IntegrationSchema
// ---------------------------------------------------------------------------

describe("IntegrationSchema", () => {
	const valid = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		facilityId: "550e8400-e29b-41d4-a716-446655440001",
		kind: "fhir",
		name: "NHDR FHIR",
		endpointUrl: "https://nhdr.gov.ph/fhir",
		credentialsRef: null,
		webhookUrl: null,
		enabled: false,
		notes: null,
		lastSyncAt: null,
		lastSyncStatus: null,
		lastTestedAt: null,
		lastTestStatus: null,
		lastTestReadinessLevel: null,
		credentialStatus: "unset",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
	}

	it("parses a valid full integration", () => {
		const result = IntegrationSchema.parse(valid)
		expect(result.id).toBe(valid.id)
		expect(result.kind).toBe("fhir")
		expect(result.credentialStatus).toBe("unset")
	})

	it("coerces string timestamps to Date", () => {
		const result = IntegrationSchema.parse({
			...valid,
			createdAt: "2024-01-01T00:00:00.000Z",
			updatedAt: "2024-01-01T00:00:00.000Z",
		})
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
	})

	it("coerces string lastSyncAt to Date", () => {
		const result = IntegrationSchema.parse({
			...valid,
			lastSyncAt: "2024-06-15T08:00:00.000Z",
		})
		expect(result.lastSyncAt).toBeInstanceOf(Date)
	})

	it("rejects invalid kind", () => {
		expect(() =>
			IntegrationSchema.parse({ ...valid, kind: "unknown" })
		).toThrow()
	})

	it("rejects invalid credentialStatus", () => {
		expect(() =>
			IntegrationSchema.parse({ ...valid, credentialStatus: "partial" })
		).toThrow()
	})

	it("rejects invalid id UUID", () => {
		expect(() =>
			IntegrationSchema.parse({ ...valid, id: "not-a-uuid" })
		).toThrow()
	})
})

// ---------------------------------------------------------------------------
// CreateIntegrationSchema
// ---------------------------------------------------------------------------

describe("CreateIntegrationSchema", () => {
	const valid = {
		kind: "fhir",
		name: "NHDR FHIR",
		endpointUrl: "https://nhdr.gov.ph/fhir",
	}

	it("parses minimal valid create payload", () => {
		const result = CreateIntegrationSchema.parse(valid)
		expect(result.kind).toBe("fhir")
		expect(result.enabled).toBe(false) // default
	})

	it("parses full create payload", () => {
		const result = CreateIntegrationSchema.parse({
			...valid,
			credentialsRef: "FHIR_API_KEY",
			enabled: true,
			notes: "Primary FHIR endpoint",
		})
		expect(result.credentialsRef).toBe("FHIR_API_KEY")
		expect(result.enabled).toBe(true)
		expect(result.notes).toBe("Primary FHIR endpoint")
	})

	it("rejects missing name", () => {
		expect(() =>
			CreateIntegrationSchema.parse({ kind: "fhir", endpointUrl: "https://x.com" })
		).toThrow()
	})

	it("rejects invalid kind", () => {
		expect(() =>
			CreateIntegrationSchema.parse({ ...valid, kind: "unknown" })
		).toThrow()
	})
})

// ---------------------------------------------------------------------------
// UpdateIntegrationSchema
// ---------------------------------------------------------------------------

describe("UpdateIntegrationSchema", () => {
	it("accepts partial update (id required)", () => {
		const result = UpdateIntegrationSchema.parse({
			id: "550e8400-e29b-41d4-a716-446655440000",
			name: "Updated Name",
		})
		expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000")
		expect(result.name).toBe("Updated Name")
		expect(result.kind).toBeUndefined()
	})

	it("accepts object with only id (no-op update)", () => {
		const result = UpdateIntegrationSchema.parse({
			id: "550e8400-e29b-41d4-a716-446655440000",
		})
		expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000")
	})

	it("rejects missing id", () => {
		expect(() => UpdateIntegrationSchema.parse({ name: "x" })).toThrow()
	})

	it("rejects invalid id UUID", () => {
		expect(() =>
			UpdateIntegrationSchema.parse({ id: "not-a-uuid", name: "x" })
		).toThrow()
	})

	it("accepts null credentialsRef (clearing it)", () => {
		const result = UpdateIntegrationSchema.parse({
			id: "550e8400-e29b-41d4-a716-446655440000",
			credentialsRef: null,
		})
		expect(result.credentialsRef).toBeNull()
	})
})

// ---------------------------------------------------------------------------
// IntegrationIdSchema
// ---------------------------------------------------------------------------

describe("IntegrationIdSchema", () => {
	it("accepts a valid UUID", () => {
		const result = IntegrationIdSchema.parse({
			id: "550e8400-e29b-41d4-a716-446655440000",
		})
		expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000")
	})

	it("rejects non-UUID string", () => {
		expect(() => IntegrationIdSchema.parse({ id: "not-a-uuid" })).toThrow()
	})
})
