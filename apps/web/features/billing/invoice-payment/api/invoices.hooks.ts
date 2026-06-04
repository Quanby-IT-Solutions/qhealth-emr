"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { billingOrpc } from "@/services/orpc/client"

export function useInvoicesQuery(encounterId: string, facilityId: string) {
	return useQuery(
		billingOrpc.listInvoices.queryOptions({
			input: { encounterId, facilityId, page: 1, limit: 10 },
		})
	)
}

export function useInvoiceQuery(id: string) {
	return useQuery(
		billingOrpc.getInvoice.queryOptions({
			input: { id },
			enabled: !!id,
		})
	)
}

export function useGenerateInvoiceMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.generateInvoice.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.listInvoices.key() }),
		})
	)
}

export function useFinalizeInvoiceMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.finalizeInvoice.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.listInvoices.key() }),
		})
	)
}

export function useApplyDiscountMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.applyDiscount.mutationOptions({
			onSuccess: () => qc.invalidateQueries({ queryKey: billingOrpc.listInvoices.key() }),
		})
	)
}

export function useListPaymentsQuery(invoiceId: string, facilityId: string) {
	return useQuery(
		billingOrpc.listPayments.queryOptions({
			input: { invoiceId, facilityId, page: 1, limit: 50 },
			enabled: !!invoiceId,
		})
	)
}

export function useRecordPaymentMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.recordPayment.mutationOptions({
			onSuccess: () =>
				Promise.all([
					qc.invalidateQueries({ queryKey: billingOrpc.listPayments.key() }),
					qc.invalidateQueries({ queryKey: billingOrpc.listInvoices.key() }),
				]),
		})
	)
}

export function useIssueReceiptMutation() {
	const qc = useQueryClient()
	return useMutation(
		billingOrpc.issueReceipt.mutationOptions({
			onSuccess: () =>
				Promise.all([
					qc.invalidateQueries({ queryKey: billingOrpc.listPayments.key() }),
					qc.invalidateQueries({ queryKey: billingOrpc.listInvoices.key() }),
				]),
		})
	)
}
