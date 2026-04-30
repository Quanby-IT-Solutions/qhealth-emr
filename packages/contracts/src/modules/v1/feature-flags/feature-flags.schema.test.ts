import { describe, expect, it } from "vitest"

import {
	CreateFeatureFlagSchema,
	FeatureFlagEnvironmentEnum,
	FeatureFlagGroupEnum,
	FeatureFlagKeySchema,
	FeatureFlagRiskLevelEnum,
	FeatureFlagSchema,
	FeatureFlagTargetInputSchema,
	UpdateFeatureFlagTargetingSchema,
} from "./feature-flags.schema"

// ── Enum tests ────────────────────────────────────────────────────────────────

describe("FeatureFlagGroupEnum", () => {
	it("accepts valid groups", () => {
		expect(FeatureFlagGroupEnum.parse("platform-control")).toBe("platform-control")
		expect(FeatureFlagGroupEnum.parse("compliance")).toBe("compliance")
		expect(FeatureFlagGroupEnum.parse("integration")).toBe("integration")
	})

	it("rejects unknown groups", () => {
		expect(() => FeatureFlagGroupEnum.parse("unknown")).toThrow()
	})
})

describe("FeatureFlagRiskLevelEnum", () => {
	it("accepts low, moderate, high", () => {
		expect(FeatureFlagRiskLevelEnum.parse("low")).toBe("low")
		expect(FeatureFlagRiskLevelEnum.parse("moderate")).toBe("moderate")
		expect(FeatureFlagRiskLevelEnum.parse("high")).toBe("high")
	})
})

describe("FeatureFlagEnvironmentEnum", () => {
	it("accepts dev, staging, prod", () => {
		expect(FeatureFlagEnvironmentEnum.parse("dev")).toBe("dev")
		expect(FeatureFlagEnvironmentEnum.parse("staging")).toBe("staging")
		expect(FeatureFlagEnvironmentEnum.parse("prod")).toBe("prod")
	})

	it("rejects development or production (wrong casing/names)", () => {
		expect(() => FeatureFlagEnvironmentEnum.parse("development")).toThrow()
		expect(() => FeatureFlagEnvironmentEnum.parse("production")).toThrow()
	})
})

// ── CreateFeatureFlagSchema ───────────────────────────────────────────────────

describe("CreateFeatureFlagSchema", () => {
	const valid = {
		key: "my-feature",
		name: "My Feature",
		group: "platform-control" as const,
		riskLevel: "low" as const,
		defaultEnabled: false,
	}

	it("accepts a minimal valid payload", () => {
		expect(() => CreateFeatureFlagSchema.parse(valid)).not.toThrow()
	})

	it("rejects keys with uppercase letters", () => {
		expect(() =>
			CreateFeatureFlagSchema.parse({ ...valid, key: "My-Feature" })
		).toThrow()
	})

	it("rejects keys with spaces", () => {
		expect(() =>
			CreateFeatureFlagSchema.parse({ ...valid, key: "my feature" })
		).toThrow()
	})

	it("accepts keys with digits and hyphens", () => {
		const result = CreateFeatureFlagSchema.parse({ ...valid, key: "ff-2025-v1" })
		expect(result.key).toBe("ff-2025-v1")
	})

	it("defaults defaultEnabled to false when omitted", () => {
		const { defaultEnabled: _, ...withoutDefault } = valid
		const result = CreateFeatureFlagSchema.parse(withoutDefault)
		expect(result.defaultEnabled).toBe(false)
	})

	it("rejects empty key", () => {
		expect(() =>
			CreateFeatureFlagSchema.parse({ ...valid, key: "" })
		).toThrow()
	})
})

// ── FeatureFlagKeySchema ──────────────────────────────────────────────────────

describe("FeatureFlagKeySchema", () => {
	it("accepts non-empty key", () => {
		expect(FeatureFlagKeySchema.parse({ key: "my-flag" })).toEqual({ key: "my-flag" })
	})

	it("rejects empty key", () => {
		expect(() => FeatureFlagKeySchema.parse({ key: "" })).toThrow()
	})
})

// ── FeatureFlagTargetInputSchema ──────────────────────────────────────────────

describe("FeatureFlagTargetInputSchema", () => {
	it("defaults all nullable fields to null", () => {
		const result = FeatureFlagTargetInputSchema.parse({ enabled: true })
		expect(result.environment).toBeNull()
		expect(result.facilityId).toBeNull()
		expect(result.roleId).toBeNull()
		expect(result.enabled).toBe(true)
	})

	it("accepts explicit null values", () => {
		const result = FeatureFlagTargetInputSchema.parse({
			environment: null,
			facilityId: null,
			roleId: null,
			enabled: false,
		})
		expect(result.environment).toBeNull()
	})

	it("accepts valid environment values", () => {
		const result = FeatureFlagTargetInputSchema.parse({
			environment: "prod",
			enabled: true,
		})
		expect(result.environment).toBe("prod")
	})

	it("rejects invalid environment values", () => {
		expect(() =>
			FeatureFlagTargetInputSchema.parse({ environment: "production", enabled: true })
		).toThrow()
	})

	it("rejects non-UUID facilityId", () => {
		expect(() =>
			FeatureFlagTargetInputSchema.parse({ facilityId: "not-a-uuid", enabled: true })
		).toThrow()
	})
})

// ── UpdateFeatureFlagTargetingSchema ──────────────────────────────────────────

describe("UpdateFeatureFlagTargetingSchema", () => {
	it("accepts empty targets array (removes all overrides)", () => {
		const result = UpdateFeatureFlagTargetingSchema.parse({
			flagId: "00000000-0000-4000-a000-000000000001",
			targets: [],
		})
		expect(result.targets).toHaveLength(0)
	})

	it("rejects non-UUID flagId", () => {
		expect(() =>
			UpdateFeatureFlagTargetingSchema.parse({ flagId: "not-a-uuid", targets: [] })
		).toThrow()
	})

	it("accepts multiple targets", () => {
		const result = UpdateFeatureFlagTargetingSchema.parse({
			flagId: "00000000-0000-4000-a000-000000000001",
			targets: [
				{ environment: "prod", enabled: true },
				{ environment: "staging", enabled: false },
			],
		})
		expect(result.targets).toHaveLength(2)
	})
})

// ── FeatureFlagSchema date coercion ───────────────────────────────────────────

describe("FeatureFlagSchema", () => {
	const base = {
		id: "00000000-0000-4000-a000-000000000001",
		key: "test-flag",
		name: "Test Flag",
		description: null,
		group: "compliance" as const,
		riskLevel: "moderate" as const,
		ownerTeam: null,
		defaultEnabled: false,
	}

	it("coerces ISO date strings to Date objects", () => {
		const now = new Date().toISOString()
		const result = FeatureFlagSchema.parse({
			...base,
			createdAt: now,
			updatedAt: now,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
	})

	it("passes through Date objects unchanged", () => {
		const now = new Date()
		const result = FeatureFlagSchema.parse({
			...base,
			createdAt: now,
			updatedAt: now,
		})
		expect(result.createdAt).toBeInstanceOf(Date)
	})
})
