"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { useLoincSearchQuery, type LoincCode } from "@/features/formulary/api/formulary.hooks"
import { useCreateLabOrderMutation } from "@/features/orders/api/orders.hooks"
import {
	useIcd10ProblemSearchQuery,
	type Icd10SearchResult,
} from "@/features/problems-allergies/api/problems-allergies.hooks"

type OrderPriority = "routine" | "urgent" | "stat"

interface CreateLabOrderDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	encounterId: string
	facilityId: string
}

export interface DiagnosisEntry {
	code: string
	description: string
}

function loincDisplayName(result: LoincCode) {
	return result.longCommonName || result.component || result.loincNum
}

function LoincTestPicker({
	value,
	onSelect,
}: {
	value: string
	onSelect: (result: LoincCode | null) => void
}) {
	const [open, setOpen] = useState(false)
	const query = useLoincSearchQuery({
		search: value.trim(),
		limit: 10,
	})
	const results = open ? (query.data?.data ?? []) : []

	function closeSearchAfterSelectionChance() {
		window.setTimeout(() => setOpen(false), 100)
	}

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-2">
				<Label htmlFor="labTestName">Test Name *</Label>
				<Badge variant="secondary" className="text-xs">
					LOINC optional
				</Badge>
			</div>
			<p className="text-muted-foreground text-xs">
				Search the active lab catalog or type a custom lab test name.
			</p>
			<div className="relative z-30">
				<Input
					id="labTestName"
					value={value}
					onChange={event => {
						onSelect({
							id: "",
							loincNum: "",
							component: event.target.value,
							property: null,
							timeAspect: null,
							system: null,
							scale: null,
							method: null,
							longCommonName: event.target.value,
							isActive: true,
							createdAt: new Date(),
						})
						setOpen(true)
					}}
					onFocus={() => setOpen(true)}
					onBlur={closeSearchAfterSelectionChance}
					onKeyDown={event => {
						if (event.key === "Escape") setOpen(false)
						if (event.key === "Enter" && results[0]) {
							event.preventDefault()
							onSelect(results[0])
							setOpen(false)
						}
					}}
					placeholder="Search lab test, e.g. Complete Blood Count"
					autoComplete="off"
				/>
				{open && (
					<div className="bg-popover text-popover-foreground ring-foreground/10 absolute z-[100] mt-1 max-h-64 w-full overflow-y-auto rounded-md border p-1 text-sm shadow-md ring-1">
						{query.isFetching ? (
							<div className="text-muted-foreground px-3 py-3">Searching lab catalog...</div>
						) : results.length > 0 ? (
							results.map(result => (
								<button
									key={result.id}
									type="button"
									className="hover:bg-muted focus:bg-muted block w-full rounded-sm px-3 py-2 text-left outline-hidden"
									onMouseDown={event => event.preventDefault()}
									onClick={() => {
										onSelect(result)
										setOpen(false)
									}}
								>
									<span className="block font-medium">{loincDisplayName(result)}</span>
									<span className="text-muted-foreground block text-xs">
										LOINC {result.loincNum}
										{result.system ? ` - ${result.system}` : ""}
									</span>
								</button>
							))
						) : (
							<div className="text-muted-foreground px-3 py-3">
								No active lab test found. Continue with the typed test name if needed.
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

export function Icd10IndicationPicker({
	value,
	onChange,
}: {
	value: DiagnosisEntry | null
	onChange: (value: DiagnosisEntry | null) => void
}) {
	const [open, setOpen] = useState(false)
	const [inputValue, setInputValue] = useState("")
	const query = useIcd10ProblemSearchQuery({
		search: inputValue.trim(),
		limit: 10,
		includeEmptySearch: open,
	})
	const results = query.data?.data ?? []

	function selectResult(result: Icd10SearchResult) {
		onChange({ code: result.code, description: result.description })
		setInputValue("")
		setOpen(false)
	}

	function closeSearchAfterSelectionChance() {
		window.setTimeout(() => setOpen(false), 100)
	}

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-2">
				<Label>ICD-10 Code / Diagnosis</Label>
				<Badge variant="secondary" className="text-xs">
					Optional
				</Badge>
			</div>
			<div className="relative z-20">
				<Input
					value={inputValue}
					onChange={event => {
						setInputValue(event.target.value)
						setOpen(true)
					}}
					onFocus={() => setOpen(true)}
					onBlur={closeSearchAfterSelectionChance}
					onKeyDown={event => {
						if (event.key === "Escape") setOpen(false)
						if (event.key === "Enter" && results[0]) {
							event.preventDefault()
							selectResult(results[0])
						}
					}}
					placeholder="Search diagnosis or ICD-10 code..."
					autoComplete="off"
				/>
				{open && (
					<div className="bg-popover text-popover-foreground ring-foreground/10 absolute z-[100] mt-1 max-h-64 w-full overflow-y-auto rounded-md border p-1 text-sm shadow-md ring-1">
						{query.isFetching ? (
							<div className="text-muted-foreground px-3 py-3">Searching ICD-10...</div>
						) : results.length > 0 ? (
							results.map(result => (
								<button
									key={result.id}
									type="button"
									className="hover:bg-muted focus:bg-muted block w-full rounded-sm px-3 py-2 text-left outline-hidden"
									onMouseDown={event => event.preventDefault()}
									onClick={() => selectResult(result)}
								>
									<span className="block font-mono text-xs font-semibold">{result.code}</span>
									<span className="block">{result.description}</span>
								</button>
							))
						) : (
							<div className="text-muted-foreground px-3 py-3">
								No ICD-10 matches. Use the clinical indication text if needed.
							</div>
						)}
					</div>
				)}
			</div>
			{value && (
				<div className="bg-primary/5 border-primary/20 flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
					<p className="min-w-0">
						<span className="font-mono text-xs font-semibold">{value.code}</span>
						<span className="text-muted-foreground"> - {value.description}</span>
					</p>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						className="size-7 shrink-0"
						aria-label={`Remove ${value.code}`}
						onClick={() => onChange(null)}
					>
						<X className="size-3" />
					</Button>
				</div>
			)}
		</div>
	)
}

export function CreateLabOrderDialog({
	open,
	onOpenChange,
	encounterId,
	facilityId,
}: CreateLabOrderDialogProps) {
	const [testName, setTestName] = useState("")
	const [panelName, setPanelName] = useState("")
	const [loincCode, setLoincCode] = useState("")
	const [panelCode, setPanelCode] = useState("")
	const [specimenType, setSpecimenType] = useState("")
	const [clinicalIndication, setClinicalIndication] = useState("")
	const [indicationDiagnosis, setIndicationDiagnosis] = useState<DiagnosisEntry | null>(null)
	const [priority, setPriority] = useState<OrderPriority>("routine")

	const createLabOrder = useCreateLabOrderMutation()

	function resetForm() {
		setTestName("")
		setPanelName("")
		setLoincCode("")
		setPanelCode("")
		setSpecimenType("")
		setClinicalIndication("")
		setIndicationDiagnosis(null)
		setPriority("routine")
	}

	function handleOpenChange(next: boolean) {
		if (!next) resetForm()
		onOpenChange(next)
	}

	function handleSubmit() {
		if (!canSubmit) return

		createLabOrder.mutate(
			{
				facilityId,
				encounterId,
				testName: testName.trim(),
				panelName: panelName.trim() || undefined,
				loincCode: loincCode.trim() || undefined,
				panelCode: panelCode.trim() || undefined,
				specimenType: specimenType.trim() || undefined,
				clinicalIndication: clinicalIndication.trim(),
				indicationIcd10Code: indicationDiagnosis?.code,
				indicationIcd10Display: indicationDiagnosis?.description,
				priority,
			},
			{
				onSuccess: () => handleOpenChange(false),
			}
		)
	}

	function handleLoincSelect(result: LoincCode | null) {
		if (!result) return
		setTestName(loincDisplayName(result))
		setLoincCode(result.loincNum)
		setPanelName("")
		setPanelCode("")
		setSpecimenType(result.system ?? "")
	}

	const canSubmit = Boolean(
		testName.trim() && clinicalIndication.trim() && !createLabOrder.isPending
	)

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>New Lab Order</DialogTitle>
					<DialogDescription>Enter the lab test details.</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<LoincTestPicker value={testName} onSelect={handleLoincSelect} />

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="labLoincCode">LOINC Code</Label>
							<Input
								id="labLoincCode"
								value={loincCode}
								readOnly
								placeholder="Optional; filled when a catalog test is selected"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="labSpecimenType">Specimen Type</Label>
							<Input
								id="labSpecimenType"
								value={specimenType}
								onChange={e => setSpecimenType(e.target.value)}
								placeholder="e.g., Blood, Urine"
							/>
						</div>
					</div>

					{(panelName || panelCode) && (
						<div className="bg-muted/40 grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2">
							{panelName && (
								<div>
									<div className="text-muted-foreground text-xs">Panel Name</div>
									<div className="font-medium">{panelName}</div>
								</div>
							)}
							{panelCode && (
								<div>
									<div className="text-muted-foreground text-xs">Panel Code</div>
									<div className="font-mono text-xs font-semibold">{panelCode}</div>
								</div>
							)}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="labClinicalIndication">Clinical Indication</Label>
						<Textarea
							id="labClinicalIndication"
							value={clinicalIndication}
							onChange={e => setClinicalIndication(e.target.value)}
							rows={2}
							placeholder="Medical necessity for the requested lab"
						/>
					</div>

					<Icd10IndicationPicker value={indicationDiagnosis} onChange={setIndicationDiagnosis} />

					<div className="space-y-2">
						<Label htmlFor="labPriority">Priority</Label>
						<Select
							value={priority}
							onValueChange={v => setPriority((v ?? "routine") as OrderPriority)}
						>
							<SelectTrigger id="labPriority">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="routine">Routine</SelectItem>
								<SelectItem value="urgent">Urgent</SelectItem>
								<SelectItem value="stat">STAT</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancel
					</Button>
					<Button disabled={!canSubmit} onClick={handleSubmit}>
						{createLabOrder.isPending ? "Signing..." : "Sign Lab Order"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
