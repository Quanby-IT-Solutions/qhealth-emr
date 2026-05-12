# [ADM-BE-02] Auth — 2FA + RBAC + Password Reset (Unified Auth Surface)

**Role:** Admin (auth surface owned by Admin module; consumed by every in-scope role)
**Layer:** Backend
**Category:** Page Implementation (backend service)
**Priority:** P0
**Story Refs:** Story 1.1 — Secure Login with 2FA; Story 1.2 — RBAC (USER_STORIES.md §1)
**Flow Refs:** Flow A1, Flow A2 (USER_FLOWS.md)

## Description

Implement 2FA-enforced login through Better Auth (`@repo/auth`), the RBAC matrix referenced by every role's pages, and the password reset flow consumed by `AUTH-FE-01`. The Auditor role uses the same audit hooks emitted here.

## Scope

### Authentication & 2FA
- Configure Better Auth's TOTP / email-OTP plugin in `@repo/auth` (default to TOTP; OTP via SMS is out of scope).
- NestJS guards: `AuthGuard`, `RolesGuard` (reads `roles` table seeded by ADM-BE-03), `PermissionsGuard` (reads `role_permissions`).
- Audit hook emits a structured event for every login attempt (success, failure, 2FA challenge issued, 2FA verified, lockout).
- Session creation writes a DPA-compliant audit entry (TOR §4.2).

### Password Reset (extension)
- `POST /api/v1/auth/password/requestReset` — email lookup, token generation (UUID, 30-min TTL), email dispatch via queue. Always returns success regardless of email existence (anti-enumeration).
- `POST /api/v1/auth/password/confirmReset` — token validation, password hash update, **invalidate all sessions for the user**, audit log.
- Rate limit: max 3 requests per email per hour and 10 per IP per hour.
- Audit: every step logged to `audit_events` with `action_type: auth.password.*` and `actor_type: system` for the dispatch step.

## oRPC / REST Endpoints

- `auth.signIn` — email + password → 2FA challenge token.
- `auth.verify2fa` — challenge token + 6-digit code → session.
- `auth.signOut`.
- `auth.password.requestReset` — { email }.
- `auth.password.confirmReset` — { token, newPassword }.
- `auth.session.current`.
- `auth.lockout.status` — surface for UI to read remaining cooldown.

## Acceptance Criteria

- [ ] Sign-in endpoint accepts email + password, returns a 2FA challenge token.
- [ ] 2FA verification endpoint accepts the challenge token + 6-digit code; succeeds only on valid TOTP / OTP within the project's clock skew window.
- [ ] Successful 2FA emits `audit.login.success` with timestamp, user id, IP, user agent.
- [ ] `RolesGuard` rejects requests where the bound user role is not in the route's `@Roles(...)` decorator list.
- [ ] `PermissionsGuard` rejects requests where the bound user lacks the route's required permission token.
- [ ] Account lockout after N failed login attempts (configurable, default 5) within a sliding window; lockout state surfaced via `auth.lockout.status` and enforced on subsequent sign-in attempts.
- [ ] `auth.password.requestReset` issues a single-use token with 30-min TTL, dispatches reset email via queue, and returns the same success response whether the email exists or not.
- [ ] `auth.password.confirmReset` validates the token (single-use, unexpired, not consumed), updates the password hash, **invalidates all sessions** for the user, and writes an audit row.
- [ ] Rate limit enforced: 3 reset requests per email per hour, 10 per IP per hour. Excess returns `429`.
- [ ] Every password-reset step (request, dispatch, validate, confirm) emits an audit event in `audit_events`.
- [ ] Integration tests in `apps/backend/test/auth/` cover: sign-in success, wrong password, wrong 2FA, expired challenge, role denied, lockout activation, password-reset request happy path, reset request for unknown email (still returns success), reset confirm happy path, expired token, replayed token, rate-limit breach, session invalidation after reset.
- [ ] All endpoints validate input via Zod DTOs in `@repo/contracts`.
- [ ] "Remember me" cookie TTL parameter accepted on sign-in and honored by Better Auth session config.

## Dependencies

- ADM-BE-01.

## References

- USER_FLOWS.md §A1 — Secure Login with 2FA (including Forgot Password branch); §A2.
- USER_STORIES.md §1 Stories 1.1, 1.2.
- TOR §4.2 — DPA, RA 10173 compliance; comprehensive audit trails.
- Project CLAUDE.md — Better Auth and `@repo/auth` patterns.
