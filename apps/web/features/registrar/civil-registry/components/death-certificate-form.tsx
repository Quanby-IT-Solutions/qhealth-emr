"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button, buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { SignatureCanvas } from "@/features/nursing/components/consent-capture"
import { usePatientProfileQuery } from "@/features/patients/api/patients.hooks"
import {
	useCreateDeathCertificateRegistrationMutation,
	useGetDeathCertificatePrefillDataQuery,
} from "@/features/registrar/civil-registry/api/lcr.hooks"
import { PatientSearchStep } from "@/features/registrar/civil-registry/components/patient-search-step"

function parseNonNegativeInt(value: string) {
	const parsed = Number(value)
	return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined
}

function formatDateTimeLocal(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return ""
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	const hours = String(date.getHours()).padStart(2, "0")
	const minutes = String(date.getMinutes()).padStart(2, "0")
	return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatPatientName({
	firstName,
	middleName,
	lastName,
}: {
	firstName: string
	middleName?: string | null
	lastName: string
}) {
	return [firstName, middleName, lastName].filter(Boolean).join(" ")
}

function formatAddress({
	addressLine1,
	addressLine2,
	city,
	province,
	zipCode,
}: {
	addressLine1?: string | null
	addressLine2?: string | null
	city?: string | null
	province?: string | null
	zipCode?: string | null
}) {
	return [addressLine1, addressLine2, city, province, zipCode].filter(Boolean).join(", ")
}

function calculateAgeYears(dateOfBirth: string) {
	const dob = new Date(dateOfBirth)
	if (Number.isNaN(dob.getTime())) return ""

	const today = new Date()
	let age = today.getFullYear() - dob.getFullYear()
	const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
	if (today < birthdayThisYear) age -= 1
	return String(Math.max(0, age))
}

export function DeathCertificateForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const encounterId = searchParams.get("encounterId") ?? undefined
	const patientId = searchParams.get("patientId") ?? undefined

	const { data: profile } = useMyProfile()
	const activeStaffProfile =
		profile?.staffProfiles.find(p => p.roles.some(r => r.id === profile.activeRole?.id)) ??
		profile?.staffProfiles?.[0]
	const facilityId = activeStaffProfile?.facilityId ?? ""
	const staffId = activeStaffProfile?.id ?? ""
	const createDeathCertificateRegistration = useCreateDeathCertificateRegistrationMutation()
	const { data: patient } = usePatientProfileQuery(patientId ?? "")
	const deathPrefillQuery = useGetDeathCertificatePrefillDataQuery(
		{ patientId: patientId ?? "", encounterId },
		{ enabled: !!patientId }
	)

	const [signatureDataUrl, setSignatureDataUrl] = useState<string>("")

	const [form, setForm] = useState({
		deceasedName: "",
		deceasedMrn: "",
		ageAtDeathYears: "",
		deceasedAddress: "",
		dateOfDeath: "",
		causeOfDeathImmediate: "",
		causeOfDeathAntecedent: "",
		causeOfDeathUnderlying: "",
		causeOfDeathContributing: "",
		placeOfDeath: "",
		informantName: "",
		informantRelationship: "",
		registryNumber: "",
		physicianName: "",
		physicianLicenseNo: "",
		certificationDate: "",
	})
	const prefill = deathPrefillQuery.data

	const patientName = patient ? formatPatientName(patient) : ""
	const patientAddress = patient ? formatAddress(patient) : ""
	const patientAge = patient ? calculateAgeYears(patient.dateOfBirth) : ""
	const resolvedDeceasedName = form.deceasedName || prefill?.deceasedName || patientName
	const resolvedDeceasedMrn = form.deceasedMrn || prefill?.deceasedMrn || patient?.mrn || ""
	const resolvedAgeAtDeathYears =
		form.ageAtDeathYears || String(prefill?.ageAtDeathYears ?? "") || patientAge
	const resolvedDeceasedAddress = form.deceasedAddress || prefill?.deceasedAddress || patientAddress
	const resolvedDateOfDeath =
		form.dateOfDeath || (prefill?.deathDatetime ? formatDateTimeLocal(prefill.deathDatetime) : "")
	const resolvedPlaceOfDeath = form.placeOfDeath || prefill?.placeOfDeath || ""
	const resolvedCauseOfDeathImmediate =
		form.causeOfDeathImmediate || prefill?.causeOfDeathImmediate || ""
	const resolvedCauseOfDeathAntecedent =
		form.causeOfDeathAntecedent || prefill?.causeOfDeathAntecedent || ""
	const resolvedCauseOfDeathUnderlying =
		form.causeOfDeathUnderlying || prefill?.causeOfDeathUnderlying || ""
	const resolvedCauseOfDeathContributing =
		form.causeOfDeathContributing || prefill?.causeOfDeathContributing || ""
	const resolvedPhysicianName = form.physicianName || prefill?.physicianName || ""
	const resolvedPhysicianLicenseNo = form.physicianLicenseNo || prefill?.physicianLicenseNo || ""

	const canSubmit =
		!!facilityId &&
		!!patientId &&
		!createDeathCertificateRegistration.isPending &&
		!!resolvedDateOfDeath &&
		!!resolvedDeceasedName

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!canSubmit || !patientId) return

		await createDeathCertificateRegistration.mutateAsync({
			facilityId,
			patientId,
			encounterId,
			deathDatetime: new Date(resolvedDateOfDeath).toISOString(),
			registeredByStaffId: staffId || undefined,
			certificateNumber: form.registryNumber || undefined,
			deceasedName: resolvedDeceasedName || undefined,
			deceasedMrn: resolvedDeceasedMrn || undefined,
			ageAtDeathYears: parseNonNegativeInt(resolvedAgeAtDeathYears),
			deceasedAddress: resolvedDeceasedAddress || undefined,
			placeOfDeath: resolvedPlaceOfDeath || undefined,
			causeOfDeathImmediate: resolvedCauseOfDeathImmediate || undefined,
			causeOfDeathAntecedent: resolvedCauseOfDeathAntecedent || undefined,
			causeOfDeathUnderlying: resolvedCauseOfDeathUnderlying || undefined,
			causeOfDeathContributing: resolvedCauseOfDeathContributing || undefined,
			informantName: form.informantName || undefined,
			informantRelationship: form.informantRelationship || undefined,
			physicianName: resolvedPhysicianName || undefined,
			physicianLicenseNo: resolvedPhysicianLicenseNo || undefined,
			physicianSignature: signatureDataUrl || undefined,
			certificationDate: form.certificationDate || undefined,
		})

		router.push("/registrar/civil-registry/tracking")
	}

	if (!patientId) {
		return (
			<PatientSearchStep
				title="Select Patient for Death Certificate"
				onSelect={id => router.replace(`/registrar/civil-registry/death?patientId=${id}`)}
			/>
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="flex items-center gap-4">
				<Link
					href="/registrar/civil-registry"
					className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
				>
					<HugeiconsIcon icon={ArrowLeft01FreeIcons} className="size-4" />
					Civil Registry
				</Link>
			</div>

			<div>
				<h1 className="text-xl font-semibold">New Death Certificate</h1>
				<p className="text-muted-foreground text-sm">
					Register a death certificate for submission to the local civil registrar.
				</p>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-semibold">Deceased Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label>
								Full Name <span className="text-destructive">*</span>
							</Label>
							<Input
								value={resolvedDeceasedName}
								onChange={e => setForm(f => ({ ...f, deceasedName: e.target.value }))}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label>MRN</Label>
							<Input
								value={resolvedDeceasedMrn}
								onChange={e => setForm(f => ({ ...f, deceasedMrn: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Age at Death</Label>
							<Input
								type="number"
								min={0}
								value={resolvedAgeAtDeathYears}
								onChange={e => setForm(f => ({ ...f, ageAtDeathYears: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>
								Date of Death <span className="text-destructive">*</span>
							</Label>
							<Input
								type="datetime-local"
								value={resolvedDateOfDeath}
								onChange={e => setForm(f => ({ ...f, dateOfDeath: e.target.value }))}
								required
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<Label>Address</Label>
						<Input
							value={resolvedDeceasedAddress}
							onChange={e => setForm(f => ({ ...f, deceasedAddress: e.target.value }))}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Place of Death</Label>
						<Input
							placeholder="Room / ward / facility"
							value={resolvedPlaceOfDeath}
							onChange={e => setForm(f => ({ ...f, placeOfDeath: e.target.value }))}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-semibold">Cause of Death</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-1.5">
						<Label>Immediate cause</Label>
						<Input
							value={resolvedCauseOfDeathImmediate}
							onChange={e => setForm(f => ({ ...f, causeOfDeathImmediate: e.target.value }))}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Antecedent cause</Label>
						<Input
							value={resolvedCauseOfDeathAntecedent}
							onChange={e => setForm(f => ({ ...f, causeOfDeathAntecedent: e.target.value }))}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Underlying cause</Label>
						<Input
							value={resolvedCauseOfDeathUnderlying}
							onChange={e => setForm(f => ({ ...f, causeOfDeathUnderlying: e.target.value }))}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Contributing cause (optional)</Label>
						<Input
							value={resolvedCauseOfDeathContributing}
							onChange={e => setForm(f => ({ ...f, causeOfDeathContributing: e.target.value }))}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Civil Registry fields */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-semibold">Civil Registry Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label>Informant Name</Label>
							<Input
								value={form.informantName}
								onChange={e => setForm(f => ({ ...f, informantName: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Informant Relationship</Label>
							<Input
								placeholder="Spouse, Child, Parent, etc."
								value={form.informantRelationship}
								onChange={e => setForm(f => ({ ...f, informantRelationship: e.target.value }))}
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<Label>Registry Number</Label>
						<Input
							placeholder="Civil registry book/page number"
							value={form.registryNumber}
							onChange={e => setForm(f => ({ ...f, registryNumber: e.target.value }))}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Physician Certification */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-semibold">Physician Certification</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label>Certifying Physician Name</Label>
							<Input
								value={resolvedPhysicianName}
								onChange={e => setForm(f => ({ ...f, physicianName: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>PRC License Number</Label>
							<Input
								value={resolvedPhysicianLicenseNo}
								onChange={e => setForm(f => ({ ...f, physicianLicenseNo: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Certification Date</Label>
							<Input
								type="date"
								value={form.certificationDate}
								onChange={e => setForm(f => ({ ...f, certificationDate: e.target.value }))}
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<Label>Digital Signature</Label>
						<SignatureCanvas
							label="Physician signature"
							onCapture={dataUrl => setSignatureDataUrl(dataUrl)}
							onClear={() => setSignatureDataUrl("")}
							disabled={createDeathCertificateRegistration.isPending}
						/>
						{signatureDataUrl && (
							<p className="text-muted-foreground text-xs">Physician signature captured.</p>
						)}
					</div>
				</CardContent>
			</Card>

			<div className="flex justify-end gap-3">
				<Link href="/registrar/civil-registry" className={buttonVariants({ variant: "outline" })}>
					Cancel
				</Link>
				<Button type="submit" disabled={!canSubmit}>
					{createDeathCertificateRegistration.isPending ? "Saving..." : "Save Death Certificate"}
				</Button>
			</div>
		</form>
	)
}
