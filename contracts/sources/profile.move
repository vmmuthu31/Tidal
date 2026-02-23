module sui_crm::profile {
    use sui::object;
    use sui::tx_context;
    use std::string::String;
    use sui::transfer;
    use sui::event;

    // ============================================================================
    // Error Codes
    // ============================================================================
    
    const ENotOwner: u64 = 0;
    const EInvalidBlobId: u64 = 1;

    // ============================================================================
    // Structs
    // ============================================================================
    
    /// Contact Profile - represents a contact in the CRM
    /// All CRM data (notes, files, interactions, etc.) is stored in a single
    /// encrypted blob in Walrus, referenced by crm_data_blob_id
    public struct Profile has key, store {
        id: object::UID,
        org_id: object::ID,              // Organization this profile belongs to
        wallet_address: address,         // Contact's wallet address
        unique_tag: String,              // e.g., "CONTACT_001", "CONTACT_002"
        crm_data_blob_id: vector<u8>,    // Walrus blob ID containing all CRM data
        crm_data_encryption_id: vector<u8>, // Seal encryption ID for the blob
        data_version: u64,               // Increment on each update for conflict resolution
        last_updated: u64,               // Timestamp of last update
        created_by: address,             // Who created this profile
    }

    // ============================================================================
    // Events
    // ============================================================================
    
    /// Emitted when a new profile is created
    public struct ProfileCreated has copy, drop {
        profile_id: object::ID,
        org_id: object::ID,
        wallet_address: address,
        unique_tag: String,
        created_by: address,
        created_at: u64,
    }

    /// Emitted when profile CRM data is updated
    public struct ProfileDataUpdated has copy, drop {
        profile_id: object::ID,
        org_id: object::ID,
        old_version: u64,
        new_version: u64,
        updated_at: u64,
        updated_by: address,
    }

    // ============================================================================
    // Public Functions - Profile Management
    // ============================================================================
    
    /// Create a new contact profile with initial CRM data and return it
    /// The CRM data should already be encrypted and uploaded to Walrus
    public fun create_profile(
        org_id: object::ID,
        wallet_address: address,
        unique_tag: String,
        blob_id: vector<u8>,
        encryption_id: vector<u8>,
        ctx: &mut tx_context::TxContext
    ): Profile {
        // Verify blob_id is not empty
        assert!(!vector::is_empty(&blob_id), EInvalidBlobId);

        let profile_uid = object::new(ctx);
        let profile_id = object::uid_to_inner(&profile_uid);
        let created_at = tx_context::epoch_timestamp_ms(ctx);
        let created_by = tx_context::sender(ctx);

        let profile = Profile {
            id: profile_uid,
            org_id,
            wallet_address,
            unique_tag,
            crm_data_blob_id: blob_id,
            crm_data_encryption_id: encryption_id,
            data_version: 1,
            last_updated: created_at,
            created_by,
        };

        // Emit event
        event::emit(ProfileCreated {
            profile_id,
            org_id,
            wallet_address,
            unique_tag,
            created_by,
            created_at,
        });

        profile
    }

    /// Standalone wrapper to create and transfer profile
    public entry fun create_and_transfer_profile(
        org_id: object::ID,
        wallet_address: address,
        unique_tag: String,
        blob_id: vector<u8>,
        encryption_id: vector<u8>,
        ctx: &mut tx_context::TxContext
    ) {
        let created_by = tx_context::sender(ctx);
        let profile = create_profile(org_id, wallet_address, unique_tag, blob_id, encryption_id, ctx);
        transfer::transfer(profile, created_by);
    }

    /// Update the CRM data blob reference
    /// Called after uploading a new version of the CRM data to Walrus
    public entry fun update_crm_data(
        profile: &mut Profile,
        new_blob_id: vector<u8>,
        new_encryption_id: vector<u8>,
        ctx: &mut tx_context::TxContext
    ) {
        // Verify blob_id is not empty
        assert!(!vector::is_empty(&new_blob_id), EInvalidBlobId);

        let old_version = profile.data_version;
        let updated_at = tx_context::epoch_timestamp_ms(ctx);
        let updated_by = tx_context::sender(ctx);

        // Update blob references
        profile.crm_data_blob_id = new_blob_id;
        profile.crm_data_encryption_id = new_encryption_id;
        profile.data_version = old_version + 1;
        profile.last_updated = updated_at;

        // Emit event
        event::emit(ProfileDataUpdated {
            profile_id: object::id(profile),
            org_id: profile.org_id,
            old_version,
            new_version: profile.data_version,
            updated_at,
            updated_by,
        });
    }

    // ============================================================================
    // Public Getter Functions
    // ============================================================================
    
    /// Get profile ID
    public fun get_profile_id(profile: &Profile): object::ID {
        object::id(profile)
    }

    /// Get organization ID
    public fun get_org_id(profile: &Profile): object::ID {
        profile.org_id
    }

    /// Get wallet address
    public fun get_wallet_address(profile: &Profile): address {
        profile.wallet_address
    }

    /// Get unique tag
    public fun get_unique_tag(profile: &Profile): String {
        profile.unique_tag
    }

    /// Get CRM data blob ID
    public fun get_blob_id(profile: &Profile): vector<u8> {
        profile.crm_data_blob_id
    }

    /// Get CRM data encryption ID
    public fun get_encryption_id(profile: &Profile): vector<u8> {
        profile.crm_data_encryption_id
    }

    /// Get data version
    public fun get_data_version(profile: &Profile): u64 {
        profile.data_version
    }

    /// Get last updated timestamp
    public fun get_last_updated(profile: &Profile): u64 {
        profile.last_updated
    }

    /// Get creator address
    public fun get_created_by(profile: &Profile): address {
        profile.created_by
    }

    /// Check if address is the creator
    public fun is_creator(profile: &Profile, addr: address): bool {
        profile.created_by == addr
    }

    /// Check if profile belongs to organization
    public fun belongs_to_org(profile: &Profile, org_id: object::ID): bool {
        profile.org_id == org_id
    }
}
