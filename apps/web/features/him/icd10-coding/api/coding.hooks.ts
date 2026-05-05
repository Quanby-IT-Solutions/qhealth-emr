"use client"

import { useQueries, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { billingOrpc, himOrpc, orpc } from "@/services/orpc/client"

export function useEncounterCodesQuery(encounterId: string) {
	return useQuery(
		himOrpc.listCodes.queryOptions({
			input: { encounterId },
			enabled: !!encounterId,
		})
	)
}

export function useUpsertCodesMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.upsertCodes.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listCodes.key() })
				qc.invalidateQueries({ queryKey: himOrpc.validateCodes.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}

export function useSignCodesMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.signCodes.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listCodes.key() })
				qc.invalidateQueries({ queryKey: himOrpc.validateCodes.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
				qc.invalidateQueries({ queryKey: orpc.encounter.key() })
				qc.invalidateQueries({ queryKey: billingOrpc.getCf4.key() })
			},
		})
	)
}

export function useAmendCodesMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.amendCodes.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listCodes.key() })
				qc.invalidateQueries({ queryKey: himOrpc.validateCodes.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
				qc.invalidateQueries({ queryKey: billingOrpc.getCf4.key() })
			},
		})
	)
}

export function useValidateCodesQuery(encounterId: string) {
	return useQuery(
		himOrpc.validateCodes.queryOptions({
			input: { encounterId },
			enabled: !!encounterId,
		})
	)
}

export function useTerminologySystemsQuery() {
	return useQuery(orpc.terminology.listSystems.queryOptions())
}

export function useIcd10LookupQuery(query: string) {
	const systemsQuery = useTerminologySystemsQuery()
	const icd10System = systemsQuery.data?.find(system => system.name.toLowerCase().includes("icd-10")) ?? null

	return useQuery(
		orpc.terminology.searchCodes.queryOptions({
			input: {
				codeSystemId: icd10System?.id ?? "00000000-0000-0000-0000-000000000000",
				query,
				includeDeprecated: true,
				page: 1,
				limit: 20,
			},
			enabled: !!icd10System && query.trim().length >= 2,
		})
	)
}

export function useTerminologyReplacementCodes(codeIds: string[]) {
	return useQueries({
		queries: codeIds.map(codeId =>
			orpc.terminology.getCode.queryOptions({
				input: { id: codeId },
				enabled: !!codeId,
			})
		),
	})
}
