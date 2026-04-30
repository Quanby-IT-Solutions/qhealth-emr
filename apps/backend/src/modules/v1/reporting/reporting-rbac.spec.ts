/**
 * Reporting RBAC Guard Tests (REPORT-001, REPORT-002)
 *
 * Verifies that every reporting handler carries the correct
 * @RequirePermission metadata so that:
 *
 *   REPORT-001 — Administrator must NOT satisfy any reporting gates:
 *     • Surveillance flag handlers  → reporting:edit  (PIDSR Officer only)
 *     • PIDSR case handlers         → reporting:edit  (PIDSR Officer only)
 *     • Weekly report generation    → reporting:edit  (PIDSR Officer only)
 *     • AHSR drilldown              → reporting:edit  (PIDSR Officer only)
 *     • AHSR view handlers          → reporting:view  (Reporting Officer only — Administrator no longer holds this)
 *
 *   REPORT-002 — Administrator CANNOT satisfy the AHSR export gate:
 *     • exportAhsr                  → reporting:export (Reporting Officer only — Administrator does not hold this)
 *
 * Tests use Reflect.getMetadata to inspect decorator metadata without
 * spinning up the full NestJS DI container.
 *
 * ESM-only packages are mocked with minimal CJS stubs.
 * rbac.guard.ts is mocked to avoid the better-auth/node ESM chain.
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
	v1: {
		reporting: {
			listSurveillanceFlags: {},
			reviewSurveillanceFlag: {},
			scanEncounter: {},
			listDetectionRules: {},
			runAutoDetection: {},
			listPidsrCases: {},
			getPidsrCase: {},
			submitPidsrCase: {},
			generateWeeklyReport: {},
			getAhsrMetrics: {},
			getAhsrRealTime: {},
			drilldownAhsr: {},
			exportAhsr: {},
		},
	},
}))
jest.mock("./reporting.service", () => ({
	ReportingService: class ReportingService {},
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

import { ReportingController } from "./reporting.controller"

type PermEntry = { module: string; action: string }

function getSinglePermission(methodName: keyof ReportingController): PermEntry | undefined {
	return Reflect.getMetadata("rbac", ReportingController.prototype, methodName)
}

// ─────────────────────────────────────────────────────────────────────────────

describe("ReportingController — RBAC guard metadata (REPORT-001, REPORT-002)", () => {
	// ── REPORT-001: Surveillance flag handlers require reporting:edit ──────────
	describe("REPORT-001 — Surveillance flag handlers require reporting:edit (Administrator blocked)", () => {
		const editHandlers: Array<keyof ReportingController> = [
			"listSurveillanceFlags",
			"reviewSurveillanceFlag",
			"scanEncounter",
			"listDetectionRules",
			"runAutoDetection",
		]

		it.each(editHandlers)(
			"%s requires reporting:edit so Administrator cannot satisfy it",
			(methodName) => {
				const perm = getSinglePermission(methodName)
				expect(perm).toEqual({ module: "reporting", action: "edit" })
			}
		)
	})

	// ── REPORT-001: PIDSR case handlers require reporting:edit ────────────────
	describe("REPORT-001 — PIDSR case handlers require reporting:edit (Administrator blocked)", () => {
		const pidsrHandlers: Array<keyof ReportingController> = [
			"listPidsrCases",
			"getPidsrCase",
			"submitPidsrCase",
		]

		it.each(pidsrHandlers)(
			"%s requires reporting:edit so Administrator cannot satisfy it",
			(methodName) => {
				const perm = getSinglePermission(methodName)
				expect(perm).toEqual({ module: "reporting", action: "edit" })
			}
		)
	})

	// ── REPORT-001: Weekly report and AHSR drilldown require reporting:edit ───
	describe("REPORT-001 — Weekly report and AHSR drilldown require reporting:edit (Administrator blocked)", () => {
		it("generateWeeklyReport requires reporting:edit", () => {
			const perm = getSinglePermission("generateWeeklyReport")
			expect(perm).toEqual({ module: "reporting", action: "edit" })
		})

		it("drilldownAhsr requires reporting:edit", () => {
			const perm = getSinglePermission("drilldownAhsr")
			expect(perm).toEqual({ module: "reporting", action: "edit" })
		})
	})

	// ── REPORT-001: AHSR view handlers require reporting:view (Administrator no longer holds this) ───
	describe("REPORT-001 — AHSR view handlers require reporting:view (Administrator does NOT hold this)", () => {
		it("getAhsrMetrics requires reporting:view — Administrator no longer holds reporting:view", () => {
			const perm = getSinglePermission("getAhsrMetrics")
			expect(perm).toEqual({ module: "reporting", action: "view" })
		})

		it("getAhsrRealTime requires reporting:view — Administrator no longer holds reporting:view", () => {
			const perm = getSinglePermission("getAhsrRealTime")
			expect(perm).toEqual({ module: "reporting", action: "view" })
		})
	})

	// ── REPORT-002: AHSR export requires reporting:export ─────────────────────
	describe("REPORT-002 — AHSR export requires reporting:export (Administrator cannot satisfy)", () => {
		it("exportAhsr requires reporting:export — Reporting Officer owns this, Administrator does not", () => {
			const perm = getSinglePermission("exportAhsr")
			expect(perm).toEqual({ module: "reporting", action: "export" })
		})
	})

	// ── Completeness: no handler is accidentally left unguarded ───────────────
	describe("All handlers are explicitly guarded", () => {
		const allHandlers: Array<keyof ReportingController> = [
			"listSurveillanceFlags",
			"reviewSurveillanceFlag",
			"scanEncounter",
			"listDetectionRules",
			"runAutoDetection",
			"listPidsrCases",
			"getPidsrCase",
			"submitPidsrCase",
			"generateWeeklyReport",
			"getAhsrMetrics",
			"getAhsrRealTime",
			"drilldownAhsr",
			"exportAhsr",
		]

		it.each(allHandlers)("%s has a @RequirePermission decorator", (methodName) => {
			const perm = getSinglePermission(methodName)
			expect(perm).toBeDefined()
			expect(perm).toHaveProperty("module", "reporting")
			expect(["view", "edit", "export"]).toContain(perm!.action)
		})
	})
})
