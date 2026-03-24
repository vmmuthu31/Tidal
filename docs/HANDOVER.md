# Phase 2 Handover: Member Access & Org Management

**Date:** 2026-03-15
**Previous:** Sponsored Transaction Bug Handover (see git history for old HANDOVER.md)

---

## Context

Read `docs/ARCHITECTURE.md`, `docs/MEMORY.md`, and `docs/IMPLEMENTATION_AND_USERFLOW.md` for full project context.

This session implemented **Phase 2: Fix Member Access & Org Management** — enabling members who accept invites to see contacts, decrypt files/notes, and giving admins the ability to manage members on-chain.

---

## What Was Done (This Session)

### Fix 1 — Contacts Visibility for Members (DONE)
**Files:** `web/app/(dashboard)/contacts/page.tsx`
**Change:** Members now query contacts using `orgAdminAddress` instead of their own `suiAddress`.
**Why:** Contacts are stored with the admin's address as `adminAddress`. Members need to query by their admin's address to see org contacts.
**Bug fixed:** Contacts page also had an infinite spinner bug — `loading` was initialized `true` but never set to `false` when `useUser` hadn't loaded yet. Split into `userLoading` + `loadingContacts`.

### Fix 2 — Propagate orgRegistryId to Members (DONE)
**Files:** `web/app/auth/callback/page.tsx`, `web/hooks/useUser.ts`
**Change:** During invite acceptance, the callback now fetches the admin's `orgRegistryId` and copies it to the member's user record. `useUser` has a fallback that does the same lookup if `orgRegistryId` is missing.
**Why:** Without `orgRegistryId`, members fall back to `EXAMPLE_ORG_REGISTRY` which doesn't have them as members, causing Seal decryption to fail with 403.

### Fix 3 — On-Chain Member Registration UI (DONE)
**Files:** `web/app/(dashboard)/organization/page.tsx`, `web/app/api/invites/route.ts`, `web/lib/mongodb.ts`
**Change:** Org page now shows unregistered members with amber "Register On-Chain" button. Admin clicks → `add_org_member` tx → member marked `onchainRegistered: true`. Invites GET endpoint enriches with `onchainRegistered` status and backfills `memberAddress` for old invites.
**Why:** Accepting an invite only creates a MongoDB record. The member must also be added to the on-chain `OrgAccessRegistry` for Seal's `seal_approve` to pass.

### Fix 4 — Remove Member (DONE)
**Files:** `web/app/(dashboard)/organization/page.tsx`, `web/app/api/invites/[token]/route.ts`
**Change:** Remove button per member. Calls `remove_org_member` on-chain, cleans up member's DB record, marks invite as "removed".
**Why:** No way to revoke access before this change.

### Fix 5 — Role Selection in Invite Flow (DONE)
**Files:** `web/app/(dashboard)/organization/page.tsx`, `web/app/api/invites/route.ts`, `web/lib/mongodb.ts`
**Change:** Added role dropdown (Viewer/Manager/Admin) to invite form. Role stored on invite and used during on-chain registration.
**Why:** Previously all invites were hardcoded as "member" role.

### Fix 6 — Decryption Service Hardening (PARTIAL)
**Files:** `web/lib/services/decryptionService.ts`
**Change:** Added validation for empty `resource_id`, retry logic (3 attempts with backoff) for "newly created object" errors, debug logging for `seal_approve` arguments.
**Why:** Empty `resourceObjectId` caused invalid PTB. Recently created on-chain objects may not be visible to Seal key servers immediately.

---

## Active Bug: Member Seal Decryption 403

### Status: UNRESOLVED

### Error
```
POST https://seal-key-server-testnet-2.mystenlabs.com/v1/fetch_key 403 (Forbidden)
InvalidParameterError: PTB contains an invalid parameter, possibly a newly created object that the FN has not yet seen
```

### What Works
- Admin can decrypt notes and files successfully
- Both admin and member use the same `orgRegistryId`, `resourceId`, and `profileRegistryId`
- Member removal works correctly
- Contacts now load for members
- Role selection and invite flow work

### What Fails
- Member gets Seal 403 when trying to decrypt
- Same `seal_approve` args as admin, but member's address is rejected

### Confirmed Logs (Admin vs Member — same args)
```
seal_approve args: {
  resourceId: '0x6ded485de46973bc9b96246c104a2cab59c002dd318070144ca980cd0d727c5b',
  orgRegistryId: '0x4d6900280ea05cf9842c66317b7055ba723acaadcce935dd8de34a8792e70238',
  profileRegistryId: '0x395e1731de16b7393f80afba04252f18c56e1cf994e9d77c755a759f8bc5c4b0',
}
```
Admin: decryption succeeds.
Member: Seal key server returns 403.

### Root Cause Analysis

The 403 means the Move contract's `seal_approve` function rejects the member during PTB simulation on the Seal key server. Possible causes:

1. **Member not actually registered on-chain** — The org page UI may have shown green checkmarks for members that were never registered (old invites without `memberAddress`). The backfill logic was added to fix this, but existing members may need to be re-registered.

2. **Member registered with wrong address** — If the `memberAddress` saved on the invite doesn't match the member's actual zkLogin address (e.g., address changed due to re-login with different salt), the on-chain registry has a stale address.

3. **Full node propagation delay** — If `add_org_member` was called very recently, the Seal key servers' full node may not have the updated `OrgAccessRegistry` state yet. The retry logic (3 attempts, 3s/6s/9s backoff) should handle this.

4. **CORS issue with NodeInfra Seal server** — One Seal key server (`open-seal-testnet.nodeinfra.com`) returns duplicate `Access-Control-Allow-Origin: *, *` headers which browsers reject. This reduces the available key servers from 4 to 3, which may affect the 2-of-4 threshold requirement.

### Debugging Steps

1. **Verify on-chain registration:**
   ```bash
   sui client object <orgRegistryId> --json
   ```
   Check the `members` field contains the member's address.

2. **Verify member's address matches:**
   Compare `member.suiAddress` in MongoDB with what's in the on-chain `OrgAccessRegistry.members` table.

3. **Re-register member:**
   On the org page, remove the member and re-add them. This ensures `add_org_member` uses the correct current address.

4. **Wait and retry:**
   After on-chain registration, wait 15-30 seconds before attempting decryption.

### Recommended Next Steps

1. Add a "Verify On-Chain" button that checks the Sui RPC for the member's presence in `OrgAccessRegistry.members` — this would confirm whether the issue is registration or something else.
2. Consider adding a CORS proxy for the NodeInfra Seal key server, or exclude it from the server list.
3. If the member's address keeps changing between logins, the root issue is in `ZkLoginService.getZkLoginAddress()` producing inconsistent addresses.

---

## Files Modified (Complete List)

| File | Change |
|------|--------|
| `web/app/(dashboard)/contacts/page.tsx` | Member queries by `orgAdminAddress`; fixed infinite spinner |
| `web/app/(dashboard)/organization/page.tsx` | On-chain register/remove buttons, role selector in invite form |
| `web/app/api/contacts/route.ts` | Comment update only |
| `web/app/api/invites/[token]/route.ts` | PATCH accepts `memberAddress` and `status` override |
| `web/app/api/invites/route.ts` | POST accepts `role`; GET enriches with `onchainRegistered` + backfills `memberAddress` |
| `web/app/api/users/route.ts` | PATCH accepts `onchainRegistered`, `orgAdminAddress`, `role` |
| `web/app/auth/callback/page.tsx` | Copies admin's `orgRegistryId` to member; saves `memberAddress` on invite |
| `web/hooks/useUser.ts` | Member fallback: fetches admin's `orgRegistryId` if missing |
| `web/lib/mongodb.ts` | Added `onchainRegistered` to `UserRecord`; expanded `InviteRecord.role` and `status` |
| `web/lib/services/decryptionService.ts` | Validate `resource_id`, retry logic, debug logging |

---

## What Has Been Verified as Working

- Admin creates org, adds contacts, encrypts notes/files, decrypts them
- Member accepts invite → sees org on dashboard
- Member sees admin's contacts list (via `orgAdminAddress`)
- Admin can register member on-chain via org page
- Admin can remove member (on-chain + DB cleanup)
- Role selection in invite form (Viewer/Manager/Admin)
- `orgRegistryId` propagated to member during invite acceptance and via useUser fallback
- Old invites without `memberAddress` are backfilled from user records

## What Has NOT Been Verified / Still Broken

- Member decryption (Seal 403) — see Active Bug above
- Member creating contacts/notes (should use `orgAdminAddress` as `adminAddress` in POST)
- Onboarding UX still shows wallet funding prompt for zkLogin users (low priority, see BUG.md)
