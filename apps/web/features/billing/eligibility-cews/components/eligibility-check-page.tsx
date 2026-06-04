"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

import { formatPin, validatePin } from "../lib/pin-format"

interface EligibilityCheckPageProps {
	encounterId: string
}

export function EligibilityCheckPage({ encounterId }: EligibilityCheckPageProps) {
	const router = useRouter()
	const [pinInput, setPinInput] = useState("")

	const isValid = validatePin(pinInput)

	function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
		setPinInput(formatPin(e.target.value))
	}

	function handleVerify() {
		if (!isValid) return
		const digits = pinInput.replace(/-/g, "")
		router.push(`/billing/eligibility-check/${digits}?encounterId=${encounterId}`)
	}

	return (
		<div className="max-w-lg space-y-4 px-4">
			<h1 className="text-lg font-semibold">CEWS Eligibility Check</h1>

			<div className="space-y-2">
				<Label htmlFor="member-pin">PhilHealth Member PIN (12 digits)</Label>
				<Input
					id="member-pin"
					value={pinInput}
					onChange={handlePinChange}
					onKeyDown={e => {
						if (e.key === "Enter") handleVerify()
					}}
					placeholder="12-345678901-2"
					maxLength={14}
					aria-label="PhilHealth member PIN"
				/>
				{pinInput.length > 0 && !isValid && (
					<p className="text-destructive text-xs" role="alert">
						PIN must be exactly 12 digits.
					</p>
				)}
			</div>

			<Button onClick={handleVerify} disabled={!isValid}>
				Verify Membership
			</Button>
		</div>
	)
}
