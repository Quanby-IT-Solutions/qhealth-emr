"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Lock, Save, Signature } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/core/components/ui/command"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"
import { useListCliniciansQuery } from "@/features/patients/api/patients.hooks"

import {
	useSaveOperationRecordMutation,
	useSignOperationRecordMutation,
	type OperationRecord,
} from "../api/surgical.hooks"

interface OperationRecordFormProps {
	caseId: string
	facilityId: string
	surgeonStaffId: string
	defaultAnesthesiologistStaffId?: string | null
	existing: OperationRecord | null | undefined
	canEdit?: boolean
	canSign?: boolean
}

interface StaffOption {
	staffProfileId: string
	name: string
	department: string | null
}

interface StaffSearchComboboxProps {
	id?: string
	value: string
	onChange: (value: string) => void
	options: StaffOption[]
	placeholder: string
	disabled?: boolean
}

interface FormState {
	preOpDiagnosis: string
	postOpDiagnosis: string
	procedurePerformed: string
	procedureDescription: string
	operativeTechnique: string
	findings: string
	specimens: string
	estimatedBloodLoss: string
	fluidIn: string
	fluidOut: string
	incisionDatetime: string
	closureDatetime: string
	firstAssistantStaffId: string
	secondAssistantStaffId: string
	scrubNurseStaffId: string
	circulatingNurseStaffId: string
	anesthesiologistStaffId: string
	instrumentCountCorrect: boolean
	swabCountCorrect: boolean
	complications: string
}

function StaffSearchCombobox({
	id,
	value,
	onChange,
	options,
	placeholder,
	disabled = false,
}: StaffSearchComboboxProps) {
	const [open, setOpen] = useState(false)
	const [inputValue, setInputValue] = useState("")

	const selectedOption = useMemo(
		() => options.find(option => option.staffProfileId === value) ?? null,
		[options, value]
	)

	const filteredOptions = useMemo(() => {
		const query = inputValue.trim().toLowerCase()
		const source =
			query.length === 0
				? options
				: options.filter(option => {
						const department = option.department?.toLowerCase() ?? ""
						return option.name.toLowerCase().includes(query) || department.includes(query)
					})

		return source.slice(0, 20)
	}, [inputValue, options])

	useEffect(() => {
		setInputValue(selectedOption?.name ?? "")
	}, [selectedOption])

	function handleInputChange(nextValue: string) {
		setInputValue(nextValue)
		if (!nextValue.trim()) {
			onChange("")
		}
		setOpen(!disabled)
	}

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen && !disabled)
		if (!nextOpen && !value) {
			setInputValue("")
		}
	}

	function handleSelect(option: StaffOption) {
		onChange(option.staffProfileId)
		setInputValue(option.name)
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<Command shouldFilter={false} className="h-auto w-full overflow-visible bg-transparent p-0">
				<PopoverTrigger render={<div className="w-full" />}>
					<CommandInput
						id={id}
						value={inputValue}
						onValueChange={handleInputChange}
						onFocus={() => {
							if (!disabled) {
								setOpen(true)
							}
						}}
						placeholder={placeholder}
						disabled={disabled}
					/>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-(--anchor-width) p-0">
					<CommandList>
						<CommandEmpty>No matching staff found.</CommandEmpty>
						<CommandGroup>
							{filteredOptions.map(option => (
								<CommandItem
									key={option.staffProfileId}
									value={option.staffProfileId}
									onSelect={() => handleSelect(option)}
									className="items-start py-2"
								>
									<div className="flex min-w-0 flex-1 flex-col">
										<span className="truncate font-medium">{option.name}</span>
										{option.department ? (
											<span className="text-muted-foreground text-xs">{option.department}</span>
										) : null}
									</div>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</PopoverContent>
			</Command>
		</Popover>
	)
}

function buildInitialState(
	existing: OperationRecord | null | undefined,
	defaultAnesthesiologistStaffId: string | null | undefined
): FormState {
	return {
		preOpDiagnosis: existing?.preOpDiagnosis ?? "",
		postOpDiagnosis: existing?.postOpDiagnosis ?? "",
		procedurePerformed: existing?.procedurePerformed ?? "",
		procedureDescription: existing?.procedureDescription ?? "",
		operativeTechnique: existing?.operativeTechnique ?? "",
		findings: existing?.findings ?? "",
		specimens: existing?.specimens ?? "",
		estimatedBloodLoss: existing?.estimatedBloodLoss?.toString() ?? "",
		fluidIn: existing?.fluidIn?.toString() ?? "",
		fluidOut: existing?.fluidOut?.toString() ?? "",
		incisionDatetime: existing?.incisionDatetime?.slice(0, 16) ?? "",
		closureDatetime: existing?.closureDatetime?.slice(0, 16) ?? "",
		firstAssistantStaffId: existing?.firstAssistantStaffId ?? "",
		secondAssistantStaffId: existing?.secondAssistantStaffId ?? "",
		scrubNurseStaffId: existing?.scrubNurseStaffId ?? "",
		circulatingNurseStaffId: existing?.circulatingNurseStaffId ?? "",
		anesthesiologistStaffId:
			existing?.anesthesiologistStaffId ?? defaultAnesthesiologistStaffId ?? "",
		instrumentCountCorrect: existing?.instrumentCountCorrect ?? false,
		swabCountCorrect: existing?.swabCountCorrect ?? false,
		complications: existing?.complications ?? "",
	}
}

export function OperationRecordForm({
	caseId,
	facilityId,
	surgeonStaffId,
	defaultAnesthesiologistStaffId,
	existing,
	canEdit = false,
	canSign = false,
}: OperationRecordFormProps) {
	const [form, setForm] = useState<FormState>(() =>
		buildInitialState(existing, defaultAnesthesiologistStaffId)
	)
	const save = useSaveOperationRecordMutation()
	const sign = useSignOperationRecordMutation()
	const staffDirectory = useListCliniciansQuery(facilityId)

	const staffOptions = useMemo(() => staffDirectory.data?.data ?? [], [staffDirectory.data])
	const surgeonName =
		staffOptions.find(option => option.staffProfileId === surgeonStaffId)?.name ?? surgeonStaffId
	const isSigned = existing?.status === "signed"
	const fieldsDisabled = isSigned || !canEdit || save.isPending || sign.isPending
	const canSubmit = Boolean(
		form.preOpDiagnosis.trim() &&
		form.procedurePerformed.trim() &&
		!save.isPending &&
		!sign.isPending
	)
	const signChecklistMissing = useMemo(() => {
		const missingFields: string[] = []

		if (!form.preOpDiagnosis.trim()) missingFields.push("pre-operative diagnosis")
		if (!form.procedurePerformed.trim()) missingFields.push("procedure performed")
		if (!form.procedureDescription.trim()) missingFields.push("procedure narrative")
		if (!form.operativeTechnique.trim()) missingFields.push("operative technique")
		if (!form.incisionDatetime) missingFields.push("incision time")
		if (!form.closureDatetime) missingFields.push("closure time")
		if (
			form.incisionDatetime &&
			form.closureDatetime &&
			new Date(form.closureDatetime) < new Date(form.incisionDatetime)
		) {
			missingFields.push("closure time after incision time")
		}
		if (!form.scrubNurseStaffId) missingFields.push("scrub nurse")
		if (!form.circulatingNurseStaffId) missingFields.push("circulating nurse")
		if (!form.anesthesiologistStaffId) missingFields.push("anesthesiologist")

		return missingFields
	}, [form])
	const canSignDraft = canSign && !isSigned && (Boolean(existing) || canEdit)
	const canSignRecord = canSignDraft && signChecklistMissing.length === 0

	useEffect(() => {
		setForm(buildInitialState(existing, defaultAnesthesiologistStaffId))
	}, [defaultAnesthesiologistStaffId, existing])

	function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm(prev => ({ ...prev, [key]: value }))
	}

	function buildPayload() {
		return {
			caseId,
			surgeonStaffId,
			preOpDiagnosis: form.preOpDiagnosis,
			postOpDiagnosis: form.postOpDiagnosis || undefined,
			procedurePerformed: form.procedurePerformed,
			procedureDescription: form.procedureDescription || undefined,
			operativeTechnique: form.operativeTechnique || undefined,
			findings: form.findings || undefined,
			specimens: form.specimens || undefined,
			estimatedBloodLoss: form.estimatedBloodLoss ? Number(form.estimatedBloodLoss) : undefined,
			fluidIn: form.fluidIn ? Number(form.fluidIn) : undefined,
			fluidOut: form.fluidOut ? Number(form.fluidOut) : undefined,
			incisionDatetime: form.incisionDatetime || undefined,
			closureDatetime: form.closureDatetime || undefined,
			firstAssistantStaffId: form.firstAssistantStaffId || undefined,
			secondAssistantStaffId: form.secondAssistantStaffId || undefined,
			scrubNurseStaffId: form.scrubNurseStaffId || undefined,
			circulatingNurseStaffId: form.circulatingNurseStaffId || undefined,
			anesthesiologistStaffId: form.anesthesiologistStaffId || null,
			instrumentCountCorrect: form.instrumentCountCorrect,
			swabCountCorrect: form.swabCountCorrect,
			complications: form.complications || undefined,
		}
	}

	async function handleSave() {
		return save.mutateAsync(buildPayload())
	}

	async function handleSign() {
		if (!canSignRecord) return

		if (canEdit) {
			await handleSave()
		} else if (!existing) {
			return
		}

		await sign.mutateAsync({ caseId })
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<CardTitle className="text-base">Operation Record Status</CardTitle>
						<p className="text-muted-foreground mt-1 text-sm">
							{isSigned
								? "This operative record has been signed and is now locked."
								: "Draft records remain editable until the assigned surgeon signs them."}
						</p>
					</div>
					<Badge variant={isSigned ? "default" : "secondary"}>
						{isSigned ? "Signed" : "Draft"}
					</Badge>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					{existing?.signedAt ? (
						<p className="text-muted-foreground">
							Signed by {existing.signedByName ?? "Unknown staff"} on{" "}
							{new Date(existing.signedAt).toLocaleString("en-PH")}
						</p>
					) : null}
					{isSigned ? (
						<div className="text-muted-foreground flex items-center gap-2">
							<Lock className="size-4" />
							<span>Edits are disabled after signing.</span>
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Diagnoses</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>
							Pre-operative Diagnosis <span className="text-destructive">*</span>
						</Label>
						<Textarea
							rows={2}
							value={form.preOpDiagnosis}
							onChange={event => setField("preOpDiagnosis", event.target.value)}
							placeholder="Pre-op diagnosis"
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Post-operative Diagnosis</Label>
						<Textarea
							rows={2}
							value={form.postOpDiagnosis}
							onChange={event => setField("postOpDiagnosis", event.target.value)}
							placeholder="Post-op diagnosis"
							disabled={fieldsDisabled}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Procedure Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-1.5">
						<Label>
							Procedure Performed <span className="text-destructive">*</span>
						</Label>
						<Textarea
							rows={3}
							value={form.procedurePerformed}
							onChange={event => setField("procedurePerformed", event.target.value)}
							placeholder="List each performed procedure on its own line for RVS mapping."
							disabled={fieldsDisabled}
						/>
						<p className="text-muted-foreground text-xs">
							Use one line per performed procedure so billing can map a primary RVS code to each
							procedure.
						</p>
					</div>
					<div className="space-y-1.5">
						<Label>Procedure Narrative</Label>
						<Textarea
							rows={3}
							value={form.procedureDescription}
							onChange={event => setField("procedureDescription", event.target.value)}
							placeholder="Narrative description for documentation and export..."
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Operative Technique</Label>
						<Textarea
							rows={4}
							value={form.operativeTechnique}
							onChange={event => setField("operativeTechnique", event.target.value)}
							placeholder="Describe operative technique..."
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Findings</Label>
						<Textarea
							rows={3}
							value={form.findings}
							onChange={event => setField("findings", event.target.value)}
							placeholder="Intraoperative findings..."
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Specimens Sent</Label>
						<Textarea
							rows={2}
							value={form.specimens}
							onChange={event => setField("specimens", event.target.value)}
							placeholder="Specimen type and destination..."
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Complications</Label>
						<Textarea
							rows={2}
							value={form.complications}
							onChange={event => setField("complications", event.target.value)}
							placeholder="Note any intraoperative complications..."
							disabled={fieldsDisabled}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Fluid Balance and Times</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="space-y-1.5">
						<Label>EBL (mL)</Label>
						<Input
							type="number"
							min={0}
							value={form.estimatedBloodLoss}
							onChange={event => setField("estimatedBloodLoss", event.target.value)}
							placeholder="0"
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Fluid In (mL)</Label>
						<Input
							type="number"
							min={0}
							value={form.fluidIn}
							onChange={event => setField("fluidIn", event.target.value)}
							placeholder="0"
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Fluid Out (mL)</Label>
						<Input
							type="number"
							min={0}
							value={form.fluidOut}
							onChange={event => setField("fluidOut", event.target.value)}
							placeholder="0"
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="col-span-full grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label>Incision Time</Label>
							<Input
								type="datetime-local"
								value={form.incisionDatetime}
								onChange={event => setField("incisionDatetime", event.target.value)}
								disabled={fieldsDisabled}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Closure Time</Label>
							<Input
								type="datetime-local"
								value={form.closureDatetime}
								onChange={event => setField("closureDatetime", event.target.value)}
								disabled={fieldsDisabled}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Surgical Team</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label>Assigned Surgeon</Label>
						<Input value={surgeonName} disabled />
					</div>
					<div className="space-y-1.5">
						<Label>1st Assistant</Label>
						<StaffSearchCombobox
							id="first-assistant"
							value={form.firstAssistantStaffId}
							onChange={value => setField("firstAssistantStaffId", value)}
							options={staffOptions}
							placeholder="Search by name or department"
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>2nd Assistant</Label>
						<StaffSearchCombobox
							id="second-assistant"
							value={form.secondAssistantStaffId}
							onChange={value => setField("secondAssistantStaffId", value)}
							options={staffOptions}
							placeholder="Search by name or department"
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Scrub Nurse</Label>
						<StaffSearchCombobox
							id="scrub-nurse"
							value={form.scrubNurseStaffId}
							onChange={value => setField("scrubNurseStaffId", value)}
							options={staffOptions}
							placeholder="Search by name or department"
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Circulating Nurse</Label>
						<StaffSearchCombobox
							id="circulating-nurse"
							value={form.circulatingNurseStaffId}
							onChange={value => setField("circulatingNurseStaffId", value)}
							options={staffOptions}
							placeholder="Search by name or department"
							disabled={fieldsDisabled}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Anesthesiologist</Label>
						<StaffSearchCombobox
							id="anesthesiologist"
							value={form.anesthesiologistStaffId}
							onChange={value => setField("anesthesiologistStaffId", value)}
							options={staffOptions}
							placeholder="Search by name or department"
							disabled={fieldsDisabled}
						/>
					</div>
					{staffDirectory.isLoading ? (
						<div className="text-muted-foreground col-span-full flex items-center gap-2 text-sm">
							<Loader2 className="size-4 animate-spin" />
							Loading facility staff directory...
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Surgical Safety Counts</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center gap-3">
						<Checkbox
							id="instrument-count"
							checked={form.instrumentCountCorrect}
							onCheckedChange={value => setField("instrumentCountCorrect", !!value)}
							disabled={fieldsDisabled}
						/>
						<Label htmlFor="instrument-count">Instrument count correct</Label>
					</div>
					<div className="flex items-center gap-3">
						<Checkbox
							id="swab-count"
							checked={form.swabCountCorrect}
							onCheckedChange={value => setField("swabCountCorrect", !!value)}
							disabled={fieldsDisabled}
						/>
						<Label htmlFor="swab-count">Swab or sponge count correct</Label>
					</div>
				</CardContent>
			</Card>

			{save.isError ? (
				<p className="text-destructive text-sm">
					{save.error instanceof Error ? save.error.message : "Unable to save operation record."}
				</p>
			) : null}
			{sign.isError ? (
				<p className="text-destructive text-sm">
					{sign.error instanceof Error ? sign.error.message : "Unable to sign operation record."}
				</p>
			) : null}

			<Separator />

			{canSign && !isSigned && signChecklistMissing.length > 0 ? (
				<p className="text-muted-foreground text-sm">
					Complete these fields before signing: {signChecklistMissing.join(", ")}.
				</p>
			) : null}

			<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
				<Button
					variant="outline"
					onClick={() => {
						void handleSave()
					}}
					disabled={!canSubmit || !canEdit || isSigned || sign.isPending}
				>
					<Save className="mr-2 size-4" />
					{save.isPending ? "Saving..." : "Save Operation Record"}
				</Button>
				{canSign ? (
					<Button
						onClick={() => {
							void handleSign()
						}}
						disabled={
							!canSignRecord || sign.isPending || (canEdit && !canSubmit) || (!canEdit && !existing)
						}
					>
						<Signature className="mr-2 size-4" />
						{sign.isPending ? "Signing..." : isSigned ? "Signed" : "Sign Operation Record"}
					</Button>
				) : null}
			</div>
		</div>
	)
}
