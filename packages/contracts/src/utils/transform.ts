/**
 * Utilities for transforming API responses to match runtime types
 */

/**
 * Generic date field transformer for any entity
 * Useful for entities with multiple date fields
 */
export function transformDateFields<
	T extends Record<string, string | Date | unknown>,
	K extends keyof T,
>(obj: T, dateFields: K[]) {
	const result = { ...obj }
	for (const field of dateFields) {
		const value = result[field]
		if (typeof value === "string") {
			result[field] = new Date(value) as T[K]
		}
	}
	return result
}
