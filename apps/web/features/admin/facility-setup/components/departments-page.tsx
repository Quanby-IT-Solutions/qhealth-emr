"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
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
	useDeleteDepartmentMutation,
	useListDepartmentsQuery,
	useUpsertDepartmentMutation,
} from "@/features/admin/facility-setup/api/departments.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

export function DepartmentsPage() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId ?? ""

	const [newName, setNewName] = useState("")
	const [newCode, setNewCode] = useState("")
	const [editId, setEditId] = useState<string | null>(null)

	const { data: departments, isLoading } = useListDepartmentsQuery(facilityId)
	const upsertMutation = useUpsertDepartmentMutation()
	const deleteMutation = useDeleteDepartmentMutation()

	function handleAdd(e: React.FormEvent) {
		e.preventDefault()
		if (!newName.trim() || !facilityId) return
		upsertMutation.mutate(
			{ facilityId, name: newName.trim(), code: newCode.trim() || null },
			{
				onSuccess: () => {
					setNewName("")
					setNewCode("")
				},
			}
		)
	}

	return (
		<div className="space-y-4">
			<form onSubmit={handleAdd} className="flex gap-2">
				<Input
					placeholder="Department name"
					value={newName}
					onChange={e => setNewName(e.target.value)}
					className="max-w-xs"
				/>
				<Input
					placeholder="Code (e.g. PEDS)"
					value={newCode}
					onChange={e => setNewCode(e.target.value)}
					className="w-32"
				/>
				<Button type="submit" disabled={!newName.trim() || upsertMutation.isPending}>
					Add
				</Button>
			</form>

			{isLoading && <Skeleton className="h-48 w-full" />}

			{!isLoading && (!departments || departments.length === 0) && (
				<p className="text-muted-foreground py-8 text-center text-sm">No departments configured.</p>
			)}

			{departments && departments.length > 0 && (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Code</TableHead>
							<TableHead>Status</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{departments.map(dept => (
							<TableRow key={dept.id}>
								<TableCell className="font-medium">{dept.name}</TableCell>
								<TableCell className="font-mono text-sm">{dept.code ?? "—"}</TableCell>
								<TableCell className="text-sm">
									<span className={dept.isActive ? "text-green-600" : "text-muted-foreground"}>
										{dept.isActive ? "Active" : "Inactive"}
									</span>
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="sm"
										className="text-destructive"
										disabled={deleteMutation.isPending}
										onClick={() => deleteMutation.mutate({ id: dept.id })}
									>
										Delete
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	)
}
