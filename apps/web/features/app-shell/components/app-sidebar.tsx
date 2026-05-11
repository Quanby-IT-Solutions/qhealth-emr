"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { WifiOff } from "lucide-react"

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/core/components/ui/collapsible"
import { Logo } from "@/core/components/logo"
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	SidebarSeparator,
} from "@/core/components/ui/sidebar"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { NAV_ICONS } from "@/features/app-shell/lib/nav-icons"
import { useOfflineSync } from "@/features/offline-cache/lib/use-offline-sync"
import {
	type AdminNavGroup,
	filterNavItems,
	PRIMARY_NAV_ITEMS,
	SECONDARY_NAV_ITEMS,
} from "@/features/app-shell/lib/navigation"

import { UserMenu } from "./user-menu"

const ADMIN_GROUPS: AdminNavGroup[] = [
	"Identity & Access",
	"Clinical Configuration",
	"Reporting & Compliance",
	"System Settings",
]

export function AppSidebar() {
	const pathname = usePathname()
	const { data: profile } = useMyProfile()
	const { isOnline } = useOfflineSync()

	const permissions = profile?.activeRole?.permissions ?? []
	const primaryItems = filterNavItems(PRIMARY_NAV_ITEMS, permissions)
	const allSecondaryItems = filterNavItems(SECONDARY_NAV_ITEMS, permissions)
	const secondaryItems = allSecondaryItems.filter(item => !item.adminGroup)

	const adminGroupMap = new Map(
		ADMIN_GROUPS.map(g => [g, allSecondaryItems.filter(item => item.adminGroup === g)])
	)
	const hasAdminItems = ADMIN_GROUPS.some(g => (adminGroupMap.get(g)?.length ?? 0) > 0)
	const isAdminPath = pathname.startsWith("/admin")

	// All visible nav hrefs — used to prevent a short href (e.g. /pharmacy) from
	// stealing the active highlight when a more specific item (/pharmacy/opd) is visible.
	const allNavHrefs = new Set([
		...primaryItems.map(i => i.href),
		...allSecondaryItems.map(i => i.href),
	])

	function isNavActive(href: string): boolean {
		if (pathname === href) return true
		if (!pathname.startsWith(href + "/")) return false
		// Only highlight the prefix if no more-specific item also matches
		return ![...allNavHrefs].some(
			other => other !== href && other.startsWith(href) && pathname.startsWith(other)
		)
	}

	return (
		<Sidebar collapsible="icon" variant="sidebar">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" tooltip="QHealth EMR">
							<Link href="/dashboard" className="flex items-center gap-2">
								<Logo text="QHealth EMR" href={undefined} size="sm" />
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarSeparator />
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{primaryItems.map(item => {
								const Icon = NAV_ICONS[item.iconName]
								const isActive = isNavActive(item.href)
								return (
									<SidebarMenuItem key={`primary-${item.href}`}>
										<SidebarMenuButton isActive={isActive} tooltip={item.title}>
											<Link href={item.href as never} className="flex items-center gap-2">
												<HugeiconsIcon icon={Icon} className="size-4" />
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)
							})}
							{!isOnline && permissions.some(permission => permission.module === "patients" && permission.action === "view") && (
								<SidebarMenuItem key="primary-offline-cache">
									<SidebarMenuButton
										isActive={pathname === "/patients/offline"}
										tooltip="Offline Cache"
									>
										<Link href="/patients/offline" className="flex items-center gap-2">
											<WifiOff className="size-4" />
											<span>Offline Cache</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{secondaryItems.length > 0 && (
					<>
						<SidebarSeparator />
						<SidebarGroup>
							<Collapsible defaultOpen={false}>
								<SidebarGroupLabel>
									<CollapsibleTrigger className="flex w-full items-center justify-between">
										<span>More Modules</span>
										<HugeiconsIcon
											icon={ArrowRight01FreeIcons}
											className="size-3 transition-transform [[data-panel-open]_&]:rotate-90"
										/>
									</CollapsibleTrigger>
								</SidebarGroupLabel>
								<CollapsibleContent>
									<SidebarGroupContent>
										<SidebarMenu>
											{secondaryItems.map(item => {
												const Icon = NAV_ICONS[item.iconName]
											const isActive = isNavActive(item.href)
												return (
													<SidebarMenuItem key={`secondary-${item.href}`}>
														<SidebarMenuButton isActive={isActive} tooltip={item.title}>
															<Link href={item.href as never} className="flex items-center gap-2">
																<HugeiconsIcon icon={Icon} className="size-4" />
																<span>{item.title}</span>
															</Link>
														</SidebarMenuButton>
													</SidebarMenuItem>
												)
											})}
										</SidebarMenu>
									</SidebarGroupContent>
								</CollapsibleContent>
							</Collapsible>
						</SidebarGroup>
					</>
				)}

				{hasAdminItems && (
					<>
						<SidebarSeparator />
						{ADMIN_GROUPS.map(group => {
							const items = adminGroupMap.get(group) ?? []
							if (items.length === 0) return null
							return (
								<SidebarGroup key={group}>
									<Collapsible defaultOpen={isAdminPath}>
										<SidebarGroupLabel>
											<CollapsibleTrigger className="flex w-full items-center justify-between">
												<span>{group}</span>
												<HugeiconsIcon
													icon={ArrowRight01FreeIcons}
													className="size-3 transition-transform [[data-panel-open]_&]:rotate-90"
												/>
											</CollapsibleTrigger>
										</SidebarGroupLabel>
										<CollapsibleContent>
											<SidebarGroupContent>
												<SidebarMenu>
													{items.map(item => {
														const Icon = NAV_ICONS[item.iconName]
												const isActive = isNavActive(item.href)
														return (
															<SidebarMenuItem key={`admin-${item.href}`}>
																<SidebarMenuButton isActive={isActive} tooltip={item.title}>
																	<Link href={item.href as never} className="flex items-center gap-2">
																		<HugeiconsIcon icon={Icon} className="size-4" />
																		<span>{item.title}</span>
																	</Link>
																</SidebarMenuButton>
															</SidebarMenuItem>
														)
													})}
												</SidebarMenu>
											</SidebarGroupContent>
										</CollapsibleContent>
									</Collapsible>
								</SidebarGroup>
							)
						})}
					</>
				)}
			</SidebarContent>
			<SidebarFooter>
				<UserMenu />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
