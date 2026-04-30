# [ADM-BE-03] User Management API (RBAC)

**Role:** Admin
**Layer:** Backend
**Category:** Integration & API Connectivity (contract + service)
**Priority:** P0
**Story Refs:** Story 1.2 — Role-Based User Management
**Flow Refs:** Flow A2

## Description

Implement the oRPC contract and NestJS service for user CRUD, role assignment, and per-module permission management.

## Endpoints (oRPC)

- `admin.users.list` — paginated, filters: search, role, status.
- `admin.users.get` — by id.
- `admin.users.create` — Profile + Role + Permissions; emits activation email.
- `admin.users.update` — partial update.
- `admin.users.disable` / `admin.users.enable`.
- `admin.users.resendActivation`.
- `admin.users.assignRole` — replace user role.
- `admin.users.setPermissions` — replace permission set.
- `admin.roles.list`, `admin.roles.get`, `admin.permissions.list`.

## Acceptance Criteria

- [ ] All endpoints declared in `packages/contracts/src/modules/v1/admin/users.contract.ts` with Zod schemas; types exported.
- [ ] Service uses Drizzle to query `users`, `roles`, `role_permissions`.
- [ ] `create` enforces email uniqueness, generates a temporary password (hashed by Better Auth), returns the activation token to the email pipeline.
- [ ] `assignRole` rejects if the role does not exist or if the actor lacks `admin.users.assign-role` permission.
- [ ] All write endpoints emit audit events (`audit.user.create|update|role-change|permission-change|disable|enable`).
- [ ] Unit tests cover happy-path and unauthorized-actor cases for each endpoint.
- [ ] Integration test seeds a role, creates a user via the endpoint, asserts the activation email payload.

## Dependencies

- ADM-BE-01, ADM-BE-02.

## References

- USER_FLOWS.md §A2.
- USER_STORIES.md §1 Story 1.2.
- TOR §1 — Role taxonomy.
