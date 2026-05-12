"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search01FreeIcons, WifiOffFreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Separator } from "@/core/components/ui/separator"
import { SidebarTrigger } from "@/core/components/ui/sidebar"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { NotificationBadge } from "@/features/app-shell/components/notification-badge"
import { getDefaultPatientsHref } from "@/features/app-shell/lib/navigation"
import { RoleSwitcher } from "@/features/app-shell/components/role-switcher"
import { useOfflineSync } from "@/features/offline-cache/lib/use-offline-sync"

export function AppTopbar() {
	const pathname = usePathname()
	const { data: profile } = useMyProfile()
	const { isOnline } = useOfflineSync()
	const permissions = profile?.activeRole?.permissions ?? []
	const canSearchPatients = permissions.some(p => p.module === "patients" && p.action === "view")
	const patientSearchHref = getDefaultPatientsHref(permissions)
	const isPatientProfilePage = /^\/patients\/[^/]+$/.test(pathname)

	if (isPatientProfilePage) {
		return null
	}

	return (
		<>
			<header className="bg-background flex h-14 shrink-0 items-center gap-2 border-b px-4">
				<SidebarTrigger className="-ml-1" />
				<Separator orientation="vertical" className="mr-2 h-4" />

				{/* Global search — only shown to roles with patients:view (not Administrator) */}
				<div className="flex flex-1 items-center">
					{canSearchPatients && (
						<Link
							href={patientSearchHref}
							className="bg-muted/40 hover:bg-muted/60 flex h-9 w-full max-w-sm items-center gap-2 rounded-md border px-3 text-sm transition-colors"
						>
							<HugeiconsIcon icon={Search01FreeIcons} className="text-muted-foreground size-4" />
							<span className="text-muted-foreground text-[13px]">Search patients, orders…</span>
						</Link>
					)}
				</div>

				<div className="flex items-center gap-1">
					<RoleSwitcher />
					<NotificationBadge />
				</div>
			</header>

			{!isOnline && (
				<div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
					<HugeiconsIcon icon={WifiOffFreeIcons} className="size-4 shrink-0" />
					<span>
						<strong>Offline mode</strong> — patient data served from local cache. Changes will sync on reconnect.
					</span>
				</div>
			)}
		</>
	)
}
