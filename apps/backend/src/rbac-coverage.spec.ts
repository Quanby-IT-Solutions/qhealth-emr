import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * RBAC coverage guard.
 *
 * The global RbacGuard treats a route with NO permission metadata as "any
 * authenticated user may call this". That default is correct for a handful of
 * deliberate self-service endpoints, and silently wrong for everything else —
 * a new endpoint merged without a decorator becomes reachable by every role
 * without anyone deciding that.
 *
 * This spec makes that decision explicit: every route handler must carry
 * @RequirePermission / @RequirePermissions / @RequireAnyPermissions or
 * @AllowAnonymous, or be listed in ALLOW_AUTHENTICATED_ONLY below with a
 * reason. Adding an endpoint without choosing fails this test.
 */

/** Handlers that are intentionally available to ANY authenticated user. */
const ALLOW_AUTHENTICATED_ONLY: Record<string, string[]> = {
	// Self-service: a user reads their own profile / switches among their own
	// assigned roles (ownership is validated in RbacService.switchRole).
	"rbac/rbac.controller.ts": ["me", "switchRole"],
	// Self-service license management: RbacService-style ownership checks in
	// ClinicianLicensesService restrict every *Mine call to the caller's rows.
	"clinician-licenses/clinician-licenses.controller.ts": [
		"getMine",
		"addMine",
		"updateMine",
		"verifyMine",
		"deleteMine",
	],
}

interface Handler {
	name: string
	decorators: string
}

/** Collects `*.controller.ts` files under modules/v1 recursively. */
function collectControllers(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry)
		if (statSync(full).isDirectory()) collectControllers(full, out)
		else if (entry.endsWith(".controller.ts")) out.push(full)
	}
	return out
}

/**
 * Parses decorator chains and the method each chain is attached to. Tracks
 * parenthesis depth so multi-line decorators (e.g. @RequireAnyPermissions with
 * an array argument) stay part of the same chain.
 */
function parseHandlers(source: string): Handler[] {
	const handlers: Handler[] = []
	const lines = source.split("\n")
	let chain: string[] = []
	let depth = 0

	for (const raw of lines) {
		const line = raw.trim()
		if (depth > 0) {
			chain.push(line)
			depth += (line.match(/\(/g) ?? []).length - (line.match(/\)/g) ?? []).length
			continue
		}
		if (line.startsWith("@")) {
			chain.push(line)
			depth = (line.match(/\(/g) ?? []).length - (line.match(/\)/g) ?? []).length
			continue
		}
		if (chain.length > 0) {
			const method = line.match(/^(?:async\s+)?([A-Za-z0-9_]+)\s*\(/)
			if (method?.[1]) {
				handlers.push({ name: method[1], decorators: chain.join("\n") })
			}
			// Blank lines and comments between decorators keep the chain alive;
			// anything else (method or not) terminates it.
			if (line !== "" && !line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*")) {
				chain = []
			}
		}
	}
	return handlers
}

const isRoute = (h: Handler) =>
	/@Implement\(/.test(h.decorators) || /@(Get|Post|Patch|Put|Delete)\(/.test(h.decorators)
const isGuarded = (h: Handler) =>
	/@Require(Permission|Permissions|AnyPermissions)\(/.test(h.decorators) ||
	/@AllowAnonymous/.test(h.decorators)

describe("RBAC route coverage", () => {
	const root = join(__dirname, "modules/v1")
	const controllers = collectControllers(root)

	it("finds a realistic number of controllers and routes", () => {
		const total = controllers.reduce(
			(n, f) => n + parseHandlers(readFileSync(f, "utf8")).filter(isRoute).length,
			0
		)
		expect(controllers.length).toBeGreaterThan(40)
		expect(total).toBeGreaterThan(400)
	})

	it("every route handler declares permissions, anonymity, or a documented exemption", () => {
		const offenders: string[] = []
		for (const file of controllers) {
			const rel = file.split("modules/v1/")[1] ?? file
			const exempt = ALLOW_AUTHENTICATED_ONLY[rel] ?? []
			for (const h of parseHandlers(readFileSync(file, "utf8"))) {
				if (!isRoute(h)) continue
				if (isGuarded(h)) continue
				if (exempt.includes(h.name)) continue
				offenders.push(`${rel} -> ${h.name}`)
			}
		}
		expect(offenders).toEqual([])
	})

	it("the exemption list does not rot", () => {
		for (const [rel, names] of Object.entries(ALLOW_AUTHENTICATED_ONLY)) {
			const file = join(root, rel)
			const handlers = parseHandlers(readFileSync(file, "utf8"))
			for (const name of names) {
				const h = handlers.find(x => x.name === name)
				// Still exists; a vanished handler means the exemption is stale.
				if (!h) throw new Error(`${rel} -> ${name} vanished; prune the exemption`)
				// …and is still unguarded (if someone added a decorator, the
				// exemption is stale and should be removed).
				if (isGuarded(h)) {
					throw new Error(`${rel} -> ${name} is now guarded; prune the exemption`)
				}
			}
		}
	})
})
