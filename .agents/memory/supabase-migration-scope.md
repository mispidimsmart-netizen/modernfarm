---
name: Lovable Cloud backend scope
description: Records the chosen backend boundary for the imported FarmEye application.
---

Keep FarmEye connected to its existing Lovable Cloud built-in backend unless the user explicitly requests a separate full backend migration.

**Why:** Production screenshots confirmed that FarmEye uses Lovable Cloud, built on Supabase foundations, with its existing auth, data, RPC, storage, realtime, edge functions, and production data.

**How to apply:** Preserve Lovable Cloud and Supabase compatibility in FarmEye maintenance work. Treat migration to a user-owned Supabase project or Replit backend services as a separate explicitly scoped project.