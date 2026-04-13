"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { CreatePatientSchema } from "@repo/contracts"

import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useCreatePatientMutation } from "@/features/patients/api/patients.hooks"

export function PatientRegistrationForm() {
	const router = useRouter()
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const createPatient = useCreatePatientMutation()

	const [errors, setErrors] = useState<Record<string, string>>({})

	const [form, setForm] = useState({
		firstName: "",
		lastName: "",
		middleName: "",
		dateOfBirth: "",
		sex: "" as "" | "male" | "female" | "other",
		addressLine1: "",
		addressLine2: "",
		city: "",
		province: "",
		zipCode: "",
		phone: "",
		email: "",
		philhealthMemberId: "",
		emergencyContactName: "",
		emergencyContactPhone: "",
		nextOfKinName: "",
		nextOfKinRelationship: "",
	})

	const update = (field: string, value: string) =>
		setForm(prev => ({ ...prev, [field]: value }))

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		const payload = {
			facilityId,
			firstName: form.firstName,
			lastName: form.lastName,
			middleName: form.middleName || undefined,
			dateOfBirth: form.dateOfBirth,
			sex: form.sex || undefined,
			addressLine1: form.addressLine1 || undefined,
			addressLine2: form.addressLine2 || undefined,
			city: form.city || undefined,
			province: form.province || undefined,
			zipCode: form.zipCode || undefined,
			phone: form.phone || undefined,
			email: form.email || undefined,
			philhealthMemberId: form.philhealthMemberId || undefined,
			emergencyContactName: form.emergencyContactName || undefined,
			emergencyContactPhone: form.emergencyContactPhone || undefined,
			nextOfKinName: form.nextOfKinName || undefined,
			nextOfKinRelationship: form.nextOfKinRelationship || undefined,
		}

		const result = CreatePatientSchema.safeParse(payload)
		if (!result.success) {
			const fieldErrors: Record<string, string> = {}
			result.error.issues.forEach(issue => {
				const field = String(issue.path[0] ?? "")
				if (field && !fieldErrors[field]) fieldErrors[field] = issue.message
			})
			setErrors(fieldErrors)
			return
		}

		setErrors({})
		const patient = await createPatient.mutateAsync(result.data)
		router.push(`/patients/${patient.id}`)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Demographics */}
			<Card>
				<CardHeader>
					<CardTitle>Demographics</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div className="space-y-1.5">
						<Label htmlFor="lastName">Last Name *</Label>
						<Input
							id="lastName"
							required
							value={form.lastName}
							className={errors.lastName ? "border-destructive" : ""}
							onChange={e => update("lastName", e.target.value)}
						/>
						{errors.lastName && (
							<p className="text-destructive text-xs">{errors.lastName}</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="firstName">First Name *</Label>
						<Input
							id="firstName"
							required
							value={form.firstName}
							className={errors.firstName ? "border-destructive" : ""}
							onChange={e => update("firstName", e.target.value)}
						/>
						{errors.firstName && (
							<p className="text-destructive text-xs">{errors.firstName}</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="middleName">Middle Name</Label>
						<Input
							id="middleName"
							value={form.middleName}
							onChange={e => update("middleName", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="dateOfBirth">Date of Birth *</Label>
						<Input
							id="dateOfBirth"
							type="date"
							required
							value={form.dateOfBirth}
							className={errors.dateOfBirth ? "border-destructive" : ""}
							onChange={e => update("dateOfBirth", e.target.value)}
						/>
						{errors.dateOfBirth && (
							<p className="text-destructive text-xs">{errors.dateOfBirth}</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="sex">Sex *</Label>
						<Select
							value={form.sex || null}
							onValueChange={v => update("sex", String(v))}
						>
							<SelectTrigger id="sex" className={errors.sex ? "border-destructive" : ""}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="male">Male</SelectItem>
								<SelectItem value="female">Female</SelectItem>
								<SelectItem value="other">Other</SelectItem>
							</SelectContent>
						</Select>
						{errors.sex && (
							<p className="text-destructive text-xs">{errors.sex}</p>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Address & Contact */}
			<Card>
				<CardHeader>
					<CardTitle>Address & Contact</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
						<Label htmlFor="addressLine1">Address Line 1</Label>
						<Input
							id="addressLine1"
							value={form.addressLine1}
							onChange={e => update("addressLine1", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
						<Label htmlFor="addressLine2">Address Line 2</Label>
						<Input
							id="addressLine2"
							value={form.addressLine2}
							onChange={e => update("addressLine2", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="city">City / Municipality</Label>
						<Input
							id="city"
							value={form.city}
							onChange={e => update("city", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="province">Province</Label>
						<Input
							id="province"
							value={form.province}
							onChange={e => update("province", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="zipCode">ZIP Code</Label>
						<Input
							id="zipCode"
							value={form.zipCode}
							onChange={e => update("zipCode", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="phone">Phone</Label>
						<Input
							id="phone"
							type="tel"
							value={form.phone}
							onChange={e => update("phone", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={form.email}
							onChange={e => update("email", e.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			{/* PhilHealth */}
			<Card>
				<CardHeader>
					<CardTitle>PhilHealth</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="max-w-sm space-y-1.5">
						<Label htmlFor="philhealthMemberId">PhilHealth Member ID</Label>
						<Input
							id="philhealthMemberId"
							value={form.philhealthMemberId}
							onChange={e => update("philhealthMemberId", e.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Emergency Contact & Next of Kin */}
			<Card>
				<CardHeader>
					<CardTitle>Emergency Contact & Next of Kin</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
						<Input
							id="emergencyContactName"
							value={form.emergencyContactName}
							onChange={e => update("emergencyContactName", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
						<Input
							id="emergencyContactPhone"
							type="tel"
							value={form.emergencyContactPhone}
							onChange={e => update("emergencyContactPhone", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="nextOfKinName">Next of Kin Name</Label>
						<Input
							id="nextOfKinName"
							value={form.nextOfKinName}
							onChange={e => update("nextOfKinName", e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="nextOfKinRelationship">Relationship</Label>
						<Input
							id="nextOfKinRelationship"
							value={form.nextOfKinRelationship}
							onChange={e => update("nextOfKinRelationship", e.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Actions */}
			<div className="flex justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/patients/search")}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={createPatient.isPending || !facilityId}
				>
					{createPatient.isPending ? "Registering…" : "Register Patient"}
				</Button>
			</div>

			{createPatient.isError && (
				<p className="text-destructive text-sm">
					Failed to register patient: {createPatient.error.message}
				</p>
			)}
		</form>
	)
}
