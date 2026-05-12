"use client"

import { useQuery } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useMedicalRecordsRequestsQuery(input: {
	facilityId: string
	page?: number
	limit?: number
	status?: "pending" | "processing" | "completed" | "rejected"
	patientId?: string
	encounterId?: string
}) {
	return useQuery(
		orpc.medicalRecords.listMedicalRecordsRequests.queryOptions({
			input: { page: 1, limit: 50, ...input },
		})
	)
}

export function useMedicalRecordsRequestQuery(id: string) {
	return useQuery(
		orpc.medicalRecords.getMedicalRecordsRequest.queryOptions({
			input: { id },
			enabled: !!id,
		})
	)
}
