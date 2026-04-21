# Administrator Implementation Analysis

> Generated: April 21, 2026  
> Scope: Administrator role pages, current implementation status, and development gaps

## Purpose

This document is a working implementation analysis for the `System Admin` role from the Terms of Reference.

It answers three questions:

1. What the administrator role needs based on the TOR
2. What is already implemented in the web app today
3. What still needs to be developed so the role is actually complete

## TOR Summary For Administrator Role

From the Terms of Reference, the administrator role is responsible for:

- managing users
- managing roles and permissions
- managing system configuration
- managing feature flags
- overseeing administrative and compliance-oriented system surfaces

The administrator should not be the owner of bedside clinical documentation or other clinical authoring workflows.

## Recommended Admin Areas

The administrator workspace is grouped into four top-level areas:

### 1. Access & Roles

- `/admin`
- `/admin/users`
- `/admin/users/[userId]`
- `/admin/roles`

### 2. Platform Control

- `/admin/feature-flags`
- `/admin/settings`

### 3. Clinical Configuration

- `/admin/formulary`
- `/admin/formulary/code-sets`

### 4. Interoperability & Compliance

- `/admin/fhir`
- `/admin/sla`
- `/audit`
- `/audit/break-glass`
- `/sla`
- `/reporting`
- `/reporting/pidsr`
- `/reporting/sla`
- `/reporting/hai`

## Current Implementation Status

## Implemented Now

These surfaces already exist and are usable in the current frontend.

### Admin workspace structure

- `/admin` exists
- admin navigation exists in the sidebar
- the admin landing page is now grouped into four areas instead of a flat card list

Current files:

- `apps/web/app/(site)/admin/page.tsx`
- `apps/web/features/admin/components/admin-overview.tsx`
- `apps/web/features/app-shell/lib/navigation.ts`

### User management

Implemented:

- `/admin/users`
- `/admin/users/[userId]`
- staff listing UI
- search and active/inactive filtering
- deactivate action
- user detail page scaffold

Current files:

- `apps/web/app/(site)/admin/users/page.tsx`
- `apps/web/app/(site)/admin/users/[userId]/page.tsx`
- `apps/web/features/admin/components/users-table.tsx`
- `apps/web/features/admin/components/user-detail.tsx`
- `apps/web/features/admin/api/admin.hooks.ts`

### Roles and permissions

Implemented:

- `/admin/roles`
- permission matrix UI
- role selection
- toggle permissions per module and action

Current files:

- `apps/web/app/(site)/admin/roles/page.tsx`
- `apps/web/features/admin/components/permission-matrix.tsx`
- `apps/web/features/admin/api/admin.hooks.ts`

### Formulary and code sets

Implemented:

- `/admin/formulary`
- `/admin/formulary/code-sets`
- formulary management surface
- code set browsing surface

Current files:

- `apps/web/app/(site)/admin/formulary/page.tsx`
- `apps/web/app/(site)/admin/formulary/code-sets/page.tsx`
- `apps/web/features/formulary/components/formulary-manager.tsx`
- `apps/web/features/formulary/components/code-set-browser.tsx`

### FHIR and SLA admin configuration

Implemented:

- `/admin/fhir`
- `/admin/sla`
- admin-facing FHIR export dashboard
- SLA configuration page

Current files:

- `apps/web/app/(site)/admin/fhir/page.tsx`
- `apps/web/app/(site)/admin/sla/page.tsx`
- `apps/web/features/fhir/components/fhir-export-dashboard.tsx`
- `apps/web/features/sla/components/sla-config.tsx`

### Admin oversight pages available

Implemented and accessible as broader governance surfaces:

- `/audit`
- `/audit/break-glass`
- `/sla`
- `/reporting`
- `/reporting/pidsr`
- `/reporting/sla`
- `/reporting/hai`
- `/beds`
- `/scheduling`

These are not strictly administrator-only, but they already exist and matter to admin governance.

### Newly scaffolded in this pass

Implemented as frontend scaffolds:

- `/admin/feature-flags`
- `/admin/settings`

Current files:

- `apps/web/app/(site)/admin/feature-flags/page.tsx`
- `apps/web/features/admin/components/feature-flags-panel.tsx`
- `apps/web/app/(site)/admin/settings/page.tsx`
- `apps/web/features/admin/components/admin-settings-panel.tsx`

What exists today in these new pages:

- layout and routing
- admin-oriented page structure
- local UI state only
- placeholder configuration content
- clear separation between feature flags and broader settings

## Partially Implemented

These areas exist in the UI but are not complete enough to be considered production-ready.

### Feature Flags

Current state:

- the page exists
- example flags are rendered
- toggles work in local component state
- groups such as platform control, compliance, and integration are defined in UI

What is missing:

- no backend persistence
- no database model
- no environment scoping
- no facility scoping
- no audit trail for changes
- no API integration
- no rollout rule engine
- no validation or approval workflow

Conclusion:

- UI scaffold implemented
- actual feature flag system not implemented

### System Settings

Current state:

- the page exists
- facility identity inputs are present
- policy toggles are present
- integration endpoint inputs are present
- values are editable in local component state

What is missing:

- no backend persistence
- no database model
- no server validation
- no save action connected to an API
- no audit history
- no facility-level config loading
- no settings versioning
- no environment-specific override model

Conclusion:

- UI scaffold implemented
- real settings management not implemented

### Admin landing page IA

Current state:

- the admin overview is implemented
- the four-area grouping is visible
- the new admin pages are discoverable from the landing page

What is missing:

- no status driven by actual backend readiness
- no progress metadata per module
- no policy-based hiding of incomplete modules

Conclusion:

- information architecture implemented in frontend
- readiness signaling still manual

## Not Yet Implemented

These are the main development gaps remaining for the administrator role.

### 1. Real feature flag system

Needed:

- feature flag schema
- admin API for listing and updating flags
- environment-aware targeting
- facility targeting where applicable
- role or cohort rollout logic
- audit logging for flag changes
- optional approval flow for high-risk controls

### 2. Real system settings management

Needed:

- settings schema
- facility-scoped configuration records
- settings read and update APIs
- server-side validation rules
- change history and audit trail
- default values with override behavior

### 3. Administrative system configuration breadth

The TOR mentions system configuration broadly. The current scaffold covers the first layer, but a complete admin system may still need:

- facility profile management
- integration registry management
- privacy and consent policy defaults
- operational defaults for ARTA and SLA monitoring
- offline mode policy configuration
- export policy and submission defaults

Some of these concepts are represented in the settings scaffold, but not yet backed by real data or separated into full modules.

### 4. Production-ready access governance improvements

Current user and role management exists, but likely still needs:

- create user flow
- invite user flow
- reset and recover account flow with clear admin controls
- stronger facility assignment workflows
- role template lifecycle management
- audit log integration for user and permission changes

### 5. Test coverage for admin surfaces

Needed:

- route-level tests for admin pages
- navigation visibility tests for admin role
- component tests for feature flags and settings pages
- mutation tests once APIs exist

## Development Priority Recommendation

If the goal is to make the administrator role truly functional instead of just navigable, the recommended development order is:

### Priority 1

- backend schema for feature flags
- backend schema for system settings
- read and update APIs for both

### Priority 2

- audit trail integration for admin changes
- facility scoping and validation rules
- persist and load real values into the new pages

### Priority 3

- richer admin account lifecycle flows
- rollout policies and approval rules for high-risk flags
- automated tests for admin surfaces

## Simple Status Matrix

| Area | Needed by TOR | Exists in UI | Backend complete | Production ready |
|------|---------------|--------------|------------------|------------------|
| Admin overview | Yes | Yes | N/A | Mostly yes |
| Users | Yes | Yes | Partial | Partial |
| Roles & permissions | Yes | Yes | Partial | Partial |
| Feature flags | Yes | Yes | No | No |
| System settings | Yes | Yes | No | No |
| Formulary | Related admin config | Yes | Partial/Existing | Partial |
| Code sets | Related admin config | Yes | Partial/Existing | Partial |
| FHIR admin config | Related admin config | Yes | Existing surface | Partial |
| SLA admin config | Related admin config | Yes | Existing surface | Partial |
| Audit oversight | Related oversight | Yes | Existing surface | Partial |

## Bottom Line

For the administrator role:

### Already implemented

- admin navigation and landing page structure
- user management pages
- role and permission pages
- formulary and code set pages
- FHIR and SLA admin pages
- oversight pages such as audit and reporting
- frontend scaffolds for feature flags and system settings

### Still needs to be developed

- real feature flag platform
- real system settings persistence and validation
- auditable admin configuration changes
- fuller admin account lifecycle actions
- tests and production hardening

The main gap is no longer page discovery. The main gap is turning the new and existing admin pages into real, persisted, auditable administrative systems.
