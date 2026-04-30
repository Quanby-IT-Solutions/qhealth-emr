"use client"

import { useMemo, useState } from "react"

import { Loader2, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Separator } from "@/core/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"

import {
	type RvsAssignment,
	type RvsCode,
	type RvsCodeStatus,
	useRemoveRvsAssignmentMutation,
	useRvsAssignmentsQuery,
	useRvsCodeSearchQuery,
	useSuggestRvsCodeMutation,
	useUpdateRvsStatusMutation,
} from "../api/surgical.hooks"

// ── Status badge variants ────────────────────────────────────────────────────

function statusBadge(status: RvsCodeStatus) {
	if (status === "finalized")
		return <Badge variant="default">{formatStatus(status)}</Badge>
	if (status === "validated")
		return <Badge variant="secondary">{formatStatus(status)}</Badge>
	return <Badge variant="outline">{formatStatus(status)}</Badge>
}

function formatStatus(s: RvsCodeStatus) {
	return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Search result row ────────────────────────────────────────────────────────

interface SearchResultRowProps {
	code: RvsCode
	onSuggest: (code: string) => void
	isSuggesting: boolean
	canSuggest?: boolean
}

function SearchResultRow({ code, onSuggest, isSuggesting, canSuggest = true }: SearchResultRowProps) {
	return (
		<TableRow>
			<TableCell className="font-mono text-sm">{code.code}</TableCell>
			<TableCell className="text-sm">{code.description}</TableCell>
			<TableCell className="text-right">
				{canSuggest && (
					<Button
						size="sm"
						variant="outline"
						disabled={isSuggesting}
						onClick={() => onSuggest(code.code)}
					>
						{isSuggesting ? (
							<Loader2 className="size-3.5 animate-spin" />
						) : (
							<Plus className="size-3.5" />
						)}
						Suggest
					</Button>
				)}
			</TableCell>
		</TableRow>
	)
}

// ── Assignment row ───────────────────────────────────────────────────────────

interface AssignmentRowProps {
	assignment: RvsAssignment
	canValidate: boolean
	canFinalize: boolean
	canEdit?: boolean
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
	onUpdateStatus,
	onRemove,
	isUpdating,
	isRemoving,
}: AssignmentRowProps) {
	return (
		<TableRow>
			<TableCell className="font-mono text-sm">{assignment.code}</TableCell>
			<TableCell className="text-sm">{assignment.description}</TableCell>
			<TableCell>{statusBadge(assignment.status)}</TableCell>
			<TableCell className="text-center text-sm">{assignment.modifier ?? "—"}</TableCell>
			<TableCell className="text-center text-sm">{assignment.units ?? 1}</TableCell>
			<TableCell className="text-right">
				<div className="flex items-center justify-end gap-2">
					{assignment.status === "suggested" && canValidate && (
						<Button
							size="sm"
							variant="outline"
							disabled={isUpdating}
							onClick={() => onUpdateStatus(assignment.id, "validated")}
						>
							{isUpdating ? <Loader2 className="size-3.5 animate-spin" /> : null}
							Validate
						</Button>
					)}
					{assignment.status === "validated" && canFinalize && (
						<Button
							size="sm"
							disabled={isUpdating}
							onClick={() => onUpdateStatus(assignment.id, "finalized")}
						>
							{isUpdating ? <Loader2 className="size-3.5 animate-spin" /> : null}
							Finalize
						</Button>
					)}
					{assignment.status !== "finalized" && canEdit && (
						<Button
							size="sm"
							variant="ghost"
							disabled={isRemoving}
							onClick={() => onRemove(assignment.id)}
						>
							<Trash2 className="size-3.5 text-red-500" />
						</Button>
					)}
				</div>
			</TableCell>
		</TableRow>
	)
}

// ── Search panel ─────────────────────────────────────────────────────────────

interface SearchPanelProps {
	caseId: string
	canEdit?: boolean
}

function SearchPanel({ caseId, canEdit = true }: SearchPanelProps) {
	const [query, setQuery] = useState("")
	const debouncedQuery = useDebounce(query, 300)
	const search = useRvsCodeSearchQuery(debouncedQuery.length >= 2 ? debouncedQuery : "")
	const suggest = useSuggestRvsCodeMutation()

	function handleSuggest(code: string) {
		suggest.mutate({ caseId, code })
	}

	return (
		<div className="space-y-3">
			<div>
				<Label htmlFor="rvsSearch" className="mb-1 block text-sm">
					Search RVS/CPT Codes
				</Label>
				<Input
					id="rvsSearch"
					placeholder="Type at least 2 characters (e.g. cholecyst, 47562)…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="max-w-md"
				/>
			</div>

			{debouncedQuery.length >= 2 && (
				<div className="rounded-md border">
					{search.isLoading ? (
						<div className="flex items-center gap-2 p-4 text-sm">
							<Loader2 className="size-4 animate-spin" />
							Searching…
						</div>
					) : search.data && search.data.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Code</TableHead>
									<TableHead>Description</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{search.data.map((code) => (
									<SearchResultRow
										key={code.code}
										code={code}
										onSuggest={handleSuggest}
										canSuggest={canEdit}
										isSuggesting={suggest.isPending && suggest.variables?.code === code.code}
									/>
								))}
							</TableBody>
						</Table>
					) : (
						<p className="text-muted-foreground p-4 text-sm">
							No codes matched &ldquo;{debouncedQuery}&rdquo;.
						</p>
					)}
				</div>
			)}
		</div>
	)
}

// ── Simple debounce hook ─────────────────────────────────────────────────────

function useDebounce<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value)
	useMemo(() => {
		const id = setTimeout(() => setDebounced(value), delayMs)
		return () => clearTimeout(id)
	}, [value, delayMs])
	return debounced
}

// ── Main component ───────────────────────────────────────────────────────────

interface RvsCodeSelectorProps {
	caseId: string
	canEdit?: boolean
	canValidate: boolean
	canFinalize: boolean
}

export function RvsCodeSelector({ caseId, canEdit = true, canValidate, canFinalize }: RvsCodeSelectorProps) {
	const assignments = useRvsAssignmentsQuery(caseId)
	const updateStatus = useUpdateRvsStatusMutation()
	const remove = useRemoveRvsAssignmentMutation()

	const finalizedTotal = useMemo(() => {
		return (assignments.data ?? [])
			.filter((a) => a.status === "finalized")
			.reduce((sum, a) => sum + (a.units ?? 1), 0)
	}, [assignments.data])

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
						{finalizedTotal > 0 && (
							<Badge variant="default">
								{finalizedTotal} finalized unit{finalizedTotal !== 1 ? "s" : ""}
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<SearchPanel caseId={caseId} canEdit={canEdit} />
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
							Loading assignments…
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
										<TableHead>Code</TableHead>
										<TableHead>Description</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-center">Modifier</TableHead>
										<TableHead className="text-center">Units</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{assignments.data.map((assignment) => (
										<AssignmentRow
											key={assignment.id}
											assignment={assignment}
											canEdit={canEdit}
											canValidate={canValidate}
											canFinalize={canFinalize}
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
									{assignments.data.filter((a) => a.status === "suggested").length}
								</span>
								<span>
									Validated:{" "}
									{assignments.data.filter((a) => a.status === "validated").length}
								</span>
								<span className="font-medium text-foreground">
									Finalized:{" "}
									{assignments.data.filter((a) => a.status === "finalized").length}
								</span>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
