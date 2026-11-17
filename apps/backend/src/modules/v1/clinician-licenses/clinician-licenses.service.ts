import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { and, desc, eq, ilike, inArray, lte, or } from "drizzle-orm"

import { clinicianLicenses, roles, staffProfiles, userRoles, users } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { AuditService } from "@/modules/v1/audit/audit.service"

interface ListInput {
	facilityId?: string
	search?: string
	status?: "pending" | "verified" | "expired"
	page: number
	limit: number
}

interface AddLicenseInput {
	staffProfileId: string
	licenseType: string
	licenseNumber: string
	issueDate?: string
	expiryDate?: string
	documentUri?: string
}

interface VerifyInput {
	id: string
	verificationProof?: string
}

interface UpdateLicenseInput {
	id: string
	licenseNumber?: string
	issueDate?: string | null
	expiryDate?: string | null
	documentUri?: string | null
}

interface AddMyLicenseInput {
	licenseType: string
	licenseNumber: string
	issueDate?: string
	expiryDate?: string
	documentUri?: string
}

type StaffCredentialSnapshot = {
	id: string
	userId: string
	facilityId: string
	prcLicenseNumber: string | null
	prcExpiry: string | Date | null
	ptrNumber: string | null
	ptrExpiry: string | Date | null
	pdeaS2License: string | null
	pdeaS2Expiry: string | Date | null
}

@Injectable()
export class ClinicianLicensesService {
	constructor(private readonly auditService: AuditService) {}

	private toDateOnly(value: string | Date | null): string | null {
		if (!value) return null
		if (value instanceof Date) {
			return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
		}
		return value.slice(0, 10)
	}

	private daysUntilDateOnly(date: string | Date | null): number | null {
		if (!date) return null
		const dateText = this.toDateOnly(date)
		if (!dateText) return null
		const [year, month, day] = dateText.split("-").map(Number)
		if (!year || !month || !day) return null

		const target = Date.UTC(year, month - 1, day)
		const now = new Date()
		const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
		return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
	}

	private nextExpiryStatus(licenses: Array<{ expiryDate: string | Date | null }>) {
		const days = licenses
			.map(license => this.daysUntilDateOnly(license.expiryDate))
			.filter((value): value is number => value !== null)

		return days.length ? Math.min(...days) : null
	}

	private activeCredentialRows(profile: StaffCredentialSnapshot) {
		return [
			{
				licenseType: "PRC" as const,
				licenseNumber: profile.prcLicenseNumber?.trim() ?? "",
				expiryDate: this.toDateOnly(profile.prcExpiry),
			},
			{
				licenseType: "PTR" as const,
				licenseNumber: profile.ptrNumber?.trim() ?? "",
				expiryDate: this.toDateOnly(profile.ptrExpiry),
			},
			{
				licenseType: "S2" as const,
				licenseNumber: profile.pdeaS2License?.trim() ?? "",
				expiryDate: this.toDateOnly(profile.pdeaS2Expiry),
			},
		].filter(credential => credential.licenseNumber.length > 0)
	}

	private async backfillActiveCredentialLicenses(
		profile: StaffCredentialSnapshot,
		existingLicenses: Array<typeof clinicianLicenses.$inferSelect>
	) {
		const existingKeys = new Set(
			existingLicenses.map(license => `${license.licenseType}:${license.licenseNumber.trim()}`)
		)
		const values = this.activeCredentialRows(profile)
			.filter(
				credential => !existingKeys.has(`${credential.licenseType}:${credential.licenseNumber}`)
			)
			.map(credential => ({
				staffProfileId: profile.id,
				licenseType: credential.licenseType,
				licenseNumber: credential.licenseNumber,
				expiryDate: credential.expiryDate,
				status: "verified" as const,
				verificationProof: {
					source: "staff_profile_active_credentials",
				},
				verifiedAt: new Date(),
			}))

		if (values.length === 0) return false

		await db.insert(clinicianLicenses).values(values).returning()
		return true
	}

	private async listLicensesForProfile(staffProfileId: string) {
		return db
			.select()
			.from(clinicianLicenses)
			.where(eq(clinicianLicenses.staffProfileId, staffProfileId))
			.orderBy(desc(clinicianLicenses.updatedAt))
	}

	private async resolveActiveStaffProfileForUser(userId: string) {
		const profileRows = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(and(eq(staffProfiles.userId, userId), eq(staffProfiles.isActive, true)))

		if (profileRows.length === 0) {
			throw new NotFoundException("No active staff profile found for this user")
		}

		const profileIds = profileRows.map(profile => profile.id)
		const assignments = await db
			.select({
				staffProfileId: userRoles.staffProfileId,
				roleId: userRoles.roleId,
				isPrimary: userRoles.isPrimary,
			})
			.from(userRoles)
			.where(inArray(userRoles.staffProfileId, profileIds))

		if (assignments.length === 0) {
			throw new ForbiddenException("Only Clinic Coordinator can manage license records")
		}

		const roleIds = assignments.map(assignment => assignment.roleId)
		const roleRows = await db
			.select({ id: roles.id, name: roles.name })
			.from(roles)
			.where(inArray(roles.id, roleIds))

		const rolesById = new Map(roleRows.map(role => [role.id, role.name]))
		const activeAssignment = assignments.find(assignment => assignment.isPrimary) ?? assignments[0]!

		return {
			staffProfileId: activeAssignment.staffProfileId,
			roleName: rolesById.get(activeAssignment.roleId) ?? null,
		}
	}

	private async resolveCoordinatorStaffProfileIdForUser(userId: string) {
		const activeProfile = await this.resolveActiveStaffProfileForUser(userId)
		if (activeProfile.roleName?.trim().toLowerCase() !== "clinic coordinator") {
			throw new ForbiddenException("Only Clinic Coordinator can manage license records")
		}
		return activeProfile.staffProfileId
	}

	private async assertLicenseOwnedByUser(userId: string, licenseId: string) {
		const staffProfileId = await this.resolveCoordinatorStaffProfileIdForUser(userId)
		const [license] = await db
			.select()
			.from(clinicianLicenses)
			.where(eq(clinicianLicenses.id, licenseId))

		if (!license) throw new NotFoundException("License not found")
		if (license.staffProfileId !== staffProfileId) {
			throw new ForbiddenException("You can only manage your own license records")
		}

		return license
	}

	@Cron("0 6 * * *")
	async sweepExpiredLicenses(): Promise<void> {
		const today = new Date().toISOString().split("T")[0]!
		await db
			.update(clinicianLicenses)
			.set({ status: "expired", updatedAt: new Date() })
			.where(
				and(eq(clinicianLicenses.status, "verified"), lte(clinicianLicenses.expiryDate, today))
			)
	}

	async list(input: ListInput) {
		const { facilityId, search, status, page, limit } = input
		const offset = (page - 1) * limit

		const profileConditions: ReturnType<typeof eq>[] = []
		if (facilityId) profileConditions.push(eq(staffProfiles.facilityId, facilityId))

		const profileQuery = db
			.select({
				id: staffProfiles.id,
				userId: staffProfiles.userId,
				facilityId: staffProfiles.facilityId,
			})
			.from(staffProfiles)
			.where(profileConditions.length ? and(...profileConditions) : undefined)

		const allProfiles = await profileQuery
		if (allProfiles.length === 0) return { data: [], total: 0, page, limit }

		const profileIds = allProfiles.map(p => p.id)
		const userIds = allProfiles.map(p => p.userId)

		const userRows = await db
			.select({ id: users.id, name: users.name })
			.from(users)
			.where(search ? and(or(ilike(users.name, `%${search}%`))!) : undefined)

		const matchingUserIds = search
			? userRows.filter(u => userIds.includes(u.id)).map(u => u.id)
			: userIds

		const matchingProfileIds = allProfiles
			.filter(p => matchingUserIds.includes(p.userId))
			.map(p => p.id)

		if (matchingProfileIds.length === 0) return { data: [], total: 0, page, limit }

		const licenseConditions = [
			...matchingProfileIds.map(id => eq(clinicianLicenses.staffProfileId, id)),
		]

		const allLicenses = await db
			.select()
			.from(clinicianLicenses)
			.where(
				status
					? and(or(...licenseConditions.map(c => c))!, eq(clinicianLicenses.status, status))
					: or(...licenseConditions.map(c => c))!
			)
			.orderBy(desc(clinicianLicenses.updatedAt))

		const licensesByProfileId = new Map<string, typeof allLicenses>()
		for (const lic of allLicenses) {
			const list = licensesByProfileId.get(lic.staffProfileId) ?? []
			list.push(lic)
			licensesByProfileId.set(lic.staffProfileId, list)
		}

		const userById = new Map(userRows.map(u => [u.id, u]))

		const data = allProfiles
			.filter(p => matchingProfileIds.includes(p.id))
			.map(p => {
				const licenses = licensesByProfileId.get(p.id) ?? []
				const daysUntilNextExpiry = this.nextExpiryStatus(licenses)

				return {
					staffProfileId: p.id,
					staffName: userById.get(p.userId)?.name ?? "Unknown",
					facilityId: p.facilityId,
					licenses,
					daysUntilNextExpiry,
				}
			})

		const paged = data.slice(offset, offset + limit)
		return { data: paged, total: data.length, page, limit }
	}

	async get(staffProfileId: string) {
		const [profile] = await db
			.select({
				id: staffProfiles.id,
				userId: staffProfiles.userId,
				facilityId: staffProfiles.facilityId,
				prcLicenseNumber: staffProfiles.prcLicenseNumber,
				prcExpiry: staffProfiles.prcExpiry,
				ptrNumber: staffProfiles.ptrNumber,
				ptrExpiry: staffProfiles.ptrExpiry,
				pdeaS2License: staffProfiles.pdeaS2License,
				pdeaS2Expiry: staffProfiles.pdeaS2Expiry,
			})
			.from(staffProfiles)
			.where(eq(staffProfiles.id, staffProfileId))

		if (!profile) throw new NotFoundException("Staff profile not found")

		const [user] = await db
			.select({ name: users.name })
			.from(users)
			.where(eq(users.id, profile.userId))

		let licenses = await this.listLicensesForProfile(staffProfileId)
		const backfilled = await this.backfillActiveCredentialLicenses(profile, licenses)
		if (backfilled) {
			licenses = await this.listLicensesForProfile(staffProfileId)
		}

		const daysUntilNextExpiry = this.nextExpiryStatus(licenses)

		return {
			staffProfileId,
			staffName: user?.name ?? "Unknown",
			facilityId: profile.facilityId,
			licenses,
			daysUntilNextExpiry,
		}
	}

	async getMine(userId: string) {
		const staffProfileId = await this.resolveCoordinatorStaffProfileIdForUser(userId)
		return this.get(staffProfileId)
	}

	async addMine(userId: string, input: AddMyLicenseInput) {
		const staffProfileId = await this.resolveCoordinatorStaffProfileIdForUser(userId)
		return this.add({ staffProfileId, ...input })
	}

	async updateMine(userId: string, input: UpdateLicenseInput) {
		await this.assertLicenseOwnedByUser(userId, input.id)
		return this.update(input)
	}

	async verifyMine(userId: string, input: VerifyInput) {
		await this.assertLicenseOwnedByUser(userId, input.id)
		return this.verify(input)
	}

	async deleteMine(userId: string, id: string) {
		await this.assertLicenseOwnedByUser(userId, id)
		return this.deleteLicense(id)
	}

	async add(input: AddLicenseInput) {
		const [profile] = await db
			.select({ id: staffProfiles.id })
			.from(staffProfiles)
			.where(eq(staffProfiles.id, input.staffProfileId))

		if (!profile) throw new NotFoundException("Staff profile not found")

		const [license] = await db
			.insert(clinicianLicenses)
			.values({
				staffProfileId: input.staffProfileId,
				licenseType: input.licenseType,
				licenseNumber: input.licenseNumber,
				issueDate: input.issueDate ?? null,
				expiryDate: input.expiryDate ?? null,
				documentUri: input.documentUri ?? null,
				status: "pending",
			})
			.returning()

		return license!
	}

	async update(input: UpdateLicenseInput) {
		const [license] = await db
			.select()
			.from(clinicianLicenses)
			.where(eq(clinicianLicenses.id, input.id))

		if (!license) throw new NotFoundException("License not found")

		const [updated] = await db
			.update(clinicianLicenses)
			.set({
				...(input.licenseNumber !== undefined ? { licenseNumber: input.licenseNumber } : {}),
				...(input.issueDate !== undefined ? { issueDate: input.issueDate } : {}),
				...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
				...(input.documentUri !== undefined ? { documentUri: input.documentUri } : {}),
				updatedAt: new Date(),
			})
			.where(eq(clinicianLicenses.id, input.id))
			.returning()

		if (!updated) throw new NotFoundException("License not found")

		if (updated.status === "verified") {
			await this.propagateVerifiedLicenseToStaffProfile(updated)
		}

		return updated
	}

	async verify(input: VerifyInput) {
		const [license] = await db
			.select()
			.from(clinicianLicenses)
			.where(eq(clinicianLicenses.id, input.id))

		if (!license) throw new NotFoundException("License not found")

		const [updated] = await db
			.update(clinicianLicenses)
			.set({
				status: "verified",
				verificationProof: input.verificationProof ?? null,
				verifiedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(clinicianLicenses.id, input.id))
			.returning()

		await this.propagateVerifiedLicenseToStaffProfile(license)

		return updated!
	}

	private async propagateVerifiedLicenseToStaffProfile(
		license: typeof clinicianLicenses.$inferSelect
	) {
		const updatedAt = new Date()

		switch (license.licenseType) {
			case "PRC":
				await db
					.update(staffProfiles)
					.set({
						prcLicenseNumber: license.licenseNumber,
						prcExpiry: license.expiryDate,
						updatedAt,
					})
					.where(eq(staffProfiles.id, license.staffProfileId))
				break
			case "PTR":
				await db
					.update(staffProfiles)
					.set({
						ptrNumber: license.licenseNumber,
						ptrExpiry: license.expiryDate,
						updatedAt,
					})
					.where(eq(staffProfiles.id, license.staffProfileId))
				break
			case "S2":
				await db
					.update(staffProfiles)
					.set({
						pdeaS2License: license.licenseNumber,
						pdeaS2Expiry: license.expiryDate,
						s2VerifiedUntil: license.expiryDate ? new Date(license.expiryDate) : null,
						updatedAt,
					})
					.where(eq(staffProfiles.id, license.staffProfileId))
				break
		}
	}

	private async clearStaffProfileCredential(
		staffProfileId: string,
		licenseType: (typeof clinicianLicenses.$inferSelect)["licenseType"]
	) {
		const updatedAt = new Date()

		switch (licenseType) {
			case "PRC":
				await db
					.update(staffProfiles)
					.set({
						prcLicenseNumber: null,
						prcExpiry: null,
						updatedAt,
					})
					.where(eq(staffProfiles.id, staffProfileId))
				break
			case "PTR":
				await db
					.update(staffProfiles)
					.set({
						ptrNumber: null,
						ptrExpiry: null,
						updatedAt,
					})
					.where(eq(staffProfiles.id, staffProfileId))
				break
			case "S2":
				await db
					.update(staffProfiles)
					.set({
						pdeaS2License: null,
						pdeaS2Expiry: null,
						s2VerifiedUntil: null,
						updatedAt,
					})
					.where(eq(staffProfiles.id, staffProfileId))
				break
		}
	}

	private async syncStaffProfileCredentialAfterDelete(
		license: typeof clinicianLicenses.$inferSelect
	) {
		if (license.status !== "verified") return

		const [replacement] = await db
			.select()
			.from(clinicianLicenses)
			.where(
				and(
					eq(clinicianLicenses.staffProfileId, license.staffProfileId),
					eq(clinicianLicenses.licenseType, license.licenseType),
					eq(clinicianLicenses.status, "verified")
				)
			)
			.orderBy(desc(clinicianLicenses.updatedAt))

		if (replacement) {
			await this.propagateVerifiedLicenseToStaffProfile(replacement)
			return
		}

		await this.clearStaffProfileCredential(license.staffProfileId, license.licenseType)
	}

	async markPending(id: string) {
		const [license] = await db.select().from(clinicianLicenses).where(eq(clinicianLicenses.id, id))

		if (!license) throw new NotFoundException("License not found")

		const [updated] = await db
			.update(clinicianLicenses)
			.set({ status: "pending", updatedAt: new Date() })
			.where(eq(clinicianLicenses.id, id))
			.returning()

		return updated!
	}

	async deleteLicense(id: string) {
		const [license] = await db.select().from(clinicianLicenses).where(eq(clinicianLicenses.id, id))

		if (!license) throw new NotFoundException("License not found")

		await db.delete(clinicianLicenses).where(eq(clinicianLicenses.id, id))
		await this.syncStaffProfileCredentialAfterDelete(license)
		return { success: true }
	}
}
