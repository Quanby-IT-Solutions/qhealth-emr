"use client"

import { useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/core/components/ui/button"
import { buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useCreateBirthRegistrationMutation } from "@/features/registrar/civil-registry/api/lcr.hooks"

export function BirthCertificateForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const encounterId = searchParams.get("encounterId") ?? undefined
	const patientId = searchParams.get("patientId") ?? undefined

	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""
	const staffId = profile?.user?.id ?? ""

	const createBirthRegistration = useCreateBirthRegistrationMutation()

	const [form, setForm] = useState({
		birthDatetime: "",
		certificateNumber: "",
		placeOfBirth: "",
		fatherName: "",
		motherName: "",
		attendant: "",
		physicianName: "",
		physicianLicenseNo: "",
	})
	const [signatureDataUrl, setSignatureDataUrl] = useState<string>("")
	const signatureInputRef = useRef<HTMLInputElement>(null)

	const canSubmit =
		!!facilityId &&
		!!patientId &&
		!!form.birthDatetime &&
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
			encounterId,
			birthDatetime: new Date(form.birthDatetime).toISOString(),
			registeredByStaffId: staffId || undefined,
			certificateNumber: form.certificateNumber || undefined,
		})

		router.push("/registrar/civil-registry/tracking")
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
								value={form.birthDatetime}
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
					<div className="space-y-1.5">
						<Label>Place of Birth</Label>
						<Input
							placeholder="Room / ward / delivery room"
							value={form.placeOfBirth}
							onChange={e => setForm(f => ({ ...f, placeOfBirth: e.target.value }))}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Attendant at Birth</Label>
						<Input
							placeholder="e.g. Physician, Midwife, Traditional Hilot"
							value={form.attendant}
							onChange={e => setForm(f => ({ ...f, attendant: e.target.value }))}
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
								value={form.physicianName}
								onChange={e => setForm(f => ({ ...f, physicianName: e.target.value }))}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>PRC License Number</Label>
							<Input
								placeholder="0000000"
								value={form.physicianLicenseNo}
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

			{!patientId && (
				<p className="text-sm text-destructive">
					No patient selected. Navigate here from a patient encounter or provide a{" "}
					<code className="text-xs">?patientId=...</code> query parameter.
				</p>
			)}
		</form>
	)
}
