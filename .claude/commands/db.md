---
description: Drizzle DB workflow - generate, migrate, or studio
---

Pick action from $ARGUMENTS:
- `push` → `pnpm db:push` (dev sync)
- `gen` → `pnpm db:generate` (create migration)
- `migrate` → `pnpm db:migrate` (apply migration)
- `studio` → `pnpm db:studio` (GUI)

If no arg, ask which action. Confirm before `migrate` on shared/prod DB.
