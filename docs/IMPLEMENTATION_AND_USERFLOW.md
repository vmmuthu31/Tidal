# Sui CRM - Complete User Flow & Implementation Roadmap

## Phase 1: Organization Setup

### Step 1: Admin Creates Organization
```
User Action: Click "Create Organization"
Frontend: Show form with org name
User: Enter "Acme Web3 Studio"
Frontend → Sui: Call crm_access_control::create_org_and_registry()
Sui: Creates Org object + OrgAccessRegistry simultaneously
Sui: Sets user as ROLE_ADMIN in the registry
Result: Organization created ✅
```

### Step 2: Admin Invites Team Members
```
User Action: Settings → Team → "Add Member"
Frontend: Show form (wallet address + role selector)
User: Enter 0x123...abc, select "Manager"
Frontend → Sui: Call crm_access_control::add_org_member()
Sui: Verifies caller is admin
Sui: Adds member with ROLE_MANAGER
Result: Team member added ✅
```

---

## Phase 2: Profile Management

### Step 3: Create Contact Profile
```
User Action: Dashboard → "Add Contact"
Frontend: Show form
User: Enter wallet 0x456...def, Twitter @cryptowhale
Frontend → Sui: Call profile::create_profile()
Sui: Creates Profile object
Frontend → Sui: Call crm_access_control::register_profile()
Sui: Maps profile → owner → org
Result: Contact created ✅
```

### Step 4: View Onchain Activity (Automatic)
```
User Action: Click on contact
Frontend → Indexer API: GET /api/profiles/0x456...def/onchain
Indexer: Queries Sui RPC for transactions
Indexer: Returns token holdings, NFTs, DeFi positions
Frontend: Displays enriched profile
Result: Onchain data shown ✅
```

---

## Phase 3: Encrypted Notes & Files with Walrus + Seal

### Step 5: Create Encrypted Note (End-to-End Encryption)
```
User Action: Contact profile → "Add Note"
Frontend: Show editor
User: Type "VIP customer, high-net-worth individual"

ENCRYPTION PIPELINE:
1. Seal SDK encrypts note locally (threshold cryptography: 2-of-4 keys needed)
2. Encrypted blob uploaded to Walrus (50+ distributed publishers)
3. Frontend → Sui: Call crm_access_control::create_encrypted_resource()
   - Stores: blobId (Walrus), encryptionId (Seal), access_level, owner
4. Metadata stored onchain; plaintext NEVER leaves client
Result: Encrypted note saved ✅
```

### Step 6: View Encrypted Note (Decryption with Access Control)
```
User Action: Click note in contact profile
Frontend: Check local access permissions
User: Click "Decrypt & View"

DECRYPTION PIPELINE:
1. Frontend → Sui: Call crm_access_control::seal_approve()
   - Verifies user's role and org membership
   - Sui blockchain confirms access is granted
2. Seal SDK: If seal_approve succeeds, Seal nodes combine key shares
3. Frontend: Downloads encrypted blob from Walrus
4. Frontend: Decrypts locally in browser
5. Plaintext displayed in UI
Result: Note decrypted and visible ✅
```

### Step 7: Upload Encrypted File (Attachments)
```
User Action: Contact profile → "Add Attachment"
Frontend: File picker → Select PDF/Doc/Image
User: Select access level (Viewer/Manager/Admin)

ENCRYPTION & UPLOAD:
1. Seal SDK encrypts file (same threshold crypto as notes)
2. File uploaded to Walrus
3. Frontend → Sui: Call crm_access_control::create_encrypted_resource()
   - Stores: blobId, encryptionId, resource_type: 2 (File)
4. Metadata stored onchain
Result: Encrypted file saved ✅
```

---

## Phase 4: Wallet Integration & Gas Sponsorship (NEW - 2026-03-14)

### zkLogin Users Get Sponsored Gas
```
User Action: Sign in with Google (zkLogin)
Frontend: User gets Sui address from Google OAuth
Transactions: All CRM actions sponsored by Enoki

SPONSORED TRANSACTION FLOW:
1. User builds transaction (e.g., create_org)
2. Frontend calls POST /api/sponsor
   - Backend calls Enoki API (ENOKI_SECRET_KEY)
   - Enoki returns sponsored tx bytes + digest
3. Frontend signs bytes with ephemeral key
4. Frontend calls POST /api/sponsor/{digest}
   - Backend submits to Enoki
   - Enoki broadcasts on-chain
5. Gas paid from org's Enoki pool (not user's wallet)
Result: Gas-free transaction ✅
```

### Wallet Users Still Pay Gas
```
User Action: Connect Sui wallet (dapp-kit)
Transactions: User pays gas from their own balance

DIRECT TRANSACTION FLOW:
1. User builds transaction
2. Frontend signs with wallet's private key
3. Frontend submits directly to Sui RPC
4. User's balance decreases by gas amount
Result: Standard Web3 experience ✅
```

---

## Phase 5: Dynamic Context & Interaction Tracking

### Proposed Implementation
- Replace hardcoded `EXAMPLE_ORG_REGISTRY` with dynamic context
- Implement UI for calling `interaction_log::log_interaction()`
- Log manual touchpoints (calls, meetings, etc.) with timestamp

---

## Phase 6: Encrypted Bot & CRM Tracking Ecosystem (Axum Backend)

### Unified Customer Profiles & Onchain Enrichment
1. **[NEW] [api/webhooks]**: Axum endpoints receive social events (Discord joins, TG messages)
2. **[NEW] [services/ProfileAggregator]**: Correlate wallet addresses, SuiNS/ENS names, social handles
3. **[Walrus/Seal Integration]**: Complete enriched profile encrypted and stored on Walrus

### Engagement & Targeted Messaging
1. Refactor `interaction_log.move` to store encrypted data (Walrus blob_id)
2. Implement `EngagementTracker` service for campaign metrics
3. Implement `Broadcaster` for targeted encrypted messages

### Content Portability & Composability
- Event management DApps can request read-access to VIP segment
- Airdrop tools can utilize onchain criteria without raw PII
- Partner ecosystem collaborates via `seal_approve()` smart contract logic

---

## Implementation Checklist

- [ ] Phase 1: Organization setup (✅ Complete)
- [ ] Phase 2: Profile management (✅ Complete)
- [ ] Phase 3: Walrus integration (✅ Complete)
- [ ] Phase 3: Seal encryption (✅ Complete)
- [ ] Phase 4: Gas sponsorship via Enoki (✅ Complete - 2026-03-14)
- [ ] Phase 5: Dynamic context & interaction logging
- [ ] Phase 6: Bot ecosystem & enrichment
- [ ] Phase 6: Engagement tracking

---

## Core Services Architecture

### `walrusService.ts`
- `storeBlob()`: Upload encrypted blob with 50+ publisher fallback
- `uploadText()`: Direct upload of text/notes
- `fetchBlob()`: Retrieve from 50+ aggregator fallback

### `encryptionService.ts`
- `encryptAndUploadResource()`: Encrypt with Seal, upload to Walrus, store metadata
- Returns: blobId, encryptionId, suiRef

### `decryptionService.ts`
- `createSessionKey()`: Create Seal session key (TTL: 10 min)
- `downloadAndDecryptResources()`: Verify access via seal_approve(), decrypt locally
- Returns: decryptedFileUrls, sessionKey

### `enoki.service.ts` (2026-03-14)
- `createSponsoredTransaction()`: POST /v1/transaction-blocks/sponsor
- `executeSponsoredTransaction()`: POST /v1/transaction-blocks/sponsor/{digest}
- `isSponsorshipConfigured()`: Check ENOKI_SECRET_KEY

---

## Access Control Matrix

| User Role | Own Profile | Viewer Team Member | Manager Team Member | Admin Team Member |
|-----------|-------------|-------------------|---------------------|-------------------|
| Profile Owner | ✅ Full | N/A | N/A | N/A |
| Org Viewer | ✅ Full | ✅ Read Level 1 | ❌ | ❌ |
| Org Manager | ✅ Full | ✅ Read Level 1 | ✅ Read/Edit Level 2 | ❌ |
| Org Admin | ✅ Full | ✅ Read Level 1 | ✅ Read/Edit Level 2 | ✅ Full Level 3 |

---

## Verification Plan

### Manual Testing
1. **Walrus Upload**: Upload note, verify blobId returned, fetch via aggregator
2. **Seal Encryption**: Encrypt note, upload, verify metadata stored onchain
3. **Decryption Flow**: Fetch note, decrypt via seal_approve(), display plaintext
4. **Access Control**: Verify unauthorized users cannot decrypt
5. **Gas Sponsorship**: zkLogin user performs action without SUI balance, Enoki pool charged
6. **Wallet Payments**: Wallet user performs action, balance decreased by gas fee
