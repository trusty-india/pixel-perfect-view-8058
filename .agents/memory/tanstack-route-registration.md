---
name: TanStack route registration
description: The imported TanStack Start project uses a generated route tree for typed links.
---

When a new file route is added, regenerate or update the generated route tree before running strict TypeScript checks; otherwise valid links can still be rejected because the router's path union is stale.

**Why:** The generated route metadata is what supplies the typed path union used by `Link`, not the route file alone.

**How to apply:** After adding a route under `src/routes`, refresh `src/routeTree.gen.ts` using the project's route-generation flow and then run `tsc --noEmit`.