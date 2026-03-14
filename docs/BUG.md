---
name: Onboarding UX Issue — Misleading Wallet Funding Prompt
description: zkLogin users no longer need SUI but onboarding still prompts to fund wallet
type: project
---

# Bug: Onboarding UX Issue

## Issue
After implementing sponsored transactions (2026-03-14), zkLogin users no longer need SUI for gas. However, the onboarding page (`web/app/onboarding/page.tsx`) still displays:
- "Step 1: Fund your wallet"
- Faucet link to get testnet SUI
- Balance check

This is misleading because zkLogin users can now skip this entirely — their gas is sponsored by the org's Enoki pool.

## Severity
🟡 **Low** — Non-critical UX issue. Doesn't break functionality; just confusing.

## Root Cause
The onboarding flow was written when all users needed to pay gas. It doesn't differentiate between:
- **Wallet users** (still need SUI for gas)
- **zkLogin users** (gas now sponsored, don't need SUI)

## How to Fix (Future)

### Option A: Simple (Recommended)
Hide Step 1 for zkLogin users:
```typescript
const { authMode } = useUnifiedAccount();

if (authMode === "zk") {
  // Skip funding step, go straight to org setup
  return <OrgSetupStep />;
}

// For wallet users, show funding step as-is
return <FundWalletStep />;
```

### Option B: Smart (Better UX)
Show contextual messaging:
```typescript
if (authMode === "zk") {
  return (
    <div className="info-banner">
      🎉 Your org pays all transaction fees! No funding needed.
    </div>
  );
}

return <FundWalletStep />;
```

## Status
🔄 **Not yet fixed** — Low priority, listed for future session context.

## Related Code
- `web/app/onboarding/page.tsx` — Main onboarding flow
- `web/hooks/useUnifiedAccount.ts` — Use `authMode` to detect auth type
