"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { formatFaceScanError } from "@/features/face-scan/lib/face-scan-errors"
import { hasFaceScanVitals, type FaceScanVitals } from "@/features/face-scan/lib/face-scan-vitals"
import {
	looksLikeCompletionPayload,
	mapInsightGenieToFaceScanVitals,
	type ScanState,
} from "@/features/face-scan/lib/insight-genie-adapter"
import {
	getPostMessageAction,
	isInsightGeniePostMessage,
	normalizePostMessageData,
} from "@/features/face-scan/lib/post-message"

import {
	createFaceScanToken,
	type FaceScanTokenInput,
	type FaceScanTokenResponse,
} from "./face-scan.hooks"

interface UseFaceScanOptions {
	autoStart: boolean
	clientId: string
	age?: number
	gender?: "male" | "female"
	smoking?: boolean
	heightCm?: number
	weightKg?: number
	createToken?: (input: FaceScanTokenInput) => Promise<FaceScanTokenResponse>
}

const FAILURE_DEFER_MS = 3500

function parseScanTimeRemaining(data: Record<string, unknown>): number | null {
	const candidates = [
		data.scanTimeRemaining,
		data.timeRemaining,
		data.remainingSeconds,
		data.seconds,
		data.value,
	]
	for (const c of candidates) {
		if (typeof c === "number" && !Number.isNaN(c)) return Math.max(0, Math.round(c))
		if (typeof c === "string") {
			const parsed = parseFloat(c)
			if (!Number.isNaN(parsed)) return Math.max(0, Math.round(parsed))
		}
	}
	return null
}

function tryCompleteFromPayload(
	data: Record<string, unknown>,
	onComplete: (vitals: FaceScanVitals) => boolean
): boolean {
	if (!looksLikeCompletionPayload(data)) return false
	try {
		const mapped = mapInsightGenieToFaceScanVitals(data)
		return hasFaceScanVitals(mapped) && onComplete(mapped)
	} catch {
		return false
	}
}

export function useFaceScan({
	autoStart,
	clientId,
	age,
	gender,
	smoking,
	heightCm,
	weightKg,
	createToken = createFaceScanToken,
}: UseFaceScanOptions) {
	const [iframeUrl, setIframeUrl] = useState<string | null>(null)
	const [scanState, setScanState] = useState<ScanState>("idle")
	const [vitals, setVitals] = useState<FaceScanVitals | null>(null)
	const [error, setError] = useState<{ message: string } | null>(null)
	const [conditionStatus, setConditionStatus] = useState<{
		centered?: boolean
		lighting?: boolean
		tooMuchMovement?: boolean
		analyzing?: boolean
	} | null>(null)
	const [scanTimeRemaining, setScanTimeRemaining] = useState<number | null>(null)

	const iframeRef = useRef<HTMLIFrameElement | null>(null)
	const requestInFlightRef = useRef(false)
	const completedRef = useRef(false)
	const failureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const clearFailureTimer = useCallback(() => {
		if (failureTimerRef.current) {
			clearTimeout(failureTimerRef.current)
			failureTimerRef.current = null
		}
	}, [])

	const markComplete = useCallback(
		(mapped: FaceScanVitals) => {
			clearFailureTimer()
			setVitals(mapped)
			completedRef.current = true
			setScanState("complete")
			setError(null)
			return true
		},
		[clearFailureTimer]
	)

	const resetScan = useCallback(() => {
		clearFailureTimer()
		setIframeUrl(null)
		setScanState("idle")
		setVitals(null)
		setError(null)
		setConditionStatus(null)
		setScanTimeRemaining(null)
		requestInFlightRef.current = false
		completedRef.current = false
	}, [clearFailureTimer])

	useEffect(() => {
		if (!autoStart || !clientId) return
		if (requestInFlightRef.current) return
		if (scanState !== "idle") return

		requestInFlightRef.current = true
		setScanState("authenticating")
		setError(null)

		void (async () => {
			try {
				const response = await createToken({ clientId, age, gender, smoking, heightCm, weightKg })
				if (!response.enabled || !response.videoIframeUrl) {
					throw new Error("Face scan is not available.")
				}
				setIframeUrl(response.videoIframeUrl)
				setScanState("positioning")
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err)
				setError({ message })
				setScanState("error")
				requestInFlightRef.current = false
			}
		})()
	}, [autoStart, clientId, age, gender, smoking, heightCm, weightKg, createToken, scanState])

	useEffect(() => {
		if (scanState !== "positioning" && scanState !== "analyzing") return

		const scheduleFailure = (failedAction: string, message?: string) => {
			if (completedRef.current) return
			clearFailureTimer()
			failureTimerRef.current = setTimeout(() => {
				if (completedRef.current) return
				setError({ message: formatFaceScanError(failedAction, message) })
				setScanState("error")
			}, FAILURE_DEFER_MS)
		}

		const handleMessage = (event: MessageEvent) => {
			const iframe = iframeRef.current
			if (!isInsightGeniePostMessage(event, iframe)) return

			const data = normalizePostMessageData(event.data)
			if (!data) return

			const action = getPostMessageAction(data)

			switch (action) {
				case "onAnalysisStart":
					setScanState("analyzing")
					setConditionStatus({ analyzing: true })
					return

				case "conditionStatus":
					setConditionStatus({
						centered: Boolean(data.faceDetected ?? data.centered ?? false),
						lighting: Boolean(data.lightingGood ?? data.lighting ?? false),
						tooMuchMovement: Boolean(data.tooMuchMovement ?? false),
					})
					return

				case "scanTimeRemaining": {
					const seconds = parseScanTimeRemaining(data)
					if (seconds !== null) setScanTimeRemaining(seconds)
					return
				}

				case "onHealthAnalysisFinished":
					try {
						const mapped = mapInsightGenieToFaceScanVitals(data)
						if (hasFaceScanVitals(mapped)) {
							markComplete(mapped)
						} else if (looksLikeCompletionPayload(data)) {
							setError({
								message: formatFaceScanError(
									"failedToGetHealthAnalysisResult",
									typeof data.message === "string" ? data.message : undefined
								),
							})
							setScanState("error")
						}
					} catch (err) {
						const message = err instanceof Error ? err.message : String(err)
						setError({ message })
						setScanState("error")
					}
					return

				case "failedToGetResults":
				case "failedToGetHealthAnalysisResult":
				case "failedToGetVoiceAnalysisResult":
				case "failedToLoadPage": {
					if (completedRef.current) return
					if (
						tryCompleteFromPayload(data, mapped => {
							markComplete(mapped)
							return true
						})
					) {
						return
					}
					scheduleFailure(
						String(action),
						typeof data.message === "string" ? data.message : undefined
					)
					return
				}

				default:
					if (
						tryCompleteFromPayload(data, mapped => {
							markComplete(mapped)
							return true
						})
					) {
						return
					}
			}
		}

		window.addEventListener("message", handleMessage)
		return () => {
			window.removeEventListener("message", handleMessage)
			clearFailureTimer()
		}
	}, [scanState, clearFailureTimer, markComplete])

	return {
		iframeUrl,
		scanState,
		vitals,
		error,
		conditionStatus,
		scanTimeRemaining,
		iframeRef,
		resetScan,
	}
}
