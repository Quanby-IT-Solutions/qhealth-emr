---
description: Auto-fix lint + format issues across monorepo
---

Run auto-fixers. Report what changed.

```bash
pnpm lint:fix && pnpm format:fix
```

After: run `pnpm typecheck` to verify nothing broke.
