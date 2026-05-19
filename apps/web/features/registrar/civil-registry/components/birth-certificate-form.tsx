"use client"

import { useContext, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button, buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { cn } from "@/core/lib/utils"
import {
	useEncounterDetailQuery,
	useEncounterListQuery,
} from "@/features/encounters/api/encounters.hooks"
import { ChartContext } from "@/features/encounters/context/chart-context"
import { usePatientProfileQuery } from "@/features/patients/api/patients.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useCreateBirthRegistrationMutation } from "@/features/registrar/civil-registry/api/lcr.hooks"
import { LocationPicker } from "@/features/registrar/civil-registry/components/location-picker"
import { PatientSearchStep } from "@/features/registrar/civil-registry/components/patient-search-step"
import { PlaceOfBirthDisplay } from "@/features/registrar/civil-registry/components/place-of-birth-display"
import {
	type BirthLocation,
	findLocationByPatientAddress,
} from "@/features/registrar/civil-registry/lib/philippines-locations"

function formatDateTimeLocal(value: string) {
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return `${value}T00:00`
	}

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return ""
	}

	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	const hours = String(date.getHours()).padStart(2, "0")
	const minutes = String(date.getMinutes()).padStart(2, "0")

	return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function BirthCertificateForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const encounterId = searchParams.get("encounterId") ?? undefined
	const patientId = searchParams.get("patientId") ?? undefined
	const chartContext = useContext(ChartContext)

	const { data: profile } = useMyProfile()
	const activeStaffProfile =
		profile?.staffProfiles.find(p => p.roles.some(r => r.id === profile.activeRole?.id)) ??
		profile?.staffProfiles?.[0]
	const facilityId = activeStaffProfile?.facilityId ?? ""
	const staffId = activeStaffProfile?.id ?? ""
	const { data: patient } = usePatientProfileQuery(patientId ?? "")
	const activeEncountersQuery = useEncounterListQuery(
		{
			facilityId,
			patientId,
			status: "active",
			page: 1,
			limit: 5,
		},
		{ enabled: !!facilityId && !!patientId && !encounterId && !chartContext?.encounter }
	)
	const inferredEncounterId =
		encounterId ??
		activeEncountersQuery.data?.data.find(item => item.encounterType === "inpatient")?.id ??
		activeEncountersQuery.data?.data[0]?.id ??
		""
	const encounterDetailQuery = useEncounterDetailQuery(inferredEncounterId, {
		enabled: !!inferredEncounterId && !chartContext?.encounter,
	})
	const encounter = chartContext?.encounter ?? encounterDetailQuery.data
	const resolvedEncounterId = (encounter?.id ?? inferredEncounterId) || undefined

	const createBirthRegistration = useCreateBirthRegistrationMutation()

	const [form, setForm] = useState({
		birthDatetime: "",
		certificateNumber: "",
		fatherName: "",
		motherName: "",
		attendantAtBirth: "",
		physicianName: "",
		physicianLicenseNo: "",
		attendingStaffId: "",
		placeOfBirthBarangay: "",
		placeOfBirthMunicipality: "",
		placeOfBirthProvince: "",
		placeOfBirthRegion: "",
	})
	const [signatureDataUrl, setSignatureDataUrl] = useState<string>("")
	const signatureInputRef = useRef<HTMLInputElement>(null)
	const resolvedBirthDatetime =
		form.birthDatetime || (patient?.dateOfBirth ? formatDateTimeLocal(patient.dateOfBirth) : "")

	const inferredLocation = findLocationByPatientAddress({
		city: patient?.city,
		province: patient?.province,
	})
	const resolvedLocation: BirthLocation = {
		barangay: form.placeOfBirthBarangay || inferredLocation.barangay,
		municipality: form.placeOfBirthMunicipality || inferredLocation.municipality,
		province: form.placeOfBirthProvince || inferredLocation.province,
		region: form.placeOfBirthRegion || inferredLocation.region,
	}
	const resolvedAttendantAtBirth = form.attendantAtBirth || encounter?.attendingStaffName || ""
	const resolvedPhysicianName = form.physicianName || encounter?.attendingStaffName || ""
	const resolvedPhysicianLicenseNo =
		form.physicianLicenseNo || encounter?.attendingStaffLicenseNo || ""
	const resolvedAttendingStaffId = form.attendingStaffId || encounter?.attendingStaffId || ""
	const facilityBirthLocation = [encounter?.wardName, encounter?.bedNumber ? `Bed ${encounter.bedNumber}` : ""]
		.filter(Boolean)
		.join(", ")

	const canSubmit =
		!!facilityId &&
		!!patientId &&
		!!resolvedBirthDatetime &&
		!createBirthRegistration.isPending

	function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = ev => setSignatureDataUrl(ev.target?.result as string)
		reader.readAsDataURL(file)
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!canSubmit || !patientId) return

		await createBirthRegistration.mutateAsync({
			facilityId,
			patientId,
			encounterId: resolvedEncounterId,
			birthDatetime: new Date(resolvedBirthDatetime).toISOString(),
			registeredByStaffId: staffId || undefined,
			certificateNumber: form.certificateNumber || undefined,
			attendantAtBirth: resolvedAttendantAtBirth || undefined,
			placeOfBirthBarangay: resolvedLocation.barangay || undefined,
			placeOfBirthMunicipality: resolvedLocation.municipality || undefined,
			placeOfBirthProvince: resolvedLocation.province || undefined,
			placeOfBirthRegion: resolvedLocation.region || undefined,
			physicianName: resolvedPhysicianName || undefined,
			physicianLicenseNo: resolvedPhysicianLicenseNo || undefined,
			attendingStaffId: resolvedAttendingStaffId || undefined,
		})

		router.push("/registrar/civil-registry/tracking")
	}

	if (!patientId) {
		return (
			<PatientSearchStep
				title="Select Patient for Birth Certificate"
				onSelect={id => router.replace(`/registrar/civil-registry/birth?patientId=${id}`)}
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
				<h1 className="text-xl font-semibold">New Birth Certificate</h1>
				<p className="text-sm text-muted-foreground">
					Register a live birth and generate a certificate for submission to the local civil registrar.
				</p>
			</div>

			{/* Birth Details */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-semibold">Birth Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label>Date &amp; Time of Birth <span className="text-destructive">*</span></Label>
							<Input
								type="datetime-local"
								value={resolvedBirthDatetime}
								onChange={e => setForm(f => ({ ...f, birthDatetime: e.target.value }))}
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Certificate Number</Label>
							<Input
								placeholder="Leave blank to auto-assign"
								value={form.certificateNumber}
								onChange={e => setForm(f => ({ ...f, certificateNumber: e.target.value }))}
							/>
						</div>
					</div>
					<div className="space-y-3">
						<div className="space-y-1.5">
							<Label>Place of Birth</Label>
							<LocationPicker
								value={resolvedLocation}
								onLocationChange={location =>
									setForm(f => ({
										...f,
										placeOfBirthBarangay: location.barangay ?? "",
										placeOfBirthMunicipality: location.municipality ?? "",
										placeOfBirthProvince: location.province ?? "",
										placeOfBirthRegion: location.region ?? "",
									}))
								}
							/>
						</div>
						<PlaceOfBirthDisplay {...resolvedLocation} />
						{facilityBirthLocation && (
							<p className="text-xs text-muted-foreground">
								Facility location from encounter: {facilityBirthLocation}
							</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label>Attendant at Birth</Label>
						<Input
							placeholder="e.g. Physician, Midwife, Traditional Hilot"
							value={resolvedAttendantAtBirth}
							onChange={e => setForm(f => ({ ...f, attendantAtBirth: e.target.value }))}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Parents */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-semibold">Parents Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label>Father&apos;s Full Name</Label>
							<Input
								placeholder="Last, First Middle"
								value={form.fatherName}
								onChange={e => setForm(f => ({ ...f, fatherName: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Mother&apos;s Full Name</Label>
							<Input
								placeholder="Last, First Middle"
								value={form.motherName}
								onChange={e => setForm(f => ({ ...f, motherName: e.target.value }))}
							/>
						</div>
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
							<Label>Attending Physician Name</Label>
							<Input
								placeholder="Full name"
								value={resolvedPhysicianName}
								onChange={e => setForm(f => ({ ...f, physicianName: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>PRC License Number</Label>
							<Input
								placeholder="0000000"
								value={resolvedPhysicianLicenseNo}
								onChange={e => setForm(f => ({ ...f, physicianLicenseNo: e.target.value }))}
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
					{createBirthRegistration.isPending ? "Saving…" : "Create Birth Registration"}
				</Button>
			</div>
		</form>
	)
}
