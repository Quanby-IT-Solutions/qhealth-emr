"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { billingOrpc } from "@/services/orpc/client"

export function useGenerateEsoaMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.generateEsoa.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.getSoa.key() }),
		})
	)
}

export function useSoaQuery(encounterId: string) {
	return useQuery(
		billingOrpc.getSoa.queryOptions({
			input: { encounterId },
			enabled: !!encounterId,
		})
	)
}

export function useGenerateSoaMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.generateSoa.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.getSoa.key() }),
		})
	)
}

export function useFinalizeSoaMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.finalizeSoa.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.getSoa.key() }),
		})
	)
}

export function useListEsoaStatementsQuery(invoiceId: string) {
	return useQuery(
		billingOrpc.listEsoaStatements.queryOptions({
			input: { invoiceId },
			enabled: !!invoiceId,
		})
	)
}

export function useSendEsoaMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.sendEsoa.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.listEsoaStatements.key() }),
		})
	)
}

export function useGenerateEsoaFromInvoiceMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.generateEsoaFromInvoice.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.listEsoaStatements.key() }),
		})
	)
}
