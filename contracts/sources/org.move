module sui_crm::org {
    use sui::object;
    use sui::tx_context;
    use std::string::String;
    use sui::transfer;
    use sui::event;

    // ============================================================================
    // Constants - Role Levels
    // ============================================================================
    
    const ROLE_VIEWER: u8 = 1;
    const ROLE_MANAGER: u8 = 2;
    const ROLE_ADMIN: u8 = 3;

    // ============================================================================
    // Error Codes
    // ============================================================================
    
    const ENotAdmin: u64 = 0;
    const EInvalidRole: u64 = 1;
    const EMemberNotFound: u64 = 2;

    // ============================================================================
    // Structs
    // ============================================================================
    
    /// Organization - represents a company/team using the CRM
    public struct Org has key, store {
        id: UID,
        name: String,
        admin: address,
        created_at: u64,
    }

    /// Organization Member - represents a team member with role-based access
    public struct OrgMember has key, store {
        id: UID,
        org_id: ID,
        address: address,
        unique_tag: String,  // e.g., "MEMBER_001", "MEMBER_002"
        role: u8,            // 1=Viewer, 2=Manager, 3=Admin
        joined_at: u64,
    }

    // ============================================================================
    // Events
    // ============================================================================
    
    /// Emitted when a new organization is created
    public struct OrgCreated has copy, drop {
        org_id: ID,
        name: String,
        admin: address,
        created_at: u64,
    }

    /// Emitted when a member is added to an organization
    public struct MemberAdded has copy, drop {
        org_id: ID,
        member_id: ID,
        member_address: address,
        unique_tag: String,
        role: u8,
        joined_at: u64,
    }

    /// Emitted when a member's role is updated
    public struct MemberRoleUpdated has copy, drop {
        org_id: ID,
        member_id: ID,
        member_address: address,
        old_role: u8,
        new_role: u8,
    }

    /// Emitted when a member is removed from an organization
    public struct MemberRemoved has copy, drop {
        org_id: ID,
        member_id: ID,
        member_address: address,
    }

    // ============================================================================
    // Public Functions - Organization Management
    // ============================================================================
    
    /// Create a new organization and return it (composable)
    public fun create_org(
        name: String,
        ctx: &mut TxContext
    ): Org {
        let org_uid = object::new(ctx);
        let org_id = object::uid_to_inner(&org_uid);
        let created_at = tx_context::epoch_timestamp_ms(ctx);
        let admin = tx_context::sender(ctx);

        let org = Org {
            id: org_uid,
            name,
            admin,
            created_at,
        };

        // Emit event
        event::emit(OrgCreated {
            org_id,
            name: org.name,
            admin,
            created_at,
        });

        org
    }

    /// Create a new organization and transfer to the caller (standalone wrapper)
    public entry fun create_and_transfer_org(
        name: String,
        ctx: &mut TxContext
    ) {
        let admin = tx_context::sender(ctx);
        let org = create_org(name, ctx);
        transfer::transfer(org, admin);
    }

    /// Add a member to the organization
    /// Only admin can add members
    public entry fun add_member(
        org: &Org,
        member_address: address,
        unique_tag: String,
        role: u8,
        ctx: &mut TxContext
    ) {
        // Verify caller is admin
        assert!(tx_context::sender(ctx) == org.admin, ENotAdmin);
        
        // Verify valid role
        assert!(role >= ROLE_VIEWER && role <= ROLE_ADMIN, EInvalidRole);

        let member_uid = object::new(ctx);
        let member_id = object::uid_to_inner(&member_uid);
        let joined_at = tx_context::epoch_timestamp_ms(ctx);
        let org_id = object::id(org);

        let member = OrgMember {
            id: member_uid,
            org_id,
            address: member_address,
            unique_tag,
            role,
            joined_at,
        };

        // Emit event
        event::emit(MemberAdded {
            org_id,
            member_id,
            member_address,
            unique_tag,
            role,
            joined_at,
        });

        transfer::transfer(member, member_address);
    }

    /// Update a member's role
    /// Only admin can update roles
    public entry fun update_member_role(
        org: &Org,
        member: &mut OrgMember,
        new_role: u8,
        ctx: &mut TxContext
    ) {
        // Verify caller is admin
        assert!(tx_context::sender(ctx) == org.admin, ENotAdmin);
        
        // Verify valid role
        assert!(new_role >= ROLE_VIEWER && new_role <= ROLE_ADMIN, EInvalidRole);
        
        // Verify member belongs to this org
        assert!(member.org_id == object::id(org), EMemberNotFound);

        let old_role = member.role;
        member.role = new_role;

        // Emit event
        event::emit(MemberRoleUpdated {
            org_id: object::id(org),
            member_id: object::id(member),
            member_address: member.address,
            old_role,
            new_role,
        });
    }

    /// Remove a member from the organization
    /// Only admin can remove members
    /// This deletes the OrgMember object
    public entry fun remove_member(
        org: &Org,
        member: OrgMember,
        ctx: &mut TxContext
    ) {
        // Verify caller is admin
        assert!(tx_context::sender(ctx) == org.admin, ENotAdmin);
        
        // Verify member belongs to this org
        assert!(member.org_id == object::id(org), EMemberNotFound);

        let org_id = object::id(org);
        let member_id = object::id(&member);
        let member_address = member.address;

        // Emit event before deletion
        event::emit(MemberRemoved {
            org_id,
            member_id,
            member_address,
        });

        // Delete the member object
        let OrgMember { id, org_id: _, address: _, unique_tag: _, role: _, joined_at: _ } = member;
        object::delete(id);
    }

    // ============================================================================
    // Public Getter Functions
    // ============================================================================
    
    /// Get organization ID
    public fun get_org_id(org: &Org): ID {
        object::id(org)
    }

    /// Get organization name
    public fun get_org_name(org: &Org): String {
        org.name
    }

    /// Get organization admin
    public fun get_org_admin(org: &Org): address {
        org.admin
    }

    /// Get member's organization ID
    public fun get_member_org_id(member: &OrgMember): ID {
        member.org_id
    }

    /// Get member's address
    public fun get_member_address(member: &OrgMember): address {
        member.address
    }

    /// Get member's unique tag
    public fun get_member_tag(member: &OrgMember): String {
        member.unique_tag
    }

    /// Get member's role
    public fun get_member_role(member: &OrgMember): u8 {
        member.role
    }

    /// Check if address is admin
    public fun is_admin(org: &Org, addr: address): bool {
        org.admin == addr
    }

    /// Check if member has sufficient role level
    public fun has_role_level(member: &OrgMember, required_level: u8): bool {
        member.role >= required_level
    }


}
