"use client"

import { useState } from "react"
import { Download, FileText, Search } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { useAnnexSignatureListQuery } from "@/features/msw/annex-signatures/api/annex.hooks"

type AnnexTypeFilter = "all" | "A" | "B"

function formatDate(iso: Date | string) {
	return new Date(iso).toLocaleDateString(undefined, {
		day: "numeric",
		month: "long",
		year: "numeric",
	})
}

type AnnexSig = {
	id: string
	encounterId: string
	annexType: "A" | "B"
	patientSignatureUri: string
	witnessSignatureUri: string | null
	pdfUri: string | null
	signedAt: Date | string
}

function SignedFormRow({ sig }: { sig: AnnexSig }) {
	const handleDownload = () => {
		const uri = sig.pdfUri ?? sig.patientSignatureUri
		const a = document.createElement("a")
		a.href = uri
		a.download = `annex-${sig.annexType}-${sig.id.slice(0, 8)}.png`
		a.click()
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between py-3">
				<div className="flex items-center gap-3">
					<FileText className="text-muted-foreground size-5 shrink-0" />
					<div>
						<p className="text-sm font-medium">
							Annex {sig.annexType} — Encounter {sig.encounterId.slice(0, 8)}
						</p>
						<p className="text-muted-foreground text-xs">{formatDate(sig.signedAt)}</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="outline">Annex {sig.annexType}</Badge>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={handleDownload}
						title="Download"
					>
						<Download className="size-4" />
					</Button>
				</div>
			</CardHeader>
		</Card>
	)
}

export function SignedFormsClient() {
	const [search, setSearch] = useState("")
	const [typeFilter, setTypeFilter] = useState<AnnexTypeFilter>("all")
	const [dateFrom, setDateFrom] = useState("")
	const [dateTo, setDateTo] = useState("")

	const { data, isLoading } = useAnnexSignatureListQuery({})
	const signatures = data ?? []

	const filtered = signatures.filter(s => {
		if (typeFilter !== "all" && s.annexType !== typeFilter) return false
		if (dateFrom) {
			if (new Date(s.signedAt) < new Date(dateFrom)) return false
		}
		if (dateTo) {
			const to = new Date(dateTo)
			to.setHours(23, 59, 59, 999)
			if (new Date(s.signedAt) > to) return false
		}
		if (search.trim()) {
			const q = search.toLowerCase()
			return s.encounterId.toLowerCase().includes(q)
		}
		return true
	})

	return (
		<div className="space-y-4">
			<div>
				<h1 className="text-xl font-semibold">Signed Annex Forms Archive</h1>
				<p className="text-muted-foreground text-sm">Story 12.9 · Flow L9</p>
			</div>

			<div className="flex flex-wrap gap-3">
				<div className="relative min-w-[200px] flex-1">
					<Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
					<Input
						placeholder="Search by encounter ID…"
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={typeFilter} onValueChange={v => setTypeFilter(v as AnnexTypeFilter)}>
					<SelectTrigger className="w-[160px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Annexes</SelectItem>
						<SelectItem value="A">Annex A Only</SelectItem>
						<SelectItem value="B">Annex B Only</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="flex flex-wrap gap-3">
				<div className="space-y-1">
					<Label className="text-muted-foreground text-xs">Date From</Label>
					<Input
						type="date"
						className="w-[160px]"
						value={dateFrom}
						onChange={e => setDateFrom(e.target.value)}
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-muted-foreground text-xs">Date To</Label>
					<Input
						type="date"
						className="w-[160px]"
						value={dateTo}
						onChange={e => setDateTo(e.target.value)}
					/>
				</div>
				{(dateFrom || dateTo) && (
					<div className="flex items-end">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setDateFrom("")
								setDateTo("")
							}}
						>
							Clear dates
						</Button>
					</div>
				)}
			</div>

			{isLoading ? (
				<Card>
					<CardContent className="text-muted-foreground py-8 text-center text-sm">
						Loading signed forms…
					</CardContent>
				</Card>
			) : filtered.length === 0 ? (
				<Card>
					<CardContent className="text-muted-foreground py-8 text-center text-sm">
						{signatures.length === 0
							? "No signed forms found. Capture a signature from an encounter's Annex page."
							: "No forms match the current filters."}
					</CardContent>
				</Card>
			) : (
				<div className="space-y-2">
					{filtered.map(sig => (
						<SignedFormRow key={sig.id} sig={sig} />
					))}
				</div>
			)}

			<div className="text-muted-foreground pt-2 text-xs">
				{filtered.length} form{filtered.length !== 1 ? "s" : ""} shown
				{typeFilter !== "all" && ` · Annex ${typeFilter} filter active`}
			</div>
		</div>
	)
}
