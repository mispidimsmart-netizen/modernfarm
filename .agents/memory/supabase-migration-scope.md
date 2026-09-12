---
name: Supabase migration scope
description: Records the chosen backend boundary for the imported FarmEye application.
---

Keep FarmEye connected to its existing Supabase backend unless the user explicitly requests a separate full backend migration.

**Why:** The user chose runtime-only porting because FarmEye relies heavily on existing Supabase auth, data, RPC, storage, realtime, edge functions, and production data.

**How to apply:** Preserve direct Supabase compatibility in FarmEye maintenance work. Treat migration to Replit database, auth, storage, and API services as a separate explicitly scoped project.