/**
 * Formulary RBAC Guard Tests (FORM-010, FORM-011, FORM-013, FORM-014)
 *
 * Verifies that every formulary write handler carries the correct
 * @RequirePermission / @RequirePermissions metadata:
 *
 *   FORM-010 — Administrator must NOT satisfy formulary item write gates:
 *     • createFormularyItem    → formulary:edit only (pharmacist)
 *     • updateFormularyItem    → formulary:edit only (pharmacist)
 *     • deleteFormularyItem    → formulary:edit only (pharmacist)
 *     • Catalog (drug generic/brand) handlers keep admin:view + formulary:manage_catalog
 *       — a permission Administrator holds, but that is separate from formulary item CRUD.
 *
 *   FORM-011 — Clinical policy writes are pharmacist-exclusive:
 *     • updateFormularyClinicalPolicy → formulary:clinical_policy only
 *       (Administrator does not receive formulary:clinical_policy)
 *
 *   FORM-013 — Administrator must NOT satisfy code-set mutation gates:
 *     • All codeSetAdmin write handlers → admin:view AND formulary:terminology_admin
 *       (Administrator does not receive formulary:terminology_admin)
 *
 * Tests use Reflect.getMetadata to inspect decorator metadata without spinning
 * up the full NestJS DI container.
 *
 * ESM-only packages (@orpc/nest, @orpc/server, @thallesp/nestjs-better-auth)
 * are mocked with minimal CJS stubs.  rbac.guard.ts is mocked to avoid the
 * better-auth/node ESM chain.
 */

// ── Mock ESM packages ─────────────────────────────────────────────────────────
jest.mock("@orpc/nest", () => ({
	Implement: () => () => {},
}))
jest.mock("@orpc/server", () => ({
	implement: jest.fn().mockReturnValue({ handler: jest.fn() }),
}))
jest.mock("@thallesp/nestjs-better-auth", () => ({
	Session: () => () => {},
}))
jest.mock("@/config/api-versions.config", () => ({
	v1: { formulary: { drugGeneric: {}, drugBrand: {}, item: {}, icd10: {}, loinc: {}, rxnorm: {}, rvs: {}, snomedCt: {}, codeSetAdmin: {} } },
}))
jest.mock("./formulary.service", () => ({
	FormularyService: class FormularyService {},
}))
jest.mock("@/modules/v1/rbac/rbac.guard", () => ({
	RBAC_PERMISSION_KEY: "rbac",
	RBAC_PERMISSIONS_KEY: "rbac_all",
	RequirePermission: (module: string, action: string) =>
		(target: object, key: string | symbol) => {
			Reflect.defineMetadata("rbac", { module, action }, target, key)
		},
	RequirePermissions: (permissions: Array<{ module: string; action: string }>) =>
		(target: object, key: string | symbol) => {
			Reflect.defineMetadata("rbac_all", permissions, target, key)
		},
}))

import { FormularyController } from "./formulary.controller"

type PermEntry = { module: string; action: string }

function getSinglePermission(methodName: keyof FormularyController): PermEntry | undefined {
	return Reflect.getMetadata("rbac", FormularyController.prototype, methodName)
}

function getMultiPermissions(methodName: keyof FormularyController): PermEntry[] | undefined {
	return Reflect.getMetadata("rbac_all", FormularyController.prototype, methodName)
}

describe("FormularyController — RBAC guard metadata (FORM-010, FORM-011, FORM-013, FORM-014)", () => {
	// ── Drug Generic / Brand (FORM-014 — pharmacist-owned, Administrator blocked) ─
	describe("FORM-014 — Drug catalog handlers require formulary:manage_catalog only (no admin:view gate)", () => {
		const drugCatalogMutators: Array<keyof FormularyController> = [
			"createDrugGeneric",
			"updateDrugGeneric",
			"createDrugBrand",
			"updateDrugBrand",
		]

		it.each(drugCatalogMutators)("%s uses single formulary:manage_catalog permission", (method) => {
			expect(getSinglePermission(method)).toEqual({ module: "formulary", action: "manage_catalog" })
		})

		it.each(drugCatalogMutators)("%s does NOT use a multi-permission (AND) gate — admin:view would block Pharmacist", (method) => {
			expect(getMultiPermissions(method)).toBeUndefined()
		})
	})

	// ── Formulary Items (pharmacist-level — formulary:edit only) ─────────────
	describe("FORM-010 — Formulary item write handlers require formulary:edit (pharmacist), not admin:view", () => {
		it("createFormularyItem requires formulary:edit only", () => {
			// Single-permission guard — no admin:view dual gate
			expect(getSinglePermission("createFormularyItem")).toEqual({ module: "formulary", action: "edit" })
			// Must NOT carry a multi-permission (AND) gate that would require admin:view
			expect(getMultiPermissions("createFormularyItem")).toBeUndefined()
		})

		it("updateFormularyItem requires formulary:edit only", () => {
			expect(getSinglePermission("updateFormularyItem")).toEqual({ module: "formulary", action: "edit" })
			expect(getMultiPermissions("updateFormularyItem")).toBeUndefined()
		})

		it("deleteFormularyItem requires formulary:edit only", () => {
			expect(getSinglePermission("deleteFormularyItem")).toEqual({ module: "formulary", action: "edit" })
			expect(getMultiPermissions("deleteFormularyItem")).toBeUndefined()
		})
	})

	// ── Clinical Policy (pharmacist-exclusive — formulary:clinical_policy) ───
	describe("FORM-011 — updateFormularyClinicalPolicy requires formulary:clinical_policy only", () => {
		it("uses the clinical_policy action, not formulary:edit", () => {
			expect(getSinglePermission("updateFormularyClinicalPolicy")).toEqual({
				module: "formulary",
				action: "clinical_policy",
			})
		})

		it("does NOT use a multi-permission gate that could include admin:view", () => {
			expect(getMultiPermissions("updateFormularyClinicalPolicy")).toBeUndefined()
		})
	})

	// ── Code Set Admin — terminology governance (FORM-013) ───────────────────
	describe("FORM-013 — codeSetAdmin mutation handlers require admin:view AND formulary:terminology_admin", () => {
		const codeSetMutators: Array<keyof FormularyController> = [
			"recordCatalogUpload",
			"setCodeActive",
			"createDeprecation",
			"updateDeprecation",
			"deleteDeprecation",
			"adminSearchEntries",
			"createEntry",
			"updateEntry",
			"deleteEntry",
			"publishVersion",
		]

		it.each(codeSetMutators)("%s requires admin:view AND formulary:terminology_admin", (method) => {
			expect(getMultiPermissions(method)).toEqual([
				{ module: "admin", action: "view" },
				{ module: "formulary", action: "terminology_admin" },
			])
		})

		it.each(codeSetMutators)("%s does NOT use formulary:manage_catalog (Administrator is blocked)", (method) => {
			const perms = getMultiPermissions(method)
			expect(perms?.some((p) => p.action === "manage_catalog")).toBe(false)
		})

		it("deleteDeprecation does NOT use formulary:delete", () => {
			const perms = getMultiPermissions("deleteDeprecation")
			expect(perms?.some((p) => p.action === "delete")).toBe(false)
		})

		it("deleteEntry does NOT use formulary:delete", () => {
			const perms = getMultiPermissions("deleteEntry")
			expect(perms?.some((p) => p.action === "delete")).toBe(false)
		})
	})
})
