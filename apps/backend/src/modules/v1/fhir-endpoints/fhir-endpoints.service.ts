import { Injectable, NotFoundException } from "@nestjs/common"
import { and, count, desc, eq } from "drizzle-orm"

import { fhirEndpoints, fhirExchangeLog } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { AuditService } from "@/modules/v1/audit/audit.service"

type RawFhirEndpointRow = typeof fhirEndpoints.$inferSelect
type FhirExchangeLogRow = typeof fhirExchangeLog.$inferSelect

// Drizzle infers jsonb as unknown; coerce to contract-expected type
type FhirEndpointRow = Omit<RawFhirEndpointRow, "resourceTypes"> & {
	resourceTypes: string[]
}

function coerceEndpoint(row: RawFhirEndpointRow): FhirEndpointRow {
	return {
		...row,
		resourceTypes: Array.isArray(row.resourceTypes) ? (row.resourceTypes as string[]) : [],
	}
}

type UpsertInput = {
	id?: string
	facilityId: string
	name: string
	endpointUrl: string
	fhirVersion?: FhirEndpointRow["fhirVersion"]
	authMethod?: FhirEndpointRow["authMethod"]
	authCredentialsRef?: string | null
	resourceTypes?: string[]
	cronSchedule?: string | null
	enabled?: boolean
}

type ListExchangeLogInput = {
	endpointId?: string
	facilityId: string
	status?: FhirExchangeLogRow["status"]
	resourceType?: string
	page: number
	limit: number
}

type TestResult = {
	status: "ok" | "error"
	httpStatus: number | null
	latencyMs: number | null
	detail: string
}

@Injectable()
export class FhirEndpointsService {
	constructor(private readonly auditService: AuditService) {}

	async list(facilityId: string): Promise<FhirEndpointRow[]> {
		const rows = await db
			.select()
			.from(fhirEndpoints)
			.where(eq(fhirEndpoints.facilityId, facilityId))
		return rows.map(coerceEndpoint)
	}

	async get(id: string): Promise<FhirEndpointRow> {
		const [row] = await db.select().from(fhirEndpoints).where(eq(fhirEndpoints.id, id))

		if (!row) throw new NotFoundException(`FHIR endpoint ${id} not found`)
		return coerceEndpoint(row)
	}

	async upsert(input: UpsertInput, actorId: string): Promise<FhirEndpointRow> {
		if (input.id) {
			const [existing] = await db
				.select()
				.from(fhirEndpoints)
				.where(and(eq(fhirEndpoints.id, input.id), eq(fhirEndpoints.facilityId, input.facilityId)))

			if (!existing) throw new NotFoundException(`FHIR endpoint ${input.id} not found`)

			const [updated] = await db
				.update(fhirEndpoints)
				.set({
					name: input.name,
					endpointUrl: input.endpointUrl,
					fhirVersion: input.fhirVersion ?? existing.fhirVersion,
					authMethod: input.authMethod ?? existing.authMethod,
					authCredentialsRef:
						input.authCredentialsRef !== undefined
							? input.authCredentialsRef
							: existing.authCredentialsRef,
					resourceTypes: input.resourceTypes ?? existing.resourceTypes,
					cronSchedule:
						input.cronSchedule !== undefined ? input.cronSchedule : existing.cronSchedule,
					enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
					updatedAt: new Date(),
				})
				.where(eq(fhirEndpoints.id, input.id))
				.returning()

			await this.auditService.log({
				facilityId: input.facilityId,
				userId: actorId,
				staffProfileId: null,
				action: "update",
				entityType: "fhir_endpoint",
				entityId: updated!.id,
				beforeState: {
					name: existing.name,
					endpointUrl: existing.endpointUrl,
					enabled: existing.enabled,
				},
				afterState: {
					name: updated!.name,
					endpointUrl: updated!.endpointUrl,
					enabled: updated!.enabled,
				},
				ipAddress: null,
				userAgent: null,
				metadata: null,
			})

			return coerceEndpoint(updated!)
		}

		const [created] = await db
			.insert(fhirEndpoints)
			.values({
				facilityId: input.facilityId,
				name: input.name,
				endpointUrl: input.endpointUrl,
				fhirVersion: input.fhirVersion ?? "R4",
				authMethod: input.authMethod ?? "none",
				authCredentialsRef: input.authCredentialsRef ?? null,
				resourceTypes: input.resourceTypes ?? [],
				cronSchedule: input.cronSchedule ?? null,
				enabled: input.enabled ?? false,
			})
			.returning()

		await this.auditService.log({
			facilityId: input.facilityId,
			userId: actorId,
			staffProfileId: null,
			action: "create",
			entityType: "fhir_endpoint",
			entityId: created!.id,
			beforeState: null,
			afterState: { name: created!.name, endpointUrl: created!.endpointUrl },
			ipAddress: null,
			userAgent: null,
			metadata: null,
		})

		return coerceEndpoint(created!)
	}

	async delete(id: string, facilityId: string, actorId: string): Promise<{ success: boolean }> {
		const [existing] = await db.select().from(fhirEndpoints).where(eq(fhirEndpoints.id, id))

		if (!existing) throw new NotFoundException(`FHIR endpoint ${id} not found`)

		await db.delete(fhirEndpoints).where(eq(fhirEndpoints.id, id))

		await this.auditService.log({
			facilityId,
			userId: actorId,
			staffProfileId: null,
			action: "delete",
			entityType: "fhir_endpoint",
			entityId: id,
			beforeState: { name: existing.name, endpointUrl: existing.endpointUrl },
			afterState: null,
			ipAddress: null,
			userAgent: null,
			metadata: null,
		})

		return { success: true }
	}

	async testConnection(id: string, actorId: string): Promise<TestResult> {
		const endpoint = await this.get(id)
		const url = endpoint.endpointUrl

		const start = Date.now()
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), 10_000)

		let httpStatus: number | null = null
		let status: "ok" | "error" = "error"
		let detail: string

		try {
			const response = await fetch(`${url.replace(/\/$/, "")}/metadata`, {
				method: "GET",
				signal: controller.signal,
				redirect: "follow",
			})
			clearTimeout(timer)
			httpStatus = response.status
			status = httpStatus >= 200 && httpStatus < 400 ? "ok" : "error"
			detail = `HTTP ${httpStatus} from ${url}`
		} catch (err: unknown) {
			clearTimeout(timer)
			const message =
				err instanceof Error
					? err.name === "AbortError"
						? "Request timed out after 10 seconds"
						: err.message
					: "Unknown error"
			detail = `Connection failed: ${message}`
		}

		const latencyMs = Date.now() - start

		await db
			.update(fhirEndpoints)
			.set({
				lastTestedAt: new Date(),
				lastTestStatus: status,
				lastTestLatencyMs: latencyMs,
				updatedAt: new Date(),
			})
			.where(eq(fhirEndpoints.id, id))

		await this.auditService.log({
			facilityId: endpoint.facilityId,
			userId: actorId,
			staffProfileId: null,
			action: "read",
			entityType: "fhir_endpoint",
			entityId: id,
			beforeState: null,
			afterState: null,
			ipAddress: null,
			userAgent: null,
			metadata: { event: "connection_tested", status, httpStatus, latencyMs, detail },
		})

		return { status, httpStatus, latencyMs, detail }
	}

	async retryExchange(logId: string): Promise<{ success: boolean; message: string }> {
		const [entry] = await db.select().from(fhirExchangeLog).where(eq(fhirExchangeLog.id, logId))

		if (!entry) throw new NotFoundException(`Exchange log entry ${logId} not found`)

		await db
			.update(fhirExchangeLog)
			.set({ status: "failed", errorMessage: null })
			.where(eq(fhirExchangeLog.id, logId))

		return { success: true, message: "Exchange log entry queued for retry" }
	}

	async listExchangeLog(input: ListExchangeLogInput) {
		const { facilityId, endpointId, status, resourceType, page, limit } = input
		const offset = (page - 1) * limit

		const conditions = [eq(fhirExchangeLog.facilityId, facilityId)]

		if (endpointId) conditions.push(eq(fhirExchangeLog.endpointId, endpointId))
		if (status) conditions.push(eq(fhirExchangeLog.status, status))
		if (resourceType) conditions.push(eq(fhirExchangeLog.resourceType, resourceType))

		const where = and(...conditions)

		const [rows, [countRow]] = await Promise.all([
			db
				.select()
				.from(fhirExchangeLog)
				.where(where)
				.orderBy(desc(fhirExchangeLog.occurredAt))
				.limit(limit)
				.offset(offset),
			db.select({ total: count() }).from(fhirExchangeLog).where(where),
		])

		return {
			data: rows,
			total: countRow?.total ?? 0,
			page,
			limit,
		}
	}
}
