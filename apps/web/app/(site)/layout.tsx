import { redirect } from "next/navigation"

import { EmrShell } from "@/features/app-shell/components/emr-shell"
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
		<NotificationProvider staffId={session.user.id}>
			<EmrShell>{children}</EmrShell>
		</NotificationProvider>
	)
}
