"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Separator } from "@/core/components/ui/separator"
import { SidebarTrigger } from "@/core/components/ui/sidebar"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { NotificationBadge } from "@/features/app-shell/components/notification-badge"
import { RoleSwitcher } from "@/features/app-shell/components/role-switcher"

export function AppTopbar() {
	const pathname = usePathname()
	const { data: profile } = useMyProfile()
	const canSearchPatients =
		profile?.activeRole?.permissions.some(p => p.module === "patients" && p.action === "view") ??
		false
	const isPatientProfilePage = /^\/patients\/[^/]+$/.test(pathname)

	if (isPatientProfilePage) {
		return null
	}

	return (
		<header className="bg-background flex h-12 shrink-0 items-center gap-2 border-b px-4">
			<SidebarTrigger className="-ml-1" />
			<Separator orientation="vertical" className="mr-2 h-4" />

			{/* Global search — only shown to roles with patients:view (not Administrator) */}
			<div className="flex flex-1 items-center">
				{canSearchPatients && (
					<Link
						href="/patients/register"
						className="bg-muted/40 hover:bg-muted/60 flex h-8 w-full max-w-sm items-center gap-2 rounded-md border px-3 text-sm transition-colors"
					>
						<HugeiconsIcon icon={Search01FreeIcons} className="text-muted-foreground size-4" />
						<span className="text-muted-foreground">Search patients, orders…</span>
					</Link>
				)}
			</div>

			<div className="flex items-center gap-1">
				<RoleSwitcher />
				<NotificationBadge />
			</div>
		</header>
	)
}
