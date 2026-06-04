import { request, type Cookie, type Page } from "@playwright/test"

export const HAS_BACKEND = !!process.env.E2E_AUTH_API_URL
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"
const DEFAULT_PASSWORD = process.env.E2E_SEED_PASSWORD ?? "Password123"

const authCookiesByEmail = new Map<string, Cookie[]>()

export async function signInForCookies(email: string) {
	const api = await request.newContext({
		baseURL: AUTH_API,
		extraHTTPHeaders: {
			"Content-Type": "application/json",
			Origin: WEB_ORIGIN,
			"X-Forwarded-For": `127.0.0.${Math.floor(Math.random() * 200) + 20}`,
		},
	})

	let authRes = await api.post("sign-in/email", {
		data: { email, password: DEFAULT_PASSWORD },
	})

	for (let attempt = 0; authRes.status() === 429 && attempt < 6; attempt++) {
		await new Promise(resolve => setTimeout(resolve, 5_000))
		authRes = await api.post("sign-in/email", {
			data: { email, password: DEFAULT_PASSWORD },
		})
	}

	if (!authRes.ok()) {
		const body = await authRes.text()
		await api.dispose()
		throw new Error(`Failed to sign in as ${email}: ${authRes.status()} ${body}`)
	}

	const { cookies } = await api.storageState()
	await api.dispose()
	return cookies
}

export async function signInAs(page: Page, email: string) {
	let cookies = authCookiesByEmail.get(email)
	if (!cookies) {
		cookies = await signInForCookies(email)
		authCookiesByEmail.set(email, cookies)
	}

	await page.context().clearCookies()
	await page.context().addCookies(cookies)
}

export async function preloadRoleAuth(emails: string[]) {
	for (const email of emails) {
		if (!authCookiesByEmail.has(email)) {
			authCookiesByEmail.set(email, await signInForCookies(email))
		}
	}
}
