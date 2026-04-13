"use client"

import { Search01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { Separator } from "@/core/components/ui/separator"
import { SidebarTrigger } from "@/core/components/ui/sidebar"
import { NotificationBadge } from "@/features/app-shell/components/notification-badge"
import { RoleSwitcher } from "@/features/app-shell/components/role-switcher"

export function AppTopbar() {
	return (
		<header className="bg-background flex h-12 shrink-0 items-center gap-2 border-b px-4">
			<SidebarTrigger className="-ml-1" />
			<Separator orientation="vertical" className="mr-2 h-4" />

			{/* Global search — navigates to the patient search page */}
			<div className="flex flex-1 items-center">
				<Link
					href="/patients/search"
					className="bg-muted/40 hover:bg-muted/60 flex h-8 w-full max-w-sm items-center gap-2 rounded-md border px-3 text-sm transition-colors"
				>
					<HugeiconsIcon icon={Search01FreeIcons} className="text-muted-foreground size-4" />
					<span className="text-muted-foreground">Search patients, orders…</span>
				</Link>
			</div>

			<div className="flex items-center gap-1">
				<RoleSwitcher />
				<NotificationBadge />
			</div>
		</header>
	)
}
