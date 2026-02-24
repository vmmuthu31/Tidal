# SUI CRM - Complete User Flow with Seal & Walrus

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

## Phase 3: Encrypted Notes (Seal Integration)

### Step 5: Create Private Note
```
User Action: Profile → Notes → "Add Note"
Frontend: Rich text editor
User: Types "Strategy: They want to invest $50K"
User: Sets access level "Admins Only" (ROLE_ADMIN = 3)
User: Click "Save"

Flow:
1. Frontend → Seal SDK: Encrypt note content
   Seal: Generates encryption_id
   Seal: Returns encrypted blob

2. Frontend → Walrus: Upload encrypted blob
   Walrus: Stores blob
   Walrus: Returns blob_id

3. Frontend → Sui: create_encrypted_resource()
   Parameters:
   - profile_id: 0x456...def
   - org_id: 0x789...ghi
   - resource_type: 1 (Note)
   - walrus_blob_id: [blob_id]
   - encryption_id: [encryption_id]
   - access_level: 3 (ROLE_ADMIN)
   - created_at: timestamp
   
   Sui: Creates EncryptedResource object
   Sui: Emits ResourceCreated event

Result: Encrypted note saved ✅
```

### Step 6: View Note (Decryption Flow)
```
User Action: Click "View Note"

Flow:
1. Frontend → Sui: Fetch EncryptedResource object
   Gets: walrus_blob_id, encryption_id, access_level

2. Frontend: Check access locally
   Calls: has_role(org_registry, user, access_level)
   If false → Show "Access Denied"

3. Frontend → Seal: Request decryption key
   Seal → Sui: Calls seal_approve()
   Sui: Executes check_access_policy()
   
   Logic:
   - Is user profile owner? → Grant
   - Is user org member with role >= 3? → Grant
   - Else → Deny
   
   Sui → Seal: Access approved ✅
   Seal → Frontend: Returns decryption key

4. Frontend → Walrus: Fetch blob by blob_id
   Walrus → Frontend: Returns encrypted blob

5. Frontend: Decrypt blob with key
   Result: "Strategy: They want to invest $50K"

6. Frontend: Display decrypted note

Result: Note displayed to authorized user ✅
```

---

## Phase 4: File Attachments (Walrus Storage)

### Step 7: Upload Encrypted File
```
User Action: Profile → Files → "Upload File"
Frontend: File picker
User: Selects "partnership_agreement.pdf"
User: Sets access "Admins and Managers" (ROLE_MANAGER = 2)

Flow:
1. Frontend: Read file as bytes

2. Frontend → Seal: Encrypt file
   Seal: Returns encrypted blob + encryption_id

3. Frontend → Walrus: Upload encrypted blob
   Walrus: Returns blob_id

4. Frontend → Sui: create_encrypted_resource()
   Parameters:
   - resource_type: 2 (File)
   - access_level: 2 (ROLE_MANAGER)
   - walrus_blob_id: [blob_id]
   - encryption_id: [encryption_id]

Result: File uploaded and encrypted ✅
```

### Step 8: Download File
```
User Action: Click "Download"

Flow:
1. Frontend → Seal: Request decryption key
   (Same seal_approve flow as notes)

2. Frontend → Walrus: Fetch encrypted blob

3. Frontend: Decrypt blob

4. Frontend: Trigger browser download
   Filename: "partnership_agreement.pdf"

Result: File downloaded ✅
```

---

## Phase 5: Interaction Tracking

### Step 9: Log Manual Interaction
```
User Action: Profile → Interactions → "Log Interaction"
Frontend: Show form
User: Type "Message", "Sent DM about token launch"
Frontend → Sui: Call interaction_log::log_interaction()
Sui: Creates InteractionLog object
Sui: Emits InteractionEvent
Result: Interaction logged ✅
```

### Step 10: Automatic Onchain Tracking
```
Background Process:
Indexer: Subscribes to Sui events
Indexer: Detects transaction from 0x456...def
Indexer: Identifies as "Swap 100 SUI → USDC"
Indexer → Database: Store interaction
Indexer → Sui: Call log_interaction() with tx_digest

Frontend: Polls /api/profiles/0x456...def/interactions
Frontend: Displays unified timeline:
  - Manual logs (messages, calls)
  - Onchain activity (swaps, mints, stakes)

Result: Complete activity history ✅
```

---

## Phase 6: Access Control in Action

### Scenario A: Admin Views Sensitive Note
```
Admin (ROLE_ADMIN = 3) → Views note with access_level = 3
check_access_policy():
  - Is admin org member? Yes
  - Admin role (3) >= access_level (3)? Yes
Result: Access granted ✅
```

### Scenario B: Manager Views Sensitive Note
```
Manager (ROLE_MANAGER = 2) → Views note with access_level = 3
check_access_policy():
  - Is manager org member? Yes
  - Manager role (2) >= access_level (3)? No
Result: Access denied ❌
```

### Scenario C: Profile Owner Views Any Note
```
Profile Owner → Views note with access_level = 3
check_access_policy():
  - Is caller profile owner? Yes
Result: Access granted ✅ (owners bypass role checks)
```

### Scenario D: Viewer Views Public Note
```
Viewer (ROLE_VIEWER = 1) → Views note with access_level = 1
check_access_policy():
  - Is viewer org member? Yes
  - Viewer role (1) >= access_level (1)? Yes
Result: Access granted ✅
```

---

## Data Flow Summary

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│  Seal SDK   │  │ Walrus API  │
│ (Encrypt)   │  │  (Storage)  │
└──────┬──────┘  └──────┬──────┘
       │                │
       │                │
       ▼                ▼
┌──────────────────────────────┐
│      Sui Blockchain          │
│  ┌────────────────────────┐  │
│  │ crm_access_control     │  │
│  │ - OrgAccessRegistry    │  │
│  │ - ProfileRegistry      │  │
│  │ - EncryptedResource    │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ profile, org,          │  │
│  │ interaction_log        │  │
│  └────────────────────────┘  │
└──────────────┬───────────────┘
               │
               ▼
        ┌─────────────┐
        │   Indexer   │
        │ (PostgreSQL)│
        └─────────────┘
```

---

## Key Takeaways

✅ **Unified Profiles**: Wallet + socials + onchain activity in one place  
✅ **Encrypted Notes**: Seal ensures only authorized users can decrypt  
✅ **Decentralized Storage**: Walrus stores files, Sui stores metadata  
✅ **Role-Based Access**: Granular permissions (Admin/Manager/Viewer)  
✅ **Onchain Verification**: Seal calls `seal_approve()` to verify access  
✅ **Profile Ownership**: Owners always have access to their data  
✅ **Auditable**: All changes emit events for indexing  

---

## Next: Implementation Checklist

- [ ] Deploy smart contracts to Sui testnet
- [ ] Set up Seal SDK in frontend
- [ ] Integrate Walrus client
- [ ] Build note/file upload UI
- [ ] Implement decryption flow
- [ ] Set up event indexer
- [ ] Add onchain activity enrichment
- [ ] Test access control scenarios
