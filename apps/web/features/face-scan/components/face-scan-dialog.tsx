"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { Alert02FreeIcons, Loading03Icon, Video01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
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

type DialogPhase = "setup" | "scanning"

interface FaceScanDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	age?: number
	gender?: "male" | "female"
	smoking?: boolean
	onComplete: (vitals: FaceScanVitals) => void
}

function scanStateLabel(state: ScanState): string | null {
	switch (state) {
		case "authenticating":
			return "Connecting"
		case "positioning":
			return "Position face"
		case "analyzing":
			return "Scanning"
		case "complete":
			return "Complete"
		case "error":
			return "Needs retry"
		default:
			return null
	}
}

function scanStateBadgeVariant(
	state: ScanState
): "default" | "secondary" | "outline" | "destructive" {
	switch (state) {
		case "analyzing":
			return "default"
		case "complete":
			return "secondary"
		case "error":
			return "destructive"
		default:
			return "outline"
	}
}

function StepIndicator({ phase }: { phase: DialogPhase }) {
	const steps = [
		{ id: "setup" as const, label: "Measurements" },
		{ id: "scanning" as const, label: "Camera scan" },
	]
	return (
		<ol className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
			{steps.map((step, index) => (
				<li key={step.id} className="flex items-center gap-2">
					{index > 0 && <span aria-hidden="true">/</span>}
					<span
						className={cn(
							"rounded-full px-2 py-0.5 font-medium transition-colors",
							phase === step.id ? "bg-primary/10 text-primary" : "text-muted-foreground"
						)}
					>
						{index + 1}. {step.label}
					</span>
				</li>
			))}
		</ol>
	)
}

export function FaceScanDialog({ open, onOpenChange, smoking, onComplete }: FaceScanDialogProps) {
	const [phase, setPhase] = useState<DialogPhase>("setup")
	const [setupSmoking, setSetupSmoking] = useState(false)
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
	const appliedRef = useRef(false)
	const iframeTitleId = useId()

	const parsedHeight = parseHeightToCm({
		unit: heightUnit,
		cm: heightCm,
		feet: heightFeet,
		inches: heightInches,
	})
	const parsedWeight = parseWeightToKg(weightValue, weightUnit)
	const effectiveSmoking = setupSmoking

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
		autoStart: open && scanActive && phase === "scanning" && Boolean(scanSessionId),
		clientId: scanSessionId ?? "",
		age: undefined,
		gender: undefined,
		smoking: effectiveSmoking,
		heightCm: parsedHeight,
		weightKg: parsedWeight,
	})

	const resetDialog = useCallback(() => {
		setPhase("setup")
		setScanActive(false)
		setScanSessionId(null)
		setScanDurationSeconds(null)
		setSetupError(null)
		appliedRef.current = false
		resetScan()
	}, [resetScan])

	useEffect(() => {
		if (!open) resetDialog()
	}, [open, resetDialog])

	useEffect(() => {
		if (!open) return
		setSetupSmoking(smoking ?? false)
	}, [open, smoking])

	useEffect(() => {
		if (scanState !== "complete" || !vitals || !hasFaceScanVitals(vitals) || appliedRef.current) {
			return
		}
		appliedRef.current = true
		onComplete(
			mergeSetupMeasurements(vitals, {
				heightCm: parsedHeight,
				weightKg: parsedWeight,
			})
		)
	}, [scanState, vitals, onComplete, parsedHeight, parsedWeight])

	useEffect(() => {
		if (scanTimeRemaining == null) return
		setScanDurationSeconds(prev => {
			if (prev == null || scanTimeRemaining > prev) return scanTimeRemaining
			return prev
		})
	}, [scanTimeRemaining])

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

	function handleBeginScan() {
		if (!isValidHeightCm(parsedHeight)) {
			setSetupError("Enter height between 50 and 300 cm, or the equivalent in ft/in.")
			return
		}
		if (!isValidWeightKg(parsedWeight)) {
			setSetupError("Enter weight between 10 and 500 kg, or the equivalent in lb.")
			return
		}
		setSetupError(null)
		appliedRef.current = false
		resetScan()
		setScanDurationSeconds(null)
		setScanSessionId(newScanSessionId())
		setPhase("scanning")
		setScanActive(true)
	}

	function handleRetry() {
		appliedRef.current = false
		resetScan()
		setScanDurationSeconds(null)
		setScanSessionId(newScanSessionId())
		setScanActive(true)
	}

	function handleDone() {
		onOpenChange(false)
	}

	const stateLabel = scanStateLabel(scanState)
	const completedVitals =
		vitals && hasFaceScanVitals(vitals)
			? mergeSetupMeasurements(vitals, {
					heightCm: parsedHeight,
					weightKg: parsedWeight,
				})
			: null
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				size="viewport"
				elevated
				className="flex h-[100svh] max-h-[100svh] w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:h-[calc(100svh-1rem)] sm:max-h-[calc(100svh-1rem)] sm:w-[calc(100vw-1rem)] sm:rounded-xl lg:h-[min(94svh,calc(100svh-1rem))] lg:w-[min(96vw,calc(100vw-1rem))]"
			>
				<DialogHeader className="border-border shrink-0 gap-3 border-b px-4 py-3 sm:px-6 sm:py-4">
					<div className="flex flex-wrap items-start justify-between gap-3 pr-10">
						<div className="flex min-w-0 items-start gap-3">
							<div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
								<HugeiconsIcon icon={Video01FreeIcons} className="size-5" strokeWidth={2} />
							</div>
							<div className="min-w-0 space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<DialogTitle className="text-base font-semibold">Camera vitals scan</DialogTitle>
									{phase === "scanning" && stateLabel && scanState !== "idle" && (
										<Badge variant={scanStateBadgeVariant(scanState)}>{stateLabel}</Badge>
									)}
								</div>
								<DialogDescription>
									Estimates from the camera only. Review and edit before saving to the chart.
								</DialogDescription>
							</div>
						</div>
						<StepIndicator phase={phase} />
					</div>
				</DialogHeader>

				{phase === "setup" && (
					<div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6 lg:p-8">
						<Card className="w-full max-w-lg shadow-none">
							<CardHeader className="border-b">
								<CardTitle>Patient measurements</CardTitle>
								<CardDescription>
									Height and weight improve scan accuracy. These are sent to the scanner only and
									are not saved until you record vitals.
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-6">
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="face-scan-height">Height</Label>
										<div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-8 min-w-0 rounded-lg border bg-transparent transition-colors focus-within:ring-[3px]">
											{heightUnit === "cm" ? (
												<Input
													id="face-scan-height"
													type="number"
													min={50}
													max={300}
													step={0.1}
													placeholder="170"
													value={heightCm}
													className="h-full flex-1 rounded-r-none border-0 focus-visible:ring-0"
													onChange={e => setHeightCm(e.target.value)}
												/>
											) : (
												<div className="grid min-w-0 flex-1 grid-cols-2">
													<Input
														id="face-scan-height"
														type="number"
														min={1}
														max={9}
														placeholder="5 ft"
														value={heightFeet}
														className="h-full rounded-none border-0 focus-visible:ring-0"
														onChange={e => setHeightFeet(e.target.value)}
													/>
													<Input
														aria-label="Height inches"
														type="number"
														min={0}
														max={11}
														step={0.1}
														placeholder="7 in"
														value={heightInches}
														className="h-full rounded-none border-0 border-l focus-visible:ring-0"
														onChange={e => setHeightInches(e.target.value)}
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
										<Label htmlFor="face-scan-weight">Weight</Label>
										<div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-8 min-w-0 rounded-lg border bg-transparent transition-colors focus-within:ring-[3px]">
											<Input
												id="face-scan-weight"
												type="number"
												min={weightUnit === "kg" ? 10 : 22}
												max={weightUnit === "kg" ? 500 : 1100}
												step={0.1}
												placeholder={weightUnit === "kg" ? "70" : "154"}
												value={weightValue}
												className="h-full flex-1 rounded-r-none border-0 focus-visible:ring-0"
												onChange={e => setWeightValue(e.target.value)}
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
									<div className="space-y-2 sm:col-span-2">
										<Label>Smoking status</Label>
										<div className="flex flex-wrap gap-2">
											<Button
												type="button"
												variant={!setupSmoking ? "default" : "outline"}
												size="sm"
												onClick={() => setSetupSmoking(false)}
											>
												Non-smoker
											</Button>
											<Button
												type="button"
												variant={setupSmoking ? "default" : "outline"}
												size="sm"
												onClick={() => setSetupSmoking(true)}
											>
												Smoker
											</Button>
										</div>
									</div>
								</div>
								{setupError && (
									<Alert variant="destructive" className="mt-4">
										<HugeiconsIcon icon={Alert02FreeIcons} />
										<AlertTitle>Check your entries</AlertTitle>
										<AlertDescription>{setupError}</AlertDescription>
									</Alert>
								)}
							</CardContent>
							<CardFooter className="justify-end gap-2 border-t">
								<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
									Cancel
								</Button>
								<Button type="button" onClick={handleBeginScan}>
									Continue to scan
								</Button>
							</CardFooter>
						</Card>
					</div>
				)}

				{phase === "scanning" && (
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
						<div className="relative flex min-h-[min(58svh,460px)] min-w-0 flex-1 flex-col lg:min-h-0">
							{isLoading && (
								<div className="bg-muted/20 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
									<HugeiconsIcon
										icon={Loading03Icon}
										className="text-primary size-8 animate-spin"
										strokeWidth={2}
									/>
									<p className="text-muted-foreground text-sm">
										{scanState === "authenticating"
											? "Connecting to scanner…"
											: "Preparing camera…"}
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
										<div className="bg-background/95 border-border absolute inset-x-0 bottom-0 z-10 border-t px-5 py-3 backdrop-blur-sm">
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

							{scanState === "complete" && completedVitals && (
								<div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-[2px] sm:p-6">
									<Card className="max-h-[calc(100svh-7rem)] w-full max-w-lg overflow-y-auto shadow-lg">
										<CardHeader>
											<CardTitle className="text-success">Scan complete</CardTitle>
											<CardDescription>
												Values were applied to the vitals form. Review them before saving.
											</CardDescription>
										</CardHeader>
										<CardContent>
											<FaceScanResults vitals={completedVitals} />
										</CardContent>
										<CardFooter className="justify-end">
											<Button type="button" onClick={handleDone}>
												Back to vitals form
											</Button>
										</CardFooter>
									</Card>
								</div>
							)}

							{scanState === "error" && error && (
								<div className="bg-background/90 absolute inset-0 z-10 flex items-center justify-center p-6">
									<Alert variant="destructive" className="max-w-lg">
										<HugeiconsIcon icon={Alert02FreeIcons} />
										<AlertTitle>Scan could not finish</AlertTitle>
										<AlertDescription>{error.message}</AlertDescription>
									</Alert>
								</div>
							)}
						</div>

						<FaceScanGuidePanel
							className="border-border w-full shrink-0 border-t lg:w-80 lg:border-t-0 lg:border-l"
							scanState={scanState}
							conditionStatus={conditionStatus}
							scanTimeRemaining={scanTimeRemaining}
						/>
					</div>
				)}

				{phase === "scanning" && (
					<DialogFooter className="bg-muted/30 mx-0 mb-0 shrink-0 gap-3 rounded-none border-t px-4 py-3 sm:rounded-b-xl sm:px-6 sm:py-4">
						{scanState === "error" && (
							<Button type="button" variant="outline" onClick={handleRetry}>
								Try again
							</Button>
						)}
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	)
}
