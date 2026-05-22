"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { orpc } from "@/services/orpc/client"

export function useListLcrTrackingQuery(
	params: {
		facilityId: string
		certificateType?: "birth" | "death"
		submissionStatus?:
			| "not_submitted"
			| "ready"
			| "submitted"
			| "acknowledged"
			| "rejected"
			| "error"
		page?: number
		limit?: number
	},
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.civilRegistry.listLcrTracking.queryOptions({
			input: { ...params, page: params.page ?? 1, limit: params.limit ?? 50 },
			enabled: (options?.enabled ?? true) && !!params.facilityId,
			staleTime: 30_000,
		})
	)
}

export function useListBirthRegistrationsQuery(
	params: {
		facilityId: string
		patientId?: string
		encounterId?: string
		status?: "draft" | "completed" | "submitted"
		page?: number
		limit?: number
	},
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.civilRegistry.listBirthRegistrations.queryOptions({
			input: { ...params, page: params.page ?? 1, limit: params.limit ?? 50 },
			enabled: (options?.enabled ?? true) && !!params.facilityId,
			staleTime: 30_000,
		})
	)
}

export function useListDeathCertificateRegistrationsQuery(
	params: {
		facilityId: string
		patientId?: string
		encounterId?: string
		status?: "draft" | "completed" | "submitted"
		page?: number
		limit?: number
	},
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.civilRegistry.listDeathCertificateRegistrations.queryOptions({
			input: { ...params, page: params.page ?? 1, limit: params.limit ?? 50 },
			enabled: (options?.enabled ?? true) && !!params.facilityId,
			staleTime: 30_000,
		})
	)
}

export function useCreateBirthRegistrationMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.createBirthRegistration.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useGenerateLcrArtifactMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.generateLcrArtifact.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useMarkLcrSubmittedMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.markLcrSubmitted.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useRetryLcrSubmissionMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.retryLcrSubmission.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useGetBirthCertificatePrefillDataQuery(
	params: { patientId: string; encounterId?: string },
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.civilRegistry.getPrefillDataForBirthCertificate.queryOptions({
			input: params,
			enabled: (options?.enabled ?? true) && !!params.patientId,
			staleTime: 60_000,
		})
	)
}

export function useGetDeathCertificatePrefillDataQuery(
	params: { patientId: string; encounterId?: string },
	options?: { enabled?: boolean }
) {
	return useQuery(
		orpc.civilRegistry.getPrefillDataForDeathCertificate.queryOptions({
			input: params,
			enabled: (options?.enabled ?? true) && !!params.patientId,
			staleTime: 60_000,
		})
	)
}

export function useGenerateBirthCertificateArtifactsMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.generateBirthCertificateArtifacts.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useGenerateDeathCertificateArtifactsMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.generateDeathCertificateArtifacts.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useSubmitBirthCertificateToLcrMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.submitBirthCertificateToLcr.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useSubmitDeathCertificateToLcrMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.submitDeathCertificateToLcr.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useCreateDeathCertificateRegistrationMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.createDeathCertificateRegistration.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useUpdateBirthRegistrationMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.updateBirthRegistration.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useMarkBirthRegistrationPaidMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.markBirthRegistrationPaid.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useMarkBirthRegistrationReleasedMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.markBirthRegistrationReleased.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useMarkDeathCertificateRegistrationPaidMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.markDeathCertificateRegistrationPaid.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}

export function useMarkDeathCertificateRegistrationReleasedMutation() {
	const queryClient = useQueryClient()
	return useMutation(
		orpc.civilRegistry.markDeathCertificateRegistrationReleased.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.civilRegistry.key() }),
		})
	)
}
