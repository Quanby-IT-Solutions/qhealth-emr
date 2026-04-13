"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useListRolesQuery,
	useUpdateRolePermissionsMutation,
} from "@/features/admin/api/admin.hooks"

const MODULES = ["adt", "clinical_docs", "orders", "nursing", "billing", "formulary", "reporting", "audit", "admin"] as const
const ACTIONS = ["view", "create", "edit", "sign", "delete", "verify", "export"] as const

type Module = (typeof MODULES)[number]
type Action = (typeof ACTIONS)[number]

export function PermissionMatrix() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId ?? ""

	const { data: rolesData, isLoading } = useListRolesQuery(facilityId)
	const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
	const updatePermMutation = useUpdateRolePermissionsMutation()

	const selectedRole = rolesData?.find(r => r.id === selectedRoleId)

	const hasPermission = (mod: Module, action: Action) =>
		selectedRole?.permissions.some(p => p.module === mod && p.action === action) ?? false

	const togglePermission = (mod: Module, action: Action) => {
		if (!selectedRole) return

		const current = selectedRole.permissions.map(p => ({ module: p.module, action: p.action })) as Array<{ module: Module; action: Action }>
		const exists = current.some(p => p.module === mod && p.action === action)
		const updated = exists
			? current.filter(p => !(p.module === mod && p.action === action))
			: [...current, { module: mod, action: action }]

		updatePermMutation.mutate({ id: selectedRole.id, permissions: updated })
	}

	if (isLoading) {
		return <p className="text-muted-foreground text-sm">Loading roles…</p>
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-2">
				{rolesData?.map(role => (
					<Button
						key={role.id}
						variant={selectedRoleId === role.id ? "default" : "outline"}
						size="sm"
						onClick={() => setSelectedRoleId(role.id)}
					>
						{role.name}
						{role.isSystemDefault && (
							<Badge variant="secondary" className="ml-1 text-xs">
								System
							</Badge>
						)}
					</Button>
				))}
			</div>

			{selectedRole && (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-40">Module</TableHead>
								{ACTIONS.map(action => (
									<TableHead key={action} className="capitalize text-center">
										{action}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{MODULES.map(mod => (
								<TableRow key={mod}>
									<TableCell className="font-medium capitalize">
										{mod.replace("_", " ")}
									</TableCell>
									{ACTIONS.map(action => (
										<TableCell key={action} className="text-center">
											<Checkbox
												checked={hasPermission(mod, action)}
												onCheckedChange={() => togglePermission(mod, action)}
												disabled={
													updatePermMutation.isPending ||
													(selectedRole.isSystemDefault &&
														mod === "admin" &&
														(action === "view" || action === "edit" || action === "create"))
												}
											/>
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{!selectedRole && (
				<p className="text-muted-foreground text-sm">Select a role above to edit its permissions.</p>
			)}
		</div>
	)
}
