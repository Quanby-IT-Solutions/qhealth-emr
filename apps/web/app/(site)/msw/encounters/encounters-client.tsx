"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Clock, HeartHandshake, Search, XCircle } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { useMswEvaluationListQuery } from "@/features/msw/assessment-coe/api/assessment.hooks"

type StatusFilter = "all" | "pending" | "in_progress" | "completed" | "cancelled"

const STATUS_LABELS: Record<string, string> = {
	pending: "Pending",
	in_progress: "In Progress",
	completed: "Completed",
	cancelled: "Cancelled",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	pending: "secondary",
	in_progress: "default",
	completed: "outline",
	cancelled: "destructive",
}

function StatusIcon({ status }: { status: string }) {
	if (status === "completed") return <CheckCircle2 className="text-muted-foreground size-4" />
	if (status === "cancelled") return <XCircle className="text-destructive size-4" />
	return <Clock className="text-muted-foreground size-4" />
}

function formatDate(d: Date | string) {
	return new Date(d).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	})
}

type Evaluation = {
	id: string
	encounterId: string
	patientName: string | null
	patientMrn: string | null
	status: string
	coeIssued: boolean
	createdAt: Date | string
}

function EvaluationRow({ ev }: { ev: Evaluation }) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between py-3">
				<div className="flex items-center gap-3">
					<StatusIcon status={ev.status} />
					<div>
						<p className="text-sm font-medium">
							{ev.patientName ?? "Unknown Patient"}
							{ev.patientMrn && (
								<span className="text-muted-foreground ml-2 font-normal">MRN {ev.patientMrn}</span>
							)}
						</p>
						<p className="text-muted-foreground text-xs">
							Encounter {ev.encounterId.slice(0, 8)} · {formatDate(ev.createdAt)}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{ev.coeIssued && (
						<Badge variant="outline" className="text-xs">
							CoE Issued
						</Badge>
					)}
					<Badge variant={STATUS_VARIANTS[ev.status] ?? "secondary"} className="text-xs">
						{STATUS_LABELS[ev.status] ?? ev.status}
					</Badge>
					<Link href={`/msw/encounters/${ev.encounterId}/assessment`}>
						<Button variant="ghost" size="icon" className="size-8" title="Open assessment">
							<ArrowRight className="size-4" />
						</Button>
					</Link>
				</div>
			</CardHeader>
		</Card>
	)
}

export function EncountersClient() {
	const [search, setSearch] = useState("")
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

	const { data, isLoading } = useMswEvaluationListQuery({ page: 1, limit: 25 })
	const evaluations = data?.data ?? []

	const filtered = evaluations.filter(ev => {
		if (statusFilter !== "all" && ev.status !== statusFilter) return false
		if (search.trim()) {
			const q = search.toLowerCase()
			return (
				ev.patientName?.toLowerCase().includes(q) ||
				ev.patientMrn?.toLowerCase().includes(q) ||
				ev.encounterId.toLowerCase().includes(q)
			)
		}
		return true
	})

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<HeartHandshake className="text-primary size-5" />
				<div>
					<h1 className="text-xl font-semibold">Assessment & CoE Queue</h1>
					<p className="text-muted-foreground text-sm">Story 12.8 · Flow L8</p>
				</div>
			</div>

			<div className="flex flex-wrap gap-3">
				<div className="relative min-w-[200px] flex-1">
					<Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
					<Input
						placeholder="Search by patient name, MRN, or encounter ID…"
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
					<SelectTrigger className="w-[160px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						<SelectItem value="pending">Pending</SelectItem>
						<SelectItem value="in_progress">In Progress</SelectItem>
						<SelectItem value="completed">Completed</SelectItem>
						<SelectItem value="cancelled">Cancelled</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{isLoading ? (
				<Card>
					<CardContent className="text-muted-foreground py-8 text-center text-sm">
						Loading assessments…
					</CardContent>
				</Card>
			) : filtered.length === 0 ? (
				<Card>
					<CardContent className="text-muted-foreground py-8 text-center text-sm">
						{evaluations.length === 0
							? "No assessments found. Evaluations are created from patient encounter MSW tabs."
							: "No assessments match the current filters."}
					</CardContent>
				</Card>
			) : (
				<div className="space-y-2">
					{filtered.map(ev => (
						<EvaluationRow key={ev.id} ev={ev} />
					))}
				</div>
			)}

			<div className="text-muted-foreground pt-1 text-xs">
				{filtered.length} assessment{filtered.length !== 1 ? "s" : ""} shown
				{statusFilter !== "all" && ` · ${STATUS_LABELS[statusFilter]} filter active`}
			</div>
		</div>
	)
}
