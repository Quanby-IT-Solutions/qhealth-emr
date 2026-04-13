"use client"

import { Notification03FreeIcons } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/core/components/ui/button"
import { useUnreadNotificationCount } from "@/features/app-shell/api/notification.hooks"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"

export function NotificationBadge() {
	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId
	const { data } = useUnreadNotificationCount(facilityId)

	const count = data?.count ?? 0

	return (
		<Button variant="ghost" size="icon-sm" className="relative">
			<HugeiconsIcon icon={Notification03FreeIcons} className="size-4" />
			{count > 0 && (
				<span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
					{count > 99 ? "99+" : count}
				</span>
			)}
			<span className="sr-only">
				{count > 0 ? `${count} unread notifications` : "Notifications"}
			</span>
		</Button>
	)
}
