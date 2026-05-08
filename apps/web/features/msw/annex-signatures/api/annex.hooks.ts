"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { mswOrpc } from "@/services/orpc/client"

export function useAnnexSignatureListQuery(input: {
	encounterId?: string
	patientId?: string
	annexType?: "A" | "B"
}) {
	return useQuery(
		mswOrpc.annexSignatures.list.queryOptions({
			input,
			enabled: !!(input.encounterId ?? input.patientId),
		})
	)
}

export function useAnnexSignatureGetQuery(id: string) {
	return useQuery(
		mswOrpc.annexSignatures.get.queryOptions({
			input: { id },
			enabled: !!id,
		})
	)
}

export function useCaptureAnnexSignatureMutation() {
	const qc = useQueryClient()
	return useMutation(
		mswOrpc.annexSignatures.capture.mutationOptions({
			onSuccess: () =>
				qc.invalidateQueries({ queryKey: mswOrpc.annexSignatures.list.key() }),
		})
	)
}
