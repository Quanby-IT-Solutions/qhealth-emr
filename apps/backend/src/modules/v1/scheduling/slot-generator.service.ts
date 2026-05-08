import { Injectable, Logger } from "@nestjs/common"
import { Cron } from "@nestjs/schedule"
import { and, eq } from "drizzle-orm"

import { clinicSlots, clinicTemplates } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

@Injectable()
export class SlotGeneratorService {
	private readonly logger = new Logger(SlotGeneratorService.name)
	private readonly windowDays = Number(process.env.SCHEDULER_SLOT_WINDOW_DAYS ?? 60) || 60

	async generateSlotsForTemplate(templateId: string, fromDate: string, toDate: string) {
		const [template] = await db
			.select()
			.from(clinicTemplates)
			.where(and(eq(clinicTemplates.id, templateId), eq(clinicTemplates.isActive, true)))
			.limit(1)

		if (!template) {
			return { inserted: 0 }
		}

		const rows = this.buildSlotRows(template, fromDate, toDate)
		if (rows.length === 0) {
			return { inserted: 0 }
		}

		const result = await db.insert(clinicSlots).values(rows).onConflictDoNothing()
		const inserted = (result as unknown as { rowCount?: number })?.rowCount ?? 0
		return { inserted }
	}

	@Cron("30 0 * * *", { name: "scheduler-slot-rolling-window" })
	async generateRollingWindow(): Promise<{ templates: number; inserted: number }> {
		const today = this.todayDateString()
		const toDate = this.addDays(today, this.windowDays)

		const templates = await db
			.select()
			.from(clinicTemplates)
			.where(eq(clinicTemplates.isActive, true))

		let inserted = 0
		for (const template of templates) {
			const result = await this.generateSlotsForTemplate(template.id, today, toDate)
			inserted += result.inserted
		}

		this.logger.log(
			`Rolling slot generation complete: templates=${templates.length} inserted=${inserted} windowDays=${this.windowDays}`
		)

		return { templates: templates.length, inserted }
	}

	private buildSlotRows(
		template: typeof clinicTemplates.$inferSelect,
		fromDate: string,
		toDate: string
	) {
		const rows: Array<typeof clinicSlots.$inferInsert> = []
		const startMinutes = this.timeToMinutes(template.startTime)
		const endMinutes = this.timeToMinutes(template.endTime)

		for (const slotDate of this.enumerateDates(fromDate, toDate)) {
			if (this.dayOfWeek(slotDate) !== template.dayOfWeek) {
				continue
			}

			for (
				let slotStartMinutes = startMinutes;
				slotStartMinutes + template.slotDurationMinutes <= endMinutes;
				slotStartMinutes += template.slotDurationMinutes
			) {
				rows.push({
					clinicTemplateId: template.id,
					facilityId: template.facilityId,
					clinicianStaffId: template.clinicianStaffId,
					slotDate,
					slotStartTime: this.minutesToTime(slotStartMinutes),
					slotEndTime: this.minutesToTime(slotStartMinutes + template.slotDurationMinutes),
					status: "open",
					blockReason: null,
					appointmentId: null,
					blockedByStaffId: null,
					blockedAt: null,
				})
			}
		}

		return rows
	}

	private enumerateDates(fromDate: string, toDate: string): string[] {
		const dates: string[] = []
		const current = new Date(`${fromDate}T00:00:00.000Z`)
		const end = new Date(`${toDate}T00:00:00.000Z`)

		while (current <= end) {
			dates.push(current.toISOString().slice(0, 10))
			current.setUTCDate(current.getUTCDate() + 1)
		}

		return dates
	}

	private dayOfWeek(date: string): number {
		return new Date(`${date}T00:00:00.000Z`).getUTCDay()
	}

	private todayDateString(): string {
		return new Date().toISOString().slice(0, 10)
	}

	private addDays(date: string, days: number): string {
		const next = new Date(`${date}T00:00:00.000Z`)
		next.setUTCDate(next.getUTCDate() + days)
		return next.toISOString().slice(0, 10)
	}

	private timeToMinutes(time: string): number {
		const [hours, minutes] = time.split(":").map(Number)
		return hours! * 60 + minutes!
	}

	private minutesToTime(minutes: number): string {
		const hours = Math.floor(minutes / 60)
		const mins = minutes % 60
		return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
	}
}
