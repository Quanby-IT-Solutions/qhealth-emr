"use client"

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react"

import { env } from "@/env"

interface SseNotificationEvent {
	id: string
	topic: string
	title: string
	body: string
	data: unknown
	createdAt: string
}

type TopicHandler = (event: SseNotificationEvent) => void

interface NotificationContextValue {
	/** Whether the SSE connection is active */
	connected: boolean
	/** Unread notification count (refreshed on new events) */
	unreadCount: number
	/** Manually set unread count (e.g. after marking all as read) */
	setUnreadCount: (count: number) => void
	/** Register a topic handler. Returns an unsubscribe function. */
	onTopic: (topic: string, handler: TopicHandler) => () => void
}

const NotificationContext = createContext<NotificationContextValue>({
	connected: false,
	unreadCount: 0,
	setUnreadCount: () => {},
	onTopic: () => () => {},
})

export function useNotifications() {
	return useContext(NotificationContext)
}

interface NotificationProviderProps {
	children: ReactNode
	/** Staff ID for the SSE connection. If not provided, SSE is not started. */
	staffId?: string
}

export function NotificationProvider({ children, staffId }: NotificationProviderProps) {
	const [connected, setConnected] = useState(false)
	const [unreadCount, setUnreadCount] = useState(0)
	const handlersRef = useRef(new Map<string, Set<TopicHandler>>())
	const eventSourceRef = useRef<EventSource | null>(null)

	const onTopic = useCallback((topic: string, handler: TopicHandler) => {
		if (!handlersRef.current.has(topic)) {
			handlersRef.current.set(topic, new Set())
		}
		handlersRef.current.get(topic)!.add(handler)

		return () => {
			handlersRef.current.get(topic)?.delete(handler)
		}
	}, [])

	useEffect(() => {
		if (!staffId) return

		const apiBase = env.NEXT_PUBLIC_API_BASE_URL
		const url = `${apiBase}/v1/notification/stream`

		const eventSource = new EventSource(url, { withCredentials: true })
		eventSourceRef.current = eventSource

		eventSource.onopen = () => {
			setConnected(true)
		}

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as SseNotificationEvent
				setUnreadCount(prev => prev + 1)

				// Dispatch to topic handlers
				const topicHandlers = handlersRef.current.get(data.topic)
				if (topicHandlers) {
					topicHandlers.forEach(handler => handler(data))
				}

				// Also dispatch to wildcard handlers
				const wildcardHandlers = handlersRef.current.get("*")
				if (wildcardHandlers) {
					wildcardHandlers.forEach(handler => handler(data))
				}
			} catch {
				// Invalid event data — ignore
			}
		}

		eventSource.onerror = () => {
			setConnected(false)
			// EventSource auto-reconnects
		}

		return () => {
			eventSource.close()
			eventSourceRef.current = null
			setConnected(false)
		}
	}, [staffId])

	return (
		<NotificationContext.Provider value={{ connected, unreadCount, setUnreadCount, onTopic }}>
			{children}
		</NotificationContext.Provider>
	)
}
