"use client"

import { Logout03FreeIcons, Settings02FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Avatar, AvatarFallback } from "@/core/components/ui/avatar"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/core/components/ui/sidebar"
import { getInitials } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { useSignOutMutation } from "@/features/auth/api/session.hooks"

export function UserMenu() {
	const { data: profile } = useMyProfile()
	const signOut = useSignOutMutation()

	const user = profile?.user
	const initials = user?.name ? getInitials(user.name) : "?"

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<SidebarMenuButton size="lg" tooltip={user?.name ?? "Account"} />}
					>
						<Avatar className="size-6">
							<AvatarFallback className="text-xs">{initials}</AvatarFallback>
						</Avatar>
						<div className="flex flex-col text-left leading-tight">
							<span className="truncate text-sm font-medium">{user?.name ?? "User"}</span>
							<span className="text-muted-foreground truncate text-xs">{user?.email ?? ""}</span>
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="start" className="w-56">
						<DropdownMenuGroup>
							<DropdownMenuLabel>
								<div className="flex flex-col">
									<span>{user?.name ?? "User"}</span>
									<span className="text-muted-foreground text-xs font-normal">
										{user?.email ?? ""}
									</span>
								</div>
							</DropdownMenuLabel>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<HugeiconsIcon icon={Settings02FreeIcons} className="size-4" />
							<span>Settings</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => signOut.mutate()} disabled={signOut.isPending}>
							<HugeiconsIcon icon={Logout03FreeIcons} className="size-4" />
							<span>{signOut.isPending ? "Signing out..." : "Sign Out"}</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
