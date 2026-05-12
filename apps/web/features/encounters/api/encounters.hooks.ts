"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

function shouldRetryDetailQuery(error: unknown, failureCount: number) {
	const candidate = error as { status?: number } | null
	if (candidate?.status === 403 || candidate?.status === 404) {
		return false
	}

	return failureCount < 3
}

export function useEncounterListQuery(
	params: {
		facilityId: string
		patientId?: string
		status?: "active" | "pending_discharge" | "discharged" | "closed" | "cancelled"
		encounterType?: "inpatient" | "outpatient" | "emergency" | "telemedicine"
		page?: number
		limit?: number
	},
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.encounter.list.queryOptions({
			input: params,
			enabled: (options?.enabled ?? true) && !!params.facilityId,
			staleTime: 30_000,
		})
	)
}

export function useEncounterDetailQuery(encounterId: string, options?: { enabled?: boolean }) {
	return useQuery(
		orpc.encounter.get.queryOptions({
			input: { id: encounterId },
			enabled: (options?.enabled ?? true) && !!encounterId,
			retry: (failureCount, error) => shouldRetryDetailQuery(error, failureCount),
		})
	)
}

export function useCreateEncounterMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.encounter.create.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.encounter.key() }),
		})
	)
}

export function useInitiateTransferMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.encounter.initiateTransfer.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.encounter.key() }),
		})
	)
}

export function useReceiveTransferMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.encounter.receiveTransfer.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.encounter.key() })
				void queryClient.invalidateQueries({ queryKey: orpc.bed.key() })
			},
		})
	)
}

export function usePendingTransfersQuery(
	params: { facilityId: string; toWardId?: string },
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.encounter.listPendingTransfers.queryOptions({
			input: params,
			enabled: (options?.enabled ?? true) && !!params.facilityId,
			staleTime: 30_000,
		})
	)
}

export function useDischargeEncounterMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.encounter.discharge.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.encounter.key() }),
		})
	)
}

export function useSignMayGoHomeOrderMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.encounter.signMayGoHomeOrder.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.encounter.key() }),
		})
	)
}

export function useCloseEncounterMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.encounter.close.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.encounter.key() }),
		})
	)
}

export function useCaptureDpaConsentMutation() {
	return useMutation(orpc.clinicalDocs.createConsent.mutationOptions())
}

export function useDischargeChecklistQuery(encounterId: string, options?: { enabled?: boolean }) {
	return useQuery(
		orpc.encounter.checklist.queryOptions({
			input: { id: encounterId },
			enabled: (options?.enabled ?? true) && !!encounterId,
		})
	)
}

// ============================================================================
// SLA Status
// ============================================================================

interface SlaStatusResponse {
	encounterId: string
	overallStatus: "on_time" | "approaching" | "exceeded"
	activeEvents: Array<{
		workflowType: string
		startedAt: string
		targetMinutes: number
		elapsedMinutes: number
		status: "on_time" | "approaching" | "exceeded"
	}>
	completedEvents: number
	exceededCount: number
}

export function useSlaStatusQuery(encounterId: string, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: ["encounters", "sla-status", encounterId] as const,
		queryFn: async () => {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/sla/events?encounterId=${encounterId}`,
				{ credentials: "include" }
			)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			return res.json() as Promise<SlaStatusResponse>
		},
		enabled: (options?.enabled ?? true) && !!encounterId,
		staleTime: 30_000,
	})
}

// ============================================================================
// Death Report Trigger
// ============================================================================

interface DeathReportTriggerInput {
	encounterId: string
	patientId: string
	facilityId: string
	dateOfDeath: string
	reportType: "fmdrf" | "fndrf" | "both"
}

interface DeathReportTriggerResponse {
	success: boolean
	fmdrfId: string | null
	fndrfId: string | null
	message: string
}

export function useDeathReportTriggerMutation() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (data: DeathReportTriggerInput) => {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/death-reporting/trigger`,
				{
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				}
			)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			return res.json() as Promise<DeathReportTriggerResponse>
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: orpc.encounter.key() })
		},
	})
}
