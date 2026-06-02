"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Save } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	useMyAccountProfile,
	useUpdateOwnAccountMutation,
} from "@/features/account/api/account-settings.hooks"

function validateDisplayName(value: string): string | null {
	if (value.length < 2) {
		return "Display name must be at least 2 characters."
	}

	if (value.length > 100) {
		return "Display name must be at most 100 characters."
	}

	return null
}

export function AccountSettingsPage() {
	const { data: profile, isLoading } = useMyAccountProfile()
	const updateOwnAccount = useUpdateOwnAccountMutation()
	const [displayName, setDisplayName] = useState("")
	const [savedDisplayName, setSavedDisplayName] = useState("")

	const currentName = profile?.user?.name ?? ""
	const currentEmail = profile?.user?.email ?? ""
	const activeRoleName = profile?.activeRole?.name ?? "No active role"

	useEffect(() => {
		const normalizedCurrentName = currentName.trim()

		if (!savedDisplayName) {
			setDisplayName(normalizedCurrentName)
			setSavedDisplayName(normalizedCurrentName)
			return
		}

		if (
			normalizedCurrentName &&
			normalizedCurrentName !== savedDisplayName &&
			!updateOwnAccount.isPending
		) {
			setDisplayName(normalizedCurrentName)
			setSavedDisplayName(normalizedCurrentName)
		}
	}, [currentName, savedDisplayName, updateOwnAccount.isPending])

	const trimmedDisplayName = displayName.trim()
	const hasChanges = trimmedDisplayName.length > 0 && trimmedDisplayName !== savedDisplayName
	const canSave = hasChanges && !updateOwnAccount.isPending

	async function handleSave() {
		const validationError = validateDisplayName(trimmedDisplayName)
		if (validationError) {
			toast.error(validationError)
			return
		}

		try {
			await updateOwnAccount.mutateAsync({ name: trimmedDisplayName })
			setDisplayName(trimmedDisplayName)
			setSavedDisplayName(trimmedDisplayName)
			toast.success("Account settings updated.")
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to update account settings"
			toast.error(message)
		}
	}

	if (isLoading) {
		return (
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">Account Settings</h1>
				<p className="text-muted-foreground text-sm">Loading your account details...</p>
			</div>
		)
	}

	if (!profile?.user) {
		return (
			<Alert variant="destructive">
				<AlertCircle className="size-4" />
				<AlertDescription>Unable to load your account details.</AlertDescription>
			</Alert>
		)
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">Account Settings</h1>
				<p className="text-muted-foreground text-sm">
					Manage your personal account profile. This page is available for all roles.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Personal Profile</CardTitle>
					<CardDescription>
						Update how your name appears in the application.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="display-name">Display Name</Label>
						<Input
							id="display-name"
							value={displayName}
							onChange={event => setDisplayName(event.target.value)}
							placeholder="Enter your display name"
							maxLength={100}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="account-email">Email</Label>
						<Input id="account-email" value={currentEmail} readOnly className="bg-muted/50" />
					</div>

					<div className="space-y-2">
						<Label htmlFor="active-role">Active Role</Label>
						<Input id="active-role" value={activeRoleName} readOnly className="bg-muted/50" />
					</div>

					<div className="pt-2">
						<Button onClick={handleSave} disabled={!canSave}>
							<Save className="mr-2 size-4" />
							{updateOwnAccount.isPending ? "Saving..." : "Save changes"}
						</Button>
					</div>

					{updateOwnAccount.isError && (
						<Alert variant="destructive">
							<AlertCircle className="size-4" />
							<AlertDescription>
								Failed to update your account settings. Please try again.
							</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
