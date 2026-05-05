# HIM Module — Route Map

Routes live under `apps/web/app/(site)/(him)/him/` so the HIM console has its own route group while still sharing the site shell.

| Route | Page | Story | Flow | Permission | Wireframe Page |
|-------|------|-------|------|------------|----------------|
| `/him` | HIM Dashboard | 15.1-15.4 | O1-O4 | `him:read` | HIM Dashboard |
| `/him/deficiencies` | Deficiency Worklist | 15.1 | O1 | `him:read` | Deficiency Worklist |
| `/him/deficiencies/[deficiencyId]` | Deficiency Detail | 15.1 | O1 | `him:read` | Deficiency Detail Page |
| `/him/coding/[encounterId]` | ICD-10 Coding | 15.2 | O2 | `him:read` | ICD-10 Coding Page |
| `/him/coding/lookup` | Code Lookup | 15.2 | O2 | `him:read` | Code Lookup Page |
| `/him/records-requests` | Records Requests List | 15.3 | O3 | `him:read` | Records Requests Page |
| `/him/records-requests/[requestId]` | Request Detail | 15.3 | O3 | `him:read` | Request Detail Page |
| `/him/records-requests/[requestId]/release` | Release Workflow | 15.3 | O3 | `him:write` | Release Page |
| `/him/records-audit` | Release Audit | 15.3 | O3 | `him:read` | Release Audit Page |
| `/him/hai` | HAI Worklist | 15.4 | O4 | `him:read` | HAI Worklist |
| `/him/hai/report` | HAI Surveillance Report | 15.4 | O4 | `him:read` | HAI Report Page |

## Feature Structure

```
apps/web/features/him/
├── ROUTES.md
├── components/                  — shared shell
├── deficiency-tracking/
│   ├── api/deficiencies.hooks.ts
│   ├── components/
│   └── lib/
├── icd10-coding/
│   ├── api/coding.hooks.ts
│   ├── components/
│   └── lib/
├── records-issuance/
│   ├── api/records.hooks.ts
│   ├── components/
│   └── lib/
└── hai-reconciliation/
    ├── api/hai.hooks.ts
    ├── components/
    └── lib/
```

## RBAC

HIM route guard accepts the dedicated `him:read` / `him:write` boundary and the legacy `medical_records:view` / `medical_records:edit` fallback while RBAC seeds catch up.

Granular sub-feature permissions:

| Sub-module | Read | Write |
|------------|------|-------|
| Deficiencies | `him.deficiencies:read` | `him.deficiencies:write` |
| Coding | `him.coding:read` | `him.coding:write` |
| Records Issuance | `him.records:read` | `him.records:write` |
| HAI | `him.hai:read` | `him.hai:write` |

Legacy `medical_records:view|edit` accepted as fallback during migration.
