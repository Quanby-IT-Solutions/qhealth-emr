"use client"

import { useMemo, useState } from "react"

import {
	AlertTriangle,
	BookOpen,
	CheckCircle2,
	Filter,
	Loader2,
	Plus,
	RefreshCw,
	Search,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
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
	SheetHeader,
	SheetTitle,
} from "@/core/components/ui/sheet"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

import { FormularyNoteEditor } from "./formulary-note-editor"

// ============================================================================
// Types
// ============================================================================

export type FormularyStatus = "on_formulary" | "restricted" | "off_formulary"

export interface FormularyItem {
	id: string
	genericName: string
	brandNames: string[]
	drugClass: string
	dosageForms: string[]
	status: FormularyStatus
	restriction?: string
	alternatives?: string[]
	costNote?: string
	clinicalRationale?: string
	effectiveDate?: string
	discontinueDate?: string
	updatedAt: string
	updatedBy?: string
}

// ============================================================================
// Demo/mock data — in production this would be fetched from the backend
// ============================================================================

const DEMO_FORMULARY: FormularyItem[] = [
	{
		id: "1",
		genericName: "Amoxicillin",
		brandNames: ["Amoxil", "Trimox"],
		drugClass: "Penicillin Antibiotic",
		dosageForms: ["250mg/5mL suspension", "500mg capsule"],
		status: "on_formulary",
		effectiveDate: "2024-01-01",
		updatedAt: "2024-06-01",
	},
	{
		id: "2",
		genericName: "Vancomycin",
		brandNames: ["Vancocin"],
		drugClass: "Glycopeptide Antibiotic",
		dosageForms: ["500mg vial", "1g vial"],
		status: "restricted",
		restriction: "Infectious Disease approval required for all uses except MRSA meningitis",
		alternatives: ["Teicoplanin"],
		effectiveDate: "2024-01-01",
		updatedAt: "2024-06-01",
	},
	{
		id: "3",
		genericName: "Linezolid",
		brandNames: ["Zyvox"],
		drugClass: "Oxazolidinone Antibiotic",
		dosageForms: ["600mg tablet", "600mg/300mL IV bag"],
		status: "restricted",
		restriction: "Reserved for vancomycin-resistant enterococcal (VRE) infections. Pharmacy committee pre-approval required.",
		alternatives: ["Daptomycin", "Tedizolid"],
		costNote: "High cost — PhilHealth coverage limited. Patient co-pay applies.",
		effectiveDate: "2024-01-01",
		updatedAt: "2024-07-01",
	},
	{
		id: "4",
		genericName: "Cilostazol",
		brandNames: ["Pletaal"],
		drugClass: "Phosphodiesterase-3 Inhibitor",
		dosageForms: ["100mg tablet"],
		status: "off_formulary",
		clinicalRationale: "Insufficient evidence for routine use. Not covered under PhilHealth Z benefit. Refer to vascular surgery for alternative management.",
		alternatives: ["Pentoxifylline"],
		updatedAt: "2024-05-15",
	},
	{
		id: "5",
		genericName: "Metformin",
		brandNames: ["Glucophage", "Fortamet"],
		drugClass: "Biguanide / Antidiabetic",
		dosageForms: ["500mg tablet", "850mg tablet"],
		status: "on_formulary",
		effectiveDate: "2024-01-01",
		updatedAt: "2024-06-01",
	},
	{
		id: "6",
		genericName: "Atorvastatin",
		brandNames: ["Lipitor"],
		drugClass: "HMG-CoA Reductase Inhibitor (Statin)",
		dosageForms: ["10mg tablet", "20mg tablet", "40mg tablet"],
		status: "on_formulary",
		effectiveDate: "2024-01-01",
		updatedAt: "2024-06-01",
	},
]

// ============================================================================
// Status badge
// ============================================================================

function StatusBadge({ status }: { status: FormularyStatus }) {
	if (status === "on_formulary")
		return <Badge className="bg-green-600 text-white">On Formulary</Badge>
	if (status === "restricted")
		return (
			<Badge className="bg-amber-500 text-white">
				<AlertTriangle className="mr-1 size-3" />
				Restricted
			</Badge>
		)
	return <Badge variant="destructive">Off Formulary</Badge>
}

// ============================================================================
// Main Component
// ============================================================================

export function FormularyManagement() {
	const [search, setSearch] = useState("")
	const [statusFilter, setStatusFilter] = useState<"all" | FormularyStatus>("all")
	const [selected, setSelected] = useState<FormularyItem | null>(null)
	const [sheetOpen, setSheetOpen] = useState(false)
	const [isLoading] = useState(false)

	// In production: replace DEMO_FORMULARY with a useQuery hook
	const formularyItems = DEMO_FORMULARY

	const filtered = useMemo(() => {
		let items = formularyItems
		if (statusFilter !== "all") {
			items = items.filter((i) => i.status === statusFilter)
		}
		if (search.trim()) {
			const q = search.toLowerCase()
			items = items.filter(
				(i) =>
					i.genericName.toLowerCase().includes(q) ||
					i.brandNames.some((b) => b.toLowerCase().includes(q)) ||
					i.drugClass.toLowerCase().includes(q)
			)
		}
		return items
	}, [formularyItems, search, statusFilter])

	const stats = useMemo(() => ({
		total: formularyItems.length,
		onFormulary: formularyItems.filter((i) => i.status === "on_formulary").length,
		restricted: formularyItems.filter((i) => i.status === "restricted").length,
		offFormulary: formularyItems.filter((i) => i.status === "off_formulary").length,
	}), [formularyItems])

	function openEditor(item: FormularyItem) {
		setSelected(item)
		setSheetOpen(true)
	}

	function openNew() {
		setSelected(null)
		setSheetOpen(true)
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Formulary Management</h1>
					<p className="text-sm text-muted-foreground">
						Institutional drug formulary — restrictions, alternatives, and cost notes
					</p>
				</div>
				<Button onClick={openNew}>
					<Plus className="mr-1.5 size-4" />
					Add Drug
				</Button>
			</div>

			{/* Stats */}
			<div className="grid gap-4 sm:grid-cols-4">
				{[
					{ label: "Total Drugs", value: stats.total, icon: <BookOpen className="size-4" />, accent: "default" },
					{ label: "On Formulary", value: stats.onFormulary, icon: <CheckCircle2 className="size-4 text-green-600" />, accent: "default" },
					{ label: "Restricted", value: stats.restricted, icon: <AlertTriangle className="size-4 text-amber-500" />, accent: "warning" },
					{ label: "Off Formulary", value: stats.offFormulary, icon: <AlertTriangle className="size-4 text-red-500" />, accent: "danger" },
				].map(({ label, value, icon }) => (
					<Card key={label}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">{label}</CardTitle>
							{icon}
						</CardHeader>
						<CardContent>
							<p className="text-2xl font-bold">{value}</p>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Filters */}
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base flex items-center gap-2">
						<BookOpen className="size-4" />
						Drug Formulary
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap gap-3">
						<div className="relative flex-1 min-w-48">
							<Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
							<Input
								placeholder="Search by generic name, brand, or drug class…"
								className="pl-9"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<div className="flex items-center gap-2">
							<Filter className="size-4 text-muted-foreground" />
							<Select
								value={statusFilter}
								onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
							>
								<SelectTrigger className="w-40 h-9">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="on_formulary">On Formulary</SelectItem>
									<SelectItem value="restricted">Restricted</SelectItem>
									<SelectItem value="off_formulary">Off Formulary</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{isLoading ? (
						<div className="flex items-center justify-center py-16">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : filtered.length === 0 ? (
						<div className="flex flex-col items-center py-16 text-center">
							<BookOpen className="size-10 text-muted-foreground mb-3" />
							<p className="font-medium">No drugs match the current filters</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Generic Name</TableHead>
									<TableHead>Brand(s)</TableHead>
									<TableHead>Drug Class</TableHead>
									<TableHead>Forms</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Updated</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map((item) => (
									<TableRow
										key={item.id}
										className="cursor-pointer hover:bg-muted/50"
										onClick={() => openEditor(item)}
									>
										<TableCell className="font-medium">{item.genericName}</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{item.brandNames.join(", ")}
										</TableCell>
										<TableCell className="text-sm">{item.drugClass}</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											{item.dosageForms.join(" · ")}
										</TableCell>
										<TableCell>
											<StatusBadge status={item.status} />
										</TableCell>
										<TableCell className="text-xs text-muted-foreground">
											{new Date(item.updatedAt).toLocaleDateString("en-PH")}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation()
													openEditor(item)
												}}
											>
												Edit
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Editor Sheet */}
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent className="w-full sm:max-w-xl overflow-y-auto">
					<SheetHeader>
						<SheetTitle>
							{selected ? `Edit — ${selected.genericName}` : "Add Drug to Formulary"}
						</SheetTitle>
					</SheetHeader>
					<div className="mt-6">
						<FormularyNoteEditor
							item={selected}
							onSave={() => setSheetOpen(false)}
							onCancel={() => setSheetOpen(false)}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	)
}
