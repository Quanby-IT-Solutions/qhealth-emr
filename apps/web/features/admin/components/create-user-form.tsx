"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Badge } from "@/core/components/ui/badge"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useListRolesQuery } from "@/features/admin/api/admin.hooks"
import { useCreateUserMutation } from "@/features/admin/api/admin.hooks"

interface FacilityEntry {
	facilityId: string
	facilityName: string
	roleIds: string[]
	isPrimary: boolean
}

export function CreateUserForm() {
	const router = useRouter()
	const { data: profile } = useMyProfile()
	const activeFacilityId = profile?.staffProfiles[0]?.facilityId ?? ""
	const activeFacilityName =
		profile?.staffProfiles[0]?.facility?.name ?? "Current Facility"

	const { data: rolesData } = useListRolesQuery(activeFacilityId)
	const createUserMutation = useCreateUserMutation()

	// Identity fields
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [employeeNumber, setEmployeeNumber] = useState("")
	const [password, setPassword] = useState("")

	// License fields
	const [prcLicenseNumber, setPrcLicenseNumber] = useState("")
	const [prcExpiry, setPrcExpiry] = useState("")
	const [ptrNumber, setPtrNumber] = useState("")
	const [ptrExpiry, setPtrExpiry] = useState("")
	const [pdeaS2License, setPdeaS2License] = useState("")
	const [pdeaS2Expiry, setPdeaS2Expiry] = useState("")

	// Facility + role entries (start with the active facility)
	const [facilities, setFacilities] = useState<FacilityEntry[]>([
		{
			facilityId: activeFacilityId,
			facilityName: activeFacilityName,
			roleIds: [],
			isPrimary: true,
		},
	])

	const [error, setError] = useState<string | null>(null)

	const toggleRole = (facilityIdx: number, roleId: string) => {
		setFacilities(prev =>
			prev.map((f, i) => {
				if (i !== facilityIdx) return f
				const hasRole = f.roleIds.includes(roleId)
				return {
					...f,
					roleIds: hasRole ? f.roleIds.filter(id => id !== roleId) : [...f.roleIds, roleId],
				}
			})
		)
	}

	const setPrimary = (facilityIdx: number) => {
		setFacilities(prev =>
			prev.map((f, i) => ({ ...f, isPrimary: i === facilityIdx }))
		)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)

		if (!name.trim() || !email.trim() || !password) {
			setError("Name, email, and password are required.")
			return
		}
		if (facilities.some(f => f.roleIds.length === 0)) {
			setError("Each facility must have at least one role assigned.")
			return
		}
		if (!facilities.some(f => f.isPrimary)) {
			setError("One facility must be marked as primary.")
			return
		}

		try {
			const result = await createUserMutation.mutateAsync({
				name: name.trim(),
				email: email.trim(),
				password,
				employeeNumber: employeeNumber || undefined,
				prcLicenseNumber: prcLicenseNumber || undefined,
				prcExpiry: prcExpiry || undefined,
				ptrNumber: ptrNumber || undefined,
				ptrExpiry: ptrExpiry || undefined,
				pdeaS2License: pdeaS2License || undefined,
				pdeaS2Expiry: pdeaS2Expiry || undefined,
				facilities: facilities.map(f => ({
					facilityId: f.facilityId,
					roleIds: f.roleIds,
					isPrimary: f.isPrimary,
				})),
			})
			router.push(`/admin/users/${result.userId}`)
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Failed to create user"
			setError(message)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Identity */}
			<Card>
				<CardHeader>
					<CardTitle>Identity</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label htmlFor="name">Full Name *</Label>
							<Input
								id="name"
								value={name}
								onChange={e => setName(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="employeeNumber">Employee Number</Label>
							<Input
								id="employeeNumber"
								value={employeeNumber}
								onChange={e => setEmployeeNumber(e.target.value)}
							/>
						</div>
					</div>
					<div className="space-y-1">
						<Label htmlFor="email">Email Address *</Label>
						<Input
							id="email"
							type="email"
							value={email}
							onChange={e => setEmail(e.target.value)}
							required
						/>
					</div>
				</CardContent>
			</Card>

			{/* Credentials */}
			<Card>
				<CardHeader>
					<CardTitle>Initial Password</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-1">
						<Label htmlFor="password">Password *</Label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
							minLength={8}
						/>
						<p className="text-muted-foreground text-xs">Minimum 8 characters</p>
					</div>
				</CardContent>
			</Card>

			{/* Facility Memberships */}
			<Card>
				<CardHeader>
					<CardTitle>Facility Memberships & Roles</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{facilities.map((entry, idx) => (
						<div key={entry.facilityId} className="rounded-md border p-4 space-y-3">
							<div className="flex items-center justify-between">
								<p className="font-medium text-sm">{entry.facilityName}</p>
								<div className="flex items-center gap-2">
									{entry.isPrimary ? (
										<Badge variant="secondary">Primary</Badge>
									) : (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => setPrimary(idx)}
										>
											Set as Primary
										</Button>
									)}
								</div>
							</div>
							<div>
								<p className="text-muted-foreground text-xs mb-2">Roles (select at least one)</p>
								<div className="flex flex-wrap gap-2">
									{rolesData?.map(role => (
										<button
											key={role.id}
											type="button"
											onClick={() => toggleRole(idx, role.id)}
											className={`rounded-full px-3 py-1 text-xs border transition-colors ${
												entry.roleIds.includes(role.id)
													? "bg-primary text-primary-foreground border-primary"
													: "bg-background text-foreground border-border hover:bg-muted"
											}`}
										>
											{role.name}
										</button>
									))}
								</div>
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			{/* License Fields */}
			<Card>
				<CardHeader>
					<CardTitle>Professional Licenses</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label htmlFor="prcLicenseNumber">PRC License Number</Label>
							<Input
								id="prcLicenseNumber"
								value={prcLicenseNumber}
								onChange={e => setPrcLicenseNumber(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="prcExpiry">PRC Expiry Date</Label>
							<Input
								id="prcExpiry"
								type="date"
								value={prcExpiry}
								onChange={e => setPrcExpiry(e.target.value)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label htmlFor="ptrNumber">PTR Number</Label>
							<Input
								id="ptrNumber"
								value={ptrNumber}
								onChange={e => setPtrNumber(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="ptrExpiry">PTR Expiry Date</Label>
							<Input
								id="ptrExpiry"
								type="date"
								value={ptrExpiry}
								onChange={e => setPtrExpiry(e.target.value)}
							/>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label htmlFor="pdeaS2License">PDEA S2 License</Label>
							<Input
								id="pdeaS2License"
								value={pdeaS2License}
								onChange={e => setPdeaS2License(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="pdeaS2Expiry">PDEA S2 Expiry Date</Label>
							<Input
								id="pdeaS2Expiry"
								type="date"
								value={pdeaS2Expiry}
								onChange={e => setPdeaS2Expiry(e.target.value)}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{error && (
				<p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
					{error}
				</p>
			)}

			<div className="flex items-center gap-3">
				<Button type="submit" disabled={createUserMutation.isPending}>
					{createUserMutation.isPending ? "Creating…" : "Create User"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => router.back()}
					disabled={createUserMutation.isPending}
				>
					Cancel
				</Button>
			</div>
		</form>
	)
}
