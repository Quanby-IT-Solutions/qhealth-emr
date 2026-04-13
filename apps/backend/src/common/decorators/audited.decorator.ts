import { Inject, Logger } from "@nestjs/common"

import type { AuditService } from "@/modules/v1/audit/audit.service"

interface AuditedOptions {
	action: "create" | "update" | "delete" | "sign" | "verify" | "override"
	entityType: string
	/** Function to extract entity ID from method arguments. Receives the first argument by default. */
	entityId?: (...args: unknown[]) => string
	/** Function to fetch before-state. Receives method arguments. If not provided, before_state is null (for create actions). */
	fetchBeforeState?: (...args: unknown[]) => Promise<unknown>
	/** Function to extract after-state from method return value. Defaults to the return value itself. */
	extractAfterState?: (result: unknown) => unknown
	/** Function to extract userId from method arguments (for cases where it's passed explicitly). */
	getUserId?: (...args: unknown[]) => string
	/** Function to extract facilityId from method arguments. */
	getFacilityId?: (...args: unknown[]) => string
}

const AUDIT_SERVICE_KEY = "AUDIT_SERVICE"

/**
 * Injects the AuditService into the class instance. Must be used alongside @Audited().
 */
export function InjectAuditService(): PropertyDecorator {
	return Inject(AUDIT_SERVICE_KEY)
}

export { AUDIT_SERVICE_KEY }

/**
 * Method decorator that wraps service methods to auto-capture before/after state
 * and log audit entries via AuditService.
 *
 * Usage:
 * ```typescript
 * @Audited({
 *   action: "update",
 *   entityType: "medication_order",
 *   entityId: (payload) => payload.id,
 *   fetchBeforeState: async function(this: MyService, payload) {
 *     return this.findOne(payload.id)
 *   },
 *   getUserId: (_, userId) => userId,
 *   getFacilityId: (_, __, facilityId) => facilityId,
 * })
 * async update(payload, userId, facilityId) { ... }
 * ```
 */
export function Audited(options: AuditedOptions): MethodDecorator {
	 
	return function (_target, _propertyKey, descriptor: TypedPropertyDescriptor<any>) {
		const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>
		const logger = new Logger("@Audited")

		descriptor.value = async function (this: Record<string, unknown>, ...args: unknown[]) {
			// 1. Capture before-state (if provided)
			let beforeState: unknown = null
			if (options.fetchBeforeState) {
				try {
					beforeState = await options.fetchBeforeState.apply(this, args)
				} catch (error) {
					logger.warn(`Failed to fetch before-state for ${options.entityType}: ${error}`)
				}
			}

			// 2. Execute the original method
			const result = await originalMethod.apply(this, args)

			// 3. Extract after-state
			const afterState = options.extractAfterState
				? options.extractAfterState(result)
				: result

			// 4. Extract entity ID
			let entityId: string | undefined
			if (options.entityId) {
				entityId = options.entityId(...args)
			} else if (result && typeof result === "object" && "id" in result) {
				entityId = String((result as { id: unknown }).id)
			}

			// 5. Log the audit entry asynchronously (don't block the response)
			const auditService = this["auditService"] as AuditService | undefined
			if (auditService && entityId) {
				const userId = options.getUserId?.(...args)
				const facilityId = options.getFacilityId?.(...args)

				if (!userId || !facilityId) {
					logger.warn(
						`@Audited skipping audit log for ${options.entityType}:${entityId} — ` +
							`missing ${!userId ? "userId" : ""}${!userId && !facilityId ? " and " : ""}${!facilityId ? "facilityId" : ""}. ` +
							`Ensure getUserId and getFacilityId are provided in @Audited options.`
					)
				} else {
					auditService
						.log({
							facilityId,
							userId,
							staffProfileId: null,
							action: options.action,
							entityType: options.entityType,
							entityId,
							beforeState: beforeState as Record<string, unknown> | null,
							afterState: afterState as Record<string, unknown> | null,
							ipAddress: null,
							userAgent: null,
							metadata: null,
						})
						.catch(error => {
							logger.error(`Failed to write audit log for ${options.entityType}:${entityId}: ${error}`)
						})
				}
			} else if (!auditService) {
				logger.warn(
					`@Audited used on ${String(_propertyKey)} but auditService not found on class instance. ` +
						`Inject AuditService as 'auditService' property.`
				)
			}

			return result
		}

		return descriptor
	}
}
