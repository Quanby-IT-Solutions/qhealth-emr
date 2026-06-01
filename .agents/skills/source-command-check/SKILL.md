---
name: "source-command-check"
description: "Run lint + typecheck + format check across monorepo"
---

# source-command-check

Use this skill when the user asks to run the migrated source command `check`.

## Command Template

Run quality gate before commit. Fix issues if found.

```bash
pnpm lint && pnpm typecheck && pnpm format
```

If failures: report which package, which file, which rule. No fix unless asked.
