"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { himOrpc, orpc } from "@/services/orpc/client"

export function useDeficienciesQuery(input: {
	facilityId: string
	page?: number
	limit?: number
	deficiencyType?: "missing_discharge_summary" | "missing_signature" | "undocumented_procedure"
	status?: "open" | "notified" | "resolved" | "dismissed"
	ownerStaffId?: string
	ownerQuery?: string
	ageBucket?: "lt_7" | "d7_14" | "d14_30" | "gt_30"
	sortBy?: "dischargeDatetime" | "ageDays" | "status" | "deficiencyType" | "patientName"
	sortDirection?: "asc" | "desc"
}) {
	return useQuery(
		himOrpc.listDeficiencies.queryOptions({
			input: { page: 1, limit: 25, sortBy: "dischargeDatetime", sortDirection: "desc", ...input },
		})
	)
}

export function useDeficiencyQuery(id: string) {
	return useQuery(
		himOrpc.getDeficiency.queryOptions({
			input: { id },
			enabled: !!id,
		})
	)
}

export function useNotifyDeficiencyMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.notifyDeficiency.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listDeficiencies.key() })
				qc.invalidateQueries({ queryKey: himOrpc.getDeficiency.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}

export function useMarkDeficiencyResolvedMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.markDeficiencyResolved.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listDeficiencies.key() })
				qc.invalidateQueries({ queryKey: himOrpc.getDeficiency.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}

export function useScanDeficienciesMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.scanDeficiencies.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listDeficiencies.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}
