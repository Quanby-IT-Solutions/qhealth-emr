"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { BadgeCheck, CircleUserRound, ShieldCheck } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

type AccessMode = "patient" | "proxy"

export function PatientPortalLoginForm() {
	const router = useRouter()
	const [accessMode, setAccessMode] = useState<AccessMode>("patient")
	const [mrn, setMrn] = useState("")
	const [dateOfBirth, setDateOfBirth] = useState("")
	const [error, setError] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)

	const hasEnteredIdentity = mrn.trim().length > 0 && dateOfBirth.length > 0
	const canSubmit = hasEnteredIdentity && !isSubmitting
	const showIdentityMismatch = error.length > 0
	let submitLabel = "Match patient to continue"

	if (isSubmitting) {
		submitLabel = "Matching patient..."
	} else if (showIdentityMismatch) {
		submitLabel = "Try matching again"
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		if (!canSubmit) {
			return
		}

		setIsSubmitting(true)
		setError("")

		try {
			const response = await fetch("/api/patient-portal/session", {
				method: "POST",
				credentials: "same-origin",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					mrn,
					dateOfBirth,
				}),
			})
			const result = (await response.json()) as { message?: string }

			if (!response.ok) {
				setError(result.message ?? "MRN and date of birth do not match a patient record.")
				return
			}

			router.push("/patient-portal/summary")
			router.refresh()
		} catch {
			setError("Unable to verify the patient record right now.")
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<form className="space-y-5" onSubmit={handleSubmit}>
			<div className="bg-muted/35 grid grid-cols-2 gap-2 rounded-lg border p-1">
				<Button
					type="button"
					variant={accessMode === "patient" ? "secondary" : "ghost"}
					className="h-9"
					onClick={() => setAccessMode("patient")}
				>
					<CircleUserRound />
					Patient
				</Button>
				<Button
					type="button"
					variant={accessMode === "proxy" ? "secondary" : "ghost"}
					className="h-9"
					onClick={() => setAccessMode("proxy")}
				>
					<ShieldCheck />
					Proxy
				</Button>
			</div>

			<div className="space-y-2">
				<Label htmlFor="portal-mrn">Patient MRN</Label>
				<Input
					id="portal-mrn"
					value={mrn}
					onChange={event => {
						setMrn(event.target.value)
						setError("")
					}}
					placeholder="e.g. QH-XXXXX or QH-XXX-XXX"
					autoComplete="username"
					aria-invalid={showIdentityMismatch}
					required
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="portal-dob">Patient date of birth</Label>
				<Input
					id="portal-dob"
					type="date"
					value={dateOfBirth}
					onChange={event => {
						setDateOfBirth(event.target.value)
						setError("")
					}}
					autoComplete="bday"
					aria-invalid={showIdentityMismatch}
					required
				/>
			</div>

			{showIdentityMismatch ? <p className="text-destructive text-sm leading-5">{error}</p> : null}

			<Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
				<BadgeCheck />
				{submitLabel}
			</Button>
		</form>
	)
}
