# Sui CRM System Architecture

## High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 14 Frontend (React 19)              │
│  ┌──────────────────────┬──────────────────────────────────────┐│
│  │  DApp Kit Provider   │     ZkLogin Provider                 ││
│  │  (Wallet Connect)    │     (Google OAuth + Ephemeral Key)   ││
│  └──────────────────────┴──────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │              unified Auth Hooks (Composite)                 ││
│  │  • useUnifiedAccount() → {address, authMode}                ││
│  │  • useUnifiedTransaction() → {execute, isPending, error}    ││
│  │    └─ wallet: dapp-kit direct (user pays gas)              ││
│  │    └─ zkLogin: Enoki sponsored (org pays gas) ← NEW (2026) ││
│  └──────────────────────────────────────────────────────────────┘│
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │ HTTP
┌──────────────────────────┼───────────────────────────────────────┐
│                 Next.js API Routes (Node.js)                     │
│                                                                  │
│  POST /api/sponsor          →  Enoki::createSponsoredTx         │
│  POST /api/sponsor/{digest} →  Enoki::executeSponsoredTx        │
│  GET  /api/sponsor/status   →  isSponsorshipConfigured()        │
└──────────────────────────────────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────┼───────────────────────────────────────┐
│            Sui Blockchain (Testnet RPC)                          │
│                                                                  │
│  • Move Contracts (11 functions across 4 modules)              │
│  • Shared Objects: Profile Registry, Org Registry, Clock       │
│  • Events: OrgCreated, MemberAdded, ProfileRegistered, etc     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Walrus Network  │    │  Seal Threshold  │    │  Mysten ZKP      │
│  (Decentralized  │    │  Encryption (4   │    │  Prover Service  │
│  Storage)        │    │  key servers)    │    │  (Proof Gen)     │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

## Dual Auth Context Providers

### DApp Kit (Wallet)
- **File:** `web/lib/providers/WalletProvider.tsx`
- **Function:** Standard Web3 wallet connection (@mysten/dapp-kit)
- **Auth flow:** User connects existing Sui wallet → immediate access
- **Gas handling:** User pays all gas fees from their wallet
- **Signature:** Standard Sui transactions signed by wallet private key

### ZkLogin (Google OAuth)
- **File:** `web/lib/providers/ZkLoginProvider.tsx`
- **Function:** Password-less Web3 via Google OAuth + Mysten prover
- **Auth flow:** Google login → ephemeral keypair generated → ZK proof → Sui address derived
- **Session:** Cached 24h in localStorage via `SessionManager`
- **Gas handling:** Enoki sponsors all gas via org's gas pool (2026-03-14 update)
- **Signature:** zkLogin signature (ephemeral sig + ZK proof + JWT claims)

### Unified Auth Hook
- **File:** `web/hooks/useUnifiedAuth.ts`
- **Exports:** `useUnifiedAccount()`, `useUnifiedSignAndExecuteTransaction()`, `useUnifiedTransaction()`
- **Design:** Single source of truth; auto-detects which auth provider is active
- **Routing logic:**
  ```
  if (wallet connected)  → use dapp-kit path
  else if (zkLogin valid) → use zkLogin path
  else                    → throw "No active account"
  ```

## Encryption Pipeline (End-to-End)

### Encryption (Client-Side)
1. User enters note/file in browser
2. Seal SDK encrypts with threshold cryptography (2-of-4 key shares needed to decrypt)
3. Encrypted blob uploaded to Walrus (50+ publishers with fallback)
4. Metadata stored: blobId + encryptionId (registration ID)
5. **Result:** plaintext NEVER leaves client

### Decryption (Client-Side)
1. User requests access to encrypted resource
2. `seal_approve()` tx sent to Sui blockchain (verifies access control)
3. If access granted, Seal nodes combine key shares
4. Encrypted blob downloaded from Walrus
5. Decrypted locally in browser
6. **Result:** plaintext only in browser memory, never synced to backend

## Smart Contracts (Move)

**Package:** `0xd86712244386bdfd82906dae8bed7be6760df054536abde426fd2dc16f9b41a4`

### Modules & Functions

| Module | Function | Purpose | Gas |
|--------|----------|---------|-----|
| `org` | `create_org` | Create organization | 10M MIST |
| `profile` | `create_profile` | Create contact profile (link to Walrus blob) | 10M MIST |
| `interaction_log` | `log_interaction` | Log user activity | 10M MIST |
| `crm_access_control` | `create_org_and_registry` | Org + access control setup | 50M MIST |
| | `add_org_member` | Add team member with role | 10M MIST |
| | `update_member_role` | Change member permissions (Viewer/Manager/Admin) | 10M MIST |
| | `remove_org_member` | Remove member | 10M MIST |
| | `register_profile` | Register profile with org access | 10M MIST |
| | `create_encrypted_resource` | Store encrypted note/file metadata | 20M MIST |
| | `seal_approve` | Verify decryption access (called by Seal nodes) | — |

### Access Control Matrix

| User Role | Own Profile | Viewer Team Member | Manager Team Member | Admin Team Member |
|-----------|-------------|-------------------|---------------------|-------------------|
| Profile Owner | ✅ Full | N/A | N/A | N/A |
| Org Viewer | ✅ Full | ✅ Read Level 1 | ❌ | ❌ |
| Org Manager | ✅ Full | ✅ Read Level 1 | ✅ Read/Edit Level 2 | ❌ |
| Org Admin | ✅ Full | ✅ Read Level 1 | ✅ Read/Edit Level 2 | ✅ Full Level 3 |

## Data Models

### On-Chain (Sui Blockchain)
- **Org:** name, admin, created_at
- **OrgMember:** role (1/2/3), unique_tag, onchain timestamp
- **Profile:** wallet_address, crm_data_blob_id (Walrus), crm_data_encryption_id (Seal)
- **EncryptedResource:** metadata for notes/files, access_level, owner address

### Off-Chain (Walrus Decentralized Storage)
- Encrypted note/file blobs
- Stored in Walrus network (50+ publishers)
- Referenced by blobId in onchain metadata

### Backend Database (MongoDB/SurrealDB)
- User profiles (email, OAuth provider)
- Interaction history
- Cached metadata for indexing
- **Note:** Sensitive data (notes, files) never stored here

## Enoki Gas Sponsorship (2026-03-14 Update)

### Setup Requirements
1. Enoki account created at https://portal.enoki.mystenlabs.com
2. Gas pool funded by org manager (via Enoki portal)
3. `ENOKI_SECRET_KEY` set on backend
4. Move call targets whitelisted in Enoki portal

### Whitelisted Targets (Testnet)
```
0xd867...::org::create_org
0xd867...::crm_access_control::*  (all functions)
0xd867...::profile::create_profile
0xd867...::interaction_log::log_interaction
```

### Gas Sponsorship Flow
1. Client builds tx (onlyTransactionKind: true)
2. Backend calls Enoki → receives sponsored tx bytes + digest
3. Client signs with ephemeral key
4. Backend submits signed tx to Enoki → tx executed on-chain
5. **Result:** zkLogin users pay 0 SUI for gas; org's Enoki pool pays

## File Structure

```
/mnt/d/projects/Sui-CRM/
├── docs/                    # 15+ documentation files
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── ENCRYPTION_FLOW_DETAILED.md
│   ├── SEAL_ACCESS_CONTROL.md
│   └── ...
├── contracts/
│   ├── sources/
│   │   ├── org.move
│   │   ├── profile.move
│   │   ├── crm_access_control.move  (main access control logic)
│   │   └── interaction_log.move
│   └── build/
├── web/
│   ├── app/
│   │   ├── api/
│   │   │   ├── sponsor/         (Enoki sponsorship routes)
│   │   │   └── ...
│   │   ├── (dashboard)/
│   │   ├── auth/
│   │   └── login/
│   ├── lib/
│   │   ├── config/
│   │   │   ├── contracts.ts    (contains CRM_SPONSORED_TARGETS)
│   │   │   └── sui.ts
│   │   ├── services/
│   │   │   ├── enoki.service.ts
│   │   │   ├── encryptionService.ts
│   │   │   ├── decryptionService.ts
│   │   │   └── walrusService.ts
│   │   ├── zklogin/
│   │   │   ├── zklogin.ts       (ZkLoginService)
│   │   │   └── session.ts       (SessionManager)
│   │   ├── providers/
│   │   │   ├── WalletProvider.tsx
│   │   │   ├── ZkLoginProvider.tsx
│   │   │   └── index.ts
│   │   └── types/
│   ├── hooks/
│   │   ├── useUnifiedAuth.ts    (unified routing hook)
│   │   ├── useSponsoredTransaction.ts  (zkLogin + Enoki)
│   │   └── ...
│   ├── components/
│   │   ├── contacts/
│   │   ├── forms/
│   │   └── ui/
│   └── package.json
├── bots/                    # Integration bots
│   ├── discord-bot/
│   ├── telegram-bot/
│   └── ...
└── infra/
```

## Key Dependencies
- `@mysten/dapp-kit: ^1.0.2` — Wallet provider
- `@mysten/sui: ^2.3.1` — Sui SDK
- `@mysten/seal: ^1.0.1` — Threshold encryption
- `next: 16.1.6` — React SSR framework
- `zod: ^4.3.6` — TypeScript validation
- `jwt-decode: ^4.0.0` — JWT parsing

## Performance & Security Notes
- **Session TTL:** 24 hours for zkLogin proofs (localStorage)
- **Ephemeral keys:** Valid for ~10 epochs (~10 hours on testnet)
- **Seal threshold:** 2-of-4 key shares required for decryption
- **Walrus fallback:** 50+ publishers for write, 50+ aggregators for read
- **Access verification:** onchain `seal_approve()` call before decryption
- **No plaintext on backend:** All sensitive data encrypted client-side
