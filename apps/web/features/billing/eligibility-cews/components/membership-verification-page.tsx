"use client"

import { useEffect, useState } from "react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { Skeleton } from "@/core/components/ui/skeleton"

import { useVerifyCewsMutation } from "../api/cews.hooks"
import { formatPin } from "../lib/pin-format"
import { SaveToEncounterCta } from "./save-to-encounter-cta"

interface MembershipVerificationPageProps {
	memberPin: string
	/** Optional — omitted when doing a standalone lookup without an active encounter */
	encounterId?: string
}

type CewsMembership = {
	memberPin: string
	memberName: string | null
	status: "active" | "lapsed" | "suspended" | "service_unavailable"
	benefitBalance: string | null
	dependents: Array<{ name: string; relationship: string; pin: string | null }>
	verifiedAt: Date
}

const STATUS_VARIANT: Record<
	CewsMembership["status"],
	"default" | "secondary" | "destructive" | "outline"
> = {
	active: "default",
	lapsed: "destructive",
	suspended: "destructive",
	service_unavailable: "outline",
}

const ERROR_MESSAGES: Record<string, string> = {
	member_not_found: "Member not found. Verify the PIN and try again.",
	service_unavailable:
		"PhilHealth CEWS is temporarily unavailable. Try again later or save a manual note.",
	auth_failed: "Authentication with PhilHealth CEWS failed. Contact your system administrator.",
}

export function MembershipVerificationPage({
	memberPin,
	encounterId,
}: MembershipVerificationPageProps) {
	const [result, setResult] = useState<CewsMembership | null>(null)
	const [errorCode, setErrorCode] = useState<string | null>(null)
	const [verifyCount, setVerifyCount] = useState(0)
	const { mutate: verify, isPending } = useVerifyCewsMutation()

	function doVerify() {
		const digits = memberPin.replace(/-/g, "")
		setErrorCode(null)
		verify(
			{ memberPin: digits, encounterId },
			{
				onSuccess: data => {
					const membership = data as CewsMembership
					if (membership.status === "service_unavailable") {
						setErrorCode("service_unavailable")
					}
					setResult(membership)
					setVerifyCount(n => n + 1)
				},
				onError: (err: unknown) => {
					const msg = String(err)
					if (msg.includes("not found")) setErrorCode("member_not_found")
					else if (msg.includes("auth") || msg.includes("401")) setErrorCode("auth_failed")
					else setErrorCode("service_unavailable")
				},
			}
		)
	}

	useEffect(() => {
		doVerify()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [memberPin])

	return (
		<div className="max-w-lg space-y-4 px-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">Membership Verification</h1>
					<p className="text-muted-foreground font-mono text-sm">{formatPin(memberPin)}</p>
				</div>
				<Button onClick={doVerify} disabled={isPending} variant="outline" size="sm">
					{isPending ? "Verifying..." : verifyCount === 0 ? "Verify" : "Re-verify"}
				</Button>
			</div>

			{isPending && !result && (
				<div className="space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-32 w-full" />
				</div>
			)}

			{errorCode && !isPending && (
				<Alert variant={errorCode === "member_not_found" ? "destructive" : "default"}>
					<AlertDescription>
						{ERROR_MESSAGES[errorCode] ?? "An unexpected error occurred. Please try again."}
					</AlertDescription>
				</Alert>
			)}

			{result && result.status !== "service_unavailable" && (
				<>
					<Card>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="text-sm">Member Details</CardTitle>
								{verifyCount > 1 && (
									<span className="text-muted-foreground text-[10px]">
										Verification #{verifyCount}
									</span>
								)}
							</div>
						</CardHeader>
						<CardContent className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Name</span>
								<span>{result.memberName ?? "—"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">PIN</span>
								<span className="font-mono">{formatPin(result.memberPin)}</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Status</span>
								<Badge variant={STATUS_VARIANT[result.status]}>{result.status}</Badge>
							</div>
							{result.benefitBalance !== null && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Benefit Balance</span>
									<span className="tabular-nums">
										₱
										{Number(result.benefitBalance).toLocaleString("en-PH", {
											minimumFractionDigits: 2,
										})}
									</span>
								</div>
							)}
							<Separator />
							<p className="text-muted-foreground text-[10px]">
								Verified: {new Date(result.verifiedAt).toLocaleString("en-PH")}
							</p>
						</CardContent>
					</Card>

					{/* Dependents — collapses to count tile on mobile */}
					{result.dependents.length > 0 && (
						<Card>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-sm">Dependents</CardTitle>
									<Badge variant="secondary" className="text-xs">
										{result.dependents.length}
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								{/* Count tile shown only on mobile */}
								<div className="bg-muted flex items-center justify-center rounded-md p-3 sm:hidden">
									<span className="text-sm font-medium">
										{result.dependents.length} dependent{result.dependents.length !== 1 ? "s" : ""}
									</span>
								</div>
								{/* Table hidden on mobile */}
								<table className="hidden w-full text-sm sm:table">
									<thead>
										<tr className="text-muted-foreground border-b text-left text-xs">
											<th className="pr-4 pb-1">Name</th>
											<th className="pr-4 pb-1">Relationship</th>
											<th className="pb-1">PIN</th>
										</tr>
									</thead>
									<tbody>
										{result.dependents.map((dep, idx) => (
											<tr key={idx} className="border-b last:border-0">
												<td className="py-1 pr-4">{dep.name}</td>
												<td className="py-1 pr-4 capitalize">{dep.relationship}</td>
												<td className="py-1 font-mono">{dep.pin ? formatPin(dep.pin) : "—"}</td>
											</tr>
										))}
									</tbody>
								</table>
							</CardContent>
						</Card>
					)}

					{encounterId && (
						<SaveToEncounterCta
							encounterId={encounterId}
							memberPin={memberPin}
							currentResult={result}
						/>
					)}
				</>
			)}
		</div>
	)
}
