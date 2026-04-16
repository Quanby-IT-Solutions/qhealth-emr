"use client"

import { useState } from "react"

import {
	CheckmarkCircle01FreeIcons,
	Notification03FreeIcons,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { cn } from "@/core/lib/utils"
import { useMyProfile } from "@/features/app-shell/api/rbac.hooks"
import { orpc } from "@/services/orpc/client"

import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { ScrollArea } from "./ui/scroll-area"
import { Skeleton } from "./ui/skeleton"

interface NotificationCenterProps {
	className?: string
}

function timeAgo(date: Date): string {
	const now = Date.now()
	const diff = Math.floor((now - date.getTime()) / 1000)
	if (diff < 60) return "just now"
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
	return `${Math.floor(diff / 86400)}d ago`
}

export function NotificationCenter({ className }: NotificationCenterProps) {
	const [open, setOpen] = useState(false)
	const queryClient = useQueryClient()

	const { data: profile } = useMyProfile()
	const facilityId = profile?.staffProfiles?.[0]?.facilityId ?? ""

	const { data, isLoading } = useQuery(
		orpc.notification.list.queryOptions({
			input: { facilityId, page: 1, limit: 20 },
			enabled: !!facilityId && open,
			staleTime: 15_000,
		}),
	)

	const { data: countData } = useQuery(
		orpc.notification.unreadCount.queryOptions({
			input: { facilityId },
			enabled: !!facilityId,
			refetchInterval: 30_000,
			staleTime: 10_000,
		}),
	)

	const markReadMutation = useMutation(
		orpc.notification.markRead.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.notification.key() })
			},
		}),
	)

	const markAllReadMutation = useMutation(
		orpc.notification.markAllRead.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.notification.key() })
			},
		}),
	)

	const unreadCount = countData?.count ?? 0
	const notifications = data?.data ?? []

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
					render={
						<button
							type="button"
							className={cn("relative inline-flex items-center justify-center rounded-md", className)}
							aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
						/>
					}
				>
					<HugeiconsIcon icon={Notification03FreeIcons} className="size-4" />
					{unreadCount > 0 && (
						<span className="bg-destructive text-destructive-foreground absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
							{unreadCount > 99 ? "99+" : unreadCount}
						</span>
					)}
				</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="end">
				<div className="flex items-center justify-between border-b px-4 py-3">
					<h3 className="text-sm font-semibold">Notifications</h3>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 text-xs"
							onClick={() => markAllReadMutation.mutate({ facilityId })}
							disabled={markAllReadMutation.isPending}
						>
							<HugeiconsIcon icon={CheckmarkCircle01FreeIcons} className="mr-1 size-3" />
							Mark all read
						</Button>
					)}
				</div>
				<ScrollArea className="h-80">
					{isLoading ? (
						<div className="space-y-1 p-2">
							{[...Array(4)].map((_, i) => (
								<Skeleton key={i} className="h-14 w-full rounded-md" />
							))}
						</div>
					) : notifications.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-10 text-center">
							<HugeiconsIcon
								icon={Notification03FreeIcons}
								className="text-muted-foreground/40 mb-2 size-8"
							/>
							<p className="text-muted-foreground text-sm">No notifications</p>
						</div>
					) : (
						<ul className="divide-y">
							{notifications.map(n => (
								<li
									key={n.id}
									className={cn(
										"group flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent",
										!n.isRead && "bg-muted/40",
									)}
								>
									<div className="min-w-0 flex-1">
										<p
											className={cn(
												"truncate font-medium",
												n.isRead && "font-normal text-muted-foreground",
											)}
										>
											{n.title}
										</p>
										<p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
											{n.body}
										</p>
										<p className="text-muted-foreground/70 mt-1 text-[11px]">
											{timeAgo(new Date(n.createdAt))}
										</p>
									</div>
									{!n.isRead && (
										<button
											className="mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
											onClick={() => markReadMutation.mutate({ id: n.id })}
											aria-label="Mark as read"
										>
											<HugeiconsIcon
												icon={CheckmarkCircle01FreeIcons}
												className="size-4 text-primary"
											/>
										</button>
									)}
								</li>
							))}
						</ul>
					)}
				</ScrollArea>
			</PopoverContent>
		</Popover>
	)
}
