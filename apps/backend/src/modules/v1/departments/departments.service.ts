import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { and, count, eq } from "drizzle-orm"

import { departments, staffProfiles } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { AuditService } from "@/modules/v1/audit/audit.service"

type UpsertInput = {
	id?: string
	facilityId: string
	name: string
	code?: string | null
	description?: string | null
	isActive?: boolean
}

@Injectable()
export class DepartmentsService {
	constructor(private readonly auditService: AuditService) {}

	async list(facilityId: string) {
		return db.select().from(departments).where(eq(departments.facilityId, facilityId))
	}

	async get(id: string) {
		const [dept] = await db.select().from(departments).where(eq(departments.id, id))
		if (!dept) throw new NotFoundException("Department not found")
		return dept
	}

	async upsert(input: UpsertInput, actorId: string) {
		if (input.id) {
			const [existing] = await db
				.select()
				.from(departments)
				.where(and(eq(departments.id, input.id), eq(departments.facilityId, input.facilityId)))
			if (!existing) throw new NotFoundException("Department not found")

			const [updated] = await db
				.update(departments)
				.set({
					name: input.name,
					code: input.code ?? existing.code,
					description: input.description ?? existing.description,
					isActive: input.isActive ?? existing.isActive,
					updatedAt: new Date(),
				})
				.where(eq(departments.id, input.id))
				.returning()
			await this.auditService.log({
				facilityId: input.facilityId,
				userId: actorId,
				staffProfileId: null,
				action: "update",
				entityType: "department",
				entityId: updated!.id,
				beforeState: { name: existing.name, code: existing.code },
				afterState: { name: updated!.name, code: updated!.code },
				ipAddress: null,
				userAgent: null,
				metadata: null,
			})
			return updated!
		}

		const [created] = await db
			.insert(departments)
			.values({
				facilityId: input.facilityId,
				name: input.name,
				code: input.code ?? null,
				description: input.description ?? null,
				isActive: input.isActive ?? true,
			})
			.returning()
		await this.auditService.log({
			facilityId: input.facilityId,
			userId: actorId,
			staffProfileId: null,
			action: "create",
			entityType: "department",
			entityId: created!.id,
			beforeState: null,
			afterState: { name: created!.name, code: created!.code },
			ipAddress: null,
			userAgent: null,
			metadata: null,
		})
		return created!
	}

	async delete(id: string, facilityId: string, actorId: string) {
		const [existing] = await db.select().from(departments).where(eq(departments.id, id))
		if (!existing) throw new NotFoundException("Department not found")

		// ADM-BE-11: block delete when staff profiles are assigned to this department
		const [staffCount] = await db
			.select({ count: count() })
			.from(staffProfiles)
			.where(
				and(eq(staffProfiles.facilityId, facilityId), eq(staffProfiles.department, existing.name))
			)
		if ((staffCount?.count ?? 0) > 0) {
			throw new BadRequestException(
				`Cannot delete department "${existing.name}": ${staffCount!.count} staff member(s) are assigned to it.`
			)
		}

		await db.delete(departments).where(eq(departments.id, id))
		await this.auditService.log({
			facilityId,
			userId: actorId,
			staffProfileId: null,
			action: "delete",
			entityType: "department",
			entityId: id,
			beforeState: { name: existing.name },
			afterState: null,
			ipAddress: null,
			userAgent: null,
			metadata: null,
		})
		return { success: true }
	}
}
