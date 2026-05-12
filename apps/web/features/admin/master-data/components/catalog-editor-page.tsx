"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/core/components/ui/sheet"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

import {
	useDeprecateItemMutation,
	useImportItemsMutation,
	useListItemsQuery,
} from "../api/master-data.hooks"

interface DeprecateDialogProps {
	itemId: string
	itemName: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

function DeprecateDialog({ itemId, itemName, open, onOpenChange }: DeprecateDialogProps) {
	const [replacedByItemId, setReplacedByItemId] = useState("")
	const deprecateMutation = useDeprecateItemMutation()

	async function handleSave() {
		if (!replacedByItemId.trim()) return
		try {
			await deprecateMutation.mutateAsync({
				id: itemId,
				replacedByItemId: replacedByItemId.trim(),
			})
			toast.success("Item deprecated.")
			setReplacedByItemId("")
			onOpenChange(false)
		} catch {
			toast.error("Failed to deprecate item.")
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Deprecate Item</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<p className="text-sm">
						Deprecating: <span className="font-medium">{itemName}</span>
					</p>
					<div className="space-y-1.5">
						<Label htmlFor="replaced-by-item-id">Replacement item ID *</Label>
						<Input
							id="replaced-by-item-id"
							placeholder="Enter replacement item UUID"
							value={replacedByItemId}
							onChange={e => setReplacedByItemId(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={!replacedByItemId.trim() || deprecateMutation.isPending}
					>
						{deprecateMutation.isPending ? "Saving..." : "Deprecate"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

interface ImportSheetProps {
	catalogId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

function ImportSheet({ catalogId, open, onOpenChange }: ImportSheetProps) {
	const fileRef = useRef<HTMLInputElement>(null)
	const [fileName, setFileName] = useState<string | null>(null)
	const [csvContent, setCsvContent] = useState<string | null>(null)
	const importMutation = useImportItemsMutation()

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		setFileName(file.name)
		const reader = new FileReader()
		reader.onload = ev => setCsvContent(ev.target?.result as string)
		reader.readAsText(file)
	}

	async function handleImport() {
		if (!csvContent) return
		try {
			const result = await importMutation.mutateAsync({ catalogId, csv: csvContent })
			if (result.errors.length === 0) {
				toast.success(`Imported ${result.imported} items.`)
				onOpenChange(false)
			} else {
				toast.warning(`${result.imported} imported, ${result.errors.length} error(s).`)
			}
		} catch {
			toast.error("Import failed.")
		}
	}

	const errors = importMutation.data?.errors ?? []

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-[480px]">
				<SheetHeader>
					<SheetTitle>Import CSV</SheetTitle>
					<SheetDescription>
						Upload a CSV file with columns: code, name, description
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6 space-y-4">
					<div>
						<input
							ref={fileRef}
							type="file"
							accept=".csv"
							className="hidden"
							onChange={handleFileChange}
						/>
						<Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
							{fileName ?? "Choose CSV file"}
						</Button>
					</div>
					{errors.length > 0 && (
						<div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-3">
							<p className="text-sm font-medium text-destructive">
								Row errors ({errors.length}):
							</p>
							{errors.map(e => (
								<p key={e.row} className="text-xs text-destructive">
									Row {e.row}: {e.message}
								</p>
							))}
						</div>
					)}
					<Button
						onClick={handleImport}
						disabled={!csvContent || importMutation.isPending}
						size="sm"
					>
						{importMutation.isPending ? "Importing..." : "Import"}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}

interface CatalogEditorPageProps {
	catalogId: string
}

export function CatalogEditorPage({ catalogId }: CatalogEditorPageProps) {
	const [search, setSearch] = useState("")
	const [page, setPage] = useState(1)
	const [importOpen, setImportOpen] = useState(false)
	const [deprecateTarget, setDeprecateTarget] = useState<{
		id: string
		name: string
	} | null>(null)

	const { data, isLoading } = useListItemsQuery(
		{ catalogId, search: search || undefined, page },
		!!catalogId
	)

	const items = data?.data ?? []
	const total = data?.total ?? 0
	const totalPages = Math.ceil(total / 50)

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<Input
						placeholder="Search items..."
						value={search}
						onChange={e => {
							setSearch(e.target.value)
							setPage(1)
						}}
						className="w-64"
					/>
					{total > 0 && (
						<span className="text-sm text-muted-foreground">{total} items</span>
					)}
				</div>
				<Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
					Import CSV
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</div>
			) : items.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">
					{search ? "No items match your search." : "No items in this catalog."}
				</p>
			) : (
				<>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Code</TableHead>
								<TableHead>Name</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-24">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.map(item => (
								<TableRow key={item.id}>
									<TableCell className="font-mono text-sm">{item.code}</TableCell>
									<TableCell>{item.name}</TableCell>
									<TableCell>
										{item.isDeprecated ? (
											<Badge variant="secondary" className="text-xs">
												Deprecated
											</Badge>
										) : (
											<Badge variant="outline" className="text-xs text-emerald-600">
												Active
											</Badge>
										)}
									</TableCell>
									<TableCell>
										{!item.isDeprecated && (
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs text-muted-foreground hover:text-destructive"
												onClick={() =>
													setDeprecateTarget({ id: item.id, name: item.name })
												}
											>
												Deprecate
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					{totalPages > 1 && (
						<div className="flex items-center justify-end gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={page <= 1}
								onClick={() => setPage(p => p - 1)}
							>
								Previous
							</Button>
							<span className="text-sm text-muted-foreground">
								Page {page} of {totalPages}
							</span>
							<Button
								variant="outline"
								size="sm"
								disabled={page >= totalPages}
								onClick={() => setPage(p => p + 1)}
							>
								Next
							</Button>
						</div>
					)}
				</>
			)}

			<ImportSheet catalogId={catalogId} open={importOpen} onOpenChange={setImportOpen} />

			{deprecateTarget && (
				<DeprecateDialog
					itemId={deprecateTarget.id}
					itemName={deprecateTarget.name}
					open={true}
					onOpenChange={open => {
						if (!open) setDeprecateTarget(null)
					}}
				/>
			)}
		</div>
	)
}
