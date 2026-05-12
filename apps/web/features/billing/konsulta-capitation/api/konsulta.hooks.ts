"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { billingOrpc } from "@/services/orpc/client"

interface KonsultaActivitiesFilter {
	patientId: string
	facilityId: string
	page?: number
	limit?: number
	activityType?: "FPE" | "Follow-up" | "Lab"
	periodStart?: string
	periodEnd?: string
}

export function useListKonsultaActivitiesQuery(filter: KonsultaActivitiesFilter) {
	return useQuery(
		billingOrpc.listKonsultaActivities.queryOptions({
			input: {
				patientId: filter.patientId,
				facilityId: filter.facilityId,
				page: filter.page ?? 1,
				limit: filter.limit ?? 20,
				activityType: filter.activityType,
				periodStart: filter.periodStart,
				periodEnd: filter.periodEnd,
			},
			enabled: !!filter.patientId && !!filter.facilityId,
		})
	)
}

interface KonsultaTrackerRowsFilter {
	facilityId: string
	page?: number
	limit?: number
	periodStart?: string
	periodEnd?: string
	memberStatus?: "all" | "active" | "exhausted" | "inactive"
}

export function useListKonsultaTrackerRowsQuery(filter: KonsultaTrackerRowsFilter) {
	return useQuery(
		billingOrpc.listKonsultaTrackerRows.queryOptions({
			input: {
				facilityId: filter.facilityId,
				page: filter.page ?? 1,
				limit: filter.limit ?? 20,
				periodStart: filter.periodStart,
				periodEnd: filter.periodEnd,
				memberStatus: filter.memberStatus,
			},
			enabled: !!filter.facilityId,
		})
	)
}

export function useRecordKonsultaEventMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.recordKonsultaEvent.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: billingOrpc.listKonsultaActivities.key() }),
		})
	)
}

export function useGenerateKonsultaReportMutation() {
	return useMutation(billingOrpc.generateKonsultaReport.mutationOptions())
}

export function useKonsultaBenefitQuery(facilityId: string, patientId: string) {
	return useQuery(
		billingOrpc.getKonsultaBenefit.queryOptions({
			input: { facilityId, patientId },
			enabled: !!facilityId && !!patientId,
		})
	)
}
