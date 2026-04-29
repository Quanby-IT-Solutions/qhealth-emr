import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"
import { and, desc, eq, gte, inArray, or } from "drizzle-orm"
import type { Request } from "express"

import { breakGlassEvents, encounters, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

import { AuditService } from "./audit.service"

export const BREAK_GLASS_REQUIRED_MESSAGE = "Break-glass required for this patient chart."

type PermissionLike = { module: string; action: string }

export type RbacProfileLike = {
	staffProfiles: Array<{ id: string; facilityId: string; roles: Array<{ id: string }> }>
	activeRole: {
		id: string
		permissions: PermissionLike[]
	} | null
}

export interface ChartAccessActor {
	userId: string
	rbacProfile?: RbacProfileLike
	ipAddress?: string | null
	userAgent?: string | null
}

export interface ChartAccessRecord {
	entityType: string
	entityId: string
}

export interface ChartAccessResult {
	mode: "permission_only" | "regular" | "break_glass"
	breakGlassEventId?: string | null
	staffProfileId?: string | null
}

type ActiveStaffProfile = { id: string; facilityId: string }

type ActiveBreakGlassEvent = { id: string; facilityId: string; recordsAccessed: unknown }

export function extractRbacProfile(req: Request): RbacProfileLike | undefined {
	return (req as Request & { rbacProfile?: RbacProfileLike }).rbacProfile
}

export function buildChartAccessActor(session: { user: { id: string } }, req: Request): ChartAccessActor {
	const forwardedFor = req.headers["x-forwarded-for"]
	const userAgent = req.headers["user-agent"]
	return {
		userId: session.user.id,
		rbacProfile: extractRbacProfile(req),
		ipAddress: Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor ?? req.ip ?? null,
		userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent ?? null,
	}
}

@Injectable()
export class ChartAccessService {
	constructor(private readonly auditService: AuditService) {}

	private hasPermission(
		profile: RbacProfileLike | undefined,
		module: string,
		action: string
	): boolean {
		return profile?.activeRole?.permissions.some(
			permission => permission.module === module && permission.action === action
		) ?? false
	}

	private shouldEnforceBreakGlass(profile: RbacProfileLike | undefined): boolean {
		return this.hasPermission(profile, "audit", "create")
	}

	private getActiveStaffProfile(profile: RbacProfileLike | undefined): ActiveStaffProfile | null {
		if (!profile?.staffProfiles?.length) return null

		const activeRoleId = profile.activeRole?.id
		const activeProfile =
			profile.staffProfiles.find(staffProfile =>
				staffProfile.roles.some(role => role.id === activeRoleId)
			) ?? profile.staffProfiles[0]

		return activeProfile
			? {
					id: activeProfile.id,
					facilityId: activeProfile.facilityId,
				}
			: null
	}

	private async resolveActiveStaffProfile(actor: ChartAccessActor): Promise<ActiveStaffProfile | null> {
		const fromProfile = this.getActiveStaffProfile(actor.rbacProfile)
		if (fromProfile) return fromProfile

		try {
			const staffProfileId = await this.auditService.resolveStaffProfileId(actor.userId)
			const [staffProfile] = await db
				.select({ id: staffProfiles.id, facilityId: staffProfiles.facilityId })
				.from(staffProfiles)
				.where(eq(staffProfiles.id, staffProfileId))
				.limit(1)

			return staffProfile ?? null
		} catch {
			return null
		}
	}

	private async findActiveBreakGlassEvent(
		clinicianStaffId: string,
		patientId: string
	): Promise<ActiveBreakGlassEvent | null> {
		const now = new Date()
		const [event] = await db
			.select({
				id: breakGlassEvents.id,
				facilityId: breakGlassEvents.facilityId,
				recordsAccessed: breakGlassEvents.recordsAccessed,
			})
			.from(breakGlassEvents)
			.where(
				and(
					eq(breakGlassEvents.clinicianStaffId, clinicianStaffId),
					eq(breakGlassEvents.patientId, patientId),
					gte(breakGlassEvents.accessExpiresAt, now)
				)
			)
			.orderBy(desc(breakGlassEvents.accessGrantedAt))
			.limit(1)

		return event ?? null
	}

	private async hasRegularPatientAccess(clinicianStaffId: string, patientId: string): Promise<boolean> {
		const [match] = await db
			.select({ id: encounters.id })
			.from(encounters)
			.where(
				and(
					eq(encounters.patientId, patientId),
					inArray(encounters.status, ["active", "discharged", "closed"]),
					or(
						eq(encounters.clinicianStaffId, clinicianStaffId),
						eq(encounters.attendingStaffId, clinicianStaffId),
						eq(encounters.admittingStaffId, clinicianStaffId)
					)
				)
			)
			.limit(1)

		return !!match
	}

	private async trackBreakGlassRecordAccess(eventId: string, record: ChartAccessRecord): Promise<void> {
		const [event] = await db
			.select({ recordsAccessed: breakGlassEvents.recordsAccessed })
			.from(breakGlassEvents)
			.where(eq(breakGlassEvents.id, eventId))
			.limit(1)

		const existing = Array.isArray(event?.recordsAccessed)
			? (event.recordsAccessed as Array<Record<string, unknown>>)
			: []
		const timestamp = new Date().toISOString()

		const nextRecords = existing.some(
			existingRecord =>
				existingRecord.entityType === record.entityType &&
				existingRecord.entityId === record.entityId
		)
			? existing.map(existingRecord =>
					existingRecord.entityType === record.entityType &&
					existingRecord.entityId === record.entityId
						? {
								...existingRecord,
								accessCount:
									typeof existingRecord.accessCount === "number"
										? existingRecord.accessCount + 1
										: 2,
								lastAccessedAt: timestamp,
							}
						: existingRecord
				)
			: [
					...existing,
					{
						entityType: record.entityType,
						entityId: record.entityId,
						firstAccessedAt: timestamp,
						lastAccessedAt: timestamp,
						accessCount: 1,
					},
				]

		await db
			.update(breakGlassEvents)
			.set({ recordsAccessed: nextRecords })
			.where(eq(breakGlassEvents.id, eventId))
	}

	async ensurePatientChartReadAccess(
		actor: ChartAccessActor | undefined,
		patientId: string,
		record?: ChartAccessRecord
	): Promise<ChartAccessResult> {
		if (!actor || !this.shouldEnforceBreakGlass(actor.rbacProfile)) {
			return { mode: "permission_only" }
		}

		const activeStaffProfile = await this.resolveActiveStaffProfile(actor)
		if (!activeStaffProfile) {
			throw new NotFoundException("Active staff profile not found")
		}

		if (await this.hasRegularPatientAccess(activeStaffProfile.id, patientId)) {
			return { mode: "regular", staffProfileId: activeStaffProfile.id }
		}

		const activeBreakGlassEvent = await this.findActiveBreakGlassEvent(activeStaffProfile.id, patientId)
		if (activeBreakGlassEvent) {
			if (record) {
				await this.trackBreakGlassRecordAccess(activeBreakGlassEvent.id, record)
			}
			return {
				mode: "break_glass",
				breakGlassEventId: activeBreakGlassEvent.id,
				staffProfileId: activeStaffProfile.id,
			}
		}

		throw new ForbiddenException(BREAK_GLASS_REQUIRED_MESSAGE)
	}

	async ensureEncounterChartReadAccess(
		actor: ChartAccessActor | undefined,
		encounterId: string,
		record?: ChartAccessRecord
	): Promise<ChartAccessResult> {
		if (!actor || !this.shouldEnforceBreakGlass(actor.rbacProfile)) {
			return { mode: "permission_only" }
		}

		const activeStaffProfile = await this.resolveActiveStaffProfile(actor)
		if (!activeStaffProfile) {
			throw new NotFoundException("Active staff profile not found")
		}

		const [encounter] = await db
			.select({
				id: encounters.id,
				patientId: encounters.patientId,
				clinicianStaffId: encounters.clinicianStaffId,
				attendingStaffId: encounters.attendingStaffId,
				admittingStaffId: encounters.admittingStaffId,
			})
			.from(encounters)
			.where(eq(encounters.id, encounterId))
			.limit(1)

		if (!encounter) {
			throw new NotFoundException(`Encounter ${encounterId} not found`)
		}

		const hasRegularAccess = [
			encounter.clinicianStaffId,
			encounter.attendingStaffId,
			encounter.admittingStaffId,
		].includes(activeStaffProfile.id)
		if (hasRegularAccess) {
			return { mode: "regular", staffProfileId: activeStaffProfile.id }
		}

		const activeBreakGlassEvent = await this.findActiveBreakGlassEvent(
			activeStaffProfile.id,
			encounter.patientId
		)
		if (activeBreakGlassEvent) {
			if (record) {
				await this.trackBreakGlassRecordAccess(activeBreakGlassEvent.id, record)
			}
			return {
				mode: "break_glass",
				breakGlassEventId: activeBreakGlassEvent.id,
				staffProfileId: activeStaffProfile.id,
			}
		}

		throw new ForbiddenException(BREAK_GLASS_REQUIRED_MESSAGE)
	}
}
