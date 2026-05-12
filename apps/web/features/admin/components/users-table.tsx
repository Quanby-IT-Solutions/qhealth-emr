"use client"

import { useRouter, useSearchParams } from "next/navigation"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import {
	useDeactivateStaffMutation,
	useListRolesQuery,
	useListStaffQuery,
} from "@/features/admin/api/admin.hooks"

function UsersTableSkeletonRows() {
	return (
		<>
			{Array.from({ length: 8 }).map((_, i) => (
				<TableRow key={i}>
					<TableCell>
						<Skeleton className="h-4 w-36" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-48" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-24" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-5 w-16 rounded-full" />
					</TableCell>
					<TableCell>
						<Skeleton className="h-4 w-20" />
					</TableCell>
				</TableRow>
			))}
		</>
	)
}

export function UsersTable() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles[0]?.facilityId

	const search = searchParams.get("search") ?? ""
	const statusFilter = (searchParams.get("status") ?? "active") as "all" | "active" | "inactive"
	const roleFilter = searchParams.get("role") ?? "all"
	const page = parseInt(searchParams.get("page") ?? "1", 10)
	const limit = 20

	function setParam(key: string, value: string) {
		const params = new URLSearchParams(searchParams.toString())
		if (value === "" || value === "all" || value === "1" && key === "page") {
			params.delete(key)
		} else {
			params.set(key, value)
		}
		if (key !== "page") params.delete("page")
		router.replace(`?${params.toString()}`, { scroll: false })
	}

	const isActive = statusFilter === "all" ? undefined : statusFilter === "active"

	const { data, isLoading } = useListStaffQuery({
		facilityId,
		search: search || undefined,
		isActive,
		page,
		limit,
	})

	const { data: rolesData } = useListRolesQuery(facilityId ?? "")
	const deactivateMutation = useDeactivateStaffMutation()

	const totalPages = data ? Math.ceil(data.total / limit) : 1

	// Client-side role filter (backend listStaff doesn't filter by role yet)
	const filteredData = roleFilter === "all"
		? data?.data
		: data?.data.filter(user =>
			user.staffProfiles.some(p =>
				p.roles.some(r => r.id === roleFilter)
			)
		)

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-3">
				<Input
					placeholder="Search by name or email…"
					value={search}
					onChange={e => setParam("search", e.target.value)}
					className="max-w-xs"
				/>
				<Select
					value={statusFilter}
					onValueChange={v => setParam("status", v ?? "all")}
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
				<Select
					value={roleFilter}
					onValueChange={v => setParam("role", v ?? "all")}
				>
					<SelectTrigger className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All roles</SelectItem>
						{rolesData?.map(role => (
							<SelectItem key={role.id} value={role.id}>
								{role.name}
							</SelectItem>
						))}
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
						{isLoading && <UsersTableSkeletonRows />}
						{!isLoading && filteredData?.length === 0 && (
							<TableRow>
								<TableCell colSpan={5} className="text-muted-foreground text-center">
									No users found
								</TableCell>
							</TableRow>
						)}
						{filteredData?.map(user => {
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
											<Badge variant="outline" className="border-green-600 text-green-600">
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
						onClick={() => setParam("page", String(Math.max(1, page - 1)))}
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
						onClick={() => setParam("page", String(Math.min(totalPages, page + 1)))}
						disabled={page >= totalPages}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	)
}
