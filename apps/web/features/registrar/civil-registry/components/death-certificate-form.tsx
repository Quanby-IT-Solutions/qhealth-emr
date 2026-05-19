"use client"

import { useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button, buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { cn } from "@/core/lib/utils"
import { useCreateFmdrfMutation, useCreateFndrfMutation } from "@/features/death-reporting/api/death-reporting.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { usePatientProfileQuery } from "@/features/patients/api/patients.hooks"
import { PatientSearchStep } from "@/features/registrar/civil-registry/components/patient-search-step"

type ReportType = "fmdrf" | "fndrf"

function parsePositiveInt(value: string, fallback: number) {
	const parsed = Number(value)
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
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
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const createFmdrf = useCreateFmdrfMutation()
	const createFndrf = useCreateFndrfMutation()
	const { data: patient } = usePatientProfileQuery(patientId ?? "")

	const [reportType, setReportType] = useState<ReportType>("fmdrf")
	const [signatureDataUrl, setSignatureDataUrl] = useState<string>("")
	const [submitError, setSubmitError] = useState<string | null>(null)
	const signatureInputRef = useRef<HTMLInputElement>(null)

	// FMDRF fields
	const [fmdrfForm, setFmdrfForm] = useState({
		patientName: "",
		patientMrn: "",
		patientAge: "",
		patientAddress: "",
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

	// FNDRF fields
	const [fndrfForm, setFndrfForm] = useState({
		newbornName: "",
		newbornMrn: "",
		newbornDateOfBirth: "",
		dateOfDeath: "",
		placeOfDeath: "",
		motherName: "",
		motherAge: "",
		registryNumber: "",
		physicianName: "",
		physicianLicenseNo: "",
		certificationDate: "",
	})

	const patientName = patient ? formatPatientName(patient) : ""
	const patientAddress = patient ? formatAddress(patient) : ""
	const patientAge = patient ? calculateAgeYears(patient.dateOfBirth) : ""
	const resolvedFmdrfPatientName = fmdrfForm.patientName || patientName
	const resolvedFmdrfPatientMrn = fmdrfForm.patientMrn || patient?.mrn || ""
	const resolvedFmdrfPatientAge = fmdrfForm.patientAge || patientAge
	const resolvedFmdrfPatientAddress = fmdrfForm.patientAddress || patientAddress
	const resolvedFndrfNewbornName = fndrfForm.newbornName || patientName
	const resolvedFndrfNewbornMrn = fndrfForm.newbornMrn || patient?.mrn || ""
	const resolvedFndrfNewbornDateOfBirth = fndrfForm.newbornDateOfBirth || patient?.dateOfBirth || ""

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
		!createFmdrf.isPending &&
		!createFndrf.isPending &&
		!!(reportType === "fmdrf" ? fmdrfForm.dateOfDeath && resolvedFmdrfPatientName : fndrfForm.dateOfDeath && resolvedFndrfNewbornName)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!canSubmit || !patientId) return

		if (!encounterId) {
			setSubmitError("The current death-reporting API requires an encounter before saving.")
			return
		}

		setSubmitError(null)

		if (reportType === "fmdrf") {
			await createFmdrf.mutateAsync({
				encounterId,
				patientId,
				facilityId,
				patientName: resolvedFmdrfPatientName,
				patientMrn: resolvedFmdrfPatientMrn,
				patientAge: parsePositiveInt(resolvedFmdrfPatientAge, 1),
				patientAddress: resolvedFmdrfPatientAddress,
				dateOfDeath: new Date(fmdrfForm.dateOfDeath).toISOString(),
				placeOfDeath: fmdrfForm.placeOfDeath,
				causeOfDeathImmediate: fmdrfForm.causeOfDeathImmediate,
				causeOfDeathAntecedent: fmdrfForm.causeOfDeathAntecedent,
				causeOfDeathUnderlying: fmdrfForm.causeOfDeathUnderlying,
				causeOfDeathContributing: fmdrfForm.causeOfDeathContributing || null,
				gravidity: 0,
				parity: 0,
				lastMenstrualPeriod: null,
				gestationalAgeWeeks: null,
				antenatalCare: false,
				antenatalVisitCount: null,
				complicationType: null,
				factorHemorrhage: false,
				factorSepsis: false,
				factorEclampsia: false,
				factorObstructedLabor: false,
				factorUnsafeAbortion: false,
				factorOther: null,
				avoidableFactors: false,
				avoidableRemark: null,
				physicianName: fmdrfForm.physicianName,
				physicianLicenseNo: fmdrfForm.physicianLicenseNo,
				physicianSignatureDataUrl: signatureDataUrl,
				certificationDate: fmdrfForm.certificationDate,
			})
		} else {
			await createFndrf.mutateAsync({
				encounterId,
				patientId,
				facilityId,
				newbornName: resolvedFndrfNewbornName,
				newbornMrn: resolvedFndrfNewbornMrn,
				newbornDateOfBirth: resolvedFndrfNewbornDateOfBirth,
				gestationalAgeWeeks: 0,
				birthWeightGrams: 1,
				deliveryType: "other",
				apgarScore1Min: null,
				apgarScore5Min: null,
				resuscitationRequired: false,
				motherName: fndrfForm.motherName,
				motherAge: parsePositiveInt(fndrfForm.motherAge, 1),
				motherGravidity: 0,
				motherParity: 0,
				motherAncVisits: null,
				dateOfDeath: new Date(fndrfForm.dateOfDeath).toISOString(),
				ageAtDeathHours: null,
				ageAtDeathDays: null,
				placeOfDeath: fndrfForm.placeOfDeath,
				causePrematurity: false,
				causeBirthAsphyxia: false,
				causeSepsis: false,
				causeCongenitalAnomaly: false,
				causeRds: false,
				causeOther: null,
				contributingRemarks: null,
				physicianName: fndrfForm.physicianName,
				physicianLicenseNo: fndrfForm.physicianLicenseNo,
				physicianSignatureDataUrl: signatureDataUrl,
				certificationDate: fndrfForm.certificationDate,
			})
		}

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
				<p className="text-sm text-muted-foreground">
					Complete the FMDRF or FNDRF form to register a death and generate a certificate for submission.
				</p>
			</div>

			{/* Report type selector */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-semibold">Report Type</CardTitle>
				</CardHeader>
				<CardContent>
					<Select value={reportType} onValueChange={v => setReportType(v as ReportType)}>
						<SelectTrigger className="w-full max-w-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="fmdrf">FMDRF — Maternal / Fetal Death</SelectItem>
							<SelectItem value="fndrf">FNDRF — Neonatal / Fetal Death</SelectItem>
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			{reportType === "fmdrf" ? (
				<>
					{/* FMDRF — Patient */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-semibold">Patient Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label>Full Name <span className="text-destructive">*</span></Label>
									<Input
										value={resolvedFmdrfPatientName}
										onChange={e => setFmdrfForm(f => ({ ...f, patientName: e.target.value }))}
										required
									/>
								</div>
								<div className="space-y-1.5">
									<Label>MRN</Label>
									<Input
										value={resolvedFmdrfPatientMrn}
										onChange={e => setFmdrfForm(f => ({ ...f, patientMrn: e.target.value }))}
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Age</Label>
									<Input
										type="number"
										min={0}
										value={resolvedFmdrfPatientAge}
										onChange={e => setFmdrfForm(f => ({ ...f, patientAge: e.target.value }))}
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Date of Death <span className="text-destructive">*</span></Label>
									<Input
										type="datetime-local"
										value={fmdrfForm.dateOfDeath}
										onChange={e => setFmdrfForm(f => ({ ...f, dateOfDeath: e.target.value }))}
										required
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label>Address</Label>
								<Input
									value={resolvedFmdrfPatientAddress}
									onChange={e => setFmdrfForm(f => ({ ...f, patientAddress: e.target.value }))}
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Place of Death</Label>
								<Input
									placeholder="Room / ward / facility"
									value={fmdrfForm.placeOfDeath}
									onChange={e => setFmdrfForm(f => ({ ...f, placeOfDeath: e.target.value }))}
								/>
							</div>
						</CardContent>
					</Card>

					{/* FMDRF — Cause of Death */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-semibold">Cause of Death</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1.5">
								<Label>Immediate cause</Label>
								<Input
									value={fmdrfForm.causeOfDeathImmediate}
									onChange={e => setFmdrfForm(f => ({ ...f, causeOfDeathImmediate: e.target.value }))}
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Antecedent cause</Label>
								<Input
									value={fmdrfForm.causeOfDeathAntecedent}
									onChange={e => setFmdrfForm(f => ({ ...f, causeOfDeathAntecedent: e.target.value }))}
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Underlying cause</Label>
								<Input
									value={fmdrfForm.causeOfDeathUnderlying}
									onChange={e => setFmdrfForm(f => ({ ...f, causeOfDeathUnderlying: e.target.value }))}
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Contributing cause (optional)</Label>
								<Input
									value={fmdrfForm.causeOfDeathContributing}
									onChange={e => setFmdrfForm(f => ({ ...f, causeOfDeathContributing: e.target.value }))}
								/>
							</div>
						</CardContent>
					</Card>
				</>
			) : (
				<>
					{/* FNDRF — Newborn */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-semibold">Newborn Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label>Newborn Name <span className="text-destructive">*</span></Label>
									<Input
										value={resolvedFndrfNewbornName}
										onChange={e => setFndrfForm(f => ({ ...f, newbornName: e.target.value }))}
										required
									/>
								</div>
								<div className="space-y-1.5">
									<Label>MRN</Label>
									<Input
										value={resolvedFndrfNewbornMrn}
										onChange={e => setFndrfForm(f => ({ ...f, newbornMrn: e.target.value }))}
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Date of Birth</Label>
									<Input
										type="datetime-local"
										value={resolvedFndrfNewbornDateOfBirth}
										onChange={e => setFndrfForm(f => ({ ...f, newbornDateOfBirth: e.target.value }))}
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Date of Death <span className="text-destructive">*</span></Label>
									<Input
										type="datetime-local"
										value={fndrfForm.dateOfDeath}
										onChange={e => setFndrfForm(f => ({ ...f, dateOfDeath: e.target.value }))}
										required
									/>
								</div>
							</div>
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label>Mother&apos;s Name</Label>
									<Input
										value={fndrfForm.motherName}
										onChange={e => setFndrfForm(f => ({ ...f, motherName: e.target.value }))}
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Mother&apos;s Age</Label>
									<Input
										type="number"
										min={0}
										value={fndrfForm.motherAge}
										onChange={e => setFndrfForm(f => ({ ...f, motherAge: e.target.value }))}
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label>Place of Death</Label>
								<Input
									value={fndrfForm.placeOfDeath}
									onChange={e => setFndrfForm(f => ({ ...f, placeOfDeath: e.target.value }))}
								/>
							</div>
						</CardContent>
					</Card>
				</>
			)}

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
								value={fmdrfForm.informantName}
								onChange={e => setFmdrfForm(f => ({ ...f, informantName: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Informant Relationship</Label>
							<Input
								placeholder="Spouse, Child, Parent, etc."
								value={fmdrfForm.informantRelationship}
								onChange={e => setFmdrfForm(f => ({ ...f, informantRelationship: e.target.value }))}
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<Label>Registry Number</Label>
						<Input
							placeholder="Civil registry book/page number"
							value={reportType === "fmdrf" ? fmdrfForm.registryNumber : fndrfForm.registryNumber}
							onChange={e =>
								reportType === "fmdrf"
									? setFmdrfForm(f => ({ ...f, registryNumber: e.target.value }))
									: setFndrfForm(f => ({ ...f, registryNumber: e.target.value }))
							}
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
								value={reportType === "fmdrf" ? fmdrfForm.physicianName : fndrfForm.physicianName}
								onChange={e =>
									reportType === "fmdrf"
										? setFmdrfForm(f => ({ ...f, physicianName: e.target.value }))
										: setFndrfForm(f => ({ ...f, physicianName: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>PRC License Number</Label>
							<Input
								value={reportType === "fmdrf" ? fmdrfForm.physicianLicenseNo : fndrfForm.physicianLicenseNo}
								onChange={e =>
									reportType === "fmdrf"
										? setFmdrfForm(f => ({ ...f, physicianLicenseNo: e.target.value }))
										: setFndrfForm(f => ({ ...f, physicianLicenseNo: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Certification Date</Label>
							<Input
								type="date"
								value={reportType === "fmdrf" ? fmdrfForm.certificationDate : fndrfForm.certificationDate}
								onChange={e =>
									reportType === "fmdrf"
										? setFmdrfForm(f => ({ ...f, certificationDate: e.target.value }))
										: setFndrfForm(f => ({ ...f, certificationDate: e.target.value }))
								}
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
				<Link
					href="/registrar/civil-registry"
					className={buttonVariants({ variant: "outline" })}
				>
					Cancel
				</Link>
				<Button type="submit" disabled={!canSubmit}>
					{createFmdrf.isPending || createFndrf.isPending ? "Saving…" : "Save Death Certificate"}
				</Button>
			</div>

			{submitError && <p className="text-sm text-destructive">{submitError}</p>}
		</form>
	)
}
