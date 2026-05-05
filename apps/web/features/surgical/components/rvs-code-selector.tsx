"use client"

import { useEffect, useMemo, useState } from "react"

import { Loader2, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Separator } from "@/core/components/ui/separator"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

import {
	type OperationRecord,
	type RvsAssignment,
	type RvsAssignmentType,
	type RvsCode,
	type RvsCodeStatus,
	useRemoveRvsAssignmentMutation,
	useRvsAssignmentsQuery,
	useRvsCodeSearchQuery,
	useSuggestRvsCodeMutation,
	useUpdateRvsStatusMutation,
} from "../api/surgical.hooks"
import { detectProcedures, normalizeProcedureLabel } from "../lib/procedure-mapping"

interface ProcedureCoverage {
	label: string
	primaryCount: number
	adjunctCount: number
	isReady: boolean
}

function statusBadge(status: RvsCodeStatus) {
	if (status === "finalized") {
		return <Badge variant="default">{formatStatus(status)}</Badge>
	}
	if (status === "validated") {
		return <Badge variant="secondary">{formatStatus(status)}</Badge>
	}
	return <Badge variant="outline">{formatStatus(status)}</Badge>
}

function formatStatus(status: RvsCodeStatus) {
	return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatAssignmentType(type: RvsAssignmentType) {
	return type === "primary" ? "Primary" : "Adjunct"
}

interface SearchResultRowProps {
	code: RvsCode
	onSuggest: (rvsCodeId: string) => void
	isSuggesting: boolean
	canSuggest: boolean
}

function SearchResultRow({
	code,
	onSuggest,
	isSuggesting,
	canSuggest,
}: SearchResultRowProps) {
	return (
		<TableRow>
			<TableCell className="font-mono text-sm">{code.code}</TableCell>
			<TableCell className="text-sm">{code.description}</TableCell>
			<TableCell className="text-right">
				<Button
					size="sm"
					variant="outline"
					disabled={!canSuggest || isSuggesting}
					onClick={() => onSuggest(code.id)}
				>
					{isSuggesting ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : (
						<Plus className="size-3.5" />
					)}
					Suggest
				</Button>
			</TableCell>
		</TableRow>
	)
}

interface AssignmentRowProps {
	assignment: RvsAssignment
	canValidate: boolean
	canFinalize: boolean
	canEdit?: boolean
	isOperationRecordSigned: boolean
	defaultProcedureLabel: string | null
	onUpdateStatus: (id: string, status: RvsCodeStatus) => void
	onRemove: (id: string) => void
	isUpdating: boolean
	isRemoving: boolean
}

function AssignmentRow({
	assignment,
	canValidate,
	canFinalize,
	canEdit = true,
	isOperationRecordSigned,
	defaultProcedureLabel,
	onUpdateStatus,
	onRemove,
	isUpdating,
	isRemoving,
}: AssignmentRowProps) {
	const disableMutations = !isOperationRecordSigned
	const procedureLabel = assignment.procedureLabel ?? defaultProcedureLabel ?? "Legacy assignment"

	return (
		<TableRow>
			<TableCell className="text-sm">{procedureLabel}</TableCell>
			<TableCell className="font-mono text-sm">{assignment.code}</TableCell>
			<TableCell className="text-sm">{assignment.description}</TableCell>
			<TableCell className="text-sm">{formatAssignmentType(assignment.assignmentType)}</TableCell>
			<TableCell>{statusBadge(assignment.status)}</TableCell>
			<TableCell className="text-center text-sm">{assignment.modifier ?? "-"}</TableCell>
			<TableCell className="text-center text-sm">{assignment.units ?? 1}</TableCell>
			<TableCell className="text-right">
				<div className="flex items-center justify-end gap-2">
					{assignment.status === "suggested" && canValidate ? (
						<Button
							size="sm"
							variant="outline"
							disabled={disableMutations || isUpdating}
							onClick={() => onUpdateStatus(assignment.id, "validated")}
						>
							{isUpdating ? <Loader2 className="size-3.5 animate-spin" /> : null}
							Validate
						</Button>
					) : null}
					{assignment.status === "validated" && canFinalize ? (
						<Button
							size="sm"
							disabled={disableMutations || isUpdating}
							onClick={() => onUpdateStatus(assignment.id, "finalized")}
						>
							{isUpdating ? <Loader2 className="size-3.5 animate-spin" /> : null}
							Finalize
						</Button>
					) : null}
					{assignment.status !== "finalized" && canEdit ? (
						<Button
							size="sm"
							variant="ghost"
							aria-label={`Remove ${assignment.code}`}
							disabled={disableMutations || isRemoving}
							onClick={() => onRemove(assignment.id)}
						>
							<Trash2 className="size-3.5 text-red-500" />
						</Button>
					) : null}
				</div>
			</TableCell>
		</TableRow>
	)
}

interface SearchPanelProps {
	caseId: string
	canEdit?: boolean
	isOperationRecordSigned: boolean
	procedureCoverage: ProcedureCoverage[]
	selectedProcedureLabel: string
	onSelectProcedure: (value: string) => void
	assignmentType: RvsAssignmentType
	onAssignmentTypeChange: (value: RvsAssignmentType) => void
}

function SearchPanel({
	caseId,
	canEdit = true,
	isOperationRecordSigned,
	procedureCoverage,
	selectedProcedureLabel,
	onSelectProcedure,
	assignmentType,
	onAssignmentTypeChange,
}: SearchPanelProps) {
	const [query, setQuery] = useState("")
	const debouncedQuery = useDebounce(query, 300)
	const search = useRvsCodeSearchQuery(debouncedQuery.length >= 2 ? debouncedQuery : "")
	const suggest = useSuggestRvsCodeMutation()
	const results = search.data?.data ?? []
	const selectedProcedure = procedureCoverage.find(
		procedure =>
			normalizeProcedureLabel(procedure.label) === normalizeProcedureLabel(selectedProcedureLabel)
	)
	const hasPrimaryForSelectedProcedure = (selectedProcedure?.primaryCount ?? 0) > 0
	const canSuggest =
		canEdit &&
		isOperationRecordSigned &&
		!!selectedProcedureLabel &&
		!(assignmentType === "primary" && hasPrimaryForSelectedProcedure)

	function handleSuggest(rvsCodeId: string) {
		if (!selectedProcedureLabel) {
			return
		}

		suggest.mutate({
			caseId,
			rvsCodeId,
			procedureLabel: selectedProcedureLabel,
			assignmentType,
		})
	}

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label className="block text-sm">Procedure Mapping</Label>
				{procedureCoverage.length > 0 ? (
					<div className="grid gap-2 md:grid-cols-2">
						{procedureCoverage.map(procedure => {
							const isSelected =
								normalizeProcedureLabel(procedure.label) ===
								normalizeProcedureLabel(selectedProcedureLabel)

							return (
								<Button
									key={procedure.label}
									type="button"
									variant={isSelected ? "default" : "outline"}
									className="h-auto min-h-16 flex-col items-start justify-start gap-1 px-3 py-2 text-left"
									onClick={() => onSelectProcedure(procedure.label)}
								>
									<span className="w-full truncate font-medium">{procedure.label}</span>
									<span className="text-xs opacity-80">
										{procedure.primaryCount} primary • {procedure.adjunctCount} adjunct
									</span>
									<span className="text-xs opacity-80">
										{procedure.isReady ? "Primary code mapped" : "Primary code still required"}
									</span>
								</Button>
							)
						})}
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						Add at least one performed procedure to the operative record before mapping RVS
						codes.
					</p>
				)}
			</div>

			<div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
				<div>
					<Label htmlFor="rvsSearch" className="mb-1 block text-sm">
						Search RVS/CPT Codes
					</Label>
					<Input
						id="rvsSearch"
						placeholder="Type at least 2 characters (e.g. cholecyst, 47562)..."
						value={query}
						onChange={event => setQuery(event.target.value)}
						className="max-w-md"
					/>
				</div>

				<div>
					<Label className="mb-1 block text-sm">Code Type</Label>
					<Select
						value={assignmentType}
						onValueChange={value => onAssignmentTypeChange(value as RvsAssignmentType)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="primary">Primary</SelectItem>
							<SelectItem value="adjunct">Adjunct</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{selectedProcedure ? (
				<div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
					Mapping to <span className="font-medium">{selectedProcedure.label}</span>.
					{assignmentType === "primary" && hasPrimaryForSelectedProcedure ? (
						<span> A primary code already exists for this procedure, so add an adjunct or remove the current primary first.</span>
					) : null}
				</div>
			) : null}

			{suggest.isError ? (
				<p className="text-destructive text-sm">
					{suggest.error instanceof Error ? suggest.error.message : "Unable to assign RVS code."}
				</p>
			) : null}

			{debouncedQuery.length >= 2 ? (
				<div className="rounded-md border">
					{search.isLoading ? (
						<div className="flex items-center gap-2 p-4 text-sm">
							<Loader2 className="size-4 animate-spin" />
							Searching...
						</div>
					) : results.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Code</TableHead>
									<TableHead>Description</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{results.map(code => (
									<SearchResultRow
										key={code.id}
										code={code}
										onSuggest={handleSuggest}
										canSuggest={canSuggest}
										isSuggesting={
											suggest.isPending && suggest.variables?.rvsCodeId === code.id
										}
									/>
								))}
							</TableBody>
						</Table>
					) : (
						<p className="text-muted-foreground p-4 text-sm">
							No codes matched "{debouncedQuery}".
						</p>
					)}
				</div>
			) : null}
		</div>
	)
}

function useDebounce<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value)

	useEffect(() => {
		const timeoutId = window.setTimeout(() => setDebounced(value), delayMs)
		return () => window.clearTimeout(timeoutId)
	}, [value, delayMs])

	return debounced
}

interface RvsCodeSelectorProps {
	caseId: string
	operationRecord?: Pick<OperationRecord, "procedurePerformed"> | null
	canEdit?: boolean
	canValidate: boolean
	canFinalize: boolean
	isOperationRecordSigned: boolean
}

export function RvsCodeSelector({
	caseId,
	operationRecord,
	canEdit = true,
	canValidate,
	canFinalize,
	isOperationRecordSigned,
}: RvsCodeSelectorProps) {
	const assignments = useRvsAssignmentsQuery(caseId)
	const updateStatus = useUpdateRvsStatusMutation()
	const remove = useRemoveRvsAssignmentMutation()
	const [selectedProcedureLabel, setSelectedProcedureLabel] = useState("")
	const [assignmentType, setAssignmentType] = useState<RvsAssignmentType>("primary")

	const detectedProcedures = useMemo(
		() => detectProcedures(operationRecord?.procedurePerformed),
		[operationRecord?.procedurePerformed]
	)

	const procedureCoverage = useMemo<ProcedureCoverage[]>(() => {
		return detectedProcedures.map(procedure => {
			const relatedAssignments = (assignments.data ?? []).filter(assignment => {
				if (assignment.procedureLabel) {
					return (
						normalizeProcedureLabel(assignment.procedureLabel) ===
						normalizeProcedureLabel(procedure.label)
					)
				}

				return detectedProcedures.length === 1
			})

			const primaryCount = relatedAssignments.filter(
				assignment => assignment.assignmentType === "primary"
			).length
			const adjunctCount = relatedAssignments.filter(
				assignment => assignment.assignmentType === "adjunct"
			).length

			return {
				label: procedure.label,
				primaryCount,
				adjunctCount,
				isReady: primaryCount > 0,
			}
		})
	}, [assignments.data, detectedProcedures])

	const defaultProcedureLabel =
		procedureCoverage.length === 1 ? procedureCoverage[0]?.label ?? null : null

	const finalizedTotal = useMemo(() => {
		return (assignments.data ?? [])
			.filter(assignment => assignment.status === "finalized")
			.reduce((sum, assignment) => sum + (assignment.units ?? 1), 0)
	}, [assignments.data])

	const missingPrimaryCount = procedureCoverage.filter(procedure => !procedure.isReady).length

	useEffect(() => {
		if (procedureCoverage.length === 0) {
			setSelectedProcedureLabel("")
			return
		}

		const selectedStillExists = procedureCoverage.some(
			procedure =>
				normalizeProcedureLabel(procedure.label) ===
				normalizeProcedureLabel(selectedProcedureLabel)
		)

		if (!selectedStillExists) {
			setSelectedProcedureLabel(procedureCoverage[0]!.label)
		}
	}, [procedureCoverage, selectedProcedureLabel])

	function handleUpdateStatus(id: string, status: RvsCodeStatus) {
		updateStatus.mutate({ caseId, assignmentId: id, status })
	}

	function handleRemove(id: string) {
		remove.mutate({ caseId, assignmentId: id })
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">RVS Code Assignment</CardTitle>
						{finalizedTotal > 0 ? (
							<Badge variant="default">
								{finalizedTotal} finalized unit{finalizedTotal !== 1 ? "s" : ""}
							</Badge>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{!isOperationRecordSigned ? (
						<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
							Sign the operative record first. RVS search remains available, but suggesting,
							validating, finalizing, and removing codes stays locked until the record is signed.
						</div>
					) : null}
					{procedureCoverage.length > 0 ? (
						<div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
							{missingPrimaryCount === 0
								? "All listed procedures already have a primary RVS code."
								: `${missingPrimaryCount} procedure${missingPrimaryCount === 1 ? "" : "s"} still need a primary RVS code before surgical billing is ready.`}
						</div>
					) : null}
					<SearchPanel
						caseId={caseId}
						canEdit={canEdit}
						isOperationRecordSigned={isOperationRecordSigned}
						procedureCoverage={procedureCoverage}
						selectedProcedureLabel={selectedProcedureLabel}
						onSelectProcedure={setSelectedProcedureLabel}
						assignmentType={assignmentType}
						onAssignmentTypeChange={setAssignmentType}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Assigned Codes</CardTitle>
				</CardHeader>
				<CardContent>
					{assignments.isLoading ? (
						<div className="flex items-center gap-2 py-4 text-sm">
							<Loader2 className="size-4 animate-spin" />
							Loading assignments...
						</div>
					) : !assignments.data || assignments.data.length === 0 ? (
						<p className="text-muted-foreground py-4 text-center text-sm">
							No codes assigned yet. Use the search above to add codes.
						</p>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Procedure</TableHead>
										<TableHead>Code</TableHead>
										<TableHead>Description</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-center">Modifier</TableHead>
										<TableHead className="text-center">Units</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{assignments.data.map(assignment => (
										<AssignmentRow
											key={assignment.id}
											assignment={assignment}
											canEdit={canEdit}
											canValidate={canValidate}
											canFinalize={canFinalize}
											isOperationRecordSigned={isOperationRecordSigned}
											defaultProcedureLabel={defaultProcedureLabel}
											onUpdateStatus={handleUpdateStatus}
											onRemove={handleRemove}
											isUpdating={
												updateStatus.isPending &&
												updateStatus.variables?.assignmentId === assignment.id
											}
											isRemoving={
												remove.isPending &&
												remove.variables?.assignmentId === assignment.id
											}
										/>
									))}
								</TableBody>
							</Table>

							<Separator className="my-4" />

							<div className="text-muted-foreground flex justify-end gap-4 text-sm">
								<span>
									Suggested:{" "}
									{assignments.data.filter(assignment => assignment.status === "suggested").length}
								</span>
								<span>
									Validated:{" "}
									{assignments.data.filter(assignment => assignment.status === "validated").length}
								</span>
								<span className="font-medium text-foreground">
									Finalized:{" "}
									{assignments.data.filter(assignment => assignment.status === "finalized").length}
								</span>
							</div>
						</>
					)}

					{updateStatus.isError ? (
						<p className="text-destructive mt-4 text-sm">
							{updateStatus.error instanceof Error
								? updateStatus.error.message
								: "Unable to update RVS status."}
						</p>
					) : null}
					{remove.isError ? (
						<p className="text-destructive mt-4 text-sm">
							{remove.error instanceof Error
								? remove.error.message
								: "Unable to remove RVS assignment."}
						</p>
					) : null}
				</CardContent>
			</Card>
		</div>
	)
}
