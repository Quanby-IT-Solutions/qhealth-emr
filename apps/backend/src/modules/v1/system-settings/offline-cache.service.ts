import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { and, count, eq } from "drizzle-orm"

import { offlineCacheJobs, patients, systemSettings } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

/** Runs once at startup (after a short delay) then every hour for all enabled facilities. */
const SCHEDULER_INITIAL_DELAY_MS = 30_000
const SCHEDULER_INTERVAL_MS = 60 * 60 * 1000

export type OfflineCacheJobResult = {
	jobId: string
	status: "running" | "completed" | "failed"
	cachedPatientCount: number | null
	errorMessage: string | null
}

@Injectable()
export class OfflineCacheService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(OfflineCacheService.name)
	private schedulerHandle: ReturnType<typeof setInterval> | null = null

	onModuleInit() {
		const run = () => this.runScheduledJobsForAllFacilities()
		const timeout = setTimeout(() => {
			void run()
			this.schedulerHandle = setInterval(() => void run(), SCHEDULER_INTERVAL_MS)
		}, SCHEDULER_INITIAL_DELAY_MS)
		// Prevent the timeout from keeping the process alive during tests
		timeout.unref?.()
	}

	onModuleDestroy() {
		if (this.schedulerHandle) {
			clearInterval(this.schedulerHandle)
			this.schedulerHandle = null
		}
	}

	/**
	 * Execute an offline cache preparation job for a single facility.
	 *
	 * Steps:
	 * 1. Verify the facility has offline caching enabled in system_settings.
	 * 2. Insert a `running` job row into offline_cache_jobs.
	 * 3. Count active patients — this is the server-side "cache preparation" step that
	 *    produces the authoritative count the client uses to track readiness.
	 * 4. Mark the job as `completed` (or `failed` on error).
	 */
	async runJobForFacility(facilityId: string, triggeredBy: string): Promise<OfflineCacheJobResult> {
		const [settings] = await db
			.select({ enableOfflineSummaryCache: systemSettings.enableOfflineSummaryCache })
			.from(systemSettings)
			.where(eq(systemSettings.facilityId, facilityId))
			.limit(1)

		if (!settings?.enableOfflineSummaryCache) {
			return {
				jobId: crypto.randomUUID(),
				status: "failed",
				cachedPatientCount: null,
				errorMessage: "Offline summary caching is disabled for this facility",
			}
		}

		const [jobRecord] = await db
			.insert(offlineCacheJobs)
			.values({ facilityId, status: "running", triggeredBy })
			.returning({ id: offlineCacheJobs.id })

		const jobId = jobRecord!.id

		try {
			const [countRow] = await db
				.select({ n: count() })
				.from(patients)
				.where(and(eq(patients.facilityId, facilityId), eq(patients.isActive, true)))

			const cachedPatientCount = countRow?.n ?? 0

			await db
				.update(offlineCacheJobs)
				.set({ status: "completed", completedAt: new Date(), cachedPatientCount })
				.where(eq(offlineCacheJobs.id, jobId))

			this.logger.log(
				`Offline cache job completed for facility ${facilityId}: ${cachedPatientCount} active patients (triggered by ${triggeredBy})`
			)

			return { jobId, status: "completed", cachedPatientCount, errorMessage: null }
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error during cache preparation"

			await db
				.update(offlineCacheJobs)
				.set({ status: "failed", completedAt: new Date(), errorMessage })
				.where(eq(offlineCacheJobs.id, jobId))

			this.logger.error(
				`Offline cache job failed for facility ${facilityId}: ${errorMessage}`
			)

			return { jobId, status: "failed", cachedPatientCount: null, errorMessage }
		}
	}

	/** Find all facilities with offline caching enabled and run a job for each. */
	private async runScheduledJobsForAllFacilities(): Promise<void> {
		let enabledFacilities: Array<{ facilityId: string }>

		try {
			enabledFacilities = await db
				.select({ facilityId: systemSettings.facilityId })
				.from(systemSettings)
				.where(eq(systemSettings.enableOfflineSummaryCache, true))
		} catch (err) {
			this.logger.error(`Scheduled offline cache run failed to query enabled facilities: ${String(err)}`)
			return
		}

		this.logger.log(`Scheduled offline cache run: ${enabledFacilities.length} facilities enabled`)

		for (const { facilityId } of enabledFacilities) {
			await this.runJobForFacility(facilityId, "scheduler")
		}
	}
}
