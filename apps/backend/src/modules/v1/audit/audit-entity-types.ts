/**
 * Single source of truth for admin entity type strings used in audit logs.
 *
 * Import this constant when writing `entityType` in `AuditService.log()` calls
 * inside admin service methods, so every slice uses the same strings and typos
 * are caught at compile time.
 *
 * @example
 * ```typescript
 * import { AUDIT_ENTITY_TYPES } from "@/modules/v1/audit/audit-entity-types"
 *
 * await auditService.log({
 *   entityType: AUDIT_ENTITY_TYPES.FEATURE_FLAG,
 *   ...
 * }, { tx })
 * ```
 */
export const AUDIT_ENTITY_TYPES = {
	FEATURE_FLAG: "feature_flag",
	FEATURE_FLAG_TARGET: "feature_flag_target",
	SYSTEM_SETTING: "system_setting",
	CLINIC_TEMPLATE: "clinic_template",
	FACILITY_PROFILE: "facility_profile",
	INTEGRATION: "integration",
	ROLE: "role",
	USER: "user",
	USER_ROLE_ASSIGNMENT: "user_role_assignment",
	STAFF_PROFILE: "staff_profile",
	DRUG_GENERIC: "drug_generic",
	DRUG_BRAND: "drug_brand",
	FORMULARY_ITEM: "formulary_item",
	CODE_SET_UPLOAD: "code_set_upload",
	DEPRECATED_CODE_MAPPING: "deprecated_code_mapping",
	CATALOG_ENTRY: "catalog_entry",
	CATALOG_VERSION: "catalog_version",
	SLA_WORKFLOW_LOG: "sla_workflow_log",
} as const

/** Union of all known admin audit entity type strings. */
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES]
