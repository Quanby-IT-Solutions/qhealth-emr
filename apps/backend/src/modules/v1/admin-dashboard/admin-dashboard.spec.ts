import { ReportingService } from "../reporting/reporting.service"
import { SlaService } from "../sla/sla.service"
import { AdminDashboardController } from "./admin-dashboard.controller"
import { AdminDashboardService } from "./admin-dashboard.service"

/**
 * Admin Dashboard — FHIR telemetry permission boundary tests (FHIR-009)
 *
 * Verifies that:
 *   1. getSummary() with canViewFhir:false strips fhirFailures from the
 *      returned integrations object (returns 0).
 *   2. getSummary() with canViewFhir:false omits the fhir-failure-no-consent
 *      anomaly alert even when FHIR failures exist and consent is not enforced.
 *   3. getSummary() with canViewFhir:true returns the real fhirFailures count
 *      and emits the FHIR alert when the condition is met.
 *   4. getSummary() with no options (default) leaves FHIR data intact.
 *
 * The service is tested directly (unit style) with all DB calls mocked via
 * jest.spyOn on the private methods, so we never touch a real database.
 *
 * All ESM-only and transitive-contract-importing packages are stubbed via
 * jest.mock() at the module level.
 *
 * ADMIN-003 addendum: controller guard metadata tests for himOps and
 * civilRegistryOps are appended at the end of this file.
 */

// ── ESM / transitive dependency stubs ────────────────────────────────────────

jest.mock("@/common/database/database.client", () => ({ db: {} }))
jest.mock("@repo/db/schema", () => ({}))
// SlaService transitively imports @repo/contracts (value import) which has
// .js extension re-exports that break Jest's CJS transformer. Stub the whole
// service to avoid the chain.
jest.mock("../sla/sla.service", () => ({
	SlaService: class SlaService {},
}))
jest.mock("../reporting/reporting.service", () => ({
	ReportingService: class ReportingService {},
}))

// ── Minimal typed stubs returned by private fetcher methods ───────────────────

const EMPTY_GOVERNANCE = {
	totalAdmins: 0,
	recentRoleChanges: [],
	inactiveAdmins: 0,
	multiFacilityUsers: 0,
	usersWithoutRole: 0,
}

const EMPTY_PLATFORM = {
	totalFeatureFlags: 0,
	activeFlags: 0,
	recentFlagChanges: [],
	highRiskFlagsEnabled: 0,
	missingCriticalSettings: [],
	facilityProfileCompleteness: 100,
}

const EMPTY_AUDIT_BASE = {
	breakGlassEventCount: 0,
	recentPrivilegedChanges: [],
	privilegedChangeCount: 0,
	pendingAuditItems: 0,
	pendingBreakGlassReviews: 0,
	flaggedBreakGlassEvents: 0,
	privilegedChangeCount7d: 0,
}

const EMPTY_ARTA = {
	slaBreachCount: 0,
	pendingRequests: 0,
	avgProcessingDays: 0,
}

const EMPTY_OFFLINE = {
	facilitiesWithoutOfflineSupport: 0,
	totalFacilities: 0,
	status: "ok" as const,
	lastFailureMessage: null,
}

function makeIntegrationHealth(fhirFailures: number) {
	return {
		failedCount: fhirFailures,
		disabledCount: 0,
		missingCredentialsCount: 0,
		staleCount: 0,
		fhirFailures,
	}
}

function stubService(fhirFailures: number, consentEnforced = false) {
	const slaService = new SlaService() as jest.Mocked<SlaService>
	const reportingService = new ReportingService() as jest.Mocked<ReportingService>
	const service = new AdminDashboardService(slaService, reportingService)

	// Stub all private async fetchers via spyOn
	jest.spyOn(service as never, "getAccessGovernance").mockResolvedValue(EMPTY_GOVERNANCE as never)
	jest.spyOn(service as never, "getPlatformControl").mockResolvedValue(EMPTY_PLATFORM as never)
	jest
		.spyOn(service as never, "getIntegrationHealth")
		.mockResolvedValue(makeIntegrationHealth(fhirFailures) as never)
	jest.spyOn(service as never, "getAuditSummary").mockResolvedValue({
		...EMPTY_AUDIT_BASE,
		consentEnforced,
	} as never)
	jest
		.spyOn(service as never, "withMissingSchemaFallback")
		.mockImplementation((async (...args: unknown[]) =>
			(args[2] as () => Promise<unknown>)()) as never)
	jest.spyOn(service as never, "getArtaSla").mockResolvedValue(EMPTY_ARTA as never)
	jest.spyOn(service as never, "getOfflineReadiness").mockResolvedValue(EMPTY_OFFLINE as never)

	return service
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AdminDashboardService.getSummary — FHIR telemetry permission boundary (FHIR-009)", () => {
	afterEach(() => jest.restoreAllMocks())

	describe("caller WITHOUT fhir:view (canViewFhir: false)", () => {
		it("returns fhirFailures as 0 even when real failures exist", async () => {
			const service = stubService(3)
			const result = await service.getSummary("facility-1", { canViewFhir: false })
			expect(result.integrations.fhirFailures).toBe(0)
		})

		it("does NOT emit fhir-failure-no-consent alert when failures exist and consent not enforced", async () => {
			const service = stubService(2, false /* consentEnforced */)
			const result = await service.getSummary("facility-1", { canViewFhir: false })
			const alertIds = result.alerts.map((a: { id: string }) => a.id)
			expect(alertIds).not.toContain("fhir-failure-no-consent")
		})

		it("still returns non-FHIR integration health fields accurately", async () => {
			const service = stubService(3)
			const result = await service.getSummary("facility-1", { canViewFhir: false })
			expect(result.integrations.fhirFailures).toBe(0)
			expect(result.integrations.disabledCount).toBe(0)
			expect(result.integrations.missingCredentialsCount).toBe(0)
		})
	})

	describe("caller WITH fhir:view (canViewFhir: true)", () => {
		it("returns the real fhirFailures count", async () => {
			const service = stubService(5)
			const result = await service.getSummary("facility-1", { canViewFhir: true })
			expect(result.integrations.fhirFailures).toBe(5)
		})

		it("emits fhir-failure-no-consent alert when failures exist and consent not enforced", async () => {
			const service = stubService(2, false)
			const result = await service.getSummary("facility-1", { canViewFhir: true })
			const alertIds = result.alerts.map((a: { id: string }) => a.id)
			expect(alertIds).toContain("fhir-failure-no-consent")
		})

		it("does NOT emit fhir-failure-no-consent alert when consent is enforced", async () => {
			const service = stubService(2, true /* consentEnforced */)
			const result = await service.getSummary("facility-1", { canViewFhir: true })
			const alertIds = result.alerts.map((a: { id: string }) => a.id)
			expect(alertIds).not.toContain("fhir-failure-no-consent")
		})

		it("does NOT emit fhir-failure-no-consent alert when there are no failures", async () => {
			const service = stubService(0, false)
			const result = await service.getSummary("facility-1", { canViewFhir: true })
			const alertIds = result.alerts.map((a: { id: string }) => a.id)
			expect(alertIds).not.toContain("fhir-failure-no-consent")
		})
	})

	describe("default behaviour (no options — backward compat)", () => {
		it("defaults to canViewFhir:true and returns real fhirFailures", async () => {
			const service = stubService(4)
			const result = await service.getSummary("facility-1")
			expect(result.integrations.fhirFailures).toBe(4)
		})
	})
})

// ── ADMIN-003: Controller guard metadata ─────────────────────────────────────
//
// Verifies that AdminDashboardController methods carry the correct
// @RequirePermission metadata:
//   • himOps           → medical_records:view  (HIM staff access, not admin)
//   • civilRegistryOps → admin:view            (admin oversight surface)
//
// Uses Reflect.getMetadata so no DI container spin-up is needed.

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
		adminDashboard: {
			summary: {},
			himOps: {},
			exportCompliance: {},
			civilRegistryOps: {},
			medicationCompliance: {},
		},
	},
}))
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

function getGuard(methodName: keyof AdminDashboardController): PermEntry | undefined {
	return Reflect.getMetadata("rbac", AdminDashboardController.prototype, methodName)
}

describe("AdminDashboardController — RBAC guard metadata (ADMIN-003)", () => {
	it("himOps is guarded by medical_records:view", () => {
		const perm = getGuard("himOps")
		expect(perm).toEqual({ module: "medical_records", action: "view" })
	})

	it("civilRegistryOps is guarded by civil_registry:view", () => {
		const perm = getGuard("civilRegistryOps")
		expect(perm).toEqual({ module: "civil_registry", action: "view" })
	})

	it("summary is guarded by admin:view", () => {
		const perm = getGuard("summary")
		expect(perm).toEqual({ module: "admin", action: "view" })
	})

	it("exportCompliance is guarded by audit:view", () => {
		const perm = getGuard("exportCompliance")
		expect(perm).toEqual({ module: "audit", action: "view" })
	})

	it("medicationCompliance is guarded by formulary:clinical_policy", () => {
		const perm = getGuard("medicationCompliance")
		expect(perm).toEqual({ module: "formulary", action: "clinical_policy" })
	})
})
