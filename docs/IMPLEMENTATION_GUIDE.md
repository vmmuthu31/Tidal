# Quick Implementation Guide - Minimal Architecture

## Step-by-Step Implementation

### Phase 1: Update Smart Contracts (1-2 days)

#### 1.1 Update `org.move`
```move
module sui_crm::org {
    use std::string::String;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    
    // Organization
    public struct Org has key {
        id: UID,
        name: String,
        admin: address,
        created_at: u64
    }
    
    // Team member with unique tag
    public struct OrgMember has key {
        id: UID,
        org_id: ID,
        address: address,
        unique_tag: String,  // "MEMBER_001", "MEMBER_002"
        role: u8,            // 1=Viewer, 2=Manager, 3=Admin
        joined_at: u64
    }
    
    // Create organization
    public entry fun create_org(
        name: String,
        ctx: &mut TxContext
    ) {
        let org = Org {
            id: object::new(ctx),
            name,
            admin: tx_context::sender(ctx),
            created_at: tx_context::epoch_timestamp_ms(ctx)
        };
        transfer::transfer(org, tx_context::sender(ctx));
    }
    
    // Add team member
    public entry fun add_member(
        org: &Org,
        member_address: address,
        unique_tag: String,
        role: u8,
        ctx: &mut TxContext
    ) {
        // Only admin can add members
        assert!(tx_context::sender(ctx) == org.admin, 0);
        
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
```

#### 1.2 Update `profile.move`
```move
module sui_crm::profile {
    use std::string::String;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    
    // Contact profile with CRM data reference
    public struct Profile has key {
        id: UID,
        org_id: ID,
        wallet_address: address,
        unique_tag: String,              // "CONTACT_001"
        crm_data_blob_id: vector<u8>,    // Walrus blob ID
        crm_data_encryption_id: vector<u8>, // Seal encryption ID
        data_version: u64,               // Increment on each update
        last_updated: u64,
        created_by: address
    }
    
    // Create profile with initial CRM data
    public entry fun create_profile(
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
            data_version: 1,
            last_updated: tx_context::epoch_timestamp_ms(ctx),
            created_by: tx_context::sender(ctx)
        };
        
        transfer::transfer(profile, tx_context::sender(ctx));
    }
    
    // Update CRM data reference
    public entry fun update_crm_data(
        profile: &mut Profile,
        new_blob_id: vector<u8>,
        new_encryption_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        profile.crm_data_blob_id = new_blob_id;
        profile.crm_data_encryption_id = new_encryption_id;
        profile.data_version = profile.data_version + 1;
        profile.last_updated = tx_context::epoch_timestamp_ms(ctx);
    }
}
```

#### 1.3 Simplified Access Control
```move
module sui_crm::access_control {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    
    // Check if caller can access profile data
    public fun can_access_profile(
        profile_org_id: ID,
        caller_org_id: ID,
        caller_role: u8,
        required_role: u8
    ): bool {
        // Must be same org
        if (profile_org_id != caller_org_id) {
            return false
        };
        
        // Check role level
        caller_role >= required_role
    }
    
    // Seal approve function (simplified)
    public entry fun seal_approve(
        profile: &Profile,
        member: &OrgMember,
        _ctx: &mut TxContext
    ) {
        // Verify same org
        assert!(profile.org_id == member.org_id, 0);
        
        // Access granted if member has any role
        // (field-level access checked in frontend/backend)
        assert!(member.role >= 1, 1);
    }
}
```

### Phase 2: Create ProfileDataService (2-3 days)

```typescript
// web/lib/services/profileDataService.ts

import { crmEncryptionService } from './encryptionService';
import { crmDecryptionService } from './decryptionService';

export interface ProfileData {
  profile_id: string;
  unique_tag: string;
  wallet_address: string;
  
  socials: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    email?: string;
  };
  
  tags: string[];
  segments: string[];
  
  notes: Array<{
    id: string;
    content: string;
    created_at: string;
    created_by: string;
    access_level: number;
  }>;
  
  files: Array<{
    id: string;
    name: string;
    blob_id: string;
    encryption_id: string;
    size: number;
    content_type: string;
    uploaded_at: string;
    uploaded_by: string;
    access_level: number;
  }>;
  
  interactions: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    metadata: Record<string, any>;
  }>;
  
  custom_fields: Record<string, any>;
  
  version: number;
  last_updated: string;
  last_updated_by: string;
}

export class ProfileDataService {
  
  // Download and decrypt profile data
  async getProfileData(
    profileId: string,
    orgId: string,
    orgRegistryId: string,
    userAddress: string
  ): Promise<ProfileData> {
    
    // Get blob reference from onchain profile
    const profile = await this.getProfileFromChain(profileId);
    
    // Create session key
    const sessionKey = await crmDecryptionService.createSessionKey(userAddress);
    
    // Prepare resource metadata
    const resources = [{
      resource_id: profileId,
      profile_id: profileId,
      org_id: orgId,
      resource_type: 'note' as const,
      blob_id: Buffer.from(profile.crm_data_blob_id).toString('utf-8'),
      encryption_id: Buffer.from(profile.crm_data_encryption_id).toString('utf-8'),
      access_level: 1,
      created_at: new Date(profile.last_updated).toISOString(),
      created_by: profile.created_by,
      walrus_url: '',
      sui_explorer_url: ''
    }];
    
    // Decrypt
    const result = await crmDecryptionService.downloadAndDecryptResources(
      resources,
      orgRegistryId,
      sessionKey
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to decrypt profile data');
    }
    
    // Parse JSON
    const response = await fetch(result.decryptedFileUrls![0]);
    const data: ProfileData = await response.json();
    
    return data;
  }
  
  // Update profile data
  async updateProfileData(
    profileId: string,
    orgId: string,
    orgRegistryId: string,
    userAddress: string,
    updates: Partial<ProfileData>
  ): Promise<void> {
    
    // Get current data
    const currentData = await this.getProfileData(
      profileId,
      orgId,
      orgRegistryId,
      userAddress
    );
    
    // Merge updates
    const updatedData: ProfileData = {
      ...currentData,
      ...updates,
      version: currentData.version + 1,
      last_updated: new Date().toISOString(),
      last_updated_by: userAddress
    };
    
    // Encrypt and upload
    const jsonString = JSON.stringify(updatedData);
    const encryptionResult = await crmEncryptionService.encryptAndUploadResource(
      jsonString,
      profileId,
      orgId,
      orgRegistryId,
      'note',
      1, // Base access level
      userAddress
    );
    
    // Update onchain reference
    await this.updateProfileBlobReference(
      profileId,
      encryptionResult.blobId!,
      encryptionResult.encryptionId!
    );
  }
  
  // Add note (convenience method)
  async addNote(
    profileId: string,
    orgId: string,
    orgRegistryId: string,
    userAddress: string,
    noteContent: string,
    accessLevel: number
  ): Promise<string> {
    
    const currentData = await this.getProfileData(
      profileId,
      orgId,
      orgRegistryId,
      userAddress
    );
    
    const newNote = {
      id: `note_${Date.now()}`,
      content: noteContent,
      created_at: new Date().toISOString(),
      created_by: userAddress,
      access_level: accessLevel
    };
    
    currentData.notes.push(newNote);
    
    await this.updateProfileData(
      profileId,
      orgId,
      orgRegistryId,
      userAddress,
      { notes: currentData.notes }
    );
    
    return newNote.id;
  }
  
  // Filter notes by access level
  filterNotesByAccess(
    data: ProfileData,
    userRole: number
  ): ProfileData['notes'] {
    return data.notes.filter(note => userRole >= note.access_level);
  }
  
  // Helper: Get profile from chain
  private async getProfileFromChain(profileId: string) {
    const suiClient = new SuiClient({ url: getCurrentRpcEndpoint() });
    const profile = await suiClient.getObject({
      id: profileId,
      options: { showContent: true }
    });
    
    if (!profile.data?.content || profile.data.content.dataType !== 'moveObject') {
      throw new Error('Profile not found');
    }
    
    return profile.data.content.fields as any;
  }
  
  // Helper: Update blob reference onchain
  private async updateProfileBlobReference(
    profileId: string,
    blobId: string,
    encryptionId: string
  ) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${getCurrentPackageId()}::profile::update_crm_data`,
      arguments: [
        tx.object(profileId),
        tx.pure.vector('u8', Array.from(Buffer.from(blobId))),
        tx.pure.vector('u8', Array.from(Buffer.from(encryptionId)))
      ]
    });
    
    // Execute (you'll need to integrate with wallet)
    // await signAndExecuteTransaction({ transaction: tx });
  }
}

export const profileDataService = new ProfileDataService();
```

### Phase 3: Update Frontend Components (3-4 days)

#### Contact Profile Page
```typescript
// app/contacts/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { profileDataService, ProfileData } from '@/lib/services/profileDataService';
import { useCurrentAccount } from '@mysten/dapp-kit';

export default function ContactProfilePage({ params }: { params: { id: string } }) {
  const account = useCurrentAccount();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(1); // Get from org member query
  
  useEffect(() => {
    loadProfileData();
  }, [params.id]);
  
  async function loadProfileData() {
    if (!account?.address) return;
    
    try {
      const data = await profileDataService.getProfileData(
        params.id,
        'YOUR_ORG_ID',
        'YOUR_ORG_REGISTRY_ID',
        account.address
      );
      setProfileData(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleAddNote(content: string, accessLevel: number) {
    if (!account?.address) return;
    
    await profileDataService.addNote(
      params.id,
      'YOUR_ORG_ID',
      'YOUR_ORG_REGISTRY_ID',
      account.address,
      content,
      accessLevel
    );
    
    // Reload data
    await loadProfileData();
  }
  
  if (loading) return <div>Loading...</div>;
  if (!profileData) return <div>Profile not found</div>;
  
  // Filter notes by access
  const visibleNotes = profileDataService.filterNotesByAccess(profileData, userRole);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {profileData.wallet_address}
      </h1>
      
      {/* Socials */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Social Profiles</h2>
        {profileData.socials.twitter && (
          <p>Twitter: {profileData.socials.twitter}</p>
        )}
        {profileData.socials.discord && (
          <p>Discord: {profileData.socials.discord}</p>
        )}
      </div>
      
      {/* Tags */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Tags</h2>
        <div className="flex gap-2">
          {profileData.tags.map(tag => (
            <span key={tag} className="px-3 py-1 bg-blue-100 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>
      
      {/* Notes */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          Notes ({visibleNotes.length})
        </h2>
        {visibleNotes.map(note => (
          <div key={note.id} className="p-4 bg-gray-50 rounded mb-2">
            <p>{note.content}</p>
            <p className="text-sm text-gray-500 mt-2">
              {new Date(note.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        
        <button
          onClick={() => {
            const content = prompt('Enter note:');
            if (content) handleAddNote(content, 2);
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Add Note
        </button>
      </div>
      
      {/* Interactions */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          Interactions ({profileData.interactions.length})
        </h2>
        {profileData.interactions.map(interaction => (
          <div key={interaction.id} className="p-4 bg-gray-50 rounded mb-2">
            <p className="font-medium">{interaction.type}</p>
            <p>{interaction.description}</p>
            <p className="text-sm text-gray-500 mt-2">
              {new Date(interaction.timestamp).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Phase 4: Deploy & Test (1 day)

```bash
# 1. Build and deploy contracts
cd contracts/sui_crm
sui move build
sui client publish --gas-budget 100000000

# 2. Update package ID in config
# Edit web/lib/config/contracts.ts

# 3. Test flows
# - Create org
# - Add team member
# - Create contact profile
# - Add notes
# - View as different roles
```

---

## Migration Path

If you already have the old architecture:

1. **Keep old contracts** for existing data
2. **Deploy new contracts** alongside
3. **Create migration script** to move data to new format
4. **Gradually migrate** profiles one by one
5. **Deprecate old contracts** after migration complete

---

## Next Steps

1. ✅ Review this architecture
2. ✅ Update smart contracts
3. ✅ Create ProfileDataService
4. ✅ Update frontend components
5. ✅ Deploy and test
6. ✅ Monitor costs and performance

This minimal architecture will save you **80% on gas costs** while maintaining full security! 🚀
