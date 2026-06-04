"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Input } from "@/core/components/ui/input"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import {
	useArchiveRoleMutation,
	useCreateRoleMutation,
	useListRolesQuery,
	useUpdateRoleMutation,
	useUpdateRolePermissionsMutation,
} from "@/features/admin/api/admin.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

const MODULES = [
	"adt",
	"clinical_docs",
	"orders",
	"nursing",
	"billing",
	"formulary",
	"reporting",
	"audit",
	"admin",
	"feature_flags",
	"system_settings",
	"facility_profile",
	"integration_registry",
] as const
const ACTIONS = ["view", "create", "edit", "sign", "delete", "verify", "export"] as const

type Module = (typeof MODULES)[number]
type Action = (typeof ACTIONS)[number]

export function PermissionMatrix() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId ?? ""

	const { data: rolesData, isLoading } = useListRolesQuery(facilityId)
	const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
	const updatePermMutation = useUpdateRolePermissionsMutation()
	const createRoleMutation = useCreateRoleMutation()
	const updateRoleMutation = useUpdateRoleMutation()

	// Draft permissions state (local, saved explicitly)
	const [draftPermissions, setDraftPermissions] = useState<Array<{
		module: Module
		action: Action
	}> | null>(null)
	const [permsDirty, setPermsDirty] = useState(false)

	// New role form state
	const [showNewRole, setShowNewRole] = useState(false)
	const [newRoleName, setNewRoleName] = useState("")

	// Rename state
	const [renamingRoleId, setRenamingRoleId] = useState<string | null>(null)
	const [renameValue, setRenameValue] = useState("")

	// Delete / archive state
	const [archivingRoleId, setArchivingRoleId] = useState<string | null>(null)
	const [archiveConflict, setArchiveConflict] = useState<{ assignedUserCount: number } | null>(null)
	const archiveRoleMutation = useArchiveRoleMutation()

	const selectedRole = rolesData?.find(r => r.id === selectedRoleId)

	// Build effective permissions from draft or persisted
	const effectivePermissions: Array<{ module: Module; action: Action }> =
		draftPermissions ??
		selectedRole?.permissions.map(p => ({
			module: p.module as Module,
			action: p.action as Action,
		})) ??
		[]

	const hasPermission = (mod: Module, action: Action) =>
		effectivePermissions.some(p => p.module === mod && p.action === action)

	const togglePermission = (mod: Module, action: Action) => {
		if (!selectedRole) return
		const exists = hasPermission(mod, action)
		const updated = exists
			? effectivePermissions.filter(p => !(p.module === mod && p.action === action))
			: [...effectivePermissions, { module: mod, action }]
		setDraftPermissions(updated)
		setPermsDirty(true)
	}

	const handleSelectRole = (roleId: string) => {
		setSelectedRoleId(roleId)
		setDraftPermissions(null)
		setPermsDirty(false)
	}

	const handleSavePermissions = () => {
		if (!selectedRole || !draftPermissions) return
		updatePermMutation.mutate(
			{ id: selectedRole.id, permissions: draftPermissions },
			{
				onSuccess: () => {
					setDraftPermissions(null)
					setPermsDirty(false)
				},
			}
		)
	}

	const handleDiscardPermissions = () => {
		setDraftPermissions(null)
		setPermsDirty(false)
	}

	const handleCreateRole = () => {
		if (!newRoleName.trim()) return
		createRoleMutation.mutate(
			{ facilityId, name: newRoleName.trim() },
			{
				onSuccess: () => {
					setNewRoleName("")
					setShowNewRole(false)
				},
			}
		)
	}

	const handleRename = (roleId: string) => {
		if (!renameValue.trim()) return
		updateRoleMutation.mutate(
			{ id: roleId, name: renameValue.trim() },
			{
				onSuccess: () => {
					setRenamingRoleId(null)
					setRenameValue("")
				},
			}
		)
	}

	const handleArchiveRole = (roleId: string) => {
		setArchiveConflict(null)
		archiveRoleMutation.mutate(
			{ id: roleId },
			{
				onSuccess: result => {
					if (result.conflict) {
						setArchiveConflict(result.conflict)
					} else {
						setArchivingRoleId(null)
						if (selectedRoleId === roleId) {
							setSelectedRoleId(null)
							setDraftPermissions(null)
						}
					}
				},
			}
		)
	}

	if (isLoading) {
		return <p className="text-muted-foreground text-sm">Loading roles…</p>
	}

	return (
		<div className="flex gap-6">
			{/* Left Rail — Role list */}
			<div className="w-56 shrink-0 space-y-2">
				<p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
					Roles
				</p>
				{rolesData?.map(role => (
					<div key={role.id} className="group">
						{renamingRoleId === role.id ? (
							<div className="flex items-center gap-1">
								<Input
									value={renameValue}
									onChange={e => setRenameValue(e.target.value)}
									className="h-7 text-sm"
									autoFocus
									onKeyDown={e => {
										if (e.key === "Enter") handleRename(role.id)
										if (e.key === "Escape") {
											setRenamingRoleId(null)
											setRenameValue("")
										}
									}}
								/>
								<Button
									size="sm"
									variant="ghost"
									className="h-7 px-2 text-xs"
									onClick={() => handleRename(role.id)}
								>
									✓
								</Button>
							</div>
						) : archivingRoleId === role.id ? (
							<div className="border-destructive/40 bg-destructive/5 space-y-1 rounded-md border p-2">
								{archiveConflict ? (
									<>
										<p className="text-destructive text-xs">
											Cannot archive: {archiveConflict.assignedUserCount} user(s) still assigned.
											Remove all assignments first.
										</p>
										<Button
											size="sm"
											variant="ghost"
											className="h-6 px-2 text-xs"
											onClick={() => {
												setArchivingRoleId(null)
												setArchiveConflict(null)
											}}
										>
											OK
										</Button>
									</>
								) : (
									<>
										<p className="text-destructive text-xs">
											Archive "{role.name}"? It will no longer be assignable.
										</p>
										<div className="flex gap-1">
											<Button
												size="sm"
												variant="destructive"
												className="h-6 px-2 text-xs"
												onClick={() => handleArchiveRole(role.id)}
												disabled={archiveRoleMutation.isPending}
											>
												Archive
											</Button>
											<Button
												size="sm"
												variant="ghost"
												className="h-6 px-2 text-xs"
												onClick={() => {
													setArchivingRoleId(null)
													setArchiveConflict(null)
												}}
											>
												Cancel
											</Button>
										</div>
									</>
								)}
							</div>
						) : (
							<div
								className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 transition-colors ${
									selectedRoleId === role.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
								}`}
								onClick={() => handleSelectRole(role.id)}
							>
								<div className="flex min-w-0 items-center gap-1.5">
									<span className="truncate text-sm">{role.name}</span>
									{role.isSystemDefault && (
										<Badge variant="secondary" className="px-1 text-[10px]">
											System
										</Badge>
									)}
								</div>
								{!role.isSystemDefault && (
									<div className="hidden shrink-0 gap-0.5 group-hover:flex">
										<button
											type="button"
											className="text-muted-foreground hover:text-foreground rounded p-0.5"
											title="Rename"
											onClick={e => {
												e.stopPropagation()
												setRenamingRoleId(role.id)
												setRenameValue(role.name)
											}}
										>
											✎
										</button>
										<button
											type="button"
											className="text-muted-foreground hover:text-destructive rounded p-0.5"
											title="Archive role"
											onClick={e => {
												e.stopPropagation()
												setArchivingRoleId(role.id)
												setArchiveConflict(null)
											}}
										>
											✕
										</button>
									</div>
								)}
							</div>
						)}
					</div>
				))}

				{/* New role inline form */}
				{showNewRole ? (
					<div className="flex items-center gap-1">
						<Input
							value={newRoleName}
							onChange={e => setNewRoleName(e.target.value)}
							placeholder="Role name…"
							className="h-7 text-sm"
							autoFocus
							onKeyDown={e => {
								if (e.key === "Enter") handleCreateRole()
								if (e.key === "Escape") {
									setShowNewRole(false)
									setNewRoleName("")
								}
							}}
						/>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 px-2 text-xs"
							onClick={handleCreateRole}
							disabled={createRoleMutation.isPending}
						>
							✓
						</Button>
					</div>
				) : (
					<Button
						size="sm"
						variant="ghost"
						className="text-muted-foreground w-full justify-start text-sm"
						onClick={() => setShowNewRole(true)}
					>
						+ New role
					</Button>
				)}
			</div>

			{/* Right Pane — Permission matrix */}
			<div className="flex-1 space-y-3">
				{permsDirty && (
					<div className="flex items-center gap-2 rounded-md border border-yellow-400/40 bg-yellow-50 px-3 py-2 dark:bg-yellow-900/20">
						<p className="flex-1 text-sm text-yellow-800 dark:text-yellow-200">
							Unsaved permission changes
						</p>
						<Button
							size="sm"
							onClick={handleSavePermissions}
							disabled={updatePermMutation.isPending}
						>
							Save
						</Button>
						<Button size="sm" variant="ghost" onClick={handleDiscardPermissions}>
							Discard
						</Button>
					</div>
				)}

				{selectedRole ? (
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-40">Module</TableHead>
									{ACTIONS.map(action => (
										<TableHead key={action} className="text-center capitalize">
											{action}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{MODULES.map(mod => (
									<TableRow key={mod}>
										<TableCell className="font-medium capitalize">
											{mod.replace(/_/g, " ")}
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
				) : (
					<p className="text-muted-foreground py-8 text-center text-sm">
						Select a role from the left to view and edit its permissions
					</p>
				)}
			</div>
		</div>
	)
}
