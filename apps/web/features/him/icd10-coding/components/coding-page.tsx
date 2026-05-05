"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/core/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { Textarea } from "@/core/components/ui/textarea"

import { ErrorState, SkeletonRows } from "@/features/admin/components/state-views"
import { HimEncounterContextBar } from "@/features/him/components/him-encounter-context-bar"
import {
	useAmendCodesMutation,
	useEncounterCodesQuery,
	useSignCodesMutation,
	useUpsertCodesMutation,
	useValidateCodesQuery,
} from "../api/coding.hooks"
import { CodeLookupPage } from "./code-lookup-page"

interface CodingPageProps {
	encounterId: string
}

interface EditorCodeRow {
	clientId: string
	id?: string
	code: string
	display: string
	isPrimary: boolean
	linkedDiagnosisRef: string
	notes: string
}

function createEditorRow(partial?: Partial<EditorCodeRow>): EditorCodeRow {
	return {
		clientId: partial?.clientId ?? crypto.randomUUID(),
		id: partial?.id,
		code: partial?.code ?? "",
		display: partial?.display ?? "",
		isPrimary: partial?.isPrimary ?? false,
		linkedDiagnosisRef: partial?.linkedDiagnosisRef ?? "",
		notes: partial?.notes ?? "",
	}
}

function formatTimestamp(value: Date | string | null | undefined) {
	if (!value) return "Pending"
	return new Date(value).toLocaleString("en-PH")
}

export function CodingPage({ encounterId }: CodingPageProps) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const { data, isLoading, isError, refetch, error } = useEncounterCodesQuery(encounterId)
	const { data: validation } = useValidateCodesQuery(encounterId)
	const { mutate: upsert, isPending: saving } = useUpsertCodesMutation()
	const { mutate: sign, isPending: signing, error: signError } = useSignCodesMutation()
	const { mutate: amend, isPending: amending } = useAmendCodesMutation()

	const [editorRows, setEditorRows] = useState<EditorCodeRow[]>([])
	const [amendOpen, setAmendOpen] = useState(false)
	const [lookupOpen, setLookupOpen] = useState(false)
	const [sourceDrawerOpen, setSourceDrawerOpen] = useState(false)
	const [activeLookupRowId, setActiveLookupRowId] = useState<string | null>(null)
	const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
	const [amendReason, setAmendReason] = useState("")

	const isSigned = !!data?.signedAt
	const documentedDiagnoses = useMemo(() => data?.documentedDiagnoses ?? [], [data?.documentedDiagnoses])
	const versionHistory = data?.versionHistory ?? []
	const diagnosisMap = useMemo(() => new Map(documentedDiagnoses.map(diagnosis => [diagnosis.id, diagnosis])), [documentedDiagnoses])
	const activeSource = activeSourceId ? diagnosisMap.get(activeSourceId) ?? null : null
	const savedBlockingViolations = validation?.violations.filter(violation => violation.path !== "ahsr") ?? []
	const ahsrViolations = validation?.violations.filter(violation => violation.path === "ahsr") ?? []
	const codedRows = editorRows.filter(row => row.code.trim().length > 0)
	const primaryCount = codedRows.filter(row => row.isPrimary).length

	useEffect(() => {
		if (!data) return
		// eslint-disable-next-line react-hooks/set-state-in-effect -- syncing server-fetched codes into local editor state is intentional
		setEditorRows(
			data.codes.map(code =>
				createEditorRow({
					clientId: code.id,
					id: code.id,
					code: code.code,
					display: code.display ?? "",
					isPrimary: code.isPrimary,
					linkedDiagnosisRef: code.linkedDiagnosisRef ?? "",
					notes: code.notes ?? "",
				})
			)
		)
	}, [data])

	useEffect(() => {
		const addCode = searchParams.get("addCode")
		if (!addCode) return

		const addDisplay = searchParams.get("addDisplay") ?? ""
		const targetRow = searchParams.get("targetRow")

		// eslint-disable-next-line react-hooks/set-state-in-effect -- syncing URL params into local editor state is intentional
		setEditorRows(prev => {
			if (targetRow && prev.some(row => row.clientId === targetRow)) {
				return prev.map(row =>
					row.clientId === targetRow ? { ...row, code: addCode, display: addDisplay } : row
				)
			}

			return [...prev, createEditorRow({ code: addCode, display: addDisplay })]
		})

		const params = new URLSearchParams(searchParams.toString())
		params.delete("addCode")
		params.delete("addDisplay")
		params.delete("targetRow")
		router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname, { scroll: false })
	}, [pathname, router, searchParams])

	const handleAddRow = useCallback((diagnosisId?: string) => {
		setEditorRows(prev => [...prev, createEditorRow({ linkedDiagnosisRef: diagnosisId ?? "" })])
	}, [])

	const handleLookupSelection = useCallback((selection: { code: string; display: string }) => {
		setEditorRows(prev => {
			if (!activeLookupRowId) {
				return [...prev, createEditorRow({ code: selection.code, display: selection.display })]
			}

			return prev.map(row =>
				row.clientId === activeLookupRowId ? { ...row, code: selection.code, display: selection.display } : row
			)
		})
		setLookupOpen(false)
		setActiveLookupRowId(null)
	}, [activeLookupRowId])

	const handleSave = useCallback(() => {
		upsert({
			encounterId,
			codes: codedRows.map(row => ({
				id: row.id,
				code: row.code,
				display: row.display || undefined,
				isPrimary: row.isPrimary,
				linkedDiagnosisRef: row.linkedDiagnosisRef || undefined,
				notes: row.notes || undefined,
			})),
		})
	}, [codedRows, encounterId, upsert])

	if (isLoading) return <SkeletonRows count={5} className="p-6" />
	if (isError) return <ErrorState error={error} retry={refetch} />

	return (
		<div className="space-y-3">
			<HimEncounterContextBar encounterId={encounterId} />
			<div className="space-y-4 px-4 py-3">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<h1 className="text-lg font-semibold">ICD-10 Coding Workspace</h1>
						<p className="text-xs text-muted-foreground">Encounter {encounterId}</p>
					</div>
					<div className="flex items-center gap-2">
						{isSigned ? <Badge>Signed v{data?.currentVersion ?? 1}</Badge> : <Badge variant="secondary">Draft v{data?.currentVersion ?? 1}</Badge>}
					</div>
				</div>

				{savedBlockingViolations.length > 0 && (
					<Alert variant="destructive">
						<AlertTitle>Validation blockers</AlertTitle>
						<AlertDescription>
							<ul className="ml-4 list-disc space-y-1 text-xs">
								{savedBlockingViolations.map(violation => (
									<li key={`${violation.path}-${violation.code ?? violation.message}`}>{violation.message}</li>
								))}
							</ul>
						</AlertDescription>
					</Alert>
				)}

				{ahsrViolations.length > 0 && (
					<Alert>
						<AlertTitle>AHSR alignment warning</AlertTitle>
						<AlertDescription className="text-sm">{ahsrViolations[0]?.message}</AlertDescription>
					</Alert>
				)}

				<div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]">
					<div className="space-y-4">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Documented Diagnoses</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{documentedDiagnoses.length === 0 ? (
									<p className="text-sm text-muted-foreground">No finalized diagnoses were found in signed notes or the problem list.</p>
								) : (
									documentedDiagnoses.map(diagnosis => (
										<div key={diagnosis.id} className="rounded-lg border p-3">
											<div className="flex items-start justify-between gap-3">
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<p className="text-sm font-medium">{diagnosis.diagnosis}</p>
														{diagnosis.isPrimary && <Badge className="text-[10px]">Primary</Badge>}
													</div>
													<p className="text-xs text-muted-foreground">
														{diagnosis.sourceLabel}
														{diagnosis.icdCode ? ` • Suggested ${diagnosis.icdCode}` : ""}
													</p>
													{diagnosis.noteExcerpt && <p className="text-xs text-muted-foreground">{diagnosis.noteExcerpt}</p>}
												</div>
												<Button variant="outline" size="sm" onClick={() => handleAddRow(diagnosis.id)} disabled={isSigned}>
													Create row
												</Button>
											</div>
										</div>
									))
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Coding History</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="rounded-lg border border-dashed p-3 text-sm">
									<p className="font-medium">Current workspace</p>
									<p className="text-xs text-muted-foreground">Version {data?.currentVersion ?? 1} {isSigned ? "is locked for billing." : "is editable until signed."}</p>
								</div>
								{versionHistory.length === 0 ? (
									<p className="text-sm text-muted-foreground">No prior signed versions yet.</p>
								) : (
									versionHistory.map(version => (
										<div key={version.id} className="rounded-lg border p-3 text-sm">
											<div className="flex items-center justify-between gap-3">
												<p className="font-medium">Version {version.version}</p>
												<Badge variant="outline">{version.replacedAt ? "Superseded" : "Signed"}</Badge>
											</div>
											<p className="mt-1 text-xs text-muted-foreground">Created {formatTimestamp(version.createdAt)}</p>
											{version.replacedAt && <p className="text-xs text-muted-foreground">Replaced {formatTimestamp(version.replacedAt)}</p>}
											{version.amendmentReason && <p className="mt-2 text-xs">Reason: {version.amendmentReason}</p>}
										</div>
									))
								)}
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader className="pb-3">
							<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
								<div>
									<CardTitle className="text-base">Assigned Codes</CardTitle>
									<p className="text-xs text-muted-foreground">Primary slot is single. Secondary codes can be multiple.</p>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<Button variant="outline" size="sm" onClick={() => handleAddRow()} disabled={isSigned}>+ Add row</Button>
									<Button variant="outline" size="sm" onClick={() => { setActiveLookupRowId(null); setLookupOpen(true) }} disabled={isSigned}>Lookup code</Button>
									{!isSigned ? (
										<>
											<Button size="sm" onClick={handleSave} disabled={saving || editorRows.length === 0}>{saving ? "Saving…" : "Save"}</Button>
											<Button onClick={() => sign({ encounterId })} disabled={signing || codedRows.length === 0 || primaryCount !== 1 || savedBlockingViolations.length > 0}>{signing ? "Signing…" : "Sign Coding"}</Button>
										</>
									) : (
										<Button size="sm" variant="outline" onClick={() => setAmendOpen(true)}>Amend</Button>
									)}
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-28">Slot</TableHead>
										<TableHead className="w-40">Code</TableHead>
										<TableHead>Description</TableHead>
										<TableHead className="w-64">Source</TableHead>
										<TableHead className="w-64">Notes</TableHead>
										<TableHead className="w-28 text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{editorRows.length === 0 && (
										<TableRow>
											<TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No code rows yet. Start from a documented diagnosis or add a blank row.</TableCell>
										</TableRow>
									)}
									{editorRows.map(row => {
										const linkedDiagnosis = row.linkedDiagnosisRef ? diagnosisMap.get(row.linkedDiagnosisRef) ?? null : null

										return (
											<TableRow key={row.clientId}>
												<TableCell>
													<div className="space-y-2">
														<Badge variant={row.isPrimary ? "default" : "secondary"}>{row.isPrimary ? "Primary" : "Secondary"}</Badge>
														{!isSigned && <Button variant="ghost" size="sm" onClick={() => setEditorRows(prev => prev.map(item => ({ ...item, isPrimary: item.clientId === row.clientId })))}>Make primary</Button>}
													</div>
												</TableCell>
												<TableCell>
													<div className="space-y-2">
														<Input value={row.code} onChange={event => setEditorRows(prev => prev.map(item => item.clientId === row.clientId ? { ...item, code: event.target.value } : item))} placeholder="J18.9" className="font-mono text-xs" disabled={isSigned} />
														{!isSigned && <Button variant="ghost" size="sm" onClick={() => { setActiveLookupRowId(row.clientId); setLookupOpen(true) }}>Lookup</Button>}
													</div>
												</TableCell>
												<TableCell>
													<Input value={row.display} onChange={event => setEditorRows(prev => prev.map(item => item.clientId === row.clientId ? { ...item, display: event.target.value } : item))} placeholder="Search or confirm code description" className="text-xs" disabled={isSigned} />
												</TableCell>
												<TableCell>
													<div className="space-y-2">
														<Select value={row.linkedDiagnosisRef || "none"} onValueChange={value => setEditorRows(prev => prev.map(item => item.clientId === row.clientId ? { ...item, linkedDiagnosisRef: !value || value === "none" ? "" : value } : item))} disabled={isSigned}>
															<SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
															<SelectContent>
																<SelectItem value="none">Add explanatory note instead</SelectItem>
																{documentedDiagnoses.map(diagnosis => <SelectItem key={diagnosis.id} value={diagnosis.id}>{diagnosis.diagnosis}</SelectItem>)}
															</SelectContent>
														</Select>
														{linkedDiagnosis && <Button variant="ghost" size="sm" onClick={() => { setActiveSourceId(linkedDiagnosis.id); setSourceDrawerOpen(true) }}>View source</Button>}
													</div>
												</TableCell>
												<TableCell>
													<Textarea value={row.notes} onChange={event => setEditorRows(prev => prev.map(item => item.clientId === row.clientId ? { ...item, notes: event.target.value } : item))} placeholder="Explain the coding decision when no direct source diagnosis is linked" className="min-h-20 text-xs" disabled={isSigned} />
												</TableCell>
												<TableCell className="text-right">
													{!isSigned && <Button variant="ghost" size="sm" onClick={() => setEditorRows(prev => prev.filter(item => item.clientId !== row.clientId))}>Remove</Button>}
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>

							{signError && <p className="text-xs text-destructive" role="alert">{(signError as Error).message}</p>}
						</CardContent>
					</Card>
				</div>

				<Dialog open={amendOpen} onOpenChange={setAmendOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Amend Signed Coding</DialogTitle>
							<DialogDescription>Create a new coding version and preserve the prior audit trail.</DialogDescription>
						</DialogHeader>
						<div className="space-y-2">
							<Label htmlFor="amend-reason">Reason</Label>
							<Textarea id="amend-reason" value={amendReason} onChange={event => setAmendReason(event.target.value)} rows={3} placeholder="Coder noted a diagnosis change after chart review…" />
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setAmendOpen(false)}>Cancel</Button>
							<Button
								disabled={!amendReason.trim() || amending}
								onClick={() => amend({ encounterId, reason: amendReason, codes: codedRows.map(row => ({ code: row.code, display: row.display || undefined, isPrimary: row.isPrimary, linkedDiagnosisRef: row.linkedDiagnosisRef || undefined, notes: row.notes || undefined })) }, { onSuccess: () => { setAmendReason(""); setAmendOpen(false) } })}
							>
								{amending ? "Creating version…" : "Confirm Amend"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Sheet open={lookupOpen} onOpenChange={open => { setLookupOpen(open); if (!open) setActiveLookupRowId(null) }}>
					<SheetContent side="right" className="w-full sm:max-w-3xl">
						<SheetHeader>
							<SheetTitle>ICD-10 Code Lookup</SheetTitle>
							<SheetDescription>Search by code prefix or term. Deprecated codes must be replaced before signing.</SheetDescription>
						</SheetHeader>
						<div className="mt-4">
							<CodeLookupPage onSelectCode={handleLookupSelection} />
						</div>
					</SheetContent>
				</Sheet>

				<Sheet open={sourceDrawerOpen} onOpenChange={setSourceDrawerOpen}>
					<SheetContent side="right" className="w-full sm:max-w-xl">
						<SheetHeader>
							<SheetTitle>{activeSource?.sourceLabel ?? "Source detail"}</SheetTitle>
							<SheetDescription>{activeSource?.noteType ?? activeSource?.sourceType ?? "Linked diagnosis source"}</SheetDescription>
						</SheetHeader>
						{activeSource && (
							<div className="mt-4 space-y-4 text-sm">
								<div>
									<p className="font-medium">Diagnosis</p>
									<p className="text-muted-foreground">{activeSource.diagnosis}</p>
								</div>
								{activeSource.icdCode && (
									<div>
										<p className="font-medium">Suggested ICD-10</p>
										<p className="text-muted-foreground">{activeSource.icdCode}</p>
									</div>
								)}
								<div>
									<p className="font-medium">Source excerpt</p>
									<p className="whitespace-pre-wrap text-muted-foreground">{activeSource.noteExcerpt ?? "No source excerpt available."}</p>
								</div>
							</div>
						)}
					</SheetContent>
				</Sheet>
			</div>
		</div>
	)
}
