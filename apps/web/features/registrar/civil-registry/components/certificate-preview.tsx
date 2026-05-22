"use client"

import { AlertCircle, BadgeCheck, FileText, Pencil, WandSparkles } from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"

type CertificatePreviewType = "birth" | "death"

interface CertificatePreviewProps {
	type: CertificatePreviewType
	data: Record<string, unknown>
	onEdit: () => void
	onGenerate: () => Promise<void>
	isGenerating?: boolean
}

export function CertificatePreview({
	type,
	data,
	onEdit,
	onGenerate,
	isGenerating = false,
}: CertificatePreviewProps) {
	const errors = type === "birth" ? validateBirthPreview(data) : validateDeathPreview(data)
	const title = type === "birth" ? "Certificate of Live Birth" : "Certificate of Death"

	return (
		<div className="space-y-4">
			{errors.length > 0 && (
				<Alert variant="destructive">
					<AlertCircle className="size-4" />
					<AlertDescription>
						<span className="font-medium">Missing required details:</span> {errors.join(", ")}
					</AlertDescription>
				</Alert>
			)}

			<Card className="overflow-hidden">
				<CardHeader className="bg-muted/40 border-b">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<FileText className="size-5" />
							{title} Preview
						</CardTitle>
						<div className="flex gap-2">
							<Button type="button" variant="outline" size="sm" onClick={onEdit}>
								<Pencil className="size-4" />
								Edit
							</Button>
							<Button
								type="button"
								size="sm"
								disabled={isGenerating || errors.length > 0}
								onClick={onGenerate}
							>
								{isGenerating ? (
									<>
										<WandSparkles className="size-4 animate-pulse" />
										Generating
									</>
								) : (
									<>
										<BadgeCheck className="size-4" />
										Generate
									</>
								)}
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-6">
					<div className="mx-auto max-w-3xl space-y-6 border bg-white p-6 text-slate-950 shadow-sm">
						<div className="text-center">
							<p className="text-xs font-semibold">REPUBLIC OF THE PHILIPPINES</p>
							<p className="text-xs font-semibold">PHILIPPINE STATISTICS AUTHORITY</p>
							<h2 className="mt-3 text-xl font-bold uppercase">{title}</h2>
							<p className="mt-1 text-xs">
								Certificate No: {stringValue(data.certificateNumber) || "Pending"}
							</p>
						</div>
						<Separator />
						{type === "birth" ? <BirthPreview data={data} /> : <DeathPreview data={data} />}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

function BirthPreview({ data }: { data: Record<string, unknown> }) {
	const patient = data.patient as Record<string, unknown> | undefined
	const childName = [patient?.firstName, patient?.middleName, patient?.lastName]
		.map(stringValue)
		.filter(Boolean)
		.join(" ")
	const placeOfBirth = [
		data.placeOfBirthBarangay,
		data.placeOfBirthMunicipality,
		data.placeOfBirthProvince,
		data.placeOfBirthRegion,
	]
		.map(stringValue)
		.filter(Boolean)
		.join(", ")

	return (
		<div className="space-y-5">
			<PreviewSection
				title="Child Information"
				rows={[
					["Name of Child", childName],
					["Sex", stringValue(patient?.sex)],
					["Date and Time of Birth", formatDateTime(data.birthDatetime)],
					["Place of Birth", placeOfBirth],
				]}
			/>
			<PreviewSection
				title="Parents Information"
				rows={[
					["Mother", stringValue(data.motherName)],
					["Father", stringValue(data.fatherName)],
				]}
			/>
			<PreviewSection
				title="Physician Certification"
				rows={[
					["Attendant", stringValue(data.attendantAtBirth)],
					["Physician", stringValue(data.physicianName)],
					["PRC License No.", stringValue(data.physicianLicenseNo)],
					["Signature", data.physicianSignature ? "Captured" : ""],
				]}
			/>
		</div>
	)
}

function DeathPreview({ data }: { data: Record<string, unknown> }) {
	return (
		<div className="space-y-5">
			<PreviewSection
				title="Deceased Information"
				rows={[
					["Name", stringValue(data.deceasedName)],
					["MRN", stringValue(data.deceasedMrn)],
					["Age at Death", stringValue(data.ageAtDeathYears)],
					["Date and Time of Death", formatDateTime(data.deathDatetime)],
					["Place of Death", stringValue(data.placeOfDeath)],
					["Address", stringValue(data.deceasedAddress)],
				]}
			/>
			<PreviewSection
				title="Cause of Death"
				rows={[
					["Immediate", stringValue(data.causeOfDeathImmediate)],
					["Antecedent", stringValue(data.causeOfDeathAntecedent)],
					["Underlying", stringValue(data.causeOfDeathUnderlying)],
					["Contributing", stringValue(data.causeOfDeathContributing)],
				]}
			/>
			<PreviewSection
				title="Certification and Informant"
				rows={[
					["Informant", stringValue(data.informantName)],
					["Relationship", stringValue(data.informantRelationship)],
					["Physician", stringValue(data.physicianName)],
					["PRC License No.", stringValue(data.physicianLicenseNo)],
					["Signature", data.physicianSignature ? "Captured" : ""],
				]}
			/>
		</div>
	)
}

function PreviewSection({ title, rows }: { title: string; rows: Array<[string, string]> }) {
	return (
		<section>
			<h3 className="mb-2 text-sm font-bold uppercase">{title}</h3>
			<div className="grid gap-2 text-sm">
				{rows.map(([label, value]) => (
					<div key={label} className="grid grid-cols-[180px_1fr] gap-3 border-b pb-1">
						<span className="font-medium">{label}</span>
						<span>{value || "—"}</span>
					</div>
				))}
			</div>
		</section>
	)
}

function validateBirthPreview(data: Record<string, unknown>): string[] {
	const errors: string[] = []
	if (!stringValue(data.birthDatetime)) errors.push("birth date/time")
	if (
		![
			data.placeOfBirthBarangay,
			data.placeOfBirthMunicipality,
			data.placeOfBirthProvince,
			data.placeOfBirthRegion,
		].some(value => stringValue(value))
	) {
		errors.push("place of birth")
	}
	if (!stringValue(data.motherName) && !stringValue(data.fatherName)) errors.push("parent name")
	return errors
}

function validateDeathPreview(data: Record<string, unknown>): string[] {
	const errors: string[] = []
	if (!stringValue(data.deathDatetime)) errors.push("death date/time")
	if (!stringValue(data.deceasedName)) errors.push("deceased name")
	if (!stringValue(data.placeOfDeath)) errors.push("place of death")
	if (
		![
			data.causeOfDeathImmediate,
			data.causeOfDeathAntecedent,
			data.causeOfDeathUnderlying,
			data.causeOfDeathContributing,
		].some(value => stringValue(value))
	) {
		errors.push("cause of death")
	}
	return errors
}

function stringValue(value: unknown): string {
	return typeof value === "string"
		? value.trim()
		: value === undefined || value === null
			? ""
			: String(value)
}

function formatDateTime(value: unknown): string {
	const raw = stringValue(value)
	if (!raw) return ""
	const date = new Date(raw)
	return Number.isNaN(date.getTime()) ? raw : date.toLocaleString("en-PH")
}
