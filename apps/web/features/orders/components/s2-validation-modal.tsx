"use client"

import { AlertCircle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { useCheckPdeaLicenseQuery } from "@/features/orders/api/orders.hooks"

interface S2ValidationModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	staffId: string
	facilityId: string
	/** Called only when S-2 is confirmed valid and user clicks Proceed */
	onProceed: () => void
}

function formatDate(value: string | null | undefined) {
	if (!value) return "--"
	return new Date(value).toLocaleDateString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

export function S2ValidationModal({
	open,
	onOpenChange,
	staffId,
	facilityId,
	onProceed,
}: S2ValidationModalProps) {
	const {
		data: licenseStatus,
		isLoading,
		isError,
		error,
	} = useCheckPdeaLicenseQuery({
		staffId,
		facilityId,
		enabled: open && !!staffId && !!facilityId,
	})

	const canPrescribe = licenseStatus?.canPrescribeControlled ?? false

	function handleProceed() {
		onProceed()
		onOpenChange(false)
	}

	function handleCancel() {
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShieldAlert className="size-5 text-amber-500" />
						S-2 License Validation
					</DialogTitle>
					<DialogDescription>
						Controlled substance ordering requires a valid PDEA S-2 license. Verifying your license
						before proceeding.
					</DialogDescription>
				</DialogHeader>

				<div className="py-2">
					{isLoading && (
						<div className="bg-muted/40 flex items-center gap-3 rounded-md border px-4 py-4 text-sm">
							<Loader2 className="text-muted-foreground size-5 animate-spin" />
							<span className="text-muted-foreground">Validating PDEA S-2 license…</span>
						</div>
					)}

					{isError && (
						<div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3 rounded-md border px-4 py-4 text-sm">
							<AlertCircle className="mt-0.5 size-5 shrink-0" />
							<div className="space-y-1">
								<p className="font-medium">License check failed</p>
								<p className="text-xs">
									{error instanceof Error
										? error.message
										: "Unable to verify PDEA S-2 license. Contact your administrator."}
								</p>
							</div>
						</div>
					)}

					{!isLoading && !isError && licenseStatus && canPrescribe && (
						<div className="space-y-3 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
							<div className="flex items-center gap-2">
								<CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
								<span className="font-semibold">S-2 License Valid</span>
								<Badge
									variant="outline"
									className="ml-auto border-emerald-400 text-[10px] text-emerald-700 dark:text-emerald-300"
								>
									PDEA S-2
								</Badge>
							</div>
							<div className="grid grid-cols-2 gap-y-1 text-xs">
								<span className="text-emerald-700 dark:text-emerald-400">License No.</span>
								<span className="font-medium">{licenseStatus.licenseNumber ?? "--"}</span>
								<span className="text-emerald-700 dark:text-emerald-400">Expires</span>
								<span className="font-medium">{formatDate(licenseStatus.expiryDate)}</span>
								{licenseStatus.daysUntilExpiry != null && (
									<>
										<span className="text-emerald-700 dark:text-emerald-400">Days remaining</span>
										<span
											className={
												licenseStatus.daysUntilExpiry <= 30
													? "font-medium text-amber-600 dark:text-amber-400"
													: "font-medium"
											}
										>
											{licenseStatus.daysUntilExpiry}
											{licenseStatus.daysUntilExpiry <= 30 ? " (expiring soon)" : ""}
										</span>
									</>
								)}
							</div>
						</div>
					)}

					{!isLoading && !isError && licenseStatus && !canPrescribe && (
						<div className="border-destructive/40 bg-destructive/10 text-destructive space-y-3 rounded-md border px-4 py-4 text-sm">
							<div className="flex items-center gap-2">
								<AlertCircle className="size-5 shrink-0" />
								<span className="font-semibold">
									{licenseStatus.licenseNumber ? "S-2 License Expired" : "No S-2 License on File"}
								</span>
							</div>
							<p className="text-xs leading-relaxed">
								{licenseStatus.errorMessage ??
									(licenseStatus.licenseNumber
										? `Your PDEA S-2 license (${licenseStatus.licenseNumber}) has expired and cannot be used to order controlled substances.`
										: "No PDEA S-2 license is on file for your account. You cannot order controlled substances until a valid license is added.")}
							</p>
							<p className="text-xs font-medium">
								Contact your facility administrator to update your license record.
							</p>
						</div>
					)}

					{!isLoading && !isError && !licenseStatus && (
						<div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3 rounded-md border px-4 py-4 text-sm">
							<AlertCircle className="mt-0.5 size-5 shrink-0" />
							<p>No S-2 license information found. Contact your administrator.</p>
						</div>
					)}
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button onClick={handleProceed} disabled={isLoading || isError || !canPrescribe}>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Validating…
							</>
						) : (
							"Proceed to Controlled Drug Order"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
