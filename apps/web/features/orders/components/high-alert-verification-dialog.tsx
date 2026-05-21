"use client"

import { useState } from "react"
import { AlertCircle, Eye, EyeOff, ShieldAlert } from "lucide-react"

import { Button } from "@/core/components/ui/button"
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
import { Textarea } from "@/core/components/ui/textarea"
import { useVerifyCoSignCredentialsMutation } from "@/features/admin/user-management/api/users.hooks"
import { useCreateHighAlertVerificationMutation } from "@/features/orders/api/orders.hooks"

import { ClinicianCoSignCombobox, type SelectedClinician } from "./clinician-cosign-combobox"

export interface HighAlertVerificationDraft {
	verifyingStaffId: string
	coSignerPassword: string
	notes?: string
}

interface HighAlertVerificationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	medicationOrderId: string
	requestingStaffId: string
	facilityId: string
	drugName: string
	onVerified: (draft?: HighAlertVerificationDraft) => void
	onPrepareVerification?: (draft: HighAlertVerificationDraft) => void
}

type Step = "pick" | "pin"

export function HighAlertVerificationDialog({
	open,
	onOpenChange,
	medicationOrderId,
	requestingStaffId,
	facilityId,
	drugName,
	onVerified,
	onPrepareVerification,
}: HighAlertVerificationDialogProps) {
	const createVerification = useCreateHighAlertVerificationMutation()
	const verifyCredentials = useVerifyCoSignCredentialsMutation()

	const [step, setStep] = useState<Step>("pick")
	const [selectedClinician, setSelectedClinician] = useState<SelectedClinician | null>(null)
	const [password, setPassword] = useState("")
	const [showPassword, setShowPassword] = useState(false)
	const [notes, setNotes] = useState("")
	const [credentialError, setCredentialError] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	function handleDialogOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			setStep("pick")
			setSelectedClinician(null)
			setPassword("")
			setShowPassword(false)
			setNotes("")
			setCredentialError(null)
			setError(null)
		}
		onOpenChange(nextOpen)
	}

	async function handleSubmit() {
		if (!selectedClinician || !password.trim()) {
			setCredentialError("Password is required.")
			return
		}

		setCredentialError(null)
		setError(null)

		try {
			await verifyCredentials.mutateAsync({
				staffProfileId: selectedClinician.staffProfileId,
				password: password.trim(),
			})
		} catch {
			setCredentialError("Incorrect password. Please try again.")
			return
		}

		const draft: HighAlertVerificationDraft = {
			verifyingStaffId: selectedClinician.staffProfileId,
			coSignerPassword: password.trim(),
			notes: notes.trim() || undefined,
		}

		if (!medicationOrderId) {
			if (!onPrepareVerification) {
				setError("Medication order ID is required to complete dual verification.")
				return
			}
			onPrepareVerification(draft)
			onVerified(draft)
			handleDialogOpenChange(false)
			return
		}

		createVerification.mutate(
			{
				medicationOrderId,
				verifyingStaffId: draft.verifyingStaffId,
				coSignerPassword: draft.coSignerPassword,
				notes: draft.notes,
			},
			{
				onSuccess: () => {
					onVerified()
					handleDialogOpenChange(false)
				},
				onError: err => {
					setError(err instanceof Error ? err.message : "Failed to verify high-alert order.")
				},
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={handleDialogOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShieldAlert className="size-5 text-purple-600" />
						High-Alert Medication — Dual Verification
					</DialogTitle>
					<DialogDescription>
						This medication requires co-signature by a second clinician before the order can be
						completed.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="rounded-md border border-purple-300 bg-purple-50 px-3 py-2 text-sm text-purple-800 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300">
						Drug: <span className="font-semibold">{drugName}</span>
					</div>

					{step === "pick" && (
						<div className="space-y-2">
							<Label>Select Co-signing Clinician</Label>
							<ClinicianCoSignCombobox
								facilityId={facilityId}
								excludeStaffProfileId={requestingStaffId}
								value={selectedClinician}
								onChange={setSelectedClinician}
							/>
							<p className="text-muted-foreground text-xs">
								Type at least 2 characters to search active clinicians at this facility.
							</p>
						</div>
					)}

					{step === "pin" && (
						<>
							<div className="flex items-center justify-between rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300">
								<span>
									Co-signing as: <span className="font-semibold">{selectedClinician?.name}</span>
								</span>
								<button
									type="button"
									className="text-xs underline opacity-70 hover:opacity-100"
									onClick={() => {
										setStep("pick")
										setPassword("")
										setCredentialError(null)
									}}
								>
									Change
								</button>
							</div>

							<div className="space-y-2">
								<Label htmlFor="cosignPassword">Co-signer Password</Label>
								<div className="relative">
									<Input
										id="cosignPassword"
										type={showPassword ? "text" : "password"}
										value={password}
										onChange={e => setPassword(e.target.value)}
										placeholder="Enter your password to confirm"
										onKeyDown={e => {
											if (e.key === "Enter") void handleSubmit()
										}}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(v => !v)}
										className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2"
										tabIndex={-1}
									>
										{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
									</button>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="highAlertNotes">Notes (optional)</Label>
								<Textarea
									id="highAlertNotes"
									value={notes}
									onChange={e => setNotes(e.target.value)}
									rows={3}
									placeholder="Optional co-sign notes"
								/>
							</div>

							{credentialError && (
								<div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
									<AlertCircle className="size-4 shrink-0" />
									<span>{credentialError}</span>
								</div>
							)}

							{error && (
								<div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
									<AlertCircle className="size-4 shrink-0" />
									<span>{error}</span>
								</div>
							)}
						</>
					)}
				</div>

				{step === "pick" && (
					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => setStep("pin")}
							disabled={!selectedClinician}
							className="bg-purple-600 text-white hover:bg-purple-700"
						>
							Continue
						</Button>
					</DialogFooter>
				)}

				{step === "pin" && (
					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => void handleSubmit()}
							disabled={verifyCredentials.isPending || createVerification.isPending}
							className="bg-purple-600 text-white hover:bg-purple-700"
						>
							{verifyCredentials.isPending || createVerification.isPending
								? "Verifying..."
								: "Co-sign & Verify"}
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	)
}
