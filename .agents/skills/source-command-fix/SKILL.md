---
name: "source-command-fix"
description: "Auto-fix lint + format issues across monorepo"
---

# source-command-fix

Use this skill when the user asks to run the migrated source command `fix`.

## Command Template

Run auto-fixers. Report what changed.

```bash
pnpm lint:fix && pnpm format:fix
```

After: run `pnpm typecheck` to verify nothing broke.
