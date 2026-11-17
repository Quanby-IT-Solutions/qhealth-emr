"use client"

import { useQuery } from "@tanstack/react-query"

import { getPublicAppUrl } from "@/core/lib/utils"
import type { FaceScanVitals } from "@/features/face-scan/lib/face-scan-vitals"
import { env } from "@/env"

const API_BASE = `${env.NEXT_PUBLIC_API_BASE_URL}/v1/nursing`

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		credentials: "include",
		...init,
		headers: {
			"Content-Type": "application/json",
			...init?.headers,
		},
	})
	if (!res.ok) {
		let message = `HTTP ${res.status}: ${res.statusText}`
		try {
			const body = (await res.json()) as { message?: string | string[] }
			if (typeof body.message === "string") message = body.message
			else if (Array.isArray(body.message)) message = body.message.join("; ")
		} catch {
			// keep default message
		}
		throw Object.assign(new Error(message), { status: res.status })
	}
	return res.json() as Promise<T>
}

export interface FaceScanTokenInput {
	clientId: string
	age?: number
	gender?: "male" | "female"
	smoking?: boolean
	heightCm?: number
	weightKg?: number
}

export interface FaceScanTokenResponse {
	videoIframeUrl: string
	enabled: boolean
}

export interface FaceScanStatusResponse {
	enabled: boolean
}

export type FaceScanPhoneSessionStatus = "pending" | "complete" | "expired"

export interface FaceScanPhoneSessionInput {
	facilityId?: string
	encounterId?: string
	patientId?: string
	age?: number
	gender?: "male" | "female"
	smoking?: boolean
}

export interface FaceScanPhoneSessionResponse {
	id: string
	token?: string
	status: FaceScanPhoneSessionStatus
	expiresAt: string
	completedAt: string | null
	vitals: FaceScanVitals | null
}

export interface FaceScanPhoneSessionPreview {
	enabled: boolean
	status: FaceScanPhoneSessionStatus
	expiresAt: string
	requiresAge: boolean
	requiresGender: boolean
	requiresSmoking: boolean
}

export interface FaceScanPhoneTokenInput {
	token: string
	clientId: string
	age?: number
	gender?: "male" | "female"
	smoking?: boolean
	heightCm?: number
	weightKg?: number
}

export interface CompleteFaceScanPhoneSessionInput {
	token: string
	vitals: FaceScanVitals
}

export function useFaceScanStatusQuery() {
	return useQuery({
		queryKey: ["nursing", "face-scan", "status"],
		queryFn: () => fetchJson<FaceScanStatusResponse>(`${API_BASE}/face-scan/status`),
		staleTime: 60_000,
		retry: 1,
	})
}

export async function createFaceScanToken(
	input: FaceScanTokenInput
): Promise<FaceScanTokenResponse> {
	return fetchJson<FaceScanTokenResponse>(`${API_BASE}/face-scan/token`, {
		method: "POST",
		body: JSON.stringify(input),
	})
}

export function getFaceScanPhonePath(token: string): string {
	return `/face-scan/phone/${encodeURIComponent(token)}`
}

export function getFaceScanPhoneUrl(token: string): string {
	return getPublicAppUrl(getFaceScanPhonePath(token))
}

export async function createFaceScanPhoneSession(
	input: FaceScanPhoneSessionInput
): Promise<FaceScanPhoneSessionResponse> {
	return fetchJson<FaceScanPhoneSessionResponse>(`${API_BASE}/face-scan/phone-sessions`, {
		method: "POST",
		body: JSON.stringify(input),
	})
}

export async function getFaceScanPhoneSession(id: string): Promise<FaceScanPhoneSessionResponse> {
	return fetchJson<FaceScanPhoneSessionResponse>(
		`${API_BASE}/face-scan/phone-sessions/${encodeURIComponent(id)}`
	)
}

export async function getFaceScanPhoneSessionPreview(
	token: string
): Promise<FaceScanPhoneSessionPreview> {
	return fetchJson<FaceScanPhoneSessionPreview>(
		`${API_BASE}/face-scan/phone-sessions/public/${encodeURIComponent(token)}`
	)
}

export async function createFaceScanPhoneToken(
	input: FaceScanPhoneTokenInput
): Promise<FaceScanTokenResponse> {
	return fetchJson<FaceScanTokenResponse>(
		`${API_BASE}/face-scan/phone-sessions/public/${encodeURIComponent(input.token)}/token`,
		{
			method: "POST",
			body: JSON.stringify(input),
		}
	)
}

export async function completeFaceScanPhoneSession(
	input: CompleteFaceScanPhoneSessionInput
): Promise<FaceScanPhoneSessionResponse> {
	return fetchJson<FaceScanPhoneSessionResponse>(
		`${API_BASE}/face-scan/phone-sessions/public/${encodeURIComponent(input.token)}/complete`,
		{
			method: "POST",
			body: JSON.stringify(input),
		}
	)
}

export function useFaceScanPhoneSessionQuery(
	id: string | null | undefined,
	options?: { enabled?: boolean; refetchInterval?: number | false }
) {
	const enabled = Boolean(id) && (options?.enabled ?? true)
	return useQuery({
		queryKey: ["nursing", "face-scan", "phone-session", id],
		queryFn: () => getFaceScanPhoneSession(id ?? ""),
		enabled,
		refetchInterval: options?.refetchInterval ?? false,
		retry: 1,
	})
}

export function useFaceScanPhoneSessionPreviewQuery(token: string) {
	return useQuery({
		queryKey: ["nursing", "face-scan", "phone-session-preview", token],
		queryFn: () => getFaceScanPhoneSessionPreview(token),
		enabled: Boolean(token),
		retry: 1,
	})
}
