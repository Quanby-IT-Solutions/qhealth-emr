"use client"

import { useCallback } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type NursingRecordType, enqueueRecord } from "./nursing-offline-queue"

type HttpMethod = "POST" | "PUT" | "PATCH"

interface OfflineMutationOptions<TData, TInput> {
	/** The API endpoint URL to POST/PUT when online. */
	endpoint: string
	method?: HttpMethod
	/** Derive a human-readable queue description from the input. */
	describe: (input: TInput) => string
	/** The queue record type used for the sync status display. */
	recordType: NursingRecordType
	/** Extract facilityId from the input. */
	facilityId: (input: TInput) => string
	/** Extract encounterId from the input (or preEncounterId). */
	encounterId: (input: TInput) => string
	/** Query keys to invalidate after a successful online submit. */
	invalidateKeys?: unknown[][]
	/** Transform input into the exact fetch body. Defaults to identity. */
	toPayload?: (input: TInput) => unknown
	/** Deserialize fetch response to TData. */
	fromResponse?: (res: Response) => Promise<TData>
}

/**
 * Drop-in replacement for useMutation that:
 * - When online: POSTs to the API and invalidates TanStack Query caches
 * - When offline: writes the record to IndexedDB and returns a mock result
 *
 * The IndexedDB queue is drained automatically by useNursingSync when the
 * browser reconnects (window `online` event).
 */
export function useOfflineNursingMutation<TData extends object, TInput>(
	opts: OfflineMutationOptions<TData, TInput>
) {
	const queryClient = useQueryClient()

	const mutationFn = useCallback(
		async (input: TInput): Promise<TData | { _queued: true; id: string }> => {
			const payload = opts.toPayload ? opts.toPayload(input) : input

			if (!navigator.onLine) {
				const id = crypto.randomUUID()
				await enqueueRecord({
					id,
					type: opts.recordType,
					description: opts.describe(input),
					endpoint: opts.endpoint,
					method: opts.method ?? "POST",
					payload,
					encounterId: opts.encounterId(input),
					facilityId: opts.facilityId(input),
					createdAt: new Date().toISOString(),
				})
				return { _queued: true, id }
			}

			const res = await fetch(opts.endpoint, {
				method: opts.method ?? "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			})

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}: ${res.statusText}`)
			}

			const data = opts.fromResponse
				? await opts.fromResponse(res)
				: ((await res.json()) as TData)
			return data
		},

		[opts]
	)

	return useMutation({
		mutationFn,
		onSuccess: (data) => {
			// Only invalidate caches when a real API call succeeded (not queued)
			if (data && "_queued" in data) return
			if (opts.invalidateKeys) {
				for (const key of opts.invalidateKeys) {
					void queryClient.invalidateQueries({ queryKey: key })
				}
			} else {
				void queryClient.invalidateQueries({ queryKey: ["nursing"] })
			}
		},
	})
}
