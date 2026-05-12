# Admin Console — Route Map

> Every route under `/admin/*` is protected by the RBAC route guard.
> Pages render inside the admin shell layout at `app/(site)/admin/layout.tsx`.

## Shared Auth Routes (NOT under admin route group)

Implementation owned by **AUTH-FE-01** — shared shell, NOT placed under the `(admin)` route group.

| URL | Story | Flow | Wireframe Page |
|-----|-------|------|----------------|
| `/login` | AUTH-FE-01 | A1 | Login Page |
| `/login/2fa` | AUTH-FE-01 | A1 | 2FA Challenge Page |
| `/forgot-password` | AUTH-FE-01 | A1 | Forgot Password Page |
| `/forgot-password/sent` | AUTH-FE-01 | A1 | Forgot Password Sent Page |
| `/forgot-password/reset` | AUTH-FE-01 | A1 | Reset Password Page |

**shared shell — owned by AUTH-FE-01**

---

## Admin Routes

### Identity & Access

| URL | Story | Flow | Wireframe Page |
|-----|-------|------|----------------|
| `/admin` | 1.2 | A2 | Admin Dashboard |
| `/admin/users` | 1.2 | A2 | User List |
| `/admin/users/new` | 1.2 | A2 | Create User Wizard |
| `/admin/users/[id]` | 1.2 | A2 | User Detail |
| `/admin/users/roles` | 1.2 | A3 | Role Matrix |
| `/admin/roles` | 1.2 | A3 | Roles & Permissions |
| `/admin/clinician-licenses` | 1.4 | A4 | Clinician License List |
| `/admin/clinician-licenses/[clinicianId]` | 1.4 | A4 | License Verification |

### Clinical Configuration

| URL | Story | Flow | Wireframe Page |
|-----|-------|------|----------------|
| `/admin/feature-flags` | 1.3 | B5 | Feature Flag Dashboard |
| `/admin/feature-flags/[moduleId]` | 1.3 | B5 | Module Config |
| `/admin/bor` | 2.5 | B1 | BOR Dashboard |
| `/admin/bor/census` | 2.5 | B1 | Daily Census Report |

### Reporting & Compliance

| URL | Story | Flow | Wireframe Page |
|-----|-------|------|----------------|
| `/admin/sla` | 19.1,19.2 | S1 | SLA Dashboard |
| `/admin/sla/config` | 19.1 | S1 | SLA Configuration |
| `/admin/sla/status-log` | 19.1 | S1 | Workflow Status Log |
| `/admin/sla/turnaround/[workflowId]` | 19.2 | S2 | Turnaround Report |
| `/admin/sla/bottleneck/[workflowId]` | 19.2 | S2 | Bottleneck Analysis |
| `/admin/fhir` | 17.1 | Q1 | FHIR Export Dashboard |
| `/admin/fhir-endpoints` | 17.1 | Q1 | FHIR Endpoint Config |
| `/admin/fhir-endpoints/log` | 17.1 | Q1 | Exchange Log |
| `/admin/terminology` | 17.2 | Q2 | Terminology Management |
| `/admin/terminology/[codeSystem]` | 17.2 | Q2 | Code Set |

### System Settings

| URL | Story | Flow | Wireframe Page |
|-----|-------|------|----------------|
| `/admin/facility-profile` | 20.1 | T1 | Facility Profile |
| `/admin/facility/departments` | 20.1 | T1 | Departments |
| `/admin/facility/wards` | 20.1 | T1 | Ward/Room/Bed Tree |
| `/admin/master-data` | 20.2 | T2 | Master Data Catalogs |
| `/admin/master-data/[catalogId]` | 20.2 | T2 | Catalog Editor |
| `/admin/integration-registry` | 20.3 | T3 | Integration Registry |
| `/admin/integrations/[integrationId]/keys` | 20.3 | T3 | API Key Management |
