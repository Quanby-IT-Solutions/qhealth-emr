import { Injectable, NotFoundException } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { and, desc, eq, ilike, lte, or } from "drizzle-orm"

import { clinicianLicenses, staffProfiles, users } from "@repo/db/schema"

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
	licenseType: "PRC" | "PTR" | "S2"
	licenseNumber: string
	issueDate?: string
	expiryDate?: string
	documentUri?: string
}

interface VerifyInput {
	id: string
	verificationProof?: string
}

@Injectable()
export class ClinicianLicensesService {
	constructor(private readonly auditService: AuditService) {}

	private daysUntilDateOnly(date: string | Date | null): number | null {
		if (!date) return null
		const dateText =
			date instanceof Date
				? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
				: date.slice(0, 10)
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
			})
			.from(staffProfiles)
			.where(eq(staffProfiles.id, staffProfileId))

		if (!profile) throw new NotFoundException("Staff profile not found")

		const [user] = await db
			.select({ name: users.name })
			.from(users)
			.where(eq(users.id, profile.userId))

		const licenses = await db
			.select()
			.from(clinicianLicenses)
			.where(eq(clinicianLicenses.staffProfileId, staffProfileId))
			.orderBy(desc(clinicianLicenses.updatedAt))

		const daysUntilNextExpiry = this.nextExpiryStatus(licenses)

		return {
			staffProfileId,
			staffName: user?.name ?? "Unknown",
			facilityId: profile.facilityId,
			licenses,
			daysUntilNextExpiry,
		}
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

	private async propagateVerifiedLicenseToStaffProfile(license: typeof clinicianLicenses.$inferSelect) {
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
		return { success: true }
	}
}
