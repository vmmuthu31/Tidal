# Sui CRM - Central Documentation Index

**Last Updated:** 2026-03-14
**Status:** Composable gas sponsorship via Enoki implemented ✅

## 🎯 Quick Start

### For New Sessions
1. Read **[ARCHITECTURE.md](ARCHITECTURE.md)** — System design, data flows, dual auth
2. Skim **[TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)** — One-liner codebase map
3. For implementation → **[IMPLEMENTATION_AND_USERFLOW.md](IMPLEMENTATION_AND_USERFLOW.md)**
4. For bugs → **[BUG.md](BUG.md)**

### Quick Answers
- **"How do sponsored transactions work?"** → See [How Enoki Sponsorship Works](#how-enoki-sponsorship-works)
- **"What changed?"** → See [Latest Changes (2026-03-14)](#latest-changes-2026-03-14)
- **"How do I add a new onchain action?"** → Read TECHNICAL_ARCHITECTURE.md - Critical Paths
- **"Is there a bug?"** → Check [BUG.md](BUG.md)

---

## 📚 Documentation Map

| File | Purpose | When to Read |
|------|---------|--------------|
| **ARCHITECTURE.md** | Complete system design, tech stack, encryption, contracts | Understanding system design |
| **TECHNICAL_ARCHITECTURE.md** | One-liner codebase reference, file map, critical paths | Finding specific files, planning features |
| **IMPLEMENTATION_AND_USERFLOW.md** | User journeys + roadmap (Phases 1-6) | Understanding user flows, verifying features |
| **BUG.md** | Known issues, severity, fixes | Debugging, UX planning |

---

## 🚀 Latest Changes (2026-03-14)

**Problem:** zkLogin users had to pay gas despite Enoki gas pool existing.

**Solution:** Implemented composable sponsored transactions.

**Files Changed:**
1. `web/lib/config/contracts.ts` — Added `CRM_SPONSORED_TARGETS` (11 whitelisted Move targets)
2. `web/hooks/useSponsoredTransaction.ts` — Made composable, defaults targets to `CRM_SPONSORED_TARGETS`
3. `web/hooks/useUnifiedAuth.ts` — Added `useUnifiedTransaction()` hook (routes wallet→direct, zkLogin→sponsored)

**Result:** zkLogin users now get 100% free gas; wallet users unaffected.

---

## 💰 How Enoki Sponsorship Works

### Setup (One-Time)
1. Create Enoki account at https://portal.enoki.mystenlabs.com
2. Deposit SUI into gas pool (org manager does this)
3. Get `ENOKI_SECRET_KEY` from portal
4. Add to `.env.local`: `ENOKI_SECRET_KEY=...`
5. Whitelist 11 CRM Move targets in portal (see [Checklist](#-enoki-portal-checklist))

### The Question: "Do I Paste My Private Key?"
**NO.** You don't paste your private key anywhere.

**How it works:**
```
Your Wallet
    ↓ (You deposit SUI upfront)
Enoki Gas Pool
    ↓ (Backend uses ENOKI_SECRET_KEY API key, not private key)
Backend calls Enoki API
    ↓
Enoki signs tx with THEIR keys
    ↓
Tx broadcasts onchain
Gas deducted from your pool ✅
```

**No payment to Enoki:** You fund the pool once, gas is deducted as txs are sponsored.

### What Happens Behind the Scenes
1. zkLogin user builds transaction
2. Backend calls: `POST https://api.enoki.mystenlabs.com/v1/transaction-blocks/sponsor`
   - Authorization: `Bearer ENOKI_SECRET_KEY`
   - Body: Move call targets must be in allowlist
3. Enoki returns sponsored tx bytes
4. Frontend signs with ephemeral key
5. Backend submits: `POST https://api.enoki.mystenlabs.com/v1/transaction-blocks/sponsor/{digest}`
6. Enoki broadcasts onchain

---

## 🔄 Auth Routing

### Wallet Users (dapp-kit)
```
Connect Wallet → Sign Transaction → User pays gas
```

### ZkLogin Users (Google OAuth)
```
Sign in with Google → Ephemeral keypair + ZK proof → Enoki sponsors gas → Free ✅
```

**Both routed via:** `useUnifiedTransaction()` hook in `web/hooks/useUnifiedAuth.ts`

---

## 📋 Enoki Portal Checklist

- [ ] Create account at portal.enoki.mystenlabs.com (testnet)
- [ ] Deposit SUI (minimum 1 SUI for testing)
- [ ] Add all 11 Move call targets to "Allowed Move Call Targets":
  ```
  0xd867...::org::create_org
  0xd867...::crm_access_control::{all 10 functions}
  0xd867...::profile::create_profile
  0xd867...::interaction_log::log_interaction
  ```
- [ ] (Optional) Set "Allowed Addresses"
- [ ] Get ENOKI_SECRET_KEY
- [ ] Add to `.env.local`
- [ ] Verify: `curl http://localhost:3000/api/sponsor/status` → `{ configured: true }`

---

## 🔑 Key Addresses (Testnet)

| Item | Address |
|------|---------|
| Package ID | `0xd86712244386bdfd82906dae8bed7be6760df054536abde426fd2dc16f9b41a4` |
| Profile Registry | `0x395e1731de16b7393f80afba04252f18c56e1cf994e9d77c755a759f8bc5c4b0` |
| Example Org Registry | `0xea7c522c85660fc793d51e64464caf29956594d47997d4217e0a22000cdcd4e6` |
| Sui Clock | `0x0000000000000000000000000000000000000000000000000000000000000006` |

---

## 👥 System Overview

- **Project:** Sui-CRM — privacy-first Web3 CRM (E2E encryption via Seal, decentralized storage via Walrus, password-less auth via zkLogin)
- **Tech Stack:** Next.js 14+, React 19, TypeScript, @mysten/sui, Seal, Walrus
- **Network:** Testnet (mainnet pending)
- **Status:** Composable gas sponsorship + encrypted notes/files ✅

---

## 🔗 References
- Enoki: https://docs.enoki.mystenlabs.com
- Sui: https://docs.sui.io
- Seal: https://github.com/mystenlabs/seal-sdk
