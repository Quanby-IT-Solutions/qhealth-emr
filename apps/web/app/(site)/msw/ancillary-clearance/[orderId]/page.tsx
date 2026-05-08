"use client"

import { Suspense, use, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle, ShieldAlert } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useApplyCoverageMutation,
	useOverrideClearanceMutation,
} from "@/features/msw/ancillary-clearance/api/clearance.hooks"

type CoverageType = "malasakit" | "philhealth" | "coe"

interface AncillaryOrderPageProps {
	params: Promise<{ orderId: string }>
}

const COVERAGE_OPTIONS: { type: CoverageType; label: string }[] = [
	{ type: "malasakit", label: "Malasakit Center" },
	{ type: "philhealth", label: "PhilHealth" },
	{ type: "coe", label: "Certificate of Eligibility (CoE)" },
]

function AncillaryOrderInner({ orderId }: { orderId: string }) {
	const searchParams = useSearchParams()
	const encounterId = searchParams.get("encounterId") ?? orderId
	const [selectedCoverage, setSelectedCoverage] = useState<CoverageType[]>([])
	const [overrideReason, setOverrideReason] = useState("")
	const [showOverride, setShowOverride] = useState(false)

	const applyCoverage = useApplyCoverageMutation()
	const overrideClearance = useOverrideClearanceMutation()

	const cleared = applyCoverage.isSuccess || overrideClearance.isSuccess
	const isPending = applyCoverage.isPending || overrideClearance.isPending

	const toggleCoverage = (type: CoverageType) => {
		setSelectedCoverage(prev =>
			prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
		)
	}

	const handleClear = () => {
		if (selectedCoverage.length === 0 && !showOverride) {
			setShowOverride(true)
			return
		}

		if (showOverride) {
			overrideClearance.mutate({
				orderId,
				encounterId,
				reason: overrideReason,
			})
			return
		}

		applyCoverage.mutate({
			orderId,
			encounterId,
			coverageSources: selectedCoverage.map(type => ({
				type,
				referenceId: encounterId,
				amount: 0,
			})),
		})
	}

	if (cleared) {
		return (
			<div className="flex flex-col items-center gap-3 py-12 text-center">
				<CheckCircle className="size-10 text-green-500" />
				<p className="font-medium">Order cleared for procedure.</p>
				<Link href="/msw/ancillary-clearance">
					<Button variant="outline" size="sm">
						Back to Queue
					</Button>
				</Link>
			</div>
		)
	}

	const mutationError = applyCoverage.error ?? overrideClearance.error

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Link href="/msw/ancillary-clearance">
					<Button variant="ghost" size="sm" className="gap-1.5">
						<ArrowLeft className="size-4" />
						Back to Queue
					</Button>
				</Link>
			</div>

			<div>
				<h1 className="text-xl font-semibold">Coverage Application</h1>
				<p className="font-mono text-xs text-muted-foreground">Order: {orderId}</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Apply Coverage Sources</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{COVERAGE_OPTIONS.map(opt => (
						<div
							key={opt.type}
							className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
								selectedCoverage.includes(opt.type) ? "border-primary bg-primary/5" : "hover:bg-accent"
							}`}
							onClick={() => toggleCoverage(opt.type)}
						>
							<div
								className={`flex size-4 items-center justify-center rounded border-2 ${selectedCoverage.includes(opt.type) ? "border-primary bg-primary" : "border-muted-foreground"}`}
							>
								{selectedCoverage.includes(opt.type) && (
									<span className="text-[10px] font-bold text-primary-foreground">✓</span>
								)}
							</div>
							<span className="text-sm font-medium">{opt.label}</span>
						</div>
					))}
				</CardContent>
			</Card>

			{showOverride && (
				<Card className="border-destructive/50">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base text-destructive">
							<ShieldAlert className="size-4" />
							Override (No Coverage)
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-sm text-muted-foreground">
							Clearing without coverage requires a reason. This action will be audited.
						</p>
						<div className="space-y-1.5">
							<Label htmlFor="overrideReason">Reason *</Label>
							<Textarea
								id="overrideReason"
								rows={3}
								placeholder="Explain why no coverage is being applied…"
								value={overrideReason}
								onChange={e => setOverrideReason(e.target.value)}
							/>
						</div>
					</CardContent>
				</Card>
			)}

			{mutationError && (
				<p className="text-xs text-destructive">{(mutationError as Error).message}</p>
			)}

			<div className="flex gap-2">
				<Button
					onClick={handleClear}
					disabled={(showOverride && !overrideReason.trim()) || isPending}
					className="gap-1.5"
				>
					{isPending ? "Saving…" : showOverride ? "Confirm Override" : "Clear for Procedure"}
				</Button>
				{showOverride && (
					<Button variant="ghost" onClick={() => setShowOverride(false)} disabled={isPending}>
						Cancel
					</Button>
				)}
			</div>
		</div>
	)
}

export default function AncillaryOrderPage({ params }: AncillaryOrderPageProps) {
	const { orderId } = use(params)
	return (
		<Suspense fallback={<Skeleton className="h-40 w-full rounded-lg" />}>
			<AncillaryOrderInner orderId={orderId} />
		</Suspense>
	)
}
