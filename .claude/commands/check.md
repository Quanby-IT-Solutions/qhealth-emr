---
description: Run lint + typecheck + format check across monorepo
---

Run quality gate before commit. Fix issues if found.

```bash
pnpm lint && pnpm typecheck && pnpm format
```

If failures: report which package, which file, which rule. No fix unless asked.
