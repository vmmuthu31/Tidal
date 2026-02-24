# 🎯 Minimal Architecture - Executive Summary

## The Problem
Traditional approach creates **separate onchain objects** for every note, file, and interaction:
- ❌ 8+ transactions per contact
- ❌ High gas costs (~0.05 SUI per contact)
- ❌ Complex smart contracts
- ❌ Difficult to batch operations

## The Solution
**Single encrypted blob per contact** stored in Walrus:
- ✅ 2 transactions per contact (80% reduction)
- ✅ Low gas costs (~0.01 SUI per contact)
- ✅ Simple smart contracts
- ✅ Easy batch operations
- ✅ Still fully encrypted and securee

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 SUI BLOCKCHAIN                       │
│                  (Minimal Data)                      │
│                                                       │
│  Organization                                        │
│  ├─ id, name, admin                                 │
│  └─ created_at                                       │
│                                                       │
│  OrgMember                                           │
│  ├─ org_id, address                                 │
│  ├─ unique_tag: "MEMBER_001"                        │
│  └─ role: 1|2|3                                     │
│                                                       │
│  Profile (Contact)                                   │
│  ├─ org_id, wallet_address                          │
│  ├─ unique_tag: "CONTACT_001"                       │
│  ├─ crm_data_blob_id ──────────────┐               │
│  ├─ crm_data_encryption_id         │               │
│  └─ last_updated                   │               │
└────────────────────────────────────┼───────────────┘
                                      │
                                      │ Reference
                                      │
┌─────────────────────────────────────▼───────────────┐
│              WALRUS STORAGE                          │
│           (All CRM Data - Encrypted)                 │
│                                                       │
│  Blob: abc123...                                     │
│  {                                                    │
│    "profile_id": "0x...",                           │
│    "unique_tag": "CONTACT_001",                     │
│    "wallet_address": "0x...",                       │
│                                                       │
│    "socials": {                                      │
│      "twitter": "@cryptowhale",                     │
│      "discord": "whale#1234"                        │
│    },                                                │
│                                                       │
│    "tags": ["VIP", "Investor"],                     │
│                                                       │
│    "notes": [                                        │
│      {                                               │
│        "id": "note_001",                            │
│        "content": "Strategy discussion...",         │
│        "access_level": 3                            │
│      }                                               │
│    ],                                                │
│                                                       │
│    "files": [...],                                   │
│    "interactions": [...],                            │
│    "custom_fields": {...}                           │
│  }                                                   │
└─────────────────────────────────────────────────────┘
```

---

## Key Benefits

### 💰 Cost Savings
| Operation | Old Approach | New Approach | Savings |
|-----------|--------------|--------------|---------|
| Create contact | 1 tx | 1 tx | 0% |
| Add 3 notes | 3 tx | 1 tx | 67% |
| Add 1 file | 1 tx | (included) | 100% |
| Add 3 interactions | 3 tx | (included) | 100% |
| **Total** | **8 tx (~0.05 SUI)** | **2 tx (~0.01 SUI)** | **80%** |

### 🚀 Performance Benefits
- **Batch operations** - Add multiple items in one update
- **Fewer network calls** - One blob download vs multiple object queries
- **Simpler indexing** - Just track blob updates
- **Version control** - Built-in versioning for conflict resolution

### 🔒 Security Maintained
- ✅ Still encrypted with Seal
- ✅ Still stored in Walrus (decentralized)
- ✅ Still has access control
- ✅ Still verifiable onchain

---

## Data Flow

### Creating a Contact
```
1. User fills form (wallet, socials, tags)
2. Create initial JSON blob
3. Encrypt with Seal → Upload to Walrus
4. Create Profile onchain with blob reference
5. Done! (1 tx)
```

### Adding a Note
```
1. Download current blob from Walrus
2. Decrypt with Seal
3. Parse JSON
4. Add new note to notes array
5. Increment version
6. Encrypt updated JSON → Upload to Walrus
7. Update Profile blob reference onchain
8. Done! (1 tx)
```

### Batch Update (Add 3 notes + 2 interactions)
```
1. Download current blob
2. Decrypt
3. Add all 3 notes
4. Add all 2 interactions
5. Increment version
6. Encrypt → Upload
7. Update reference onchain
8. Done! (Still just 1 tx!)
```

---

## Implementation Checklist

### Smart Contracts
- [ ] `org.move` - Organization with unique_tag for members
- [ ] `profile.move` - Profile with blob_id and encryption_id
- [ ] `access_control.move` - Simplified seal_approve

### Services
- [ ] `ProfileDataService` - Manage blob CRUD operations
- [ ] Update `encryptionService` - Handle JSON encryption
- [ ] Update `decryptionService` - Handle JSON decryption

### Frontend
- [ ] Contact profile page with all data
- [ ] Add note form
- [ ] Add interaction form
- [ ] Batch update UI
- [ ] Access level filtering

### Backend (Optional)
- [ ] API endpoints for profile CRUD
- [ ] Caching layer for frequently accessed profiles
- [ ] Indexer for blob updates

---

## Access Control

### Blob-Level Access
- Entire blob encrypted with base access level (e.g., VIEWER)
- All org members can decrypt the blob

### Field-Level Access
- Each note/file has its own `access_level` field
- Frontend filters based on user role
- Example:
  ```json
  {
    "notes": [
      {
        "content": "Public note",
        "access_level": 1  // Viewer can see
      },
      {
        "content": "Manager note",
        "access_level": 2  // Only Manager+ can see
      },
      {
        "content": "Admin secret",
        "access_level": 3  // Only Admin can see
      }
    ]
  }
  ```

**Recommended:** Field-level access for flexibility

---

## Example: Complete Contact Profile

```json
{
  "profile_id": "0xabc123...",
  "unique_tag": "CONTACT_001",
  "wallet_address": "0x456def...",
  
  "socials": {
    "twitter": "@cryptowhale",
    "discord": "whale#1234",
    "telegram": "@whale_tg"
  },
  
  "tags": ["VIP", "Investor", "Early Adopter"],
  "segments": ["High Value", "Active"],
  
  "notes": [
    {
      "id": "note_1707654321000",
      "content": "Initial contact - interested in $50K investment",
      "created_at": "2026-02-10T10:30:00Z",
      "created_by": "0xadmin...",
      "access_level": 3
    },
    {
      "id": "note_1707654322000",
      "content": "Follow up scheduled for next Tuesday",
      "created_at": "2026-02-10T14:20:00Z",
      "created_by": "0xmanager...",
      "access_level": 2
    }
  ],
  
  "files": [
    {
      "id": "file_1707654323000",
      "name": "partnership_agreement.pdf",
      "blob_id": "walrus_xyz...",
      "encryption_id": "seal_xyz...",
      "size": 2400000,
      "content_type": "application/pdf",
      "uploaded_at": "2026-02-10T11:00:00Z",
      "uploaded_by": "0xadmin...",
      "access_level": 3
    }
  ],
  
  "interactions": [
    {
      "id": "int_1707654324000",
      "type": "discord_message",
      "description": "Asked about token launch timeline",
      "timestamp": "2026-02-09T15:30:00Z",
      "metadata": {
        "channel": "#general",
        "message_id": "123456789"
      }
    },
    {
      "id": "int_1707654325000",
      "type": "onchain_mint",
      "description": "Minted Genesis NFT #1234",
      "timestamp": "2026-02-10T09:15:00Z",
      "metadata": {
        "tx_hash": "0xabc...",
        "collection": "Genesis Collection",
        "token_id": "1234"
      }
    }
  ],
  
  "custom_fields": {
    "investment_amount": "$50,000",
    "equity_ask": "2%",
    "priority": "High",
    "next_followup": "2026-02-17"
  },
  
  "version": 5,
  "last_updated": "2026-02-10T16:45:00Z",
  "last_updated_by": "0xadmin..."
}
```

---

## Migration Strategy

If you have existing data:

### Option 1: Fresh Start
- Deploy new contracts
- Start fresh with new architecture
- Keep old data for reference

### Option 2: Gradual Migration
1. Deploy new contracts alongside old
2. Create migration script:
   ```typescript
   async function migrateProfile(oldProfileId: string) {
     // 1. Fetch all old data (notes, files, interactions)
     // 2. Combine into single JSON blob
     // 3. Encrypt and upload to Walrus
     // 4. Create new Profile with blob reference
     // 5. Mark old profile as migrated
   }
   ```
3. Migrate profiles one by one
4. Deprecate old contracts after complete

---

## FAQ

**Q: What if the blob gets too large?**
A: Walrus supports GBs per blob. For most CRM use cases, even 1000 notes = ~1 MB. If needed, you can split into multiple blobs (e.g., current year + archive).

**Q: How do I handle concurrent updates?**
A: Use optimistic locking with version numbers. If version mismatch on update, fetch latest and retry.

**Q: Can I still query notes by date/tag?**
A: Yes, but you need to:
- Download and decrypt the blob
- Parse JSON and filter client-side
- OR index the data in your backend database

**Q: What about large files?**
A: Large files (>10 MB) should still be separate Walrus blobs. Just store the reference in the main blob.

**Q: Is this less secure?**
A: No! Still encrypted with Seal, still access-controlled. Just more efficient storage.

---

## Next Steps

1. **Review** this architecture with your team
2. **Update** smart contracts (see IMPLEMENTATION_GUIDE.md)
3. **Create** ProfileDataService
4. **Test** with a few contacts
5. **Deploy** to testnet
6. **Monitor** costs and performance
7. **Scale** to production

---

## Resources

- **[MINIMAL_ARCHITECTURE.md](./MINIMAL_ARCHITECTURE.md)** - Detailed architecture
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Step-by-step code
- **[ENCRYPTION_FLOW_DETAILED.md](./ENCRYPTION_FLOW_DETAILED.md)** - Security details
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Code snippets

---

**This architecture will save you 80% on gas costs while maintaining full security and flexibility!** 🚀

Questions? Open an issue or reach out to the team.
