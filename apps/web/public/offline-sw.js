const CACHE_NAME = "qhealth-emr-offline-v2"
const OFFLINE_ENTRY = "/patients/offline"
const NAVIGATION_ALLOWLIST = ["/patients/offline", "/dashboard"]

self.addEventListener("install", event => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then(cache => cache.addAll([OFFLINE_ENTRY]))
			.catch(() => undefined)
	)
	self.skipWaiting()
})

self.addEventListener("activate", event => {
	event.waitUntil(
		caches
			.keys()
			.then(keys =>
				Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	)
})

self.addEventListener("fetch", event => {
	const { request } = event
	if (request.method !== "GET") return

	const url = new URL(request.url)
	if (url.origin !== self.location.origin) return

	if (request.mode === "navigate") {
		event.respondWith(handleNavigation(request, url))
		return
	}

	if (
		url.pathname.startsWith("/_next/static/") ||
		url.pathname.startsWith("/_next/image") ||
		url.pathname === "/favicon.ico"
	) {
		event.respondWith(networkFirst(request))
	}
})

async function handleNavigation(request, url) {
	const cache = await caches.open(CACHE_NAME)
	try {
		const response = await fetch(request)
		if (response.ok && shouldCacheNavigation(url.pathname)) {
			await cache.put(request, response.clone())
		}
		return response
	} catch {
		return (
			(await cache.match(request)) ||
			(await cache.match(OFFLINE_ENTRY)) ||
			new Response("Peregrine offline cache is unavailable on this device.", {
				status: 503,
				headers: { "Content-Type": "text/plain" },
			})
		)
	}
}

async function networkFirst(request) {
	const cache = await caches.open(CACHE_NAME)
	try {
		const response = await fetch(request)
		if (response.ok) {
			cache.put(request, response.clone()).catch(() => undefined)
		}
		return response
	} catch (error) {
		const cached = await cache.match(request)
		if (cached) return cached
		throw error
	}
}

function shouldCacheNavigation(pathname) {
	return NAVIGATION_ALLOWLIST.some(path => pathname === path || pathname.startsWith(`${path}/`))
}
