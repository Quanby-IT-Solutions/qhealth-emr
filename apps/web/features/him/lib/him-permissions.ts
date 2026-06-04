export interface HimPermission {
	module: string
	action: string
}

const HIM_ACCESS_PERMISSIONS = [
	"him:read",
	"him:write",
	"medical_records:view",
	"medical_records:edit",
	"him.deficiencies:read",
	"him.deficiencies:write",
	"him.coding:read",
	"him.coding:write",
	"him.records:read",
	"him.records:write",
	"him.hai:read",
	"him.hai:write",
] as const

export function hasHimAccess(permissions: HimPermission[]) {
	const permissionSet = new Set(
		permissions.map(permission => `${permission.module}:${permission.action}`)
	)

	return HIM_ACCESS_PERMISSIONS.some(permission => permissionSet.has(permission))
}
