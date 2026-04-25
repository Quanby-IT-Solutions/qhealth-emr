import { and, desc, eq, isNull } from "drizzle-orm"

import { encounterStatusEvents } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

type DbClient = typeof db

/**
 * Closes the most recent open SLA step for an encounter + workflow pair by
 * back-filling `actualMinutes`.
 *
 * Call this immediately *before* inserting the next transition event so that
 * `actualMinutes IS NULL` always means "currently in progress / not yet closed".
 *
 * @param client       Drizzle database client or transaction object cast as `typeof db`
 * @param encounterId  The encounter being tracked
 * @param workflowType The workflow stream to close within (e.g. "opd", "billing")
 * @param closedAt     Defaults to now(); pass explicitly for backdated transitions
 */
export async function closeOpenSlaStep(
	client: DbClient,
	encounterId: string,
	workflowType: "opd" | "ed" | "admission" | "discharge" | "ancillary" | "pharmacy" | "billing",
	closedAt: Date = new Date(),
): Promise<void> {
	const [openStep] = await client
		.select({ id: encounterStatusEvents.id, occurredAt: encounterStatusEvents.occurredAt })
		.from(encounterStatusEvents)
		.where(
			and(
				eq(encounterStatusEvents.encounterId, encounterId),
				eq(encounterStatusEvents.workflowType, workflowType),
				isNull(encounterStatusEvents.actualMinutes),
			),
		)
		.orderBy(desc(encounterStatusEvents.occurredAt))
		.limit(1)

	if (!openStep) return

	const actualMinutes = Math.max(
		1,
		Math.ceil((closedAt.getTime() - openStep.occurredAt.getTime()) / 60_000),
	)

	await client
		.update(encounterStatusEvents)
		.set({ actualMinutes })
		.where(eq(encounterStatusEvents.id, openStep.id))
}
