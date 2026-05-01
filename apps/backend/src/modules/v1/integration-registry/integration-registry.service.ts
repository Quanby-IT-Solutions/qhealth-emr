import { createHash, createHmac, randomBytes } from "crypto"

import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import { integrationApiKeys, integrations, webhookEndpoints } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { INTEGRATION_CREDENTIAL_ENV_VARS } from "@/config/app.config"
import { AUDIT_ENTITY_TYPES } from "@/modules/v1/audit/audit-entity-types"
import { type DBTransaction, AuditService } from "@/modules/v1/audit/audit.service"

type IntegrationRow = typeof integrations.$inferSelect
type CredentialStatus = "ok" | "missing_in_env" | "not_in_whitelist" | "unset"
type TestReadinessLevel = "activation" | "transport" | "none"

type ProbeCheck = { name: string; status: "pass" | "fail" | "skipped"; detail: string }

type ConnectivityResult = {
	status: "ok" | "error"
	readinessLevel: TestReadinessLevel
	latencyMs: number | null
	detail: string
	credentialProbed: boolean
	checks: ProbeCheck[]
}

type IntegrationWithStatus = IntegrationRow & { credentialStatus: CredentialStatus }

interface FieldChange {
	path: string
	before: unknown
	after: unknown
}

/**
 * Derive the credentialStatus for an integration row.
 * No credential values are exposed — only the status is computed.
 */
function deriveCredentialStatus(credentialsRef: string | null): CredentialStatus {
	if (!credentialsRef) return "unset"
	const whitelist: readonly string[] = INTEGRATION_CREDENTIAL_ENV_VARS
	if (!whitelist.includes(credentialsRef)) return "not_in_whitelist"
	const val = process.env[credentialsRef]
	if (!val) return "missing_in_env"
	return "ok"
}

function withStatus(row: IntegrationRow): IntegrationWithStatus {
	return { ...row, credentialStatus: deriveCredentialStatus(row.credentialsRef) }
}

const UPDATE_COLS = [
	"kind",
	"name",
	"endpointUrl",
	"credentialsRef",
	"webhookUrl",
	"enabled",
	"notes",
] as const

/**
 * Fields whose change invalidates any previously-recorded connectivity proof.
 * If any of these change, lastTestedAt/lastTestStatus/lastTestReadinessLevel must be
 * nulled so the readiness gate cannot be bypassed with a stale proof.
 */
const CONNECTIVITY_INVALIDATING_COLS = ["endpointUrl", "credentialsRef", "kind"] as const

type UpdateableField = (typeof UPDATE_COLS)[number]

function diffFields(
	before: IntegrationRow,
	after: Partial<IntegrationRow>
): FieldChange[] {
	const changes: FieldChange[] = []

	for (const col of UPDATE_COLS) {
		if (!(col in after)) continue
		const oldVal = before[col]
		const newVal = after[col]
		if (oldVal !== newVal) {
			changes.push({ path: col, before: oldVal, after: newVal })
		}
	}

	return changes
}

@Injectable()
export class IntegrationRegistryService {
	private readonly logger = new Logger(IntegrationRegistryService.name)

	constructor(private readonly auditService: AuditService) {}

	/**
	 * List all integrations for a facility with computed credentialStatus.
	 * Writes a read audit entry so every enumeration of the registry is traceable.
	 */
	async list(
		facilityId: string,
		actor: { userId: string; facilityId: string; staffProfileId: string | null; ipAddress: string | null; userAgent: string | null }
	): Promise<IntegrationWithStatus[]> {
		const rows = await db
			.select()
			.from(integrations)
			.where(eq(integrations.facilityId, facilityId))

		const result = rows.map(withStatus)

		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "read",
			entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
			entityId: facilityId,
			beforeState: null,
			afterState: null,
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: { event: "integration_list_viewed", count: result.length },
		})

		return result
	}

	/**
	 * Get a single integration by ID (must belong to the facility).
	 * When `actor` is supplied (direct controller call) a read audit entry is written.
	 * Internal callers (testConnectivity, listApiKeys, etc.) omit actor to avoid double-logging.
	 */
	async get(
		facilityId: string,
		id: string,
		actor?: { userId: string; facilityId: string; staffProfileId: string | null; ipAddress: string | null; userAgent: string | null }
	): Promise<IntegrationWithStatus> {
		const [row] = await db
			.select()
			.from(integrations)
			.where(and(eq(integrations.id, id), eq(integrations.facilityId, facilityId)))

		if (!row) throw new NotFoundException(`Integration ${id} not found`)

		if (actor) {
			await this.auditService.log({
				facilityId: actor.facilityId,
				userId: actor.userId,
				staffProfileId: actor.staffProfileId,
				action: "read",
				entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
				entityId: id,
				beforeState: null,
				afterState: null,
				ipAddress: actor.ipAddress,
				userAgent: actor.userAgent,
				metadata: { event: "integration_viewed" },
			})
		}

		return withStatus(row)
	}

	/**
	 * Create a new integration.
	 * Validates credentialsRef against the whitelist.
	 * Writes audit atomically.
	 */
	async create(
		facilityId: string,
		input: {
			kind: IntegrationRow["kind"]
			name: string
			endpointUrl: string
			credentialsRef?: string | null
			webhookUrl?: string | null
			enabled?: boolean
			notes?: string | null
		},
		actor: { userId: string; facilityId: string; staffProfileId: string | null; ipAddress: string | null; userAgent: string | null }
	): Promise<IntegrationWithStatus> {
		this.validateCredentialsRef(input.credentialsRef)

		// Readiness gate: a brand-new integration has never been tested, so it cannot
		// be created in an enabled state.
		if (input.enabled === true) {
			throw new BadRequestException(
				"A new integration cannot be created in an enabled state. " +
				"Save it first, run the connectivity test, then enable it."
			)
		}

		return db.transaction(async (tx: DBTransaction) => {
			const [created] = await tx
				.insert(integrations)
				.values({
					facilityId,
					kind: input.kind,
					name: input.name,
					endpointUrl: input.endpointUrl,
					credentialsRef: input.credentialsRef ?? null,
					webhookUrl: input.webhookUrl ?? null,
					enabled: input.enabled ?? false,
					notes: input.notes ?? null,
				})
				.returning()

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "create",
					entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
					entityId: created!.id,
					beforeState: null,
					afterState: created as unknown as Record<string, unknown>,
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
					metadata: {},
				},
				{ tx }
			)

			return withStatus(created!)
		})
	}

	/**
	 * Update an integration. Computes per-field diff, writes audit atomically.
	 */
	async update(
		facilityId: string,
		input: {
			id: string
			kind?: IntegrationRow["kind"]
			name?: string
			endpointUrl?: string
			credentialsRef?: string | null
			webhookUrl?: string | null
			enabled?: boolean
			notes?: string | null
		},
		actor: { userId: string; facilityId: string; staffProfileId: string | null; ipAddress: string | null; userAgent: string | null }
	): Promise<IntegrationWithStatus> {
		this.validateCredentialsRef(input.credentialsRef)

		return db.transaction(async (tx: DBTransaction) => {
			const [current] = await tx
				.select()
				.from(integrations)
				.where(and(eq(integrations.id, input.id), eq(integrations.facilityId, facilityId)))

			if (!current) throw new NotFoundException(`Integration ${input.id} not found`)

			// Readiness gate: kind-aware enablement.
			//
			// - fhir and nhdr: require activation-grade proof (contract-level interoperability
			//   confirmed via CapabilityStatement or /submissions 2xx respectively).
			// - All other kinds (pidsr, hai, philhealth, erp, lis, pacs, telemedicine, custom):
			//   the strongest automated proof available is a credentialed transport 2xx. These
			//   kinds are submission-based and a HEAD probe cannot prove payload acceptance, so
			//   transport-grade is the honest ceiling. Allow enabling from transport-grade proof.
			if (input.enabled === true && !current.enabled) {
				const READINESS_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
				const testedAt = current.lastTestedAt
				const kindRequiresActivation = current.kind === "fhir" || current.kind === "nhdr"
				const isRecentPass =
					current.lastTestStatus === "ok" &&
					(!kindRequiresActivation || current.lastTestReadinessLevel === "activation") &&
					testedAt !== null &&
					Date.now() - testedAt.getTime() < READINESS_WINDOW_MS

				if (!isRecentPass) {
					const hint = kindRequiresActivation
						? "Run the connectivity test first and ensure it reaches activation-grade readiness."
						: "Run the connectivity test first and ensure it passes (transport-grade proof is sufficient for this kind)."
					throw new BadRequestException(
						"Integration cannot be enabled without a recent successful connectivity test. " +
						hint
					)
				}
			}

			const changes = diffFields(current, input as Partial<IntegrationRow>)

			// Invalidation gate: connection-critical fields cannot change on a live integration
			// because the existing readiness proof was recorded against the old config.
			const connectionChanged = changes.some(c =>
				(CONNECTIVITY_INVALIDATING_COLS as readonly string[]).includes(c.path)
			)
			if (connectionChanged && current.enabled) {
				throw new BadRequestException(
					"Cannot change endpoint, credential, or kind on a live integration. " +
					"Disable the integration first, then update the connection settings and re-run the connectivity test."
				)
			}

			const updatePayload: Partial<IntegrationRow> = { updatedAt: new Date() }
			for (const col of UPDATE_COLS) {
				if (col in input) {
					;(updatePayload as Record<string, unknown>)[col] = (input as Record<string, unknown>)[col]
				}
			}

			// Null out stale readiness proof when connection config changes on a disabled integration
			if (connectionChanged) {
				updatePayload.lastTestedAt = null
				updatePayload.lastTestStatus = null
				updatePayload.lastTestReadinessLevel = null
			}

			const [updated] = await tx
				.update(integrations)
				.set(updatePayload)
				.where(and(eq(integrations.id, input.id), eq(integrations.facilityId, facilityId)))
				.returning()

			if (changes.length > 0) {
				await this.auditService.log(
					{
						facilityId: actor.facilityId,
						userId: actor.userId,
						staffProfileId: actor.staffProfileId,
						action: "update",
						entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
						entityId: input.id,
						beforeState: current as unknown as Record<string, unknown>,
						afterState: updated as unknown as Record<string, unknown>,
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
						metadata: { changes },
					},
					{ tx }
				)
			}

			return withStatus(updated!)
		})
	}

	/**
	 * Delete an integration. Writes audit atomically.
	 */
	async delete(
		facilityId: string,
		id: string,
		actor: { userId: string; facilityId: string; staffProfileId: string | null; ipAddress: string | null; userAgent: string | null }
	): Promise<IntegrationWithStatus> {
		return db.transaction(async (tx: DBTransaction) => {
			const [current] = await tx
				.select()
				.from(integrations)
				.where(and(eq(integrations.id, id), eq(integrations.facilityId, facilityId)))

			if (!current) throw new NotFoundException(`Integration ${id} not found`)

			await tx.delete(integrations).where(eq(integrations.id, id))

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "delete",
					entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
					entityId: id,
					beforeState: current as unknown as Record<string, unknown>,
					afterState: null,
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
					metadata: {},
				},
				{ tx }
			)

			return withStatus(current)
		})
	}

	/**
	 * Return the whitelisted credential env var names only — no values.
	 * Writes a read audit entry because enumerating the credential ref list is
	 * a sensitive reconnaissance action (an attacker could use it to probe which
	 * env vars are in scope).
	 */
	async listCredentialRefs(
		actor: { userId: string; facilityId: string; staffProfileId: string | null; ipAddress: string | null; userAgent: string | null }
	): Promise<string[]> {
		await this.auditService.log({
			facilityId: actor.facilityId,
			userId: actor.userId,
			staffProfileId: actor.staffProfileId,
			action: "read",
			entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
			entityId: actor.facilityId,
			beforeState: null,
			afterState: null,
			ipAddress: actor.ipAddress,
			userAgent: actor.userAgent,
			metadata: { event: "credential_refs_enumerated" },
		})
		return [...INTEGRATION_CREDENTIAL_ENV_VARS]
	}

	/**
	 * Perform an on-demand activation-grade probe against the integration's endpointUrl.
	 *
	 * Readiness levels:
	 *  - "activation" — contract-level interoperability confirmed for the configured kind
	 *  - "transport"  — HTTP reachable but contract-level validation did not pass
	 *  - "none"       — endpoint not reachable (network error, timeout, DNS failure)
	 *
	 * Kind-specific contract checks:
	 *  - fhir:          GET /metadata must return a FHIR CapabilityStatement
	 *  - nhdr:          POST /submissions must return 2xx (submission endpoint accepted the probe)
	 *  - all others with credentials: credentialed transport probe confirms reachability and that
	 *                   credentials are not rejected at transport layer, but cannot prove that a
	 *                   POST submission payload is accepted — these return readinessLevel: "transport"
	 *  - all others without credentials: transport-level only (no activation-grade proof possible)
	 *
	 * Enablement gate (update()):
	 *  - fhir and nhdr require `lastTestStatus: "ok"` AND `lastTestReadinessLevel: "activation"`
	 *  - all other kinds require only `lastTestStatus: "ok"` (transport-grade proof suffices,
	 *    as it is the strongest automated proof available for submission-based integrations)
	 */
	async testConnectivity(
		facilityId: string,
		id: string,
		actor: { userId: string; facilityId: string; staffProfileId: string | null; ipAddress: string | null; userAgent: string | null }
	): Promise<ConnectivityResult> {
		const integration = await this.get(facilityId, id)

		const url = integration.endpointUrl
		const kind = integration.kind

		// Resolve credential — fail fast if ref is configured but env var is absent
		let credentialProbed = false
		const probeHeaders: Record<string, string> = {}
		if (integration.credentialsRef) {
			const credValue = process.env[integration.credentialsRef]
			if (!credValue) {
				const result: ConnectivityResult = {
					status: "error",
					readinessLevel: "none",
					latencyMs: null,
					detail: `Credential reference "${integration.credentialsRef}" is configured but the environment variable is not set. Provide the credential before running connectivity tests.`,
					credentialProbed: false,
					checks: [
						{
							name: "credential-resolution",
							status: "fail",
							detail: `Environment variable "${integration.credentialsRef}" is not set`,
						},
					],
				}
				await this.persistAndAuditConnectivity(facilityId, id, actor, result)
				return result
			}
			// NHDR and PIDSR both use X-API-Key authentication; all other kinds use Bearer tokens
			if (kind === "nhdr" || kind === "pidsr") {
				probeHeaders["X-API-Key"] = credValue
			} else {
				probeHeaders["Authorization"] = `Bearer ${credValue}`
			}
			credentialProbed = true
		}

		// NHDR uses X-API-Key + transport probe (not FHIR /metadata)
		const isFhirKind = kind === "fhir"

		// ── FHIR / NHDR: capability statement probe ───────────────────────────
		if (isFhirKind) {
			const capProbe = await this.probeFhirCapabilityStatement(url, probeHeaders)
			const probeLabel = credentialProbed ? "credentialed" : "unauthenticated"
			const checks: ProbeCheck[] = []

			if (capProbe.kind === "capability_statement") {
				checks.push({
					name: "fhir-capability-statement",
					status: "pass",
					detail: `FHIR CapabilityStatement confirmed at ${url.replace(/\/$/, "")}/metadata`,
				})
				const result: ConnectivityResult = {
					status: "ok",
					readinessLevel: "activation",
					latencyMs: capProbe.latencyMs,
					detail: `FHIR CapabilityStatement confirmed (${probeLabel} probe)`,
					credentialProbed,
					checks,
				}
				await this.persistAndAuditConnectivity(facilityId, id, actor, result)
				return result
			}

			if (capProbe.kind === "reachable_not_fhir") {
				checks.push({
					name: "fhir-capability-statement",
					status: "fail",
					detail: `HTTP ${capProbe.httpStatus} from /metadata — response is not a FHIR CapabilityStatement`,
				})
				const result: ConnectivityResult = {
					status: "error",
					readinessLevel: "transport",
					latencyMs: capProbe.latencyMs,
					detail: `Endpoint reachable but /metadata did not return a FHIR CapabilityStatement (HTTP ${capProbe.httpStatus})`,
					credentialProbed,
					checks,
				}
				await this.persistAndAuditConnectivity(facilityId, id, actor, result)
				return result
			}

			// capProbe.kind === "error" — could not reach /metadata; check root for transport level
			const transportProbe = await this.probeTransport(url, probeHeaders)
			const readinessLevel: TestReadinessLevel =
				transportProbe.kind === "ok" || transportProbe.kind === "http_error" ? "transport" : "none"
			checks.push({
				name: "fhir-capability-statement",
				status: "fail",
				detail: `Could not reach ${url.replace(/\/$/, "")}/metadata`,
			})
			const result: ConnectivityResult = {
				status: "error",
				readinessLevel,
				latencyMs: capProbe.latencyMs,
				detail:
					readinessLevel === "transport"
						? "Endpoint root is reachable but /metadata could not be reached"
						: `Cannot reach endpoint: ${transportProbe.kind === "network_error" ? transportProbe.message : "unknown error"}`,
				credentialProbed,
				checks,
			}
			await this.persistAndAuditConnectivity(facilityId, id, actor, result)
			return result
		}

		// ── NHDR: probe /submissions endpoint specifically ────────────────────
		// The /submissions path is the actual live submission path used by fhir.service.ts.
		// Probing it directly gives stronger readiness evidence than a root transport check.
		// Any HTTP response (200-499) confirms the endpoint exists; 5xx = transport; error = none.
		if (kind === "nhdr") {
			const submissionsUrl = `${url.replace(/\/$/, "")}/submissions`
			const nhdrProbe = await this.probeNhdrSubmissionsEndpoint(submissionsUrl, probeHeaders)
			const checks: ProbeCheck[] = []

			if (nhdrProbe.kind === "network_error") {
				checks.push({ name: "nhdr-submissions-endpoint", status: "fail", detail: nhdrProbe.message })
				const result: ConnectivityResult = {
					status: "error",
					readinessLevel: "none",
					latencyMs: nhdrProbe.latencyMs,
					detail: nhdrProbe.message,
					credentialProbed,
					checks,
				}
				await this.persistAndAuditConnectivity(facilityId, id, actor, result)
				return result
			}

			const httpStatus = nhdrProbe.httpStatus

			if (httpStatus >= 500) {
				// Server reachable but returning 5xx — transport-grade
				checks.push({
					name: "nhdr-submissions-endpoint",
					status: "fail",
					detail: `HTTP ${httpStatus} from /submissions — server error`,
				})
				const result: ConnectivityResult = {
					status: "error",
					readinessLevel: "transport",
					latencyMs: nhdrProbe.latencyMs,
					detail: `NHDR /submissions reachable but returned HTTP ${httpStatus} — server error`,
					credentialProbed,
					checks,
				}
				await this.persistAndAuditConnectivity(facilityId, id, actor, result)
				return result
			}

			// 200-499: endpoint exists and responded
			// Only 2xx proves the submission endpoint accepted the probe → activation-grade.
			// Any non-2xx (auth failure, 404, 422, 4xx) → transport-grade: endpoint exists but
			// the submission was not accepted, so we cannot claim activation-grade readiness.
			const isSuccess = httpStatus >= 200 && httpStatus < 300
			const isAuthFailure = httpStatus === 401 || httpStatus === 403
			const nhdrReadinessLevel: TestReadinessLevel = isSuccess ? "activation" : "transport"
			const probeLabel = credentialProbed ? "credentialed probe" : "unauthenticated probe"
			checks.push({
				name: "nhdr-submissions-endpoint",
				status: "pass",
				detail: `HTTP ${httpStatus} from /submissions (${probeLabel})`,
			})
			if (credentialProbed) {
				checks.push({
					name: "auth-acceptance",
					status: isSuccess ? "pass" : isAuthFailure ? "fail" : "skipped",
					detail: isSuccess
						? `Credentials accepted — /submissions returned ${httpStatus}`
						: isAuthFailure
						? `Configured credentials were rejected (HTTP ${httpStatus})`
						: `HTTP ${httpStatus} — credential status indeterminate (non-auth endpoint error)`,
				})
			}
			const result: ConnectivityResult = {
				status: isSuccess ? "ok" : "error",
				readinessLevel: nhdrReadinessLevel,
				latencyMs: nhdrProbe.latencyMs,
				detail: `NHDR /submissions responded HTTP ${httpStatus} (${probeLabel})`,
				credentialProbed,
				checks,
			}
			await this.persistAndAuditConnectivity(facilityId, id, actor, result)
			return result
		}

		// ── All other kinds: transport + auth-acceptance check ────────────────
		const transportProbe = await this.probeTransport(url, probeHeaders)
		const probeLabel = credentialProbed ? "credentialed probe" : "unauthenticated probe"
		const checks: ProbeCheck[] = []

		if (transportProbe.kind === "network_error") {
			checks.push({ name: "transport", status: "fail", detail: transportProbe.message })
			const result: ConnectivityResult = {
				status: "error",
				readinessLevel: "none",
				latencyMs: transportProbe.latencyMs,
				detail: transportProbe.message,
				credentialProbed,
				checks,
			}
			await this.persistAndAuditConnectivity(facilityId, id, actor, result)
			return result
		}

		const httpStatus = transportProbe.httpStatus

		if (transportProbe.kind === "ok" && credentialProbed) {
			// 2xx with credentials — transport-grade: endpoint is reachable and credentials are not
			// rejected at transport layer, but a HEAD/transport probe cannot prove that a POST
			// submission payload will be accepted. Activation-grade requires contract-level proof.
			checks.push({
				name: "transport",
				status: "pass",
				detail: `HTTP ${httpStatus} in ${transportProbe.latencyMs}ms`,
			})
			checks.push({
				name: "auth-acceptance",
				status: "pass",
				detail: "Credentials appear valid — endpoint returned 2xx (transport-level check only)",
			})
			const result: ConnectivityResult = {
				status: "ok",
				readinessLevel: "transport",
				latencyMs: transportProbe.latencyMs,
				detail: `HTTP ${httpStatus} in ${transportProbe.latencyMs}ms (${probeLabel} — transport confirmed, credentials appear valid)`,
				credentialProbed,
				checks,
			}
			await this.persistAndAuditConnectivity(facilityId, id, actor, result)
			return result
		}

		if (transportProbe.kind === "ok" && !credentialProbed) {
			// 2xx without credentials — transport only, cannot prove activation-grade
			checks.push({
				name: "transport",
				status: "pass",
				detail: `HTTP ${httpStatus} in ${transportProbe.latencyMs}ms`,
			})
			checks.push({
				name: "auth-acceptance",
				status: "skipped",
				detail: "No credential configured — configure a credential to reach activation-grade readiness",
			})
			const result: ConnectivityResult = {
				status: "error",
				readinessLevel: "transport",
				latencyMs: transportProbe.latencyMs,
				detail: `Endpoint reachable (HTTP ${httpStatus}) but no credential is configured. Add a credential to reach activation-grade readiness.`,
				credentialProbed: false,
				checks,
			}
			await this.persistAndAuditConnectivity(facilityId, id, actor, result)
			return result
		}

		// HTTP error (non-2xx) — server was reached (transport), but request failed
		checks.push({
			name: "transport",
			status: transportProbe.kind === "http_error" ? "pass" : "fail",
			detail: `HTTP ${httpStatus} in ${transportProbe.latencyMs}ms`,
		})
		if (credentialProbed) {
			const isAuthFailure = httpStatus === 401 || httpStatus === 403
			checks.push({
				name: "auth-acceptance",
				status: "fail",
				detail: isAuthFailure
					? `Configured credentials were rejected (HTTP ${httpStatus})`
					: `HTTP ${httpStatus} — non-2xx response with credentials`,
			})
			const result: ConnectivityResult = {
				status: "error",
				readinessLevel: "transport",
				latencyMs: transportProbe.latencyMs,
				detail: isAuthFailure
					? `Endpoint reachable but configured credentials were rejected (HTTP ${httpStatus}, ${probeLabel})`
					: `HTTP ${httpStatus} — non-2xx response (${probeLabel})`,
				credentialProbed,
				checks,
			}
			await this.persistAndAuditConnectivity(facilityId, id, actor, result)
			return result
		}

		const result: ConnectivityResult = {
			status: "error",
			readinessLevel: "transport",
			latencyMs: transportProbe.latencyMs,
			detail: `HTTP ${httpStatus} — endpoint returned non-2xx (${probeLabel})`,
			credentialProbed,
			checks,
		}
		await this.persistAndAuditConnectivity(facilityId, id, actor, result)
		return result
	}

	/**
	 * Perform a HEAD→GET transport probe against a URL.
	 * Returns the HTTP response kind and status, or a network error.
	 */
	private async probeTransport(
		url: string,
		headers: Record<string, string>
	): Promise<
		| { kind: "ok"; httpStatus: number; latencyMs: number }
		| { kind: "http_error"; httpStatus: number; latencyMs: number }
		| { kind: "network_error"; message: string; latencyMs: number }
	> {
		const start = Date.now()
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), 10_000)

		try {
			let response: Response
			try {
				response = await fetch(url, {
					method: "HEAD",
					headers,
					signal: controller.signal,
					redirect: "follow",
				})
			} catch {
				// Some endpoints reject HEAD; retry with GET
				response = await fetch(url, {
					method: "GET",
					headers,
					signal: controller.signal,
					redirect: "follow",
				})
			}
			clearTimeout(timeout)
			const latencyMs = Date.now() - start
			const httpStatus = response.status
			return httpStatus >= 200 && httpStatus < 300
				? { kind: "ok", httpStatus, latencyMs }
				: { kind: "http_error", httpStatus, latencyMs }
		} catch (err: unknown) {
			clearTimeout(timeout)
			const latencyMs = Date.now() - start
			const message =
				err instanceof Error
					? err.name === "AbortError"
						? "Request timed out after 10 seconds"
						: err.message
					: "Unknown error"
			return { kind: "network_error", message, latencyMs }
		}
	}

	/**
	 * Probe a FHIR endpoint's /metadata path for a CapabilityStatement.
	 */
	private async probeFhirCapabilityStatement(
		endpointUrl: string,
		headers: Record<string, string>
	): Promise<
		| { kind: "capability_statement"; latencyMs: number }
		| { kind: "reachable_not_fhir"; httpStatus: number; latencyMs: number }
		| { kind: "error"; latencyMs: number }
	> {
		const metadataUrl = `${endpointUrl.replace(/\/$/, "")}/metadata`
		const start = Date.now()
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), 10_000)

		try {
			const response = await fetch(metadataUrl, {
				method: "GET",
				headers,
				signal: controller.signal,
				redirect: "follow",
			})
			clearTimeout(timeout)
			const latencyMs = Date.now() - start

			if (response.status >= 200 && response.status < 300) {
				try {
					const json: unknown = await response.json()
					if (
						json !== null &&
						typeof json === "object" &&
						"resourceType" in json &&
						(json as Record<string, unknown>).resourceType === "CapabilityStatement"
					) {
						return { kind: "capability_statement", latencyMs }
					}
				} catch {
					// Non-JSON response — not a FHIR server
				}
				return { kind: "reachable_not_fhir", httpStatus: response.status, latencyMs }
			}
			return { kind: "reachable_not_fhir", httpStatus: response.status, latencyMs }
		} catch {
			clearTimeout(timeout)
			return { kind: "error", latencyMs: Date.now() - start }
		}
	}

	/**
	 * Probe the NHDR /submissions endpoint directly.
	 * Returns the HTTP status if reachable, or a network error.
	 * This is a HEAD probe (no body); it does not submit real data.
	 */
	private async probeNhdrSubmissionsEndpoint(
		submissionsUrl: string,
		headers: Record<string, string>
	): Promise<
		| { kind: "ok" | "http_error"; httpStatus: number; latencyMs: number }
		| { kind: "network_error"; message: string; latencyMs: number }
	> {
		const start = Date.now()
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), 10_000)

		try {
			const response = await fetch(submissionsUrl, {
				method: "HEAD",
				headers,
				signal: controller.signal,
				redirect: "follow",
			})
			clearTimeout(timeout)
			const latencyMs = Date.now() - start
			const httpStatus = response.status
			return httpStatus >= 200 && httpStatus < 300
				? { kind: "ok", httpStatus, latencyMs }
				: { kind: "http_error", httpStatus, latencyMs }
		} catch (err: unknown) {
			clearTimeout(timeout)
			const latencyMs = Date.now() - start
			const message =
				err instanceof Error
					? err.name === "AbortError"
						? "Request timed out after 10 seconds"
						: err.message
					: "Unknown error"
			return { kind: "network_error", message, latencyMs }
		}
	}

	/**
	 * Persist the test outcome and write an audit entry.
	 */
	private async persistAndAuditConnectivity(
		facilityId: string,
		id: string,
		actor: { userId: string; facilityId: string; staffProfileId: string | null; ipAddress: string | null; userAgent: string | null },
		result: ConnectivityResult
	): Promise<void> {
		await db.transaction(async (tx: DBTransaction) => {
			await tx
				.update(integrations)
				.set({
					lastTestedAt: new Date(),
					lastTestStatus: result.status,
					lastTestReadinessLevel: result.readinessLevel,
				})
				.where(and(eq(integrations.id, id), eq(integrations.facilityId, facilityId)))

			await this.auditService.log(
				{
					facilityId: actor.facilityId,
					userId: actor.userId,
					staffProfileId: actor.staffProfileId,
					action: "read",
					entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
					entityId: id,
					beforeState: null,
					afterState: null,
					ipAddress: actor.ipAddress,
					userAgent: actor.userAgent,
					metadata: {
						testStatus: result.status,
						readinessLevel: result.readinessLevel,
						latencyMs: result.latencyMs,
						detail: result.detail,
					},
				},
				{ tx }
			)
		})
	}

	// ── Private helpers ───────────────────────────────────────────────────────

	/**
	 * If credentialsRef is provided (non-null), it must appear in the whitelist.
	 * This prevents storing arbitrary env var names that the UI couldn't have
	 * offered via the dropdown.
	 */
	private validateCredentialsRef(credentialsRef?: string | null): void {
		if (!credentialsRef) return
		const whitelist: readonly string[] = INTEGRATION_CREDENTIAL_ENV_VARS
		if (!whitelist.includes(credentialsRef)) {
			throw new BadRequestException(
				`credentialsRef "${credentialsRef}" is not in the allowed whitelist`
			)
		}
	}

	// ============================================================================
	// API Key Management (ADM-BE-12)
	// ============================================================================

	async listApiKeys(integrationId: string) {
		return db
			.select({
				id: integrationApiKeys.id,
				integrationId: integrationApiKeys.integrationId,
				label: integrationApiKeys.label,
				keyPrefix: integrationApiKeys.keyPrefix,
				createdBy: integrationApiKeys.createdBy,
				createdAt: integrationApiKeys.createdAt,
				revokedAt: integrationApiKeys.revokedAt,
			})
			.from(integrationApiKeys)
			.where(eq(integrationApiKeys.integrationId, integrationId))
	}

	async generateApiKey(integrationId: string, label: string, createdBy: string) {
		const [integration] = await db
			.select({ id: integrations.id, facilityId: integrations.facilityId })
			.from(integrations)
			.where(eq(integrations.id, integrationId))
		if (!integration) throw new NotFoundException("Integration not found")

		// Generate a cryptographically random 32-byte key and encode as hex
		const rawKey = `qhk_${randomBytes(24).toString("hex")}`
		const keyTail = rawKey.slice(-4)
		const keyHash = createHash("sha256").update(rawKey).digest("hex")

		const [created] = await db
			.insert(integrationApiKeys)
			.values({ integrationId, label, keyPrefix: keyTail, keyHash, createdBy })
			.returning()

		await this.auditService.log({
			facilityId: integration.facilityId,
			userId: createdBy,
			staffProfileId: null,
			action: "create",
			entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
			entityId: integrationId,
			beforeState: null,
			afterState: { keyId: created!.id, label, keyPrefix: keyTail },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "api_key_generated" },
		})

		return { ...created!, rawKey }
	}

	async revokeApiKey(id: string, actorId: string) {
		const [existing] = await db
			.select()
			.from(integrationApiKeys)
			.where(eq(integrationApiKeys.id, id))
		if (!existing) throw new NotFoundException("API key not found")
		if (existing.revokedAt) throw new BadRequestException("API key already revoked")

		const [updated] = await db
			.update(integrationApiKeys)
			.set({ revokedAt: new Date() })
			.where(eq(integrationApiKeys.id, id))
			.returning()

		const [integration] = await db
			.select({ facilityId: integrations.facilityId })
			.from(integrations)
			.where(eq(integrations.id, existing.integrationId))

		await this.auditService.log({
			facilityId: integration?.facilityId ?? "",
			userId: actorId,
			staffProfileId: null,
			action: "delete",
			entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
			entityId: existing.integrationId,
			beforeState: { keyId: id, label: existing.label, keyPrefix: existing.keyPrefix },
			afterState: { revokedAt: updated!.revokedAt },
			ipAddress: null,
			userAgent: null,
			metadata: { operation: "api_key_revoked" },
		})

		return updated!
	}

	async rotateApiKey(id: string, graceHours: number, actorId: string) {
		const [existing] = await db
			.select()
			.from(integrationApiKeys)
			.where(eq(integrationApiKeys.id, id))

		if (!existing) throw new NotFoundException('API key not found')
		if (existing.revokedAt) throw new BadRequestException('API key is already revoked')

		const rawKey = `qhk_${randomBytes(24).toString("hex")}`
		const keyTail = rawKey.slice(-4)
		const keyHash = createHash('sha256').update(rawKey).digest('hex')

		const oldKeyRevokedAt = new Date(Date.now() + graceHours * 3_600_000)

		const [integration] = await db
			.select({ id: integrations.id, facilityId: integrations.facilityId })
			.from(integrations)
			.where(eq(integrations.id, existing.integrationId))

		if (!integration) throw new NotFoundException('Integration not found')

		const newKey = await db.transaction(async (tx) => {
			// Set grace-period revocation on old key
			await tx
				.update(integrationApiKeys)
				.set({ revokedAt: oldKeyRevokedAt })
				.where(eq(integrationApiKeys.id, id))

			// Insert new key
			const [created] = await tx
				.insert(integrationApiKeys)
				.values({
					integrationId: existing.integrationId,
					label: existing.label + ' (rotated)',
					keyPrefix: keyTail,
					keyHash,
					createdBy: actorId,
				})
				.returning()

			await this.auditService.log(
				{
					facilityId: integration.facilityId,
					userId: actorId,
					staffProfileId: null,
					action: 'update',
					entityType: AUDIT_ENTITY_TYPES.INTEGRATION,
					entityId: existing.integrationId,
					beforeState: { keyId: id, label: existing.label },
					afterState: { newKeyId: created!.id, oldKeyRevokedAt },
					ipAddress: null,
					userAgent: null,
					metadata: { operation: 'api_key_rotated', graceHours },
				},
				{ tx }
			)

			return { ...created!, rawKey, oldKeyRevokedAt }
		})

		return newKey
	}

	// ============================================================================
	// Webhook Endpoint Management (ADM-BE-12)
	// ============================================================================

	private toWebhookResponse(row: typeof webhookEndpoints.$inferSelect) {
		const { signingSecretHash: _, ...rest } = row
		return {
			id: rest.id,
			integrationId: rest.integrationId,
			url: rest.targetUrl,
			events: rest.subscribedEvents as string[],
			isActive: rest.isActive,
			createdAt: rest.createdAt,
			updatedAt: rest.updatedAt,
		}
	}

	async listWebhooks(integrationId: string) {
		const rows = await db
			.select()
			.from(webhookEndpoints)
			.where(eq(webhookEndpoints.integrationId, integrationId))
		return rows.map(row => this.toWebhookResponse(row))
	}

	async createWebhook(input: { integrationId: string; url: string; events: string[] }) {
		const signingSecretPlain = randomBytes(32).toString("hex")
		const signingSecretHash = createHash("sha256").update(signingSecretPlain).digest("hex")

		const [created] = await db
			.insert(webhookEndpoints)
			.values({
				integrationId: input.integrationId,
				targetUrl: input.url,
				signingSecretHash,
				subscribedEvents: input.events,
			})
			.returning()

		return this.toWebhookResponse(created!)
	}

	async updateWebhook(id: string, input: { url?: string; events?: string[]; isActive?: boolean }) {
		const updateValues: Partial<typeof webhookEndpoints.$inferInsert> & { updatedAt: Date } = {
			updatedAt: new Date(),
		}
		if (input.url !== undefined) updateValues.targetUrl = input.url
		if (input.events !== undefined) updateValues.subscribedEvents = input.events
		if (input.isActive !== undefined) updateValues.isActive = input.isActive

		const [updated] = await db
			.update(webhookEndpoints)
			.set(updateValues)
			.where(eq(webhookEndpoints.id, id))
			.returning()

		if (!updated) throw new NotFoundException("Webhook not found")
		return this.toWebhookResponse(updated)
	}

	async deleteWebhook(id: string) {
		const [deleted] = await db
			.delete(webhookEndpoints)
			.where(eq(webhookEndpoints.id, id))
			.returning()

		if (!deleted) throw new NotFoundException("Webhook not found")
		return this.toWebhookResponse(deleted)
	}

	async deliverWebhook(
		integrationId: string,
		event: string,
		payload: Record<string, unknown>
	): Promise<void> {
		const endpoints = await db
			.select()
			.from(webhookEndpoints)
			.where(
				and(
					eq(webhookEndpoints.integrationId, integrationId),
					eq(webhookEndpoints.isActive, true),
				)
			)

		const relevant = endpoints.filter(ep => {
			const events = ep.subscribedEvents as string[]
			return events.length === 0 || events.includes(event)
		})

		await Promise.allSettled(relevant.map(ep => this.deliverWithRetry(ep, event, payload)))
	}

	private async deliverWithRetry(
		ep: typeof webhookEndpoints.$inferSelect,
		event: string,
		payload: Record<string, unknown>,
		attempt = 0
	): Promise<void> {
		const MAX_ATTEMPTS = 5
		const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })
		const sig = createHmac("sha256", ep.signingSecretHash).update(body).digest("hex")

		try {
			const res = await fetch(ep.targetUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Webhook-Signature": `sha256=${sig}`,
					"X-Webhook-Event": event,
				},
				body,
				signal: AbortSignal.timeout(10_000),
			})
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
		} catch (err) {
			if (attempt < MAX_ATTEMPTS - 1) {
				const delay = Math.pow(2, attempt) * 1000
				await new Promise(resolve => setTimeout(resolve, delay))
				return this.deliverWithRetry(ep, event, payload, attempt + 1)
			}
			this.logger.warn(`Webhook delivery failed after ${MAX_ATTEMPTS} attempts: ${ep.targetUrl} — ${String(err)}`)
		}
	}
}
