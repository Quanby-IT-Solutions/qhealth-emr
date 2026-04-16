"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight01FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

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
import {
	filterNavItems,
	PRIMARY_NAV_ITEMS,
	SECONDARY_NAV_ITEMS,
} from "@/features/app-shell/lib/navigation"

import { UserMenu } from "./user-menu"

export function AppSidebar() {
	const pathname = usePathname()
	const { data: profile } = useMyProfile()

	const permissions = profile?.activeRole?.permissions ?? []
	const primaryItems = filterNavItems(PRIMARY_NAV_ITEMS, permissions)
	const primaryHrefs = new Set(primaryItems.map(item => item.href))
	const secondaryItems = filterNavItems(SECONDARY_NAV_ITEMS, permissions).filter(
		item => !primaryHrefs.has(item.href)
	)

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
								const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
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
												const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
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
			</SidebarContent>
			<SidebarFooter>
				<UserMenu />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
