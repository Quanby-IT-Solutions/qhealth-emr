"use client"

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Smartphone } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Progress, ProgressLabel } from "@/core/components/ui/progress"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { cn } from "@/core/lib/utils"
import { FaceScanGuidePanel } from "@/features/face-scan/components/face-scan-guide-panel"
import { FaceScanResults } from "@/features/face-scan/components/face-scan-results"
import {
	completeFaceScanPhoneSession,
	createFaceScanPhoneToken,
	useFaceScanPhoneSessionPreviewQuery,
	type FaceScanTokenInput,
	type FaceScanTokenResponse,
} from "@/features/face-scan/hooks/face-scan.hooks"
import { useFaceScan } from "@/features/face-scan/hooks/use-face-scan"
import { newScanSessionId } from "@/features/face-scan/lib/face-scan-errors"
import {
	hasFaceScanVitals,
	mergeSetupMeasurements,
	type FaceScanVitals,
} from "@/features/face-scan/lib/face-scan-vitals"
import type { ScanState } from "@/features/face-scan/lib/insight-genie-adapter"
import {
	formatHeightFromCm,
	formatWeightFromKg,
	heightCmToFeetInches,
	isValidHeightCm,
	isValidWeightKg,
	parseHeightToCm,
	parseWeightToKg,
	type HeightUnit,
	type WeightUnit,
} from "@/features/face-scan/lib/measurement-units"

type PhonePhase = "setup" | "scanning" | "complete"

interface FaceScanPhonePageProps {
	token: string
}

function formatExpiry(expiresAt?: string) {
	if (!expiresAt) return null
	return new Date(expiresAt).toLocaleTimeString("en-PH", {
		hour: "2-digit",
		minute: "2-digit",
	})
}

function scanStateLabel(state: ScanState): string {
	switch (state) {
		case "authenticating":
			return "Connecting"
		case "positioning":
			return "Position face"
		case "analyzing":
			return "Scanning"
		case "complete":
			return "Sending results"
		case "error":
			return "Needs retry"
		default:
			return "Ready"
	}
}

function unavailableMessage(
	preview:
		| {
				enabled: boolean
				status: "pending" | "complete" | "expired"
				expiresAt: string
		  }
		| undefined,
	error: unknown
) {
	if (error) return "This scan link is not available. Please ask staff for a new QR code."
	if (!preview) return null
	if (!preview.enabled) return "Face scanning is not available right now."
	if (preview.status === "expired")
		return "This scan link has expired. Please ask staff for a new QR code."
	if (preview.status === "complete") return "This scan link has already been used."
	return null
}

export function FaceScanPhonePage({ token }: FaceScanPhonePageProps) {
	const previewQuery = useFaceScanPhoneSessionPreviewQuery(token)
	const [phase, setPhase] = useState<PhonePhase>("setup")
	const [smokingValue, setSmokingValue] = useState(false)
	const [heightCm, setHeightCm] = useState("")
	const [heightFeet, setHeightFeet] = useState("")
	const [heightInches, setHeightInches] = useState("")
	const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm")
	const [weightValue, setWeightValue] = useState("")
	const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg")
	const [setupError, setSetupError] = useState<string | null>(null)
	const [scanActive, setScanActive] = useState(false)
	const [scanSessionId, setScanSessionId] = useState<string | null>(null)
	const [scanDurationSeconds, setScanDurationSeconds] = useState<number | null>(null)
	const [postedVitals, setPostedVitals] = useState<FaceScanVitals | null>(null)
	const [completeError, setCompleteError] = useState<string | null>(null)
	const [isSubmittingResults, setIsSubmittingResults] = useState(false)
	const completionInFlightRef = useRef(false)
	const completionPostedRef = useRef(false)
	const iframeTitleId = useId()

	const parsedHeight = parseHeightToCm({
		unit: heightUnit,
		cm: heightCm,
		feet: heightFeet,
		inches: heightInches,
	})
	const parsedWeight = parseWeightToKg(weightValue, weightUnit)
	const requiresSmoking = Boolean(previewQuery.data?.requiresSmoking)
	const effectiveSmoking = requiresSmoking ? smokingValue : undefined

	const createToken = useCallback(
		(input: FaceScanTokenInput): Promise<FaceScanTokenResponse> =>
			createFaceScanPhoneToken({
				token,
				clientId: input.clientId,
				smoking: input.smoking,
				heightCm: input.heightCm,
				weightKg: input.weightKg,
			}),
		[token]
	)

	const {
		iframeUrl,
		scanState,
		vitals,
		error,
		conditionStatus,
		scanTimeRemaining,
		iframeRef,
		resetScan,
	} = useFaceScan({
		autoStart:
			phase === "scanning" &&
			scanActive &&
			Boolean(scanSessionId) &&
			previewQuery.data?.status === "pending",
		clientId: scanSessionId ?? "",
		age: undefined,
		gender: undefined,
		smoking: effectiveSmoking,
		heightCm: parsedHeight,
		weightKg: parsedWeight,
		createToken,
	})

	const completedVitals =
		vitals && hasFaceScanVitals(vitals)
			? mergeSetupMeasurements(vitals, {
					heightCm: parsedHeight,
					weightKg: parsedWeight,
				})
			: null

	const postCompletedVitals = useCallback(
		async (nextVitals: FaceScanVitals) => {
			if (completionInFlightRef.current) return
			completionInFlightRef.current = true
			completionPostedRef.current = true
			setIsSubmittingResults(true)
			setCompleteError(null)

			try {
				const response = await completeFaceScanPhoneSession({ token, vitals: nextVitals })
				setPostedVitals(response.vitals ?? nextVitals)
				setPhase("complete")
				setScanActive(false)
			} catch (err) {
				completionPostedRef.current = false
				const message = err instanceof Error ? err.message : String(err)
				setCompleteError(message)
			} finally {
				completionInFlightRef.current = false
				setIsSubmittingResults(false)
			}
		},
		[token]
	)

	useEffect(() => {
		if (scanTimeRemaining == null) return
		setScanDurationSeconds(prev => {
			if (prev == null || scanTimeRemaining > prev) return scanTimeRemaining
			return prev
		})
	}, [scanTimeRemaining])

	useEffect(() => {
		if (
			scanState !== "complete" ||
			!completedVitals ||
			completionPostedRef.current ||
			phase !== "scanning"
		) {
			return
		}

		void postCompletedVitals(completedVitals)
	}, [completedVitals, phase, postCompletedVitals, scanState])

	function handleHeightUnitChange(unit: HeightUnit) {
		if (heightUnit === unit) return
		const height = parseHeightToCm({
			unit: heightUnit,
			cm: heightCm,
			feet: heightFeet,
			inches: heightInches,
		})
		setHeightUnit(unit)
		if (unit === "cm") {
			setHeightCm(height !== undefined ? formatHeightFromCm(height) : "")
			setHeightFeet("")
			setHeightInches("")
			return
		}
		const converted = heightCmToFeetInches(height)
		setHeightCm("")
		setHeightFeet(converted.feet)
		setHeightInches(converted.inches)
	}

	function handleWeightUnitChange(unit: WeightUnit) {
		if (weightUnit === unit) return
		const weightKg = parseWeightToKg(weightValue, weightUnit)
		setWeightUnit(unit)
		setWeightValue(weightKg !== undefined ? formatWeightFromKg(weightKg, unit) : "")
	}

	function handleBeginScan(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!isValidHeightCm(parsedHeight)) {
			setSetupError("Enter height between 50 and 300 cm, or the equivalent in ft/in.")
			return
		}
		if (!isValidWeightKg(parsedWeight)) {
			setSetupError("Enter weight between 10 and 500 kg, or the equivalent in lb.")
			return
		}

		setSetupError(null)
		setCompleteError(null)
		setPostedVitals(null)
		completionPostedRef.current = false
		resetScan()
		setScanDurationSeconds(null)
		setScanSessionId(newScanSessionId())
		setPhase("scanning")
		setScanActive(true)
	}

	function handleRetry() {
		setCompleteError(null)
		completionPostedRef.current = false
		resetScan()
		setScanDurationSeconds(null)
		setScanSessionId(newScanSessionId())
		setScanActive(true)
	}

	const preview = previewQuery.data
	const blockedMessage = unavailableMessage(preview, previewQuery.error)
	const expiryLabel = formatExpiry(preview?.expiresAt)
	const showIframe =
		phase === "scanning" &&
		(scanState === "positioning" || scanState === "analyzing") &&
		Boolean(iframeUrl)
	const isLoading = phase === "scanning" && (scanState === "idle" || scanState === "authenticating")
	const scanProgress =
		scanTimeRemaining != null && scanDurationSeconds != null && scanDurationSeconds > 0
			? Math.min(
					100,
					Math.max(0, ((scanDurationSeconds - scanTimeRemaining) / scanDurationSeconds) * 100)
				)
			: null

	return (
		<main className="bg-background min-h-svh">
			<div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6">
				<header className="flex flex-col items-start justify-between gap-4 sm:flex-row">
					<div className="flex items-start gap-3">
						<div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
							<Smartphone className="size-5" />
						</div>
						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								JuanMeds Vitals
							</p>
							<h1 className="text-xl font-semibold">Face scan</h1>
							{expiryLabel && phase !== "complete" && (
								<p className="text-muted-foreground text-sm">Link expires at {expiryLabel}</p>
							)}
						</div>
					</div>
					<Badge variant={phase === "complete" ? "secondary" : "outline"}>
						{phase === "complete" ? "Complete" : scanStateLabel(scanState)}
					</Badge>
				</header>

				{previewQuery.isLoading && (
					<div className="border-border bg-muted/20 flex flex-1 items-center justify-center rounded-lg border p-8">
						<div className="text-muted-foreground flex flex-col items-center gap-3 text-sm">
							<Loader2 className="text-primary size-8 animate-spin" />
							Checking scan link
						</div>
					</div>
				)}

				{!previewQuery.isLoading && blockedMessage && phase !== "complete" && (
					<Alert variant="destructive">
						<AlertCircle className="size-4" />
						<AlertTitle>Scan link unavailable</AlertTitle>
						<AlertDescription>{blockedMessage}</AlertDescription>
					</Alert>
				)}

				{!previewQuery.isLoading && !blockedMessage && phase === "setup" && (
					<form
						onSubmit={handleBeginScan}
						className="border-border bg-card mx-auto w-full max-w-xl rounded-lg border p-5 shadow-sm"
					>
						<div className="space-y-1">
							<h2 className="text-base font-semibold">Patient measurements</h2>
							<p className="text-muted-foreground text-sm">
								Enter the scan setup details before starting.
							</p>
						</div>

						<div className="mt-5 grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="phone-face-scan-height">Height</Label>
								<div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-8 min-w-0 rounded-lg border bg-transparent transition-colors focus-within:ring-[3px]">
									{heightUnit === "cm" ? (
										<Input
											id="phone-face-scan-height"
											type="number"
											min={50}
											max={300}
											step={0.1}
											inputMode="decimal"
											placeholder="170"
											value={heightCm}
											className="h-full flex-1 rounded-r-none border-0 focus-visible:ring-0"
											onChange={event => setHeightCm(event.target.value)}
										/>
									) : (
										<div className="grid min-w-0 flex-1 grid-cols-2">
											<Input
												id="phone-face-scan-height"
												type="number"
												min={1}
												max={9}
												inputMode="numeric"
												placeholder="5 ft"
												value={heightFeet}
												className="h-full rounded-none border-0 focus-visible:ring-0"
												onChange={event => setHeightFeet(event.target.value)}
											/>
											<Input
												aria-label="Height inches"
												type="number"
												min={0}
												max={11}
												step={0.1}
												inputMode="decimal"
												placeholder="7 in"
												value={heightInches}
												className="h-full rounded-none border-0 border-l focus-visible:ring-0"
												onChange={event => setHeightInches(event.target.value)}
											/>
										</div>
									)}
									<Select
										value={heightUnit}
										onValueChange={value => handleHeightUnitChange(value as HeightUnit)}
									>
										<SelectTrigger
											aria-label="Unit selector"
											className="h-full w-20 shrink-0 rounded-none rounded-r-lg border-0 border-l px-2 focus-visible:ring-0"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="cm">cm</SelectItem>
											<SelectItem value="ft-in">ft/in</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="phone-face-scan-weight">Weight</Label>
								<div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-8 min-w-0 rounded-lg border bg-transparent transition-colors focus-within:ring-[3px]">
									<Input
										id="phone-face-scan-weight"
										type="number"
										min={weightUnit === "kg" ? 10 : 22}
										max={weightUnit === "kg" ? 500 : 1100}
										step={0.1}
										inputMode="decimal"
										placeholder={weightUnit === "kg" ? "70" : "154"}
										value={weightValue}
										className="h-full flex-1 rounded-r-none border-0 focus-visible:ring-0"
										onChange={event => setWeightValue(event.target.value)}
									/>
									<Select
										value={weightUnit}
										onValueChange={value => handleWeightUnitChange(value as WeightUnit)}
									>
										<SelectTrigger
											aria-label="Unit selector"
											className="h-full w-20 shrink-0 rounded-none rounded-r-lg border-0 border-l px-2 focus-visible:ring-0"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="kg">kg</SelectItem>
											<SelectItem value="lb">lb</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							{requiresSmoking && (
								<div className="space-y-2 sm:col-span-2">
									<Label>Smoking status</Label>
									<div className="flex flex-wrap gap-2">
										<Button
											type="button"
											variant={!smokingValue ? "default" : "outline"}
											size="sm"
											onClick={() => setSmokingValue(false)}
										>
											Non-smoker
										</Button>
										<Button
											type="button"
											variant={smokingValue ? "default" : "outline"}
											size="sm"
											onClick={() => setSmokingValue(true)}
										>
											Smoker
										</Button>
									</div>
								</div>
							)}
						</div>

						{setupError && (
							<Alert variant="destructive" className="mt-4">
								<AlertCircle className="size-4" />
								<AlertTitle>Check your entries</AlertTitle>
								<AlertDescription>{setupError}</AlertDescription>
							</Alert>
						)}

						<Button type="submit" className="mt-5 w-full">
							Start face scan
						</Button>
					</form>
				)}

				{phase === "scanning" && (
					<div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
						<div className="border-border bg-muted/20 relative min-h-[min(68svh,720px)] overflow-hidden rounded-lg border lg:min-h-[calc(100svh-9rem)]">
							{isLoading && (
								<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
									<Loader2 className="text-primary size-8 animate-spin" />
									<p className="text-muted-foreground text-sm">
										{scanState === "authenticating" ? "Connecting to scanner" : "Preparing camera"}
									</p>
								</div>
							)}

							{showIframe && iframeUrl && (
								<>
									<iframe
										key={scanSessionId ?? undefined}
										ref={iframeRef}
										src={iframeUrl}
										title={iframeTitleId}
										className="absolute inset-0 h-full w-full border-0 bg-black"
										allow="camera; microphone; autoplay; fullscreen"
										allowFullScreen
									/>
									{scanProgress != null && (
										<div className="bg-background/95 border-border absolute inset-x-0 bottom-0 z-10 border-t px-4 py-3 backdrop-blur-sm">
											<Progress value={scanProgress}>
												<ProgressLabel>Scan progress</ProgressLabel>
												{scanTimeRemaining != null && (
													<span className="text-muted-foreground ml-auto text-sm tabular-nums">
														{scanTimeRemaining}s left
													</span>
												)}
											</Progress>
										</div>
									)}
								</>
							)}

							{scanState === "complete" && (
								<div className="bg-background/95 absolute inset-0 z-20 flex items-center justify-center overflow-y-auto p-5">
									<div className="flex flex-col items-center gap-3 text-center">
										<Loader2
											className={cn("text-primary size-8", isSubmittingResults && "animate-spin")}
										/>
										<p className="font-medium">Sending results to staff</p>
										<p className="text-muted-foreground max-w-sm text-sm">
											Keep this page open until the confirmation appears.
										</p>
										{completeError && completedVitals && (
											<>
												<Alert variant="destructive" className="mt-2 text-left">
													<AlertCircle className="size-4" />
													<AlertTitle>Could not send results</AlertTitle>
													<AlertDescription>{completeError}</AlertDescription>
												</Alert>
												<Button
													type="button"
													variant="outline"
													onClick={() => void postCompletedVitals(completedVitals)}
												>
													<RefreshCw className="size-4" />
													Send again
												</Button>
											</>
										)}
									</div>
								</div>
							)}

							{scanState === "error" && error && (
								<div className="bg-background/95 absolute inset-0 z-20 flex items-center justify-center p-5">
									<div className="w-full max-w-md space-y-4">
										<Alert variant="destructive">
											<AlertCircle className="size-4" />
											<AlertTitle>Scan could not finish</AlertTitle>
											<AlertDescription>{error.message}</AlertDescription>
										</Alert>
										<Button
											type="button"
											variant="outline"
											className="w-full"
											onClick={handleRetry}
										>
											<RefreshCw className="size-4" />
											Try again
										</Button>
									</div>
								</div>
							)}
						</div>

						<FaceScanGuidePanel
							className="border-border max-h-none rounded-lg border lg:max-h-[calc(100svh-9rem)]"
							scanState={scanState}
							conditionStatus={conditionStatus}
							scanTimeRemaining={scanTimeRemaining}
						/>
					</div>
				)}

				{phase === "complete" && postedVitals && (
					<div className="border-border bg-card mx-auto w-full max-w-xl rounded-lg border p-5 shadow-sm">
						<div className="text-success flex items-center gap-2 text-sm font-medium">
							<CheckCircle2 className="size-4" />
							Results sent
						</div>
						<h2 className="mt-3 text-base font-semibold">Return to staff</h2>
						<p className="text-muted-foreground mt-1 text-sm">
							Your vitals were sent to the desktop form for review.
						</p>
						<FaceScanResults vitals={postedVitals} className="mt-5" />
					</div>
				)}
			</div>
		</main>
	)
}
