"use client"

import { useRef, useState } from "react"
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
import { usePatientProfileQuery } from "@/features/patients/api/patients.hooks"
import { useCreateDeathCertificateRegistrationMutation } from "@/features/registrar/civil-registry/api/lcr.hooks"
import { PatientSearchStep } from "@/features/registrar/civil-registry/components/patient-search-step"

function parseNonNegativeInt(value: string) {
	const parsed = Number(value)
	return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined
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

	const [signatureDataUrl, setSignatureDataUrl] = useState<string>("")
	const signatureInputRef = useRef<HTMLInputElement>(null)

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

	const patientName = patient ? formatPatientName(patient) : ""
	const patientAddress = patient ? formatAddress(patient) : ""
	const patientAge = patient ? calculateAgeYears(patient.dateOfBirth) : ""
	const resolvedDeceasedName = form.deceasedName || patientName
	const resolvedDeceasedMrn = form.deceasedMrn || patient?.mrn || ""
	const resolvedAgeAtDeathYears = form.ageAtDeathYears || patientAge
	const resolvedDeceasedAddress = form.deceasedAddress || patientAddress

	function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = ev => setSignatureDataUrl(ev.target?.result as string)
		reader.readAsDataURL(file)
	}

	const canSubmit =
		!!facilityId &&
		!!patientId &&
		!createDeathCertificateRegistration.isPending &&
		!!form.dateOfDeath &&
		!!resolvedDeceasedName

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!canSubmit || !patientId) return

		await createDeathCertificateRegistration.mutateAsync({
			facilityId,
			patientId,
			encounterId,
			deathDatetime: new Date(form.dateOfDeath).toISOString(),
			registeredByStaffId: staffId || undefined,
			certificateNumber: form.registryNumber || undefined,
			deceasedName: resolvedDeceasedName || undefined,
			deceasedMrn: resolvedDeceasedMrn || undefined,
			ageAtDeathYears: parseNonNegativeInt(resolvedAgeAtDeathYears),
			deceasedAddress: resolvedDeceasedAddress || undefined,
			placeOfDeath: form.placeOfDeath || undefined,
			causeOfDeathImmediate: form.causeOfDeathImmediate || undefined,
			causeOfDeathAntecedent: form.causeOfDeathAntecedent || undefined,
			causeOfDeathUnderlying: form.causeOfDeathUnderlying || undefined,
			causeOfDeathContributing: form.causeOfDeathContributing || undefined,
			informantName: form.informantName || undefined,
			informantRelationship: form.informantRelationship || undefined,
			physicianName: form.physicianName || undefined,
			physicianLicenseNo: form.physicianLicenseNo || undefined,
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
								value={form.dateOfDeath}
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
							value={form.placeOfDeath}
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
							value={form.causeOfDeathImmediate}
							onChange={e => setForm(f => ({ ...f, causeOfDeathImmediate: e.target.value }))}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Antecedent cause</Label>
						<Input
							value={form.causeOfDeathAntecedent}
							onChange={e => setForm(f => ({ ...f, causeOfDeathAntecedent: e.target.value }))}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Underlying cause</Label>
						<Input
							value={form.causeOfDeathUnderlying}
							onChange={e => setForm(f => ({ ...f, causeOfDeathUnderlying: e.target.value }))}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Contributing cause (optional)</Label>
						<Input
							value={form.causeOfDeathContributing}
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
								value={form.physicianName}
								onChange={e => setForm(f => ({ ...f, physicianName: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>PRC License Number</Label>
							<Input
								value={form.physicianLicenseNo}
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
						<Label>Digital Signature (upload PNG/JPEG)</Label>
						<Input
							ref={signatureInputRef}
							type="file"
							accept="image/png,image/jpeg"
							onChange={handleSignatureUpload}
						/>
						{signatureDataUrl && (
							<img
								src={signatureDataUrl}
								alt="Physician signature preview"
								className="mt-2 h-16 rounded border object-contain"
							/>
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
