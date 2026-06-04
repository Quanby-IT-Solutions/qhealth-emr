"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"

import { useListCliniciansQuery } from "../api/licenses.hooks"

const SESSION_KEY = "license_expiry_banner_dismissed"

export function LicenseExpiryBanner() {
	const [dismissed, setDismissed] = useState(true)

	useEffect(() => {
		setDismissed(sessionStorage.getItem(SESSION_KEY) === "1")
	}, [])

	const { data } = useListCliniciansQuery({ limit: 100 })

	const expiringSoon =
		data?.data.filter(
			c =>
				c.daysUntilNextExpiry !== null && c.daysUntilNextExpiry >= 0 && c.daysUntilNextExpiry <= 30
		) ?? []
	const expired =
		data?.data.filter(c => c.daysUntilNextExpiry !== null && c.daysUntilNextExpiry < 0) ?? []
	const totalAttention = expiringSoon.length + expired.length

	if (dismissed || totalAttention === 0) return null

	function dismiss() {
		sessionStorage.setItem(SESSION_KEY, "1")
		setDismissed(true)
	}

	return (
		<Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
			<AlertDescription className="flex items-center justify-between">
				<span className="text-amber-800 dark:text-amber-300">
					{expired.length > 0 && (
						<>
							{expired.length} clinician license{expired.length > 1 ? "s" : ""} expired
							{expiringSoon.length > 0 ? "; " : ". "}
						</>
					)}
					{expiringSoon.length > 0 && (
						<>
							{expiringSoon.length} clinician license{expiringSoon.length > 1 ? "s" : ""} expiring
							within 30 days.{" "}
						</>
					)}
					<Link href="/admin/clinician-licenses" className="font-medium underline">
						Review now
					</Link>
				</span>
				<Button
					variant="ghost"
					size="sm"
					onClick={dismiss}
					className="-mr-2 text-amber-700 hover:text-amber-900"
				>
					Dismiss
				</Button>
			</AlertDescription>
		</Alert>
	)
}
