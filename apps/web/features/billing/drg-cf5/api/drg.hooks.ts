"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { billingOrpc } from "@/services/orpc/client"

export function useCf5Query(encounterId: string) {
	return useQuery(
		billingOrpc.getCf5.queryOptions({
			input: { encounterId },
			enabled: !!encounterId,
		})
	)
}

export function useSearchDrgQuery(search: string) {
	return useQuery(
		billingOrpc.searchDrgCodes.queryOptions({
			input: { search },
			enabled: search.length > 0,
		})
	)
}

export function useAssignDrgMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.assignDrg.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.getCf5.key() }),
		})
	)
}

export function useApproveCf5Mutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.approveCf5.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.getCf5.key() }),
		})
	)
}

export function useCf5WithBillingQuery(encounterId: string) {
	return useQuery(
		billingOrpc.getCf5WithBilling.queryOptions({
			input: { encounterId },
			enabled: !!encounterId,
		})
	)
}

export function useSuggestDrgMutation() {
	return useMutation(billingOrpc.suggestDrg.mutationOptions())
}

export function useConfirmDrgMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.confirmDrg.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: billingOrpc.suggestDrg.key() })
				qc.invalidateQueries({ queryKey: billingOrpc.getCf5.key() })
			},
		})
	)
}

export function usePreviewCf5XmlQuery(cf5ClaimId: string) {
	return useQuery(
		billingOrpc.previewCf5Xml.queryOptions({
			input: { id: cf5ClaimId },
			enabled: !!cf5ClaimId,
		})
	)
}

export function usePollCf5StatusMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.pollCf5Status.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.listCf5Claims.key() }),
		})
	)
}

export function useListCf5ClaimsQuery(encounterId: string) {
	return useQuery(
		billingOrpc.listCf5Claims.queryOptions({
			input: { encounterId },
			enabled: !!encounterId,
		})
	)
}

export function useGenerateCf5Mutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.generateCf5.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.listCf5Claims.key() }),
		})
	)
}

export function useSubmitCf5Mutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.submitCf5.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.listCf5Claims.key() }),
		})
	)
}

export function useResubmitCf5Mutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.resubmitCf5.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.listCf5Claims.key() }),
		})
	)
}
