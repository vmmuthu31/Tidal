# Goal Description
Integrate decentralized storage (Walrus) and encryption (Seal) to securely store and manage private notes and files within the Sui CRM. The goal is to first implement direct upload to Walrus for notes, and subsequently integrate Seal to encrypt those notes based on role-based access control before uploading.

## Proposed Changes

### Documentation
#### [MODIFY] [USER_FLOW.md](file:///mnt/d/projects/Sui-CRM/docs/USER_FLOW.md)
- Updated [docs/USER_FLOW.md](file:///mnt/d/projects/Sui-CRM/docs/USER_FLOW.md) to explain the necessity and importance of encrypted notes within the CRM context.

---

### Core Services

#### [NEW] [walrusService.ts](file:///mnt/d/projects/Sui-CRM/web/lib/services/walrusService.ts)
Creates a service dedicated to interacting with Walrus publishers and aggregators.
- Implements [storeBlob](file:///mnt/d/projects/Sui-CRM/web/lib/services/encryptionService.ts#134-159) with fallback logic across multiple Walrus testnet publishers.
- Implements [uploadText](file:///mnt/d/projects/Sui-CRM/web/lib/services/walrusService.ts#113-160) to upload raw text/notes directly to Walrus.
- Implements `fetchBlob` to retrieve blobs from Walrus aggregators natively.

#### [NEW] [encryptionService.ts](file:///mnt/d/projects/Sui-CRM/web/lib/services/encryptionService.ts)
Creates a service wrapping the `@mysten/seal` SDK, handling encryption before uploading to Walrus.
- Implements `encryptAndUploadNote` which generates an encryption ID, encrypts the note content via Seal, and then uses `walrusService` to upload the encrypted blob.
- Implements `decryptNote` which retrieves the encrypted blob from Walrus and requests a decryption key via `seal_approve()` on Sui before decrypting the content.

## Verification Plan

### Automated Tests
- N/A (We will rely on manual testing for end-to-end integration for the Web3 wallet / SDK interactions).

### Manual Verification
1. **Walrus Direct Upload**: Create a temporary script or UI button to trigger a direct upload of a simple text note to Walrus, ensuring we receive a valid `blobId` back. Use `curl` or the browser to fetch the note from the Walrus aggregator using the `blobId` to verify it was stored correctly.
2. **Seal Encryption + Walrus**: Test the full flow in the UI to encrypt a note, upload it to Walrus, and verify the returned `blobId` and `encryptionId`.
3. **Decryption Flow**: Test fetching the note using the `blobId`, requesting decryption via Seal using the active wallet session, and displaying the plaintext note.
4. **Access Control**: Verify that a user without the correct role fails to decrypt the note (Seal returns an error or denies access based on on-chain policies).

---

## Phase 3: Wallet Integration for Decryption (NEW)

To decrypt real notes using the deployed CRM smart contracts, we must authenticate the request using the user's active Sui wallet.

**Proposed Changes:**
#### [MODIFY] [ProfileNotes.tsx](file:///mnt/d/projects/Sui-CRM/web/components/contacts/profile-notes.tsx)
- Integrate the `@mysten/dapp-kit` hooks: `useCurrentAccount` and `useSignPersonalMessage`.
- When the user clicks "Simulate Decrypt", generate an ephemeral [SessionKey](file:///mnt/d/projects/Sui-CRM/web/lib/services/decryptionService.ts#64-76) using their `userAddress`.
- Prompt the user to sign the session key bytes using their active browser wallet.
- Pass the signed session key to the `crmDecryptionService`.

#### [MODIFY] [decryptionService.ts](file:///mnt/d/projects/Sui-CRM/web/lib/services/decryptionService.ts)
- Utilize the `seal_approve` smart contract function mapped to the correct CRM package identifier.
- Build the `TransactionBlock` representing the authorization call and provide those `txBytes` directly to `sealClient.decrypt`.

---

## Phase 4: API & Data Indexing Layer (Next Up)

Currently, `EncryptedResource` objects (notes) are minted on the Sui blockchain, but the frontend lacks a way to query them efficiently. To display a list of notes for a specific profile, we need an indexing layer.

**Proposed Changes:**
#### [NEW] [api/profiles/[id]/notes/route.ts](file:///mnt/d/projects/Sui-CRM/web/app/api/profiles/[id]/notes/route.ts)
- Create a Next.js API route to either query the Sui RPC (getting objects owned by the profile/user) or read from a local Postgres database synced via a Sui Indexer.
- Endpoint will return a list of [ResourceMetadata](file:///mnt/d/projects/Sui-CRM/web/lib/services/decryptionService.ts#44-58) (Blob ID, Encryption ID, Resource Object ID, Access Level) for a given Profile ID.

#### [MODIFY] [ProfileNotes.tsx](file:///mnt/d/projects/Sui-CRM/web/components/contacts/profile-notes.tsx)
- Remove the manual "Test Decryption Form" where users paste Blob IDs.
- Fetch the list of notes from the new API endpoint automatically on load.
- Render a list of notes, each with a "Decrypt & View" button that triggers the Wallet signature flow.

---

## Phase 5: File Attachments (Seal + Walrus)

**Proposed Changes:**
#### [NEW] [FileUploader.tsx](file:///mnt/d/projects/Sui-CRM/web/components/contacts/file-uploader.tsx)
- Build a UI component to select a file (PDF, Doc, Image) and an Access Level.
- Convert the file to `Uint8Array`, encrypt it via `SealSDK`, upload to [Walrus](file:///mnt/d/projects/Sui-CRM/web/lib/services/walrusService.ts#61-197), and call `create_encrypted_resource` on Sui with `resource_type: 2 (File)`.

#### [MODIFY] [decryptionService.ts](file:///mnt/d/projects/Sui-CRM/web/lib/services/decryptionService.ts)
- Ensure the decryption service handles different MIME types correctly based on the `resource_type` or metadata when creating Blob URLs for downloads.

---

## Phase 6: Dynamic Context & Interaction Tracking

**Proposed Changes:**
- **Dynamic Org/Profile Context:** Replace the hardcoded `EXAMPLE_ORG_REGISTRY` and `MOCK_VALID_ADDRESS` in forms with actual active Organization contexts fetched from the user's wallet connection.
- **Log Interaction Form:** Implement the UI and Sui transaction builder for calling `interaction_log::log_interaction()` to save manual touchpoints.

---

## Phase 7: Encrypted Bot & CRM Tracking Ecosystem (Axum Backend)

The CRM system includes 4 dedicated bots (`discord-bot`, `telegram-bot`, `twitter-bot`, `farcaster-bot`). Instead of merely tracking these interactions in plaintext Postgres tables, the Axum backend will act as the orchestration layer to **encrypt all community engagement data via the Seal SDK and store it trustlessly on Walrus**, ensuring privacy while maintaining on-chain composability.

### Unified Customer Profiles & Onchain Enrichment
**Proposed Changes:**
1. **[NEW] [api/webhooks]**: Axum endpoints receive social events (Discord joins, TG messages).
2. **[NEW] [services/ProfileAggregator]**: The Axum backend will correlate wallet addresses, SuiNS/ENS names, and social handles into a single JSON profile object. It will periodically poll the Sui Indexer to enrich this profile with on-chain actions (mints, stakes).
3. **[Walrus/Seal Integration]**: The complete enriched profile is encrypted using Seal and stored periodically on Walrus. Only authorized team members (Admin/Managers) can decrypt the complete picture.

### Engagement & Targeted Messaging
**Proposed Changes:**
1. **[MODIFY] [interaction_log.move]**: Currently, `log_interaction` stores string data natively on-chain. This must be refactored to accept an `EncryptedResource` schema (similar to notes) pointing to a Walrus blob_id.
2. **[NEW] [services/EngagementTracker]**: Tracks campaign metrics and content views. Like notes, these metrics are grouped by segment and encrypted. 
3. **[NEW] [services/Broadcaster]**: Allows role-authorized users to send targeted encrypted messages to segments. The Axum backend decrypts the targeted segment criteria via Seal, securely maps users to their Telegram/Discord handles, and delivers the message.

### Content Portability & Composability
**Proposed Changes:**
By storing the CRM profiles and engagement data as secure `EncryptedResource` objects on Sui:
- Event management DApps can request read-access to the CRM's VIP segment object to auto-sync invite lists.
- Airdrop tools can utilize the onchain criteria without needing the raw PII.
- All partner ecosystem collaborations can integrate the CRM data relying on the core `seal_approve()` smart contract logic.
