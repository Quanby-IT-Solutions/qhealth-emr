# ADM-01: Align Administrator Permission Model With TOR

## Summary

Remove clinical write permissions from the Administrator role and keep the role focused on governance and configuration.

## Problem

The TOR states that the System Admin manages configuration, users, roles, and feature flags and has no clinical write access. The seeded Administrator role currently includes clinical write/sign permissions in areas such as `clinical_docs`, `orders`, and `nursing`.

## Source References

- `docs/MASTER_EMR_TERMS_OF_REFERENCE.md`
- `packages/db/src/seed-dev.ts`
- `apps/web/features/app-shell/lib/navigation.ts`

## Scope

- update the Administrator role bundle in seed data
- review any hardcoded admin bypass assumptions in navigation or page access logic
- preserve access to admin, audit, reporting, configuration, and interoperability surfaces
- explicitly decide whether any limited ADT access remains for Administrator

## Out of Scope

- redesigning the full RBAC system
- changing non-admin role bundles except where required by dependencies

## Acceptance Criteria

- Administrator no longer has create, edit, sign, verify, or delete access for `clinical_docs`
- Administrator no longer has create, edit, sign, verify, or delete access for `orders`
- Administrator no longer has create, edit, sign, or delete access for `nursing`
- any retained non-admin module access is explicitly justified and documented
- admin navigation still exposes the expected governance surfaces
- seeded admin login still works after reseeding

## Implementation Notes

- start with `packages/db/src/seed-dev.ts`
- verify whether navigation relies on `admin:view` alone or also on historical broad permissions
- verify that no dashboard or page assumes Administrator can create patients or edit encounters

## Validation

- reseed dev data
- login as `admin@qhealth.local`
- verify clinical write actions are not available
- verify admin pages remain accessible
- run typecheck for affected packages/apps

## Dependencies

- none

## Risks

- hidden assumptions in navigation or legacy demos may still expect Administrator to have broad access

## Definition of Done

- corrected Administrator role is seeded and verified in UI
- no TOR conflict remains for System Admin permissions