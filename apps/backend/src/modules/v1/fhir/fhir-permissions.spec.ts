import { FhirController } from "./fhir.controller"

/**
 * FHIR Permission Guard Tests (FHIR-003, FHIR-007)
 *
 * Verifies that every FhirController handler carries the correct
 * @RequirePermissions metadata (AND logic — all listed permissions required):
 *
 *   • All handlers require admin:view (workspace boundary — FHIR-007)
 *   • Read-only operations (list, get, validation report, system status)
 *     require fhir:view in addition to admin:view
 *   • Bundle download requires fhir:export (not fhir:view — FHIR-003 fix)
 *   • Mutation operations (createExport, submitToNhdr) require fhir:export
 *   • Submission history requires fhir:view
 *
 * The tests use Reflect.getMetadata so they never spin up the full NestJS
 * DI container — they simply read the decorator metadata that was stamped on
 * the prototype method at class-definition time.
 *
 * NOTE: We do NOT import from rbac.guard.ts directly because that module
 * transitively imports 'better-auth/node' which is an ESM package.  The
 * metadata key value 'rbac_all' is copied here from RBAC_PERMISSIONS_KEY.
 * We also mock @orpc/nest, @orpc/server and @thallesp/nestjs-better-auth
 * because they are distributed as ESM and cannot be required by Jest directly.
 */

// ── Mock ESM packages that FhirController depends on ─────────────────────────

// @orpc/nest and @orpc/server are ESM-only; provide minimal CJS stubs.
jest.mock("@orpc/nest", () => ({
	Implement: () => () => {},
}))
jest.mock("@orpc/server", () => ({
	implement: jest.fn().mockReturnValue({ handler: jest.fn() }),
}))
// @thallesp/nestjs-better-auth provides the @Session() param decorator
jest.mock("@thallesp/nestjs-better-auth", () => ({
	Session: () => () => {},
}))
// api-versions config just needs to export a v1 object with a fhir contract
jest.mock("@/config/api-versions.config", () => ({
	v1: { fhir: {} },
}))
// Mock FhirService to cut its entire transitive dependency chain
// (env.config → @t3-oss/env-core ESM, db/schema → .js re-exports, etc.)
jest.mock("./fhir.service", () => ({
	FhirService: class FhirService {},
}))

// Avoid the ESM chain via better-auth/node by mocking the RBAC guard module.
jest.mock("@/modules/v1/rbac/rbac.guard", () => ({
	RBAC_PERMISSION_KEY: "rbac",
	RBAC_PERMISSIONS_KEY: "rbac_all",
	RequirePermission: (module: string, action: string) => (target: object, key: string | symbol) => {
		Reflect.defineMetadata("rbac", { module, action }, target, key)
	},
	RequirePermissions:
		(permissions: Array<{ module: string; action: string }>) =>
		(target: object, key: string | symbol) => {
			Reflect.defineMetadata("rbac_all", permissions, target, key)
		},
}))

type PermEntry = { module: string; action: string }

function getPermissions(methodName: keyof FhirController): PermEntry[] | undefined {
	return Reflect.getMetadata("rbac_all", FhirController.prototype, methodName)
}

describe("FhirController — @RequirePermissions metadata (FHIR-003, FHIR-007)", () => {
	it("listExports requires admin:view AND fhir:view", () => {
		expect(getPermissions("listExports")).toEqual([
			{ module: "admin", action: "view" },
			{ module: "fhir", action: "view" },
		])
	})

	it("getExport requires admin:view AND fhir:view", () => {
		expect(getPermissions("getExport")).toEqual([
			{ module: "admin", action: "view" },
			{ module: "fhir", action: "view" },
		])
	})

	it("getValidationReport requires admin:view AND fhir:view", () => {
		expect(getPermissions("getValidationReport")).toEqual([
			{ module: "admin", action: "view" },
			{ module: "fhir", action: "view" },
		])
	})

	it("listNhdrSubmissions requires admin:view AND fhir:view", () => {
		expect(getPermissions("listNhdrSubmissions")).toEqual([
			{ module: "admin", action: "view" },
			{ module: "fhir", action: "view" },
		])
	})

	it("getSystemStatus requires admin:view AND fhir:view", () => {
		expect(getPermissions("getSystemStatus")).toEqual([
			{ module: "admin", action: "view" },
			{ module: "fhir", action: "view" },
		])
	})

	it("createExport requires admin:view AND fhir:export", () => {
		expect(getPermissions("createExport")).toEqual([
			{ module: "admin", action: "view" },
			{ module: "fhir", action: "export" },
		])
	})

	it("submitToNhdr requires admin:view AND fhir:export", () => {
		expect(getPermissions("submitToNhdr")).toEqual([
			{ module: "admin", action: "view" },
			{ module: "fhir", action: "export" },
		])
	})

	/**
	 * FHIR-003 regression: bundle download must require fhir:export, NOT fhir:view.
	 * A user with only fhir:view must NOT be able to download a bundle — the download
	 * endpoint streams raw clinical data (PII / PHI) and must be gated behind the
	 * stronger export permission.
	 */
	it("downloadBundle requires admin:view AND fhir:export (FHIR-003 regression)", () => {
		expect(getPermissions("downloadBundle")).toEqual([
			{ module: "admin", action: "view" },
			{ module: "fhir", action: "export" },
		])
	})

	it("downloadBundle does NOT include fhir:view (regression guard)", () => {
		const perms = getPermissions("downloadBundle")
		expect(perms?.some(p => p.module === "fhir" && p.action === "view")).toBe(false)
	})

	it("all handlers include admin:view in their required permissions (FHIR-007)", () => {
		const handlers: (keyof FhirController)[] = [
			"listExports",
			"getExport",
			"createExport",
			"getValidationReport",
			"submitToNhdr",
			"listNhdrSubmissions",
			"downloadBundle",
			"getSystemStatus",
		]
		for (const handler of handlers) {
			const perms = getPermissions(handler)
			expect(perms?.some(p => p.module === "admin" && p.action === "view")).toBe(true)
		}
	})
})
