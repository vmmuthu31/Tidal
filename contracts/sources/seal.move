/// CRM Access Control with Seal Integration
/// - Organization admins can decrypt all notes/files within their org
/// - Profile owners can decrypt their own data
/// - Role-based access (Admin, Manager, Viewer) with granular permissions
/// - Integrates with Seal for encryption/decryption
module sui_crm::crm_access_control {

use sui::table::{Self, Table};
use sui::event;
use sui::object::{Self, UID, ID};
use sui::tx_context::{Self, TxContext};
use sui::transfer;

// Error codes
const ENoAccess: u64 = 1;
const EInvalidRole: u64 = 2;
const ENotOrgMember: u64 = 3;
const ENotProfileOwner: u64 = 4;
const EDuplicate: u64 = 5;
const EInvalidOrg: u64 = 6;

// Role constants
const ROLE_ADMIN: u8 = 3;
const ROLE_MANAGER: u8 = 2;
const ROLE_VIEWER: u8 = 1;

/// Organization access registry - tracks members and their roles
public struct OrgAccessRegistry has key {
    id: UID,
    org_id: ID,
    /// Member address -> Role level (1=Viewer, 2=Manager, 3=Admin)
    members: Table<address, u8>,
}

/// Profile access registry - tracks who owns profiles and can access their data
public struct ProfileAccessRegistry has key {
    id: UID,
    /// Profile ID -> Owner address
    profile_owners: Table<ID, address>,
    /// Profile ID -> Organization ID (for org-level access)
    profile_orgs: Table<ID, ID>,
}

/// Encrypted note/file metadata stored onchain
public struct EncryptedResource has key, store {
    id: UID,
    profile_id: ID,
    org_id: ID,
    resource_type: u8, // 1=Note, 2=File
    walrus_blob_id: vector<u8>, // Walrus storage ID
    encryption_id: vector<u8>, // Seal encryption ID
    access_level: u8, // Minimum role required (1=Viewer, 2=Manager, 3=Admin)
    created_by: address,
    created_at: u64,
}

// Events
public struct OrgMemberAdded has copy, drop {
    org_id: ID,
    member: address,
    role: u8,
}

public struct OrgMemberRemoved has copy, drop {
    org_id: ID,
    member: address,
}

public struct ProfileRegistered has copy, drop {
    profile_id: ID,
    owner: address,
    org_id: ID,
}

public struct ResourceCreated has copy, drop {
    resource_id: ID,
    profile_id: ID,
    resource_type: u8,
    access_level: u8,
}

/// Initialize - creates shared registries
fun init(ctx: &mut TxContext) {
    let profile_registry = ProfileAccessRegistry {
        id: object::new(ctx),
        profile_owners: table::new(ctx),
        profile_orgs: table::new(ctx),
    };
    
    transfer::share_object(profile_registry);
}

/// Create organization access registry and return it
public fun create_org_registry(
    org_id: ID,
    admin: address,
    ctx: &mut TxContext
): OrgAccessRegistry {
    let mut registry = OrgAccessRegistry {
        id: object::new(ctx),
        org_id,
        members: table::new(ctx),
    };
    
    // Add creator as admin
    table::add(&mut registry.members, admin, ROLE_ADMIN);
    
    event::emit(OrgMemberAdded {
        org_id,
        member: admin,
        role: ROLE_ADMIN,
    });
    
    registry
}

/// Creates an organization and its associated access registry simultaneously
public entry fun create_org_and_registry(
    name: std::string::String,
    ctx: &mut TxContext
) {
    let admin = tx_context::sender(ctx);
    let org = sui_crm::org::create_org(name, ctx);
    let org_id = sui_crm::org::get_org_id(&org);
    
    let registry = create_org_registry(org_id, admin, ctx);
    
    // Transfer org to creator, share the access registry globally so adding members is easy
    transfer::public_transfer(org, admin);
    transfer::share_object(registry);
}

/// Add member to organization with specific role
public entry fun add_org_member(
    registry: &mut OrgAccessRegistry,
    member: address,
    role: u8,
    ctx: &TxContext
) {
    let caller = tx_context::sender(ctx);
    
    // Only admins can add members
    assert!(
        table::contains(&registry.members, caller) && 
        *table::borrow(&registry.members, caller) == ROLE_ADMIN,
        ENoAccess
    );
    
    assert!(role >= ROLE_VIEWER && role <= ROLE_ADMIN, EInvalidRole);
    assert!(!table::contains(&registry.members, member), EDuplicate);
    
    table::add(&mut registry.members, member, role);
    
    event::emit(OrgMemberAdded {
        org_id: registry.org_id,
        member,
        role,
    });
}

/// Update member role
public entry fun update_member_role(
    registry: &mut OrgAccessRegistry,
    member: address,
    new_role: u8,
    ctx: &TxContext
) {
    let caller = tx_context::sender(ctx);
    
    // Only admins can update roles
    assert!(
        table::contains(&registry.members, caller) && 
        *table::borrow(&registry.members, caller) == ROLE_ADMIN,
        ENoAccess
    );
    
    assert!(new_role >= ROLE_VIEWER && new_role <= ROLE_ADMIN, EInvalidRole);
    assert!(table::contains(&registry.members, member), ENotOrgMember);
    
    let role_ref = table::borrow_mut(&mut registry.members, member);
    *role_ref = new_role;
}

/// Remove member from organization
public entry fun remove_org_member(
    registry: &mut OrgAccessRegistry,
    member: address,
    ctx: &TxContext
) {
    let caller = tx_context::sender(ctx);
    
    // Only admins can remove members
    assert!(
        table::contains(&registry.members, caller) && 
        *table::borrow(&registry.members, caller) == ROLE_ADMIN,
        ENoAccess
    );
    
    assert!(table::contains(&registry.members, member), ENotOrgMember);
    table::remove(&mut registry.members, member);
    
    event::emit(OrgMemberRemoved {
        org_id: registry.org_id,
        member,
    });
}

/// Create and register a profile in one cohesive step
public entry fun create_and_register_profile(
    registry: &mut ProfileAccessRegistry,
    org_id: ID,
    wallet_address: address,
    unique_tag: std::string::String,
    blob_id: vector<u8>,
    encryption_id: vector<u8>,
    ctx: &mut TxContext
) {
    // Create the Profile object via the composable function
    let profile = sui_crm::profile::create_profile(org_id, wallet_address, unique_tag, blob_id, encryption_id, ctx);
    let profile_id = sui_crm::profile::get_profile_id(&profile);
    
    let creator = tx_context::sender(ctx);

    // Register it natively inside the CRM mapping
    register_profile(registry, profile_id, wallet_address, org_id, ctx);
    
    // Transfer the object to the creator (org admin/member)
    transfer::public_transfer(profile, creator);
}

/// Register a profile with owner and org
public entry fun register_profile(
    registry: &mut ProfileAccessRegistry,
    profile_id: ID,
    owner: address,
    org_id: ID,
    _ctx: &TxContext
) {
    assert!(!table::contains(&registry.profile_owners, profile_id), EDuplicate);
    
    table::add(&mut registry.profile_owners, profile_id, owner);
    table::add(&mut registry.profile_orgs, profile_id, org_id);
    
    event::emit(ProfileRegistered {
        profile_id,
        owner,
        org_id,
    });
}

/// Create encrypted resource (note or file)
public fun create_encrypted_resource(
    profile_id: ID,
    org_id: ID,
    resource_type: u8,
    walrus_blob_id: vector<u8>,
    encryption_id: vector<u8>,
    access_level: u8,
    created_at: u64,
    ctx: &mut TxContext
): EncryptedResource {
    let resource = EncryptedResource {
        id: object::new(ctx),
        profile_id,
        org_id,
        resource_type,
        walrus_blob_id,
        encryption_id,
        access_level,
        created_by: tx_context::sender(ctx),
        created_at,
    };
    
    event::emit(ResourceCreated {
        resource_id: object::id(&resource),
        profile_id,
        resource_type,
        access_level,
    });
    
    resource
}

/// Check if caller can access a resource based on role and ownership
fun check_access_policy(
    caller: address,
    resource: &EncryptedResource,
    org_registry: &OrgAccessRegistry,
    profile_registry: &ProfileAccessRegistry
): bool {
    // Check if caller is profile owner
    if (table::contains(&profile_registry.profile_owners, resource.profile_id)) {
        let owner = table::borrow(&profile_registry.profile_owners, resource.profile_id);
        if (caller == *owner) {
            return true
        };
    };
    
    // Check if caller is org member with sufficient role
    if (table::contains(&org_registry.members, caller)) {
        let role = table::borrow(&org_registry.members, caller);
        if (*role >= resource.access_level) {
            return true
        };
    };
    
    false
}

/// Seal approval function - called by Seal to verify decryption access
public entry fun seal_approve(
    resource: &EncryptedResource,
    org_registry: &OrgAccessRegistry,
    profile_registry: &ProfileAccessRegistry,
    ctx: &TxContext
) {
    let caller = tx_context::sender(ctx);
    assert!(
        check_access_policy(caller, resource, org_registry, profile_registry),
        ENoAccess
    );
}

/// Check if address has specific role in org
public fun has_role(
    registry: &OrgAccessRegistry,
    member: address,
    required_role: u8
): bool {
    if (!table::contains(&registry.members, member)) {
        return false
    };
    
    let role = table::borrow(&registry.members, member);
    *role >= required_role
}

/// Check if address is profile owner
public fun is_profile_owner(
    registry: &ProfileAccessRegistry,
    profile_id: ID,
    address: address
): bool {
    if (!table::contains(&registry.profile_owners, profile_id)) {
        return false
    };
    
    let owner = table::borrow(&registry.profile_owners, profile_id);
    *owner == address
}

/// Get member role
public fun get_member_role(
    registry: &OrgAccessRegistry,
    member: address
): u8 {
    if (!table::contains(&registry.members, member)) {
        return 0
    };
    
    *table::borrow(&registry.members, member)
}

// Public constants for frontend
public fun role_admin(): u8 { ROLE_ADMIN }
public fun role_manager(): u8 { ROLE_MANAGER }
public fun role_viewer(): u8 { ROLE_VIEWER }

}