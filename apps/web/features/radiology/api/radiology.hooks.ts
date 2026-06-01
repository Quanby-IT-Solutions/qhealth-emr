"use client"

import { useQuery } from "@tanstack/react-query"

import { env } from "@/env"

const ORDERS_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/orders`

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		credentials: "include",
		...init,
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	})
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
	return res.json() as Promise<T>
}

function buildQueryString(
	params: Record<string, string | number | boolean | undefined>,
): string {
	const entries = Object.entries(params).filter(([, v]) => v !== undefined)
	if (entries.length === 0) return ""
	return `?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")}`
}

// ============================================================================
// Types
// ============================================================================

export interface ImagingDashboardOrder {
	id: string
	facilityId: string
	encounterId: string | null
	preEncounterId: string | null
	patientId: string | null
	patientName: string | null
	patientMrn: string | null
	modality: string
	bodyPart: string
	clinicalIndication: string | null
	indicationIcd10Code: string | null
	indicationIcd10Display: string | null
	priority: "routine" | "urgent" | "stat"
	status: "ordered" | "scheduled" | "in_progress" | "completed" | "cancelled"
	orderingStaffId: string
	orderingStaffName: string | null
	scheduledDatetime: string | null
	completedDatetime: string | null
	imagingOrderReceivedAt: string | null
	studyStartedAt: string | null
	report: string | null
	structuredResults: unknown
	createdAt: string
	updatedAt: string
}

export interface PaginatedImagingDashboardOrders {
	data: ImagingDashboardOrder[]
	total: number
	page: number
	limit: number
	totalPages: number
}

// ============================================================================
// Query Keys
// ============================================================================

export const radiologyKeys = {
	all: ["radiology"] as const,
	dashboard: (params: object) => [...radiologyKeys.all, "dashboard", params] as const,
	order: (id: string) => [...radiologyKeys.all, "order", id] as const,
}

// ============================================================================
// Queries
// ============================================================================

interface ImagingDashboardParams {
	facilityId: string
	status?: "ordered" | "scheduled" | "in_progress" | "completed" | "cancelled"
	priority?: string
	page?: number
	limit?: number
}

export function useImagingDashboardQuery(params: ImagingDashboardParams, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: radiologyKeys.dashboard(params),
		queryFn: () =>
			fetchJson<PaginatedImagingDashboardOrders>(
				`${ORDERS_BASE}/imaging${buildQueryString(params as unknown as Record<string, string | number | boolean | undefined>)}`,
			),
		enabled: !!params.facilityId && (options?.enabled ?? true),
		refetchInterval: 30 * 1000,
		refetchOnWindowFocus: true,
		staleTime: 30_000,
	})
}
