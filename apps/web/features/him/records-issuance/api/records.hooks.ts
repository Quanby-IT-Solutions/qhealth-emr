"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { himOrpc, orpc } from "@/services/orpc/client"

export function useRecordsAuditQuery(input: {
	facilityId: string
	requestId?: string
	dateFrom?: string
	dateTo?: string
	documentType?: string
	recipient?: string
	page?: number
	limit?: number
}) {
	return useQuery(
		himOrpc.listRecordsAudit.queryOptions({
			input: { page: 1, limit: 50, ...input },
		})
	)
}

export function useCaptureDpaConsentMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.captureDpaConsent.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listRecordsAudit.key() })
				qc.invalidateQueries({ queryKey: orpc.medicalRecords.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}

export function useAttachIdentityProofMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.attachIdentityProof.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listRecordsAudit.key() })
				qc.invalidateQueries({ queryKey: orpc.medicalRecords.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}

export function useAttachPhysicianSignatureMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.attachPhysicianSignature.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listRecordsAudit.key() })
				qc.invalidateQueries({ queryKey: orpc.medicalRecords.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}

export function useMarkRecordsPaymentClearedMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.markRecordsPaymentCleared.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listRecordsAudit.key() })
				qc.invalidateQueries({ queryKey: orpc.medicalRecords.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}

export function useReleaseRecordsMutation() {
	const qc = useQueryClient()
	return useMutation(
		himOrpc.releaseRecords.mutationOptions({
			onSuccess: () => {
				qc.invalidateQueries({ queryKey: himOrpc.listRecordsAudit.key() })
				qc.invalidateQueries({ queryKey: orpc.medicalRecords.key() })
				qc.invalidateQueries({ queryKey: orpc.adminDashboard.himOps.key() })
			},
		})
	)
}
