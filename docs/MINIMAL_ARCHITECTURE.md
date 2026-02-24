# Minimal Architecture - Optimized for Low Onchain Calls

## Core Principle
**Minimize onchain transactions, maximize Walrus storage**

Instead of creating separate onchain objects for each note/file, we'll:
1. Create **one profile per contact** onchain (minimal metadata)
2. Store **all CRM data in a single encrypted blob** per profile in Walrus
3. Update the blob reference onchain only when needed

---

## Simplified Data Model

### Onchain (Sui Blockchain) - MINIMAL
```
Organization
├─ id: UID
├─ name: String
├─ admin: address
└─ created_at: u64

OrgMember
├─ id: UID
├─ org_id: ID
├─ address: address
├─ unique_tag: String  // "MEMBER_001", "MEMBER_002"
├─ role: u8
└─ joined_at: u64

Profile (Contact)
├─ id: UID
├─ org_id: ID
├─ wallet_address: address
├─ unique_tag: String  // "CONTACT_001", "CONTACT_002"
├─ crm_data_blob_id: vector<u8>  // Walrus blob ID
├─ crm_data_encryption_id: vector<u8>  // Seal encryption ID
├─ last_updated: u64
└─ created_by: address
```

### Offchain (Walrus) - ALL CRM DATA
```json
{
  "profile_id": "0xabc...def",
  "unique_tag": "CONTACT_001",
  "wallet_address": "0x123...456",
  
  // Social & Contact Info
  "socials": {
    "twitter": "@cryptowhale",
    "discord": "whale#1234",
    "telegram": "@whale_tg",
    "email": "whale@example.com"
  },
  
  // Tags & Segments
  "tags": ["VIP", "Investor", "Early Adopter"],
  "segments": ["High Value", "Active"],
  
  // Notes (all notes in one place)
  "notes": [
    {
      "id": "note_001",
      "content": "Strategy discussion - wants $50K investment...",
      "created_at": "2026-02-10T10:30:00Z",
      "created_by": "0xadmin...",
      "access_level": 3  // Admin only
    },
    {
      "id": "note_002",
      "content": "Follow up scheduled for next week",
      "created_at": "2026-02-10T14:20:00Z",
      "created_by": "0xmanager...",
      "access_level": 2  // Manager+
    }
  ],
  
  // Files (references to separate Walrus blobs)
  "files": [
    {
      "id": "file_001",
      "name": "partnership_agreement.pdf",
      "blob_id": "walrus_blob_xyz...",
      "encryption_id": "seal_enc_xyz...",
      "size": 2400000,
      "content_type": "application/pdf",
      "uploaded_at": "2026-02-10T11:00:00Z",
      "uploaded_by": "0xadmin...",
      "access_level": 3
    }
  ],
  
  // Interactions (all interactions in one place)
  "interactions": [
    {
      "id": "int_001",
      "type": "discord_message",
      "description": "Asked about token launch",
      "timestamp": "2026-02-09T15:30:00Z",
      "metadata": {
        "channel": "#general",
        "message_id": "123456789"
      }
    },
    {
      "id": "int_002",
      "type": "onchain_mint",
      "description": "Minted NFT #1234",
      "timestamp": "2026-02-10T09:15:00Z",
      "metadata": {
        "tx_hash": "0xabc...",
        "collection": "Genesis Collection"
      }
    }
  ],
  
  // Custom Fields
  "custom_fields": {
    "investment_amount": "$50,000",
    "equity_ask": "2%",
    "priority": "High"
  },
  
  // Metadata
  "version": 3,  // Increment on each update
  "last_updated": "2026-02-10T16:45:00Z",
  "last_updated_by": "0xadmin..."
}
```

---

## Optimized Flows

### Flow 1: Create Organization (1 onchain tx)

```typescript
// Single transaction
const tx = new Transaction();

// Create org
const org = tx.moveCall({
  target: `${PACKAGE_ID}::org::create_org`,
  arguments: [
    tx.pure.string("Acme Web3 Studio")
  ],
});

// Transfer to admin
tx.transferObjects([org], adminAddress);

// Execute
await signAndExecute(tx);
```

**Onchain calls:** 1  
**Walrus calls:** 0  
**Cost:** ~0.01 SUI

---

### Flow 2: Add Team Member (1 onchain tx)

```typescript
// Single transaction
const tx = new Transaction();

// Create member with unique tag
const member = tx.moveCall({
  target: `${PACKAGE_ID}::org::add_member`,
  arguments: [
    tx.object(orgId),
    tx.pure.address(memberAddress),
    tx.pure.string("MEMBER_001"),  // Unique tag
    tx.pure.u8(CRM_ROLES.MANAGER)
  ],
});

tx.transferObjects([member], memberAddress);

await signAndExecute(tx);
```

**Onchain calls:** 1  
**Walrus calls:** 0  
**Cost:** ~0.005 SUI

---

### Flow 3: Create Contact Profile (1 onchain tx + 1 Walrus upload)

```typescript
// Step 1: Create initial CRM data blob
const initialData = {
  profile_id: "", // Will be filled after creation
  unique_tag: "CONTACT_001",
  wallet_address: contactWalletAddress,
  socials: {
    twitter: "@cryptowhale",
    discord: "whale#1234"
  },
  tags: ["VIP"],
  notes: [],
  files: [],
  interactions: [],
  custom_fields: {},
  version: 1,
  last_updated: new Date().toISOString(),
  last_updated_by: currentUserAddress
};

// Step 2: Encrypt and upload to Walrus
const jsonString = JSON.stringify(initialData);
const encryptionResult = await crmEncryptionService.encryptAndUploadResource(
  jsonString,
  "", // No profile ID yet
  orgId,
  orgRegistryId,
  'note', // Using 'note' type for JSON data
  CRM_ROLES.VIEWER, // Everyone in org can see basic info
  currentUserAddress
);

// Step 3: Create profile onchain with blob reference
const tx = new Transaction();

const profile = tx.moveCall({
  target: `${PACKAGE_ID}::profile::create_profile_with_data`,
  arguments: [
    tx.object(orgId),
    tx.pure.address(contactWalletAddress),
    tx.pure.string("CONTACT_001"),
    tx.pure.vector('u8', Array.from(Buffer.from(encryptionResult.blobId!))),
    tx.pure.vector('u8', Array.from(Buffer.from(encryptionResult.encryptionId!))),
  ],
});

tx.transferObjects([profile], currentUserAddress);

await signAndExecute(tx);
```

**Onchain calls:** 1  
**Walrus calls:** 1  
**Cost:** ~0.005 SUI + ~$0.0001 Walrus

---

### Flow 4: Add Note to Contact (0 onchain tx, 1 Walrus update)

**This is the key optimization!**

```typescript
async function addNoteToContact(
  profileId: string,
  orgId: string,
  orgRegistryId: string,
  noteContent: string,
  accessLevel: number
) {
  // Step 1: Download and decrypt current CRM data
  const sessionKey = await crmDecryptionService.createSessionKey(currentUserAddress);
  
  const currentBlobId = await getProfileBlobId(profileId); // Query Sui
  const currentEncryptionId = await getProfileEncryptionId(profileId);
  
  const resources: ResourceMetadata[] = [{
    resource_id: profileId,
    profile_id: profileId,
    org_id: orgId,
    resource_type: 'note',
    blob_id: currentBlobId,
    encryption_id: currentEncryptionId,
    access_level: 1,
    created_at: new Date().toISOString(),
    created_by: currentUserAddress,
    walrus_url: `https://aggregator.../v1/blobs/${currentBlobId}`,
    sui_explorer_url: `https://suiscan.xyz/testnet/object/${profileId}`,
  }];
  
  const decryptResult = await crmDecryptionService.downloadAndDecryptResources(
    resources,
    orgRegistryId,
    sessionKey
  );
  
  // Step 2: Parse current data
  const response = await fetch(decryptResult.decryptedFileUrls![0]);
  const currentData = await response.json();
  
  // Step 3: Add new note
  const newNote = {
    id: `note_${Date.now()}`,
    content: noteContent,
    created_at: new Date().toISOString(),
    created_by: currentUserAddress,
    access_level: accessLevel
  };
  
  currentData.notes.push(newNote);
  currentData.version += 1;
  currentData.last_updated = new Date().toISOString();
  currentData.last_updated_by = currentUserAddress;
  
  // Step 4: Encrypt and upload updated data
  const updatedJsonString = JSON.stringify(currentData);
  const encryptionResult = await crmEncryptionService.encryptAndUploadResource(
    updatedJsonString,
    profileId,
    orgId,
    orgRegistryId,
    'note',
    CRM_ROLES.VIEWER, // Base access level for the blob
    currentUserAddress
  );
  
  // Step 5: Update profile onchain with new blob reference
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::profile::update_crm_data`,
    arguments: [
      tx.object(profileId),
      tx.pure.vector('u8', Array.from(Buffer.from(encryptionResult.blobId!))),
      tx.pure.vector('u8', Array.from(Buffer.from(encryptionResult.encryptionId!))),
      tx.pure.u64(Date.now())
    ],
  });
  
  await signAndExecute(tx);
  
  return newNote.id;
}
```

**Onchain calls:** 1 (just to update blob reference)  
**Walrus calls:** 2 (1 download, 1 upload)  
**Cost:** ~0.003 SUI + ~$0.0001 Walrus

**Key Benefit:** All notes are in ONE blob, not separate objects!

---

### Flow 5: Add Multiple Items (Batch Update)

```typescript
async function batchUpdateContact(
  profileId: string,
  updates: {
    notes?: Array<{content: string, access_level: number}>,
    tags?: string[],
    socials?: {twitter?: string, discord?: string},
    interactions?: Array<{type: string, description: string}>
  }
) {
  // Step 1: Download current data
  const currentData = await downloadAndDecryptProfileData(profileId);
  
  // Step 2: Apply all updates
  if (updates.notes) {
    updates.notes.forEach(note => {
      currentData.notes.push({
        id: `note_${Date.now()}_${Math.random()}`,
        content: note.content,
        created_at: new Date().toISOString(),
        created_by: currentUserAddress,
        access_level: note.access_level
      });
    });
  }
  
  if (updates.tags) {
    currentData.tags = [...new Set([...currentData.tags, ...updates.tags])];
  }
  
  if (updates.socials) {
    currentData.socials = { ...currentData.socials, ...updates.socials };
  }
  
  if (updates.interactions) {
    updates.interactions.forEach(interaction => {
      currentData.interactions.push({
        id: `int_${Date.now()}_${Math.random()}`,
        type: interaction.type,
        description: interaction.description,
        timestamp: new Date().toISOString(),
        metadata: {}
      });
    });
  }
  
  currentData.version += 1;
  currentData.last_updated = new Date().toISOString();
  
  // Step 3: Upload once
  const encryptionResult = await encryptAndUploadData(currentData);
  
  // Step 4: Update onchain once
  await updateProfileBlobReference(profileId, encryptionResult);
}
```

**Onchain calls:** 1 (regardless of how many items added)  
**Walrus calls:** 2  
**Cost:** ~0.003 SUI + ~$0.0001 Walrus

**Key Benefit:** Add 10 notes, 5 tags, 3 interactions = still just 1 onchain tx!

---

## Updated Smart Contract Structure

### Minimal Move Contracts

```move
// org.move
module sui_crm::org {
    public struct Org has key {
        id: UID,
        name: String,
        admin: address,
        created_at: u64
    }
    
    public struct OrgMember has key {
        id: UID,
        org_id: ID,
        address: address,
        unique_tag: String,  // "MEMBER_001"
        role: u8,
        joined_at: u64
    }
    
    public entry fun create_org(name: String, ctx: &mut TxContext) {
        let org = Org {
            id: object::new(ctx),
            name,
            admin: tx_context::sender(ctx),
            created_at: tx_context::epoch_timestamp_ms(ctx)
        };
        transfer::transfer(org, tx_context::sender(ctx));
    }
    
    public entry fun add_member(
        org: &Org,
        member_address: address,
        unique_tag: String,
        role: u8,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == org.admin, ENotAdmin);
        
        let member = OrgMember {
            id: object::new(ctx),
            org_id: object::id(org),
            address: member_address,
            unique_tag,
            role,
            joined_at: tx_context::epoch_timestamp_ms(ctx)
        };
        
        transfer::transfer(member, member_address);
    }
}

// profile.move
module sui_crm::profile {
    public struct Profile has key {
        id: UID,
        org_id: ID,
        wallet_address: address,
        unique_tag: String,  // "CONTACT_001"
        crm_data_blob_id: vector<u8>,  // Walrus blob ID
        crm_data_encryption_id: vector<u8>,  // Seal encryption ID
        last_updated: u64,
        created_by: address
    }
    
    public entry fun create_profile_with_data(
        org_id: ID,
        wallet_address: address,
        unique_tag: String,
        blob_id: vector<u8>,
        encryption_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        let profile = Profile {
            id: object::new(ctx),
            org_id,
            wallet_address,
            unique_tag,
            crm_data_blob_id: blob_id,
            crm_data_encryption_id: encryption_id,
            last_updated: tx_context::epoch_timestamp_ms(ctx),
            created_by: tx_context::sender(ctx)
        };
        
        transfer::transfer(profile, tx_context::sender(ctx));
    }
    
    public entry fun update_crm_data(
        profile: &mut Profile,
        new_blob_id: vector<u8>,
        new_encryption_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        profile.crm_data_blob_id = new_blob_id;
        profile.crm_data_encryption_id = new_encryption_id;
        profile.last_updated = tx_context::epoch_timestamp_ms(ctx);
    }
}
```

---

## Access Control Strategy

### Option 1: Blob-Level Access (Simpler)
- Entire CRM data blob has one access level
- Everyone with access sees everything
- Simplest implementation

### Option 2: Field-Level Access (More Flexible)
- Each note/file has its own access_level in the JSON
- Frontend filters based on user role
- Backend validates on decrypt

**Recommended: Option 2** - More flexible, still minimal onchain calls

---

## Cost Comparison

### Old Approach (Separate Objects)
```
Create profile: 1 tx
Add note 1: 1 tx
Add note 2: 1 tx
Add note 3: 1 tx
Add file 1: 1 tx
Add interaction 1: 1 tx
Add interaction 2: 1 tx
Add interaction 3: 1 tx

Total: 8 transactions
Cost: ~0.05 SUI
```

### New Approach (Single Blob)
```
Create profile: 1 tx (includes initial data)
Update with 3 notes: 1 tx
Update with 1 file: 1 tx
Update with 3 interactions: 1 tx

Total: 4 transactions
Cost: ~0.02 SUI (60% savings!)
```

### Batch Approach (Best)
```
Create profile: 1 tx
Batch update (3 notes + 1 file + 3 interactions): 1 tx

Total: 2 transactions
Cost: ~0.01 SUI (80% savings!)
```

---

## Implementation Checklist

### Smart Contracts
- [ ] Update `org.move` with unique_tag field
- [ ] Update `profile.move` with blob_id and encryption_id fields
- [ ] Add `update_crm_data()` function
- [ ] Remove separate note/file/interaction modules
- [ ] Simplify access control (just check org membership + role)

### Frontend Services
- [ ] Create `ProfileDataService` for blob management
- [ ] Implement `downloadProfileData()`
- [ ] Implement `updateProfileData()`
- [ ] Implement `batchUpdateProfileData()`
- [ ] Add JSON schema validation

### Backend
- [ ] Create API endpoints for profile data CRUD
- [ ] Implement caching for frequently accessed profiles
- [ ] Add versioning support
- [ ] Implement conflict resolution (optimistic locking)

---

## Benefits Summary

✅ **80% fewer onchain transactions**  
✅ **Lower gas costs**  
✅ **Simpler smart contracts**  
✅ **Easier to maintain**  
✅ **Better for batch operations**  
✅ **Still fully encrypted and secure**  
✅ **Flexible access control**  
✅ **Version tracking built-in**  

This is a **much more efficient architecture** for a CRM system! 🚀
