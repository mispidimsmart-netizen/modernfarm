---
name: FarmEye security phase boundaries
description: Records security work intentionally separated to preserve production compatibility.
---

Keep critical RPC tenant isolation separate from device-secret storage and alert-dispatcher caller authorization.

**Why:** Raw device secrets remain exposed through row-level table access even after RPC grants are fixed, and correcting that safely requires a client compatibility migration. The alert dispatcher also supports an authenticated frontend resend flow, so making its endpoint service-only without redesigning that flow would break user-visible behavior.

**How to apply:** Handle device secret columns and policies in the legacy device authentication phase. In the alert authorization/deduplication phase, authenticate cron calls separately and authorize frontend resend requests against the alert's tenant and the caller's role before any service-role operation.