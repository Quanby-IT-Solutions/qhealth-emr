export interface TriagePermission {
	module: string
	action: string
}

export function hasTriageAccess(permissions: TriagePermission[]) {
	const permissionSet = new Set(
		permissions.map(permission => `${permission.module}:${permission.action}`)
	)

	return (
		permissionSet.has("adt:create") &&
		permissionSet.has("nursing:create") &&
		permissionSet.has("ed:create")
	)
}
