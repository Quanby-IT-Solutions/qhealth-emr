"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { CreatePatientSchema } from "@repo/contracts"

import { useActiveFacilityId } from "@/core/hooks/use-active-facility"
import { useListCliniciansQuery } from "@/features/patients/api/patients.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useRegisterPatientWithOpdEncounterMutation } from "@/features/patients/api/patients.hooks"

export function PatientRegistrationForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	// pendingTriageId is present when the registrar arrives from the walk-in triage reconciliation flow
	const pendingTriageId = searchParams.get("pendingTriageId") ?? ""

	const { data: profile } = useMyProfile()
	const facilityId = useActiveFacilityId()
	// PS-046: resolve staff from the active role, mirroring patient-search.tsx logic
	const activeStaffProfile =
		profile?.staffProfiles?.find(p => p.roles?.some(r => r.id === profile.activeRole?.id)) ??
		profile?.staffProfiles?.[0]
	const staffId = activeStaffProfile?.id ?? ""
	const canCreate = profile?.activeRole?.permissions.some(
		(p: { module: string; action: string }) => p.module === "patients" && p.action === "create"
	) ?? false
	const registerPatient = useRegisterPatientWithOpdEncounterMutation()

	const [errors, setErrors] = useState<Record<string, string>>({})
	const [clinicianStaffId, setClinicianStaffId] = useState("")
	const [regQueueResult, setRegQueueResult] = useState<{
		queueNumber: number
		encounterId: string
		patientId: string
		mrn: string
	} | null>(null)

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

	const { data: cliniciansData } = useListCliniciansQuery(facilityId ?? undefined)

	const clinicianOptions = cliniciansData?.data ?? []
				name: user.name as string,
				department: sp.department as string | undefined,
			}))
	)

	const update = (field: string, value: string) =>
		setForm(prev => ({ ...prev, [field]: value }))

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		// PS-036: clinicianStaffId is required for OPD registration; submit button is disabled
		// when empty, but guard here ensures the mutation always receives a non-empty value
		if (!facilityId || !canCreate || !clinicianStaffId) return

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
		// PS-034: single atomic endpoint creates patient + OPD encounter in one DB transaction.
		// PS-033: if pendingTriageId is set, the intake is also linked atomically (no separate call).
		const reg = await registerPatient.mutateAsync({
			...result.data,
			admittingStaffId: staffId || undefined,
			clinicianStaffId: clinicianStaffId,
			pendingTriageId: pendingTriageId || undefined,
		})

		// PS-035: show queue number confirmation before navigating
		if (reg.queueNumber != null) {
			setRegQueueResult({
				queueNumber: reg.queueNumber,
				encounterId: reg.encounterId,
				patientId: reg.patientId,
				mrn: reg.mrn,
			})
		} else {
			router.push(`/patients/${reg.patientId}/encounters/${reg.encounterId}`)
		}
	}

	if (!profile) {
		return (
			<div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
				Loading…
			</div>
		)
	}

	if (!facilityId) {
		return (
			<div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
				No active facility context. Switch to a facility role to register patients.
			</div>
		)
	}

	if (!canCreate) {
		return (
			<div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
				You do not have permission to register patients.
			</div>
		)
	}

	// PS-038: triage-first gate — OPD patient registration must originate from a triage intake.
	// Direct navigation to /patients/register without a pendingTriageId is blocked so that every
	// new OPD patient has a triage arrival timestamp, chief complaint, and baseline vitals before
	// Step 2 registration (TOR Flow 1 Step 1 → Step 2 sequence).
	if (!pendingTriageId) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center gap-6 py-12">
					<p className="text-muted-foreground max-w-sm text-center text-sm">
						OPD patient registration requires a completed triage intake. Ask the triage
						nurse to assess the patient first, then open this page from the triage
						reconciliation queue.
					</p>
					<Button variant="outline" onClick={() => router.push("/patients/search")}>
						Back to Patient Search
					</Button>
				</CardContent>
			</Card>
		)
	}

	// PS-035: Queue number confirmation — shown after successful registration before navigating
	if (regQueueResult) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Registration Complete</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex flex-col items-center gap-3 py-4">
						<p className="text-muted-foreground text-sm">
							Queue number assigned for {form.lastName}, {form.firstName}{" "}
							(MRN: {regQueueResult.mrn})
						</p>
						<Badge className="px-8 py-4 text-5xl font-bold tabular-nums">
							{regQueueResult.queueNumber}
						</Badge>
						<p className="text-muted-foreground text-xs">Hand this number to the patient</p>
					</div>
					<div className="flex gap-3">
						<Button
							onClick={() =>
								router.push(
									`/patients/${regQueueResult.patientId}/encounters/${regQueueResult.encounterId}`,
								)
							}
						>
							View Encounter
						</Button>
						<Button variant="outline" onClick={() => router.push("/patients/search")}>
							Register Another Patient
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Walk-in triage reconciliation context banner */}
			{pendingTriageId && (
				<Alert className="border-amber-300 bg-amber-50">
					<AlertTitle className="text-amber-900">Walk-in Triage Reconciliation</AlertTitle>
					<AlertDescription className="text-amber-800 text-sm">
						A triage intake has already been recorded for this walk-in patient. After registration,
						the system will automatically link the triage record to this patient and continue to
						OPD encounter creation.
					</AlertDescription>
				</Alert>
			)}

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

			{/* Clinic Assignment — required for OPD encounter creation (TOR Flow 1 Step 2) */}
			<Card>
				<CardHeader>
					<CardTitle>Clinic Assignment</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="max-w-sm space-y-1.5">
						<Label htmlFor="clinicianStaffId">Attending Clinician / Clinic *</Label>
						<Select
							value={clinicianStaffId || null}
							onValueChange={v => setClinicianStaffId(String(v))}
						>
							<SelectTrigger id="clinicianStaffId">
								<SelectValue placeholder="Select a clinician…" />
							</SelectTrigger>
							<SelectContent>
								{clinicianOptions.map(opt => (
									<SelectItem key={opt.staffProfileId} value={opt.staffProfileId}>
										{opt.name}{opt.department ? ` — ${opt.department}` : ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-muted-foreground text-xs">
							Required to assign a clinic-specific queue number (TOR Flow 1 Step 2).
						</p>
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
					disabled={registerPatient.isPending || !facilityId || !clinicianStaffId}
				>
					{registerPatient.isPending ? "Registering…" : "Register Patient"}
				</Button>
			</div>

			{registerPatient.isError && (
				<p className="text-destructive text-sm">
					Failed to register patient: {registerPatient.error.message}
				</p>
			)}
		</form>
	)
}
