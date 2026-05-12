"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useSlaConfigsOrpcQuery(facilityId: string, enabled = true) {
	return useQuery(
		orpc.sla.listConfigs.queryOptions({
			input: { facilityId },
			enabled: enabled && !!facilityId,
			staleTime: 60_000,
		})
	)
}

export function useSlaEventsOrpcQuery(
	params: {
		facilityId: string
		workflowType?: string
		status?: string
		page?: number
	},
	enabled = true
) {
	return useQuery(
		orpc.sla.listEvents.queryOptions({
			input: {
				facilityId: params.facilityId,
				workflowType: params.workflowType as never,
				status: params.status as never,
				page: params.page ?? 1,
				limit: 20,
			},
			enabled: enabled && !!params.facilityId,
			staleTime: 15_000,
			refetchInterval: 30_000,
		})
	)
}

export function useSlaDashboardQuery(facilityId: string, enabled = true) {
	return useQuery(
		orpc.sla.dashboard.queryOptions({
			input: { facilityId },
			enabled: enabled && !!facilityId,
			staleTime: 60_000,
			refetchInterval: 5 * 60_000,
		})
	)
}

export function useSlaTurnaroundQuery(
	params: {
		facilityId: string
		workflowType: string
		startDate: string
		endDate: string
		compareStartDate?: string
		compareEndDate?: string
	},
	enabled = true
) {
	return useQuery(
		orpc.sla.turnaround.queryOptions({
			input: params,
			enabled: enabled && !!params.facilityId && !!params.workflowType,
			staleTime: 5 * 60_000,
		})
	)
}

export function useSlaBottleneckQuery(
	params: {
		facilityId: string
		workflowType: string
		startDate: string
		endDate: string
	},
	enabled = true
) {
	return useQuery(
		orpc.sla.bottleneck.queryOptions({
			input: params,
			enabled: enabled && !!params.facilityId && !!params.workflowType,
			staleTime: 5 * 60_000,
		})
	)
}

export function useAppendStatusLogMutation() {
	return useMutation(orpc.sla.appendStatusLog.mutationOptions({}))
}

export function useSlaComplianceReportOrpcQuery(
	params: {
		facilityId: string
		periodStart: string
		periodEnd: string
	},
	enabled = true
) {
	return useQuery(
		orpc.sla.getComplianceReport.queryOptions({
			input: {
				facilityId: params.facilityId,
				periodStart: params.periodStart,
				periodEnd: params.periodEnd,
			},
			enabled: enabled && !!params.facilityId,
			staleTime: 5 * 60_000,
		})
	)
}

export function useCreateSlaConfigOrpcMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.sla.createConfig.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.sla.listConfigs.key() }),
		})
	)
}

export function useUpdateSlaConfigOrpcMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.sla.updateConfig.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.sla.listConfigs.key() }),
		})
	)
}

export function useDeleteSlaConfigOrpcMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.sla.deleteConfig.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.sla.listConfigs.key() }),
		})
	)
}

export function useListStepConfigsOrpcQuery(facilityId: string, enabled = true) {
	return useQuery(
		orpc.sla.listStepConfigs.queryOptions({
			input: { facilityId },
			enabled: enabled && !!facilityId,
			staleTime: 60_000,
		})
	)
}

export function useCreateSlaStepConfigOrpcMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.sla.createStepConfig.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.sla.listStepConfigs.key() }),
		})
	)
}

export function useUpdateSlaStepConfigOrpcMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.sla.updateStepConfig.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: orpc.sla.listStepConfigs.key() })
				const previousData = queryClient.getQueriesData({ queryKey: orpc.sla.listStepConfigs.key() })
				queryClient.setQueriesData(
					{ queryKey: orpc.sla.listStepConfigs.key() },
					(old: { data?: Array<{ id: string; [key: string]: unknown }> } | undefined) => {
						if (!old?.data) return old
						return {
							...old,
							data: old.data.map(item =>
								item.id === variables.id ? { ...item, ...variables } : item
							),
						}
					}
				)
				return { previousData }
			},
			onError: (_err, _variables, context) => {
				if (context?.previousData) {
					for (const [queryKey, data] of context.previousData) {
						queryClient.setQueryData(queryKey, data)
					}
				}
			},
			onSettled: () => queryClient.invalidateQueries({ queryKey: orpc.sla.listStepConfigs.key() }),
		})
	)
}

export function useDeleteSlaStepConfigOrpcMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.sla.deleteStepConfig.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.sla.listStepConfigs.key() }),
		})
	)
}
