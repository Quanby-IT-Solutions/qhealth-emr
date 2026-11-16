/**
 * SLA-024: Death-report controller RBAC permission contract tests
 *
 * Verifies that every mutation endpoint that writes Flow 7 SLA evidence
 * carries an explicit @RequirePermission decorator, so the RBAC guard
 * cannot silently fall back to authenticated-only access.
 *
 * Permission model (mirrors civil-registry baseline):
 *   create  → createFmdrf, createFndrf
 *   edit    → updateFmdrf, updateFndrf, markDeathReportPaid, markDeathReportReleased
 *   view    → getStatus, getFmdrf, getFndrf  (read-only, not checked here)
 *
 * Implementation notes:
 *   - rbac.guard is mocked to avoid pulling in better-auth/node (ESM-only).
 *     The mock implements RequirePermission correctly using Reflect.defineMetadata
 *     so the actual decorator metadata is set and readable by the tests.
 *   - @orpc/nest and @orpc/server are mocked with no-op implementations.
 *   - DeathReportingService is auto-mocked (not exercised here).
 */

// reflect-metadata must be loaded before any decorator-using imports
import "reflect-metadata"

import { DeathReportingController } from "./death-reporting.controller"

// ============================================================================
// Mock rbac.guard first (before importing the controller) to avoid the
// better-auth/node ESM import chain that Jest cannot transform.
// ============================================================================
const RBAC_PERMISSION_KEY = "rbac"

jest.mock("@thallesp/nestjs-better-auth", () => ({
	Session: () => () => undefined,
}))

jest.mock("@/common/database/database.client", () => ({
	db: {
		select: jest.fn(),
	},
}))

jest.mock("@repo/db/schema", () => ({
	deathReports: {
		facilityId: "facilityId",
		id: "id",
	},
	staffProfiles: {
		facilityId: "facilityId",
		id: "id",
		isActive: "isActive",
		userId: "userId",
	},
}))

jest.mock("@/modules/v1/rbac/rbac.guard", () => ({
	RBAC_PERMISSION_KEY: "rbac",
	// Functional replica of NestJS SetMetadata: attaches metadata to descriptor.value
	// so that Reflect.getMetadata works on the prototype method after decoration.
	RequirePermission:
		(module: string, action: string) =>
		(target: object, _key: string | symbol, descriptor: PropertyDescriptor) => {
			Reflect.defineMetadata("rbac", { module, action }, descriptor.value)
			return descriptor
		},
	RbacGuard: jest.fn(),
}))

jest.mock("@orpc/nest", () => ({
	// No-op decorator: does not modify descriptor so RequirePermission still
	// attaches to the original method function.
	Implement: () => () => undefined,
}))

jest.mock("@orpc/server", () => ({
	implement: () => ({ handler: (_fn: unknown) => undefined }),
}))

jest.mock("@/config/api-versions.config", () => ({
	v1: {
		deathReporting: new Proxy({}, { get: () => ({}) }),
	},
}))

jest.mock("./death-reporting.service", () => ({
	// Factory mock — prevents Jest from loading the real service file and
	// triggering the @repo/db/schema .js-extension import chain.
	DeathReportingService: jest.fn().mockImplementation(() => ({})),
}))

// ============================================================================
// Helpers
// ============================================================================
function getPermission(methodName: string) {
	// Metadata is attached to descriptor.value (the method function itself).
	const method = (DeathReportingController.prototype as unknown as Record<string, unknown>)[
		methodName
	] as Function
	return Reflect.getMetadata(RBAC_PERMISSION_KEY, method) as
		{ module: string; action: string } | undefined
}

// ============================================================================
// Tests
// ============================================================================
describe("DeathReportingController — SLA-024 RBAC permission metadata", () => {
	// -------------------------------------------------------------------------
	// FMDRF mutations
	// -------------------------------------------------------------------------
	describe("createFmdrf", () => {
		it("requires death_reporting / create permission", () => {
			expect(getPermission("createFmdrf")).toEqual({
				module: "death_reporting",
				action: "create",
			})
		})
	})

	describe("updateFmdrf", () => {
		it("requires death_reporting / edit permission", () => {
			expect(getPermission("updateFmdrf")).toEqual({
				module: "death_reporting",
				action: "edit",
			})
		})
	})

	// -------------------------------------------------------------------------
	// FNDRF mutations
	// -------------------------------------------------------------------------
	describe("createFndrf", () => {
		it("requires death_reporting / create permission", () => {
			expect(getPermission("createFndrf")).toEqual({
				module: "death_reporting",
				action: "create",
			})
		})
	})

	describe("updateFndrf", () => {
		it("requires death_reporting / edit permission", () => {
			expect(getPermission("updateFndrf")).toEqual({
				module: "death_reporting",
				action: "edit",
			})
		})
	})

	// -------------------------------------------------------------------------
	// SLA checkpoint mutations
	// -------------------------------------------------------------------------
	describe("markDeathReportPaid", () => {
		it("requires death_reporting / edit permission (SLA-017 payment evidence)", () => {
			expect(getPermission("markDeathReportPaid")).toEqual({
				module: "death_reporting",
				action: "edit",
			})
		})
	})

	describe("markDeathReportReleased", () => {
		it("requires death_reporting / edit permission (SLA-023 release evidence)", () => {
			expect(getPermission("markDeathReportReleased")).toEqual({
				module: "death_reporting",
				action: "edit",
			})
		})
	})

	// -------------------------------------------------------------------------
	// Sanity-check: read endpoints use view permission (not changed by SLA-024)
	// -------------------------------------------------------------------------
	describe("getFmdrf (read-only, unchanged)", () => {
		it("still requires death_reporting / view permission", () => {
			expect(getPermission("getFmdrf")).toEqual({
				module: "death_reporting",
				action: "view",
			})
		})
	})

	describe("getFndrf (read-only, unchanged)", () => {
		it("still requires death_reporting / view permission", () => {
			expect(getPermission("getFndrf")).toEqual({
				module: "death_reporting",
				action: "view",
			})
		})
	})
})
