// Re-exports tables for @repo/db/schema.
// Keep the defineRelations() result out of this barrel because Drizzle's
// `schema` option should only receive schema entities, not the relations map.
export * from "./auth.js"
export * from "./rbac.js"
export * from "./core.js"
export * from "./clinical.js"
export * from "./formulary.js"
export * from "./orders.js"
export * from "./nursing.js"
export * from "./billing.js"
export * from "./reporting.js"
export * from "./audit.js"
