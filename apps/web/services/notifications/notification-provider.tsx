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
	const isClosingRef = useRef(false)

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

		isClosingRef.current = false

		// Use proxied path (through Next.js rewrites) to avoid cross-origin cookie issues
		// The rewrite in next.config.ts proxies this to the backend
		const url = "/api/v1/notification/stream"

		const eventSource = new EventSource(url, { withCredentials: true })
		eventSourceRef.current = eventSource

		eventSource.onopen = () => {
			setConnected(true)
		}

		eventSource.onmessage = event => {
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
			// Ignore errors during intentional close (page unload/cleanup)
			if (isClosingRef.current) return
			setConnected(false)
			// EventSource auto-reconnects
		}

		// Close SSE before page unload to prevent browser "connection interrupted" warnings
		const handleBeforeUnload = () => {
			isClosingRef.current = true
			eventSource.close()
		}
		window.addEventListener("beforeunload", handleBeforeUnload)

		return () => {
			isClosingRef.current = true
			window.removeEventListener("beforeunload", handleBeforeUnload)
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
