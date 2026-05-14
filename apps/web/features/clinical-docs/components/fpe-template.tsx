"use client"

import type { ReactNode } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"

import {
	maxLengthForFpeField,
	sanitizeBloodPressure,
	sanitizeDecimal,
	sanitizeFpeText,
	sanitizeIcd10Code,
	sanitizeWholeNumber,
	type FpeFieldKey,
	type FpeValidationResult,
} from "./fpe-validation"

interface VitalSigns {
	bloodPressure: string
	heartRate: string
	respiratoryRate: string
	temperature: string
	oxygenSaturation: string
	weight: string
	height: string
}

interface DiagnosisEntry {
	code: string
	description: string
}

export interface FpeData {
	chiefComplaint: string
	historyOfPresentIllness: string
	pastMedicalHistory: string
	familyHistory: string
	socialHistory: string
	reviewOfSystems: string
	vitalSigns: VitalSigns
	physicalExamGeneral: string
	physicalExamHeent: string
	physicalExamChestLungs: string
	physicalExamCardiovascular: string
	physicalExamAbdomen: string
	physicalExamExtremities: string
	physicalExamNeurological: string
	primaryDiagnosis: DiagnosisEntry
	secondaryDiagnoses: DiagnosisEntry[]
	medications: string
	referrals: string
	followUp: string
	otherRemarks: string
}

interface FpeTemplateProps {
	value: FpeData
	onChange?: (data: FpeData) => void
	readOnly?: boolean
	validation?: FpeValidationResult
}

const EMPTY_VITALS: VitalSigns = {
	bloodPressure: "",
	heartRate: "",
	respiratoryRate: "",
	temperature: "",
	oxygenSaturation: "",
	weight: "",
	height: "",
}

export const EMPTY_FPE_DATA: FpeData = {
	chiefComplaint: "",
	historyOfPresentIllness: "",
	pastMedicalHistory: "",
	familyHistory: "",
	socialHistory: "",
	reviewOfSystems: "",
	vitalSigns: { ...EMPTY_VITALS },
	physicalExamGeneral: "",
	physicalExamHeent: "",
	physicalExamChestLungs: "",
	physicalExamCardiovascular: "",
	physicalExamAbdomen: "",
	physicalExamExtremities: "",
	physicalExamNeurological: "",
	primaryDiagnosis: { code: "", description: "" },
	secondaryDiagnoses: [],
	medications: "",
	referrals: "",
	followUp: "",
	otherRemarks: "",
}

function SectionHeader({ number, title }: { number: number; title: string }) {
	return (
		<div className="flex items-center gap-3 mb-3">
			<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
				{number}
			</div>
			<h4 className="text-sm font-semibold uppercase tracking-wide">{title}</h4>
		</div>
	)
}

function ReadOnlyText({ value, placeholder }: { value: string; placeholder?: string }) {
	return (
		<div className="bg-muted/30 rounded-md border px-3 py-2 text-sm whitespace-pre-wrap min-h-[3rem]">
			{value || <span className="text-muted-foreground italic">{placeholder ?? "-"}</span>}
		</div>
	)
}

function FieldError({ show, children }: { show: boolean; children: ReactNode }) {
	if (!show) return null
	return <p className="text-destructive mt-1.5 text-xs">{children}</p>
}

export function FpeTemplate({
	value,
	onChange,
	readOnly = false,
	validation,
}: FpeTemplateProps) {
	const isReadOnly = readOnly || !onChange
	const missing = new Set(validation?.submitMissingFields ?? [])
	const fieldErrors = validation?.fieldErrors ?? {}

	function set<K extends keyof FpeData>(key: K, val: FpeData[K]) {
		onChange?.({ ...value, [key]: val })
	}

	function setVital(key: keyof VitalSigns, val: string) {
		const sanitized =
			key === "bloodPressure"
				? sanitizeBloodPressure(val)
				: key === "heartRate" || key === "respiratoryRate" || key === "oxygenSaturation"
					? sanitizeWholeNumber(val)
					: sanitizeDecimal(val)
		onChange?.({ ...value, vitalSigns: { ...value.vitalSigns, [key]: sanitized } })
	}

	function setPrimaryDiag(field: "code" | "description", val: string) {
		const key: FpeFieldKey = `primaryDiagnosis.${field}`
		const sanitized =
			field === "code"
				? sanitizeIcd10Code(val)
				: sanitizeFpeText(val, maxLengthForFpeField(key))
		onChange?.({ ...value, primaryDiagnosis: { ...value.primaryDiagnosis, [field]: sanitized } })
	}

	function setText<K extends keyof FpeData>(key: K, val: string) {
		set(key, sanitizeFpeText(val, maxLengthForFpeField(key as FpeFieldKey)) as FpeData[K])
	}

	function errorFor(field: FpeFieldKey) {
		return fieldErrors[field]
	}

	return (
		<div className="space-y-7">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						PhilHealth Konsulta Program
					</p>
					<h3 className="text-base font-semibold">First Patient Encounter (FPE)</h3>
				</div>
				<Badge variant="outline">Structured Template</Badge>
			</div>

			<Separator />

			<section>
				<SectionHeader number={1} title="Chief Complaint" />
				{isReadOnly ? (
					<ReadOnlyText value={value.chiefComplaint} placeholder="No chief complaint recorded" />
				) : (
					<>
						<Textarea
							placeholder="Patient's primary reason for visit in their own words..."
							rows={2}
							maxLength={maxLengthForFpeField("chiefComplaint")}
							value={value.chiefComplaint}
							onChange={e => setText("chiefComplaint", e.target.value)}
						/>
						<FieldError show={missing.has("Chief Complaint") && !errorFor("chiefComplaint")}>
							Chief Complaint is required before Review & Submit.
						</FieldError>
						<FieldError show={!!errorFor("chiefComplaint")}>{errorFor("chiefComplaint")}</FieldError>
					</>
				)}
			</section>

			<section>
				<SectionHeader number={2} title="History of Present Illness" />
				{isReadOnly ? (
					<ReadOnlyText value={value.historyOfPresentIllness} placeholder="No HPI recorded" />
				) : (
					<>
						<Textarea
							placeholder="Onset, duration, character, severity, location, radiation, associated symptoms, relieving/aggravating factors..."
							rows={5}
							maxLength={maxLengthForFpeField("historyOfPresentIllness")}
							value={value.historyOfPresentIllness}
							onChange={e => setText("historyOfPresentIllness", e.target.value)}
						/>
						<FieldError
							show={missing.has("History of Present Illness") && !errorFor("historyOfPresentIllness")}
						>
							History of Present Illness is required before Review & Submit.
						</FieldError>
						<FieldError show={!!errorFor("historyOfPresentIllness")}>
							{errorFor("historyOfPresentIllness")}
						</FieldError>
					</>
				)}
			</section>

			<section>
				<SectionHeader number={3} title="Past Medical History" />
				{isReadOnly ? (
					<ReadOnlyText value={value.pastMedicalHistory} placeholder="No past medical history recorded" />
				) : (
					<Textarea
						placeholder="Chronic conditions, previous hospitalizations, surgeries, current medications, allergies, immunizations..."
						rows={4}
						maxLength={maxLengthForFpeField("pastMedicalHistory")}
						value={value.pastMedicalHistory}
						onChange={e => setText("pastMedicalHistory", e.target.value)}
					/>
				)}
				<FieldError show={!isReadOnly && !!errorFor("pastMedicalHistory")}>
					{errorFor("pastMedicalHistory")}
				</FieldError>
			</section>

			<section>
				<SectionHeader number={4} title="Family History" />
				{isReadOnly ? (
					<ReadOnlyText value={value.familyHistory} placeholder="No family history recorded" />
				) : (
					<Textarea
						placeholder="Relevant hereditary or familial conditions..."
						rows={3}
						maxLength={maxLengthForFpeField("familyHistory")}
						value={value.familyHistory}
						onChange={e => setText("familyHistory", e.target.value)}
					/>
				)}
				<FieldError show={!isReadOnly && !!errorFor("familyHistory")}>
					{errorFor("familyHistory")}
				</FieldError>
			</section>

			<section>
				<SectionHeader number={5} title="Social History" />
				{isReadOnly ? (
					<ReadOnlyText value={value.socialHistory} placeholder="No social history recorded" />
				) : (
					<Textarea
						placeholder="Smoking, alcohol use, recreational drugs, occupation, marital status, living conditions, activity level..."
						rows={3}
						maxLength={maxLengthForFpeField("socialHistory")}
						value={value.socialHistory}
						onChange={e => setText("socialHistory", e.target.value)}
					/>
				)}
				<FieldError show={!isReadOnly && !!errorFor("socialHistory")}>
					{errorFor("socialHistory")}
				</FieldError>
			</section>

			<section>
				<SectionHeader number={6} title="Review of Systems" />
				{isReadOnly ? (
					<ReadOnlyText value={value.reviewOfSystems} placeholder="No ROS recorded" />
				) : (
					<Textarea
						placeholder="Constitutional, HEENT, respiratory, cardiovascular, GI, GU, musculoskeletal, neuro, skin, psychiatric, endocrine..."
						rows={5}
						maxLength={maxLengthForFpeField("reviewOfSystems")}
						value={value.reviewOfSystems}
						onChange={e => setText("reviewOfSystems", e.target.value)}
					/>
				)}
				<FieldError show={!isReadOnly && !!errorFor("reviewOfSystems")}>
					{errorFor("reviewOfSystems")}
				</FieldError>
			</section>

			<Separator />

			<section className="space-y-4">
				<SectionHeader number={7} title="Physical Examination" />

				<div>
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
						Vital Signs
					</p>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{(
							[
								["bloodPressure", "Blood Pressure", "mmHg", "Blood Pressure"],
								["heartRate", "Heart Rate", "bpm", ""],
								["respiratoryRate", "Respiratory Rate", "/min", ""],
								["temperature", "Temperature", "deg C", ""],
								["oxygenSaturation", "O2 Saturation", "%", ""],
								["weight", "Weight", "kg", "Weight"],
								["height", "Height", "cm", "Height"],
							] as const
						).map(([key, label, unit, requiredName]) => (
							<div key={key} className="space-y-1.5">
								<Label className="text-xs">
									{label} <span className="text-muted-foreground">({unit})</span>
								</Label>
								{isReadOnly ? (
									<div className="border rounded-md px-3 py-1.5 text-sm bg-muted/30">
										{value.vitalSigns[key] || "-"}
									</div>
								) : (
									<>
										<Input
											placeholder={unit}
											inputMode={key === "bloodPressure" ? "numeric" : "decimal"}
											maxLength={key === "bloodPressure" ? 7 : 6}
											value={value.vitalSigns[key]}
											onChange={e => setVital(key, e.target.value)}
										/>
										<FieldError
											show={
												!!requiredName &&
												missing.has(requiredName) &&
												!errorFor(`vitalSigns.${key}`)
											}
										>
											{label} is required before Review & Submit.
										</FieldError>
										<FieldError show={!!errorFor(`vitalSigns.${key}`)}>
											{errorFor(`vitalSigns.${key}`)}
										</FieldError>
									</>
								)}
							</div>
						))}
					</div>
				</div>

				{(
					[
						["physicalExamGeneral", "General"],
						["physicalExamHeent", "HEENT"],
						["physicalExamChestLungs", "Chest / Lungs"],
						["physicalExamCardiovascular", "Cardiovascular"],
						["physicalExamAbdomen", "Abdomen"],
						["physicalExamExtremities", "Extremities"],
						["physicalExamNeurological", "Neurological"],
					] as Array<[keyof FpeData, string]>
				).map(([key, label]) => (
					<div key={key} className="space-y-1.5">
						<Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							{label}
						</Label>
						{isReadOnly ? (
							<ReadOnlyText value={value[key] as string} placeholder={`No ${label} findings`} />
						) : (
							<>
								<Textarea
									placeholder={`${label} findings...`}
									rows={2}
									maxLength={maxLengthForFpeField(key as FpeFieldKey)}
									value={value[key] as string}
									onChange={e => setText(key, e.target.value)}
								/>
								<FieldError
									show={
										key === "physicalExamGeneral" &&
										missing.has("Physical Exam (General)") &&
										!errorFor(key as FpeFieldKey)
									}
								>
									Physical Exam (General) is required before Review & Submit.
								</FieldError>
								<FieldError show={!!errorFor(key as FpeFieldKey)}>
									{errorFor(key as FpeFieldKey)}
								</FieldError>
							</>
						)}
					</div>
				))}
			</section>

			<Separator />

			<section className="space-y-4">
				<SectionHeader number={8} title="Assessment / Diagnosis" />

				<div className="space-y-2">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Primary Diagnosis (ICD-10) *
					</p>
					{isReadOnly ? (
						<div className="flex gap-2 text-sm">
							<span className="font-mono font-semibold">{value.primaryDiagnosis.code || "-"}</span>
							<span>{value.primaryDiagnosis.description}</span>
						</div>
					) : (
						<div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
							<div>
								<Input
									placeholder="ICD-10 code (e.g. J18.9)"
									maxLength={maxLengthForFpeField("primaryDiagnosis.code")}
									value={value.primaryDiagnosis.code}
									onChange={e => setPrimaryDiag("code", e.target.value)}
								/>
								<FieldError
									show={
										missing.has("Primary Diagnosis Code") &&
										!errorFor("primaryDiagnosis.code")
									}
								>
									Primary Diagnosis Code is required before saving the draft.
								</FieldError>
								<FieldError show={!!errorFor("primaryDiagnosis.code")}>
									{errorFor("primaryDiagnosis.code")}
								</FieldError>
							</div>
							<div>
								<Input
									placeholder="Diagnosis description"
									maxLength={maxLengthForFpeField("primaryDiagnosis.description")}
									value={value.primaryDiagnosis.description}
									onChange={e => setPrimaryDiag("description", e.target.value)}
								/>
								<FieldError
									show={
										missing.has("Primary Diagnosis Description") &&
										!errorFor("primaryDiagnosis.description")
									}
								>
									Primary Diagnosis Description is required before Review & Submit.
								</FieldError>
								<FieldError show={!!errorFor("primaryDiagnosis.description")}>
									{errorFor("primaryDiagnosis.description")}
								</FieldError>
							</div>
						</div>
					)}
				</div>

				{value.secondaryDiagnoses.length > 0 && (
					<div className="space-y-2">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Secondary Diagnoses
						</p>
						{value.secondaryDiagnoses.map((diag, i) => (
							<div key={`${diag.code}-${i}`} className="flex gap-2 text-sm">
								<span className="font-mono font-semibold">{diag.code || "-"}</span>
								<span>{diag.description}</span>
							</div>
						))}
					</div>
				)}
			</section>

			<section className="space-y-4">
				<SectionHeader number={9} title="Plan / Management" />

				<div className="space-y-3">
					<div className="space-y-1.5">
						<Label>Medications / Prescriptions</Label>
						{isReadOnly ? (
							<ReadOnlyText value={value.medications} placeholder="No medications prescribed" />
						) : (
							<Textarea
								placeholder="Drug, dose, frequency, duration..."
								rows={3}
								maxLength={maxLengthForFpeField("medications")}
								value={value.medications}
								onChange={e => setText("medications", e.target.value)}
							/>
						)}
						<FieldError show={!isReadOnly && !!errorFor("medications")}>
							{errorFor("medications")}
						</FieldError>
					</div>

					<div className="space-y-1.5">
						<Label>Referrals</Label>
						{isReadOnly ? (
							<ReadOnlyText value={value.referrals} placeholder="No referrals" />
						) : (
							<Textarea
								placeholder="Specialist referrals, diagnostics requested..."
								rows={2}
								maxLength={maxLengthForFpeField("referrals")}
								value={value.referrals}
								onChange={e => setText("referrals", e.target.value)}
							/>
						)}
						<FieldError show={!isReadOnly && !!errorFor("referrals")}>
							{errorFor("referrals")}
						</FieldError>
					</div>

					<div className="space-y-1.5">
						<Label>Follow-up Instructions</Label>
						{isReadOnly ? (
							<ReadOnlyText value={value.followUp} placeholder="No follow-up instructions" />
						) : (
							<Textarea
								placeholder="Return visit schedule, red flags, patient instructions..."
								rows={2}
								maxLength={maxLengthForFpeField("followUp")}
								value={value.followUp}
								onChange={e => setText("followUp", e.target.value)}
							/>
						)}
						<FieldError show={!isReadOnly && !!errorFor("followUp")}>
							{errorFor("followUp")}
						</FieldError>
					</div>

					<div className="space-y-1.5">
						<Label>Other Remarks</Label>
						{isReadOnly ? (
							<ReadOnlyText value={value.otherRemarks} placeholder="No additional remarks" />
						) : (
							<Textarea
								placeholder="Additional notes, patient disposition..."
								rows={2}
								maxLength={maxLengthForFpeField("otherRemarks")}
								value={value.otherRemarks}
								onChange={e => setText("otherRemarks", e.target.value)}
							/>
						)}
						<FieldError show={!isReadOnly && !!errorFor("otherRemarks")}>
							{errorFor("otherRemarks")}
						</FieldError>
					</div>
				</div>
			</section>
		</div>
	)
}
