"use client"

import { useState } from "react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useDeactivateStaffMutation,
	useListStaffQuery,
} from "@/features/admin/api/admin.hooks"

export function UsersTable() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId

	const [search, setSearch] = useState("")
	const [isActiveFilter, setIsActiveFilter] = useState<"all" | "active" | "inactive">("active")
	const [page, setPage] = useState(1)
	const limit = 20

	const isActive = isActiveFilter === "all" ? undefined : isActiveFilter === "active"

	const { data, isLoading } = useListStaffQuery({
		facilityId,
		search: search || undefined,
		isActive,
		page,
		limit,
	})

	const deactivateMutation = useDeactivateStaffMutation()

	const totalPages = data ? Math.ceil(data.total / limit) : 1

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Input
					placeholder="Search by name or email…"
					value={search}
					onChange={e => {
						setSearch(e.target.value)
						setPage(1)
					}}
					className="max-w-xs"
				/>
				<Select
					value={isActiveFilter}
					onValueChange={v => {
						setIsActiveFilter(v as "all" | "active" | "inactive")
						setPage(1)
					}}
				>
					<SelectTrigger className="w-36">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All users</SelectItem>
						<SelectItem value="active">Active</SelectItem>
						<SelectItem value="inactive">Inactive</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Profiles</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="w-32">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading && (
							<TableRow>
								<TableCell colSpan={5} className="text-muted-foreground text-center">
									Loading…
								</TableCell>
							</TableRow>
						)}
						{!isLoading && data?.data.length === 0 && (
							<TableRow>
								<TableCell colSpan={5} className="text-muted-foreground text-center">
									No users found
								</TableCell>
							</TableRow>
						)}
						{data?.data.map(user => {
							const activeProfile = user.staffProfiles.find(p => p.isActive)
							return (
								<TableRow key={user.id}>
									<TableCell className="font-medium">{user.name}</TableCell>
									<TableCell className="text-muted-foreground">{user.email}</TableCell>
									<TableCell>
										{user.staffProfiles.map(p => (
											<span key={p.id} className="text-xs">
												{p.roles.map(r => r.name).join(", ") || "—"}
											</span>
										))}
									</TableCell>
									<TableCell>
										{activeProfile ? (
											<Badge variant="outline" className="text-green-600 border-green-600">
												Active
											</Badge>
										) : (
											<Badge variant="outline" className="text-muted-foreground">
												Inactive
											</Badge>
										)}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<Button
												variant="ghost"
												size="sm"
												nativeButton={false}
												render={<a href={`/admin/users/${user.id}`} />}
											>
												View
											</Button>
											{activeProfile && (
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive"
													onClick={() =>
														deactivateMutation.mutate({ id: activeProfile.id })
													}
													disabled={deactivateMutation.isPending}
												>
													Deactivate
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-end gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPage(p => Math.max(1, p - 1))}
						disabled={page <= 1}
					>
						Previous
					</Button>
					<span className="text-muted-foreground text-sm">
						Page {page} of {totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPage(p => Math.min(totalPages, p + 1))}
						disabled={page >= totalPages}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	)
}
