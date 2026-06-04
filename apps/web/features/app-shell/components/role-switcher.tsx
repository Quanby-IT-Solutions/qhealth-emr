"use client"

import { ArrowTurnBackwardFreeIcons, CheckmarkCircle01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { useMyProfile, useSwitchRoleMutation } from "@/features/app-shell/api/rbac.hooks"

export function RoleSwitcher() {
	const { data: profile } = useMyProfile()
	const switchRole = useSwitchRoleMutation()

	const activeRole = profile?.activeRole
	const allRoles = profile?.staffProfiles?.flatMap(sp => sp.roles) ?? []

	if (allRoles.length <= 1) return null

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1 text-sm">
				<HugeiconsIcon icon={ArrowTurnBackwardFreeIcons} className="size-4" />
				<span className="max-w-[120px] truncate">{activeRole?.name ?? "No Role"}</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Switch Role</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				{allRoles.map(role => (
					<DropdownMenuItem
						key={role.id}
						disabled={switchRole.isPending}
						onClick={() => {
							if (role.id !== activeRole?.id) {
								switchRole.mutate({ roleId: role.id })
							}
						}}
					>
						<span className="flex-1 truncate">{role.name}</span>
						{role.id === activeRole?.id && (
							<HugeiconsIcon icon={CheckmarkCircle01FreeIcons} className="text-primary size-4" />
						)}
						{role.isPrimary && (
							<Badge variant="secondary" className="ml-1 text-[10px]">
								Primary
							</Badge>
						)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
