# Technical Architecture - One-Liner Codebase Reference

## Frontend Structure

### Providers (`web/lib/providers/`)
- `WalletProvider.tsx` — @mysten/dapp-kit wallet connection
- `ZkLoginProvider.tsx` — zkLogin OAuth + ephemeral keypair management
- `ThemeProvider.tsx` — TailwindCSS theme context

### Hooks (`web/hooks/`)
- `useUnifiedAuth.ts` — Main hook; exports `useUnifiedAccount()`, `useUnifiedTransaction()` (routes wallet→direct, zkLogin→sponsored)
- `useSponsoredTransaction.ts` — zkLogin-only hook; handles Enoki gas sponsorship with injected proof support
- `useUser.ts` — User profile context
- `useSuiNS.ts` — Sui Name Service resolution

### Services (`web/lib/services/`)
- `enoki.service.ts` — `createSponsoredTransaction()`, `executeSponsoredTransaction()`, `isSponsorshipConfigured()` (server-side Enoki API)
- `encryptionService.ts` — `encryptAndUploadResource()` (Seal + Walrus pipeline)
- `decryptionService.ts` — `downloadAndDecryptResources()` (verify access + decrypt locally)
- `walrusService.ts` — `storeBlob()`, `fetchBlob()` (50+ publisher/aggregator fallback)
- `zklogin.service.ts` — `ZkLoginService.fetchZkProof()`, `createTransactionSignature()` (proof generation)

### Config (`web/lib/config/`)
- `contracts.ts` — Package ID, registries, `CRM_SPONSORED_TARGETS` (11 whitelisted Move targets), gas budgets
- `sui.ts` — RPC endpoints, network config
- `api.ts` — API endpoint URLs

### ZkLogin (`web/lib/zklogin/`)
- `zklogin.ts` — `ZkLoginService` (ephemeral keypairs, prover calls, address computation)
- `session.ts` — `SessionManager` (localStorage session/proof cache with 24h TTL)

### Components (`web/components/`)
- `contacts/` — Profile UI, notes editor, profile-notes.tsx
- `forms/` — Organization, member, profile forms (use `useUnifiedTransaction()`)
- `ui/` — Shadcn components (buttons, modals, inputs)

---

## Backend Structure

### API Routes (`web/app/api/`)
- `sponsor/route.ts` — POST /api/sponsor (create sponsored tx via Enoki)
- `sponsor/[digest]/route.ts` — POST /api/sponsor/{digest} (execute signed sponsored tx)
- `sponsor/status/route.ts` — GET /api/sponsor/status (check if sponsorship configured)
- `profiles/[id]/notes/route.ts` — GET /api/profiles/{id}/notes (fetch encrypted resource metadata)
- `webhooks/discord/route.ts` — Discord webhook integration
- `webhooks/telegram/route.ts` — Telegram webhook integration

---

## Smart Contracts (`contracts/sources/`)

### Move Modules
- `org.move` — Organizations: `create_org` event
- `profile.move` — Contact profiles: `create_profile` (points to Walrus + Seal metadata)
- `crm_access_control.move` — Core logic: 11 functions
  - `create_org_and_registry()` — Org + access control in one tx
  - `add_org_member()`, `update_member_role()`, `remove_org_member()` — Team management
  - `register_profile()`, `create_and_register_profile()` — Profile access mapping
  - `create_encrypted_resource()` — Store encrypted note/file metadata
  - `seal_approve()` — Verify decryption access (called by Seal nodes)
- `interaction_log.move` — Activity logging: `log_interaction()`

### Key Objects
- `Org` — name, admin, created_at
- `OrgMember` — role (1=Viewer, 2=Manager, 3=Admin), unique_tag
- `Profile` — wallet_address, crm_data_blob_id (Walrus), crm_data_encryption_id (Seal)
- `EncryptedResource` — metadata for notes/files, access_level, owner

---

## Data Flow

### Encrypted Note Creation
```
User types note → Seal encrypts (2-of-4 threshold) →
Walrus stores blob (50+ publishers) →
create_encrypted_resource() stores metadata onchain →
blobId + encryptionId returned
```

### Encrypted Note Decryption
```
User clicks decrypt → seal_approve() called onchain (verifies access) →
Seal nodes combine key shares (if access granted) →
Blob downloaded from Walrus (50+ aggregators) →
Decrypted locally in browser → Displayed to user
```

### Sponsored Transaction (zkLogin)
```
User builds tx → POST /api/sponsor (backend calls Enoki with ENOKI_SECRET_KEY) →
Enoki returns tx bytes + digest →
User signs with ephemeral key →
POST /api/sponsor/{digest} (submit signature) →
Enoki broadcasts onchain → Gas deducted from org's Enoki pool
```

---

## Configuration & Deployment

### Environment Variables
- `NEXT_PUBLIC_SUI_NETWORK` — "testnet" | "mainnet" | "devnet"
- `NEXT_PUBLIC_SUI_RPC_URL` — RPC endpoint
- `ENOKI_SECRET_KEY` — Enoki private API key (backend only, for sponsorship)
- `NEXT_PUBLIC_ENOKI_API_KEY` — Enoki public API key (frontend, zkLogin nonce/prover)

### Testnet Addresses
- **Package:** `0xd86712244386bdfd82906dae8bed7be6760df054536abde426fd2dc16f9b41a4`
- **Profile Registry:** `0x395e1731de16b7393f80afba04252f18c56e1cf994e9d77c755a759f8bc5c4b0`
- **Example Org Registry:** `0xea7c522c85660fc793d51e64464caf29956594d47997d4217e0a22000cdcd4e6`

### Whitelisted Move Targets (Enoki)
```
0xd867...::org::create_org
0xd867...::crm_access_control::{all 10 functions}
0xd867...::profile::create_profile
0xd867...::interaction_log::log_interaction
(seal_approve NOT whitelisted — Seal nodes call it internally)
```

---

## Key Dependencies
- `@mysten/dapp-kit: ^1.0.2` — Wallet provider
- `@mysten/sui: ^2.3.1` — Sui SDK
- `@mysten/seal: ^1.0.1` — Threshold encryption
- `next: 16.1.6` — React SSR + API routes
- `@mysten/suins: ^1.0.2` — Sui Name Service
- `zod: ^4.3.6` — TypeScript validation

---

## Session & Auth Management

### ZkLogin Flow
1. User clicks "Sign in with Google"
2. Ephemeral keypair generated → stored in localStorage
3. User redirected to Google OAuth
4. JWT returned → zkLogin address derived
5. ZK proof fetched from Mysten prover
6. Proof + JWT cached for 24h (SessionManager)
7. User can perform sponsored transactions

### Wallet Flow
1. User clicks "Connect Wallet"
2. dapp-kit opens wallet selector
3. User approves connection
4. Wallet address returned
5. User can perform transactions (pays own gas)

---

## Access Control Levels
- **Level 1 (Viewer):** Read encrypted data
- **Level 2 (Manager):** Read + Edit encrypted data
- **Level 3 (Admin):** Full access + manage members
- **Owner:** Full access to own profile + all team members

---

## Performance Optimizations
- Walrus: 50+ publishers (write), 50+ aggregators (read) for reliability
- Seal: 2-of-4 threshold requires only half the key servers
- zkLogin: 24h proof cache avoids re-proving on every session
- Gas sponsorship: zkLogin users don't need to manage SUI balance

---

## Critical Paths to Understand
1. **New onchain action?** → Add function to `crm_access_control.move`, whitelist in Enoki portal, export in `CRM_SPONSORED_TARGETS`
2. **New encrypted resource?** → Use `encryptionService.encryptAndUploadResource()` then call `create_encrypted_resource()`
3. **Need user to decrypt?** → Check access via `seal_approve()`, use `decryptionService.downloadAndDecryptResources()`
4. **New auth provider?** → Add to `web/lib/providers/`, update `useUnifiedAuth.ts` routing logic
