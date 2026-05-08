import { redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar"
import { AppSidebar } from "@/features/app-shell/components/app-sidebar"
import { AppTopbar } from "@/features/app-shell/components/app-topbar"
import { OfflineModeIndicator } from "@/features/offline-cache/components/offline-mode-indicator"
import { getSession } from "@/services/better-auth/auth-server"
import { NotificationProvider } from "@/services/notifications/notification-provider"

export default async function SiteLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const session = await getSession()

	if (!session) {
		redirect("/login")
	}

	return (
		<SidebarProvider>
			<NotificationProvider staffId={session.user.id}>
				<AppSidebar />
				<SidebarInset>
					<AppTopbar />
					<OfflineModeIndicator />
					<div className="relative flex-1 overflow-auto p-4 md:p-6">{children}</div>
				</SidebarInset>
			</NotificationProvider>
		</SidebarProvider>
	)
}
