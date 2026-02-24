# Complete Encryption/Decryption Flow - User & Technical Perspective

## Overview: What Gets Encrypted vs What Stays Public

### 🔓 **PUBLIC (Onchain, No Encryption)**
- Organization name
- Profile wallet addresses
- Social handles (Twitter, Discord, Telegram)
- Tags (VIP, Investor, Early Adopter)
- Interaction timestamps and types
- Onchain transaction history (public blockchain data)
- Team member roles and addresses

### 🔐 **ENCRYPTED (Seal + Walrus)**
- **Private notes** about contacts (strategy, deals, conversations)
- **Confidential files** (contracts, NDAs, pitch decks)
- **Internal tags** (e.g., "whale", "VC lead", "potential investor")
- **Sensitive metadata** (deal amounts, equity discussions)

---

## Flow 1: Organization Setup (No Encryption)

### User Perspective
```
Admin opens app → Click "Create Organization" → 
Enter "Acme Web3 Studio" → Click Create →
Organization created ✅
```

### Technical Flow
```
Frontend                    Sui Blockchain
   │                             │
   │  1. Connect Wallet          │
   ├─────────────────────────────▶
   │                             │
   │  2. Create Transaction      │
   │     org::create_org()       │
   ├─────────────────────────────▶
   │                             │
   │                        Creates Org object
   │                        Creates OrgAccessRegistry
   │                        Sets admin as ROLE_ADMIN
   │                             │
   │  3. Org ID + Registry ID    │
   ◀─────────────────────────────┤
   │                             │
Store in local state
```

**What's Encrypted:** Nothing  
**What's Public:** Organization name, admin address

---

## Flow 2: Adding Team Members (No Encryption)

### User Perspective
```
Admin → Settings → Team → "Add Member" →
Enter wallet: 0x123...abc →
Select role: Manager →
Click "Add" →
Team member added ✅
```

### Technical Flow
```
Frontend                    Sui Blockchain
   │                             │
   │  add_org_member()           │
   │  - registry: OrgAccessRegistry
   │  - member: 0x123...abc      │
   │  - role: ROLE_MANAGER (2)   │
   ├─────────────────────────────▶
   │                             │
   │                        Verifies caller is ADMIN
   │                        Adds member to registry
   │                        Emits OrgMemberAdded event
   │                             │
   │  Success                    │
   ◀─────────────────────────────┤
```

**What's Encrypted:** Nothing  
**What's Public:** Member address, role level

---

## Flow 3: Creating Contact Profile (No Encryption)

### User Perspective
```
User → Dashboard → "Add Contact" →
Fill form:
  - Wallet: 0x456...def
  - Twitter: @cryptowhale
  - Discord: whale#1234
  - Tags: [VIP] [Investor]
→ Click "Create Contact" →
Contact created ✅
```

### Technical Flow
```
Frontend                    Sui Blockchain
   │                             │
   │  1. create_profile()        │
   │     username: "@cryptowhale"│
   ├─────────────────────────────▶
   │                             │
   │                        Creates Profile object
   │                             │
   │  Profile ID                 │
   ◀─────────────────────────────┤
   │                             │
   │  2. register_profile()      │
   │     - profile_id            │
   │     - owner: current user   │
   │     - org_id                │
   ├─────────────────────────────▶
   │                             │
   │                        Maps profile → owner → org
   │                        Emits ProfileRegistered
   │                             │
   │  Success                    │
   ◀─────────────────────────────┤
```

**What's Encrypted:** Nothing  
**What's Public:** Wallet address, social handles, tags, owner

---

## Flow 4: Creating ENCRYPTED Note (🔐 ENCRYPTION HAPPENS HERE)

### User Perspective
```
User → Contact Profile → Notes Tab → "Add Note" →
Rich text editor appears →
User types:
  "Strategy Discussion
   - Wants to invest $50K in next round
   - Interested in becoming advisor
   - Asking for 2% equity
   
   Follow up: Schedule call with CEO"
   
→ Set access: "Admins Only" →
Click "Save Note" →
[Encrypting... Uploading... Saving...]
→ Note saved ✅
```

### Technical Flow (DETAILED)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION PHASE                              │
└─────────────────────────────────────────────────────────────────┘

Frontend
   │
   │  User clicks "Save Note"
   │  Note content: "Strategy Discussion..."
   │  Access level: ROLE_ADMIN (3)
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 1: Generate Encryption ID                       │
│                                                       │
│ const nonce = crypto.getRandomValues(5 bytes)       │
│ const policyBytes = fromHex(orgRegistryId)          │
│ const encryptionId = toHex([policyBytes, nonce])    │
│                                                       │
│ Result: 0x789abc...def123 (encryption ID)           │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 2: Convert Note to Bytes                        │
│                                                       │
│ const encoder = new TextEncoder()                   │
│ const noteBytes = encoder.encode(noteContent)       │
│                                                       │
│ Result: Uint8Array[245 bytes]                       │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 3: Encrypt with Seal                            │
│                                                       │
│ sealClient.encrypt({                                 │
│   threshold: 2,                                      │
│   packageId: PACKAGE_ID,                            │
│   id: encryptionId,                                  │
│   data: noteBytes                                    │
│ })                                                   │
│                                                       │
│ Seal distributes key shares to key servers          │
│ Returns encrypted blob                               │
│                                                       │
│ Result: Uint8Array[512 bytes] (encrypted)           │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 4: Upload to Walrus                             │
│                                                       │
│ fetch('https://publisher.../v1/blobs', {            │
│   method: 'PUT',                                     │
│   body: encryptedBytes                               │
│ })                                                   │
│                                                       │
│ Walrus stores encrypted blob                         │
│ Returns blob_id                                      │
│                                                       │
│ Result: blob_id = "abc123xyz..."                    │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 5: Create EncryptedResource Onchain             │
│                                                       │
│ tx.moveCall({                                        │
│   target: 'create_encrypted_resource',              │
│   arguments: [                                       │
│     profileId,                                       │
│     orgId,                                           │
│     RESOURCE_TYPE.NOTE (1),                         │
│     blob_id,                                         │
│     encryptionId,                                    │
│     ROLE_ADMIN (3), // access_level                 │
│     timestamp                                        │
│   ]                                                  │
│ })                                                   │
│                                                       │
│ Sui creates EncryptedResource object                │
│ Emits ResourceCreated event                          │
│                                                       │
│ Result: resource_id = 0xabc...def                   │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 6: Store Metadata in Backend DB                 │
│                                                       │
│ POST /api/encryption/note                           │
│ {                                                    │
│   profile_id,                                        │
│   org_id,                                            │
│   resource_type: 'note',                            │
│   blob_id,                                           │
│   encryption_id,                                     │
│   access_level: 3,                                   │
│   created_by: userAddress                           │
│ }                                                    │
│                                                       │
│ Backend stores in PostgreSQL for fast queries       │
└──────────────────────────────────────────────────────┘
   │
   ▼
 Done! Note is encrypted and saved ✅
```

**What's Encrypted:** The entire note content  
**What's Public:** That a note exists, who created it, when, and minimum role required  
**Where Encrypted Data Lives:** Walrus (decentralized storage)  
**Where Metadata Lives:** Sui blockchain + Backend database

---

## Flow 5: Viewing ENCRYPTED Note (🔓 DECRYPTION HAPPENS HERE)

### User Perspective
```
Admin → Contact Profile → Notes Tab →
Sees list:
  📝 "Strategy Discussion" - Jan 15 - Admins only
  
→ Click "View" →
[Creating session key... Please sign message]
→ User signs with wallet →
[Checking access... Downloading... Decrypting...]
→ Note content displayed ✅

"Strategy Discussion
 - Wants to invest $50K in next round
 - Interested in becoming advisor
 - Asking for 2% equity
 
 Follow up: Schedule call with CEO"
```

### Technical Flow (DETAILED)

```
┌─────────────────────────────────────────────────────────────────┐
│                    DECRYPTION PHASE                              │
└─────────────────────────────────────────────────────────────────┘

Frontend
   │
   │  User clicks "View Note"
   │  Has: resource_id, blob_id, encryption_id, access_level
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 1: Create Session Key                           │
│                                                       │
│ const sessionKey = await SessionKey.create({        │
│   address: userAddress,                              │
│   packageId: PACKAGE_ID,                            │
│   ttlMin: 10                                         │
│ })                                                   │
│                                                       │
│ User signs personal message with wallet              │
│ Session key valid for 10 minutes                     │
│                                                       │
│ Result: SessionKey object                           │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 2: Check Access (Frontend Validation)           │
│                                                       │
│ Query Sui:                                           │
│   - Is user profile owner? → No                     │
│   - Is user org member? → Yes                       │
│   - User role: ROLE_ADMIN (3)                       │
│   - Required role: ROLE_ADMIN (3)                   │
│   - 3 >= 3? → Yes ✅                                │
│                                                       │
│ Access granted, proceed to decrypt                   │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 3: Download Encrypted Blob from Walrus          │
│                                                       │
│ fetch('https://aggregator.../v1/blobs/' + blob_id)  │
│                                                       │
│ Walrus returns encrypted blob                        │
│                                                       │
│ Result: Uint8Array[512 bytes] (still encrypted)     │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 4: Parse Encrypted Object                       │
│                                                       │
│ const encryptedObj = EncryptedObject.parse(blob)    │
│ const fullId = encryptedObj.id                      │
│                                                       │
│ Result: fullId for Seal verification                │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 5: Create Seal Approval Transaction             │
│                                                       │
│ const tx = new Transaction()                        │
│ tx.moveCall({                                        │
│   target: 'crm_access_control::seal_approve',      │
│   arguments: [                                       │
│     resource_id,      // EncryptedResource object   │
│     orgRegistryId,    // OrgAccessRegistry          │
│     profileRegistryId // ProfileAccessRegistry      │
│   ]                                                  │
│ })                                                   │
│                                                       │
│ Build transaction bytes (NOT executed yet)          │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 6: Request Decryption from Seal                 │
│                                                       │
│ sealClient.decrypt({                                 │
│   data: encryptedBytes,                              │
│   sessionKey: sessionKey,                            │
│   txBytes: txBytes  // seal_approve transaction     │
│ })                                                   │
│                                                       │
│ Seal key servers:                                    │
│ 1. Simulate the seal_approve transaction            │
│ 2. Check if it would succeed (access control)       │
│ 3. If yes, provide key shares                       │
│ 4. Combine shares to decrypt                        │
│                                                       │
│ Result: Uint8Array[245 bytes] (decrypted!)          │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 7: Convert Bytes to Text                        │
│                                                       │
│ const decoder = new TextDecoder()                   │
│ const noteText = decoder.decode(decryptedBytes)     │
│                                                       │
│ Result: "Strategy Discussion..."                    │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 8: Display to User                              │
│                                                       │
│ Render note in UI                                    │
│ User can read the decrypted content                  │
└──────────────────────────────────────────────────────┘
   │
   ▼
 Done! User sees decrypted note ✅
```

**Key Point:** The actual decryption happens **client-side** using Seal. The encrypted data never leaves Walrus in plaintext. Seal key servers verify access by simulating the `seal_approve` transaction onchain.

---

## Flow 6: Access Denied Scenario (Manager tries to view Admin-only note)

### User Perspective
```
Manager → Contact Profile → Notes Tab →
Sees list:
  📝 "Strategy Discussion" - Jan 15 - Admins only
  
→ Click "View" →
[Creating session key... Please sign message]
→ User signs with wallet →
[Checking access...]
→ ❌ "Access Denied: This note requires Admin role"
```

### Technical Flow

```
Frontend
   │
   │  Manager clicks "View Note"
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 1: Create Session Key                           │
│ ✅ Success                                           │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 2: Check Access                                 │
│                                                       │
│ Query Sui:                                           │
│   - Is user profile owner? → No                     │
│   - Is user org member? → Yes                       │
│   - User role: ROLE_MANAGER (2)                     │
│   - Required role: ROLE_ADMIN (3)                   │
│   - 2 >= 3? → No ❌                                 │
│                                                       │
│ Access DENIED                                        │
└──────────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Step 3: Seal Verification (if we tried anyway)       │
│                                                       │
│ Seal simulates seal_approve transaction:            │
│                                                       │
│ check_access_policy() returns false                 │
│ Transaction would fail with ENoAccess               │
│                                                       │
│ Seal REFUSES to provide decryption keys             │
└──────────────────────────────────────────────────────┘
   │
   ▼
 Show error: "Access Denied" ❌
```

**Security:** Even if someone bypasses frontend checks, Seal key servers will refuse to provide decryption keys because the onchain access control fails.

---

## Flow 7: Profile Owner Always Has Access

### User Perspective
```
Contact (owns their profile) → My Profile → Notes Tab →
Sees note created by Admin:
  📝 "Strategy Discussion" - Jan 15 - Admins only
  
→ Click "View" →
[Checking access... Downloading... Decrypting...]
→ Note content displayed ✅

(Even though it's "Admins only", profile owner can see it)
```

### Technical Flow

```
┌──────────────────────────────────────────────────────┐
│ Access Check in seal_approve()                       │
│                                                       │
│ check_access_policy(caller, resource, ...):         │
│                                                       │
│ // First check: Profile ownership                   │
│ if (caller == profile_owner) {                      │
│   return true  ✅  // BYPASS role check             │
│ }                                                    │
│                                                       │
│ // Second check: Org member with sufficient role    │
│ if (org_member && role >= access_level) {           │
│   return true                                        │
│ }                                                    │
│                                                       │
│ return false                                         │
└──────────────────────────────────────────────────────┘
```

**Key Feature:** Profile owners can always decrypt their own data, regardless of access level. This prevents lockout scenarios.

---

## Flow 8: Uploading Encrypted File

### User Perspective
```
User → Contact Profile → Files Tab → "Upload File" →
File picker opens →
User selects "partnership_agreement.pdf" (2.3 MB) →
Set access: "Admins and Managers" (ROLE_MANAGER) →
Click "Upload" →
[Encrypting... 15%... 45%... 78%... 100%]
[Uploading to Walrus... 25%... 60%... 100%]
[Saving metadata...]
→ File uploaded ✅
```

### Technical Flow

```
Same as Note Encryption, but:

Step 2: Convert File to Bytes
┌──────────────────────────────────────────────────────┐
│ const arrayBuffer = await file.arrayBuffer()        │
│ const fileBytes = new Uint8Array(arrayBuffer)       │
│                                                       │
│ Result: Uint8Array[2,400,000 bytes] (2.3 MB)       │
└──────────────────────────────────────────────────────┘

Step 3: Encrypt with Seal
┌──────────────────────────────────────────────────────┐
│ Encrypts the entire PDF                              │
│ Result: Uint8Array[2,450,000 bytes] (encrypted)     │
└──────────────────────────────────────────────────────┘

Step 5: Create EncryptedResource
┌──────────────────────────────────────────────────────┐
│ resource_type: RESOURCE_TYPE.FILE (2)               │
│ access_level: ROLE_MANAGER (2)                      │
│ file_name: "partnership_agreement.pdf"              │
│ file_size: 2,400,000                                 │
│ content_type: "application/pdf"                     │
└──────────────────────────────────────────────────────┘
```

**What's Encrypted:** The entire PDF file  
**What's Public:** File name, size, type, who uploaded, when, minimum role required

---

## Summary: Encryption Decision Tree

```
┌─────────────────────────────────────────────────────┐
│ Is this data SENSITIVE or PRIVATE?                  │
└───────────────┬─────────────────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
       YES             NO
        │               │
        ▼               ▼
┌───────────────┐  ┌──────────────┐
│ ENCRYPT IT    │  │ STORE PUBLIC │
│               │  │              │
│ - Notes       │  │ - Org name   │
│ - Files       │  │ - Profiles   │
│ - Internal    │  │ - Socials    │
│   tags        │  │ - Tags       │
│ - Deal info   │  │ - Roles      │
│               │  │ - Timestamps │
└───────────────┘  └──────────────┘
        │               │
        ▼               ▼
┌───────────────┐  ┌──────────────┐
│ Seal + Walrus │  │ Sui Blockchain│
│ Encrypted     │  │ + Backend DB │
│ Client-side   │  │              │
│ Role-based    │  │ Queryable    │
│ access        │  │ Indexable    │
└───────────────┘  └──────────────┘
```

---

## Key Takeaways

### 🔐 **Encryption (Seal + Walrus)**
1. **Client-side encryption** - Data encrypted before leaving browser
2. **Distributed key management** - Seal key servers hold key shares
3. **Onchain access control** - `seal_approve()` verifies permissions
4. **Decentralized storage** - Walrus stores encrypted blobs
5. **No plaintext exposure** - Even Walrus never sees unencrypted data

### 🔓 **Decryption (Seal Verification)**
1. **Session key** - User signs message to create temporary key
2. **Access simulation** - Seal simulates `seal_approve()` transaction
3. **Key reconstruction** - If approved, key shares combined
4. **Client-side decryption** - Data decrypted in browser
5. **Temporary access** - Session key expires after 10 minutes

### 🎯 **Access Control Logic**
```
Can decrypt if:
  (Profile Owner) OR 
  (Org Member AND Role >= Access Level)
```

This gives you **privacy, security, and flexibility** for your Web3 CRM! 🚀
