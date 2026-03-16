// Contract Configuration for SUI CRM
// This file contains all contract addresses and IDs used across the application

// =============================================================================
// PACKAGE IDs - Main contract packages deployed on different networks
// =============================================================================

export const CONTRACT_PACKAGES = {
  // Development network (not deployed yet)
  DEVNET: '0xTODO',

  // Testnet deployment - Fixed seal_approve ENoAccess assertion (2026-03-02 v3)
  TESTNET: '0xd86712244386bdfd82906dae8bed7be6760df054536abde426fd2dc16f9b41a4',

  // Mainnet deployment (not deployed yet)
  MAINNET: '0xTODO',
} as const;

// =============================================================================
// REGISTRY & SHARED OBJECTS - Core CRM system objects
// =============================================================================

export const SHARED_OBJECTS = {
  // Profile Access Registry - Latest deployment (2026-03-02 v3)
  PROFILE_REGISTRY: '0x395e1731de16b7393f80afba04252f18c56e1cf994e9d77c755a759f8bc5c4b0',

  // Organization Access Registry - CRMOrg2, deployed with new package v3 (2026-03-02)
  EXAMPLE_ORG_REGISTRY: '0xea7c522c85660fc793d51e64464caf29956594d47997d4217e0a22000cdcd4e6',

  // SUI Clock object - System clock for timestamp operations
  CLOCK: '0x0000000000000000000000000000000000000000000000000000000000000006',
} as const;

// =============================================================================
// CRM ROLE CONSTANTS - Match the Move contract roles
// =============================================================================

export const CRM_ROLES = {
  VIEWER: 1,
  MANAGER: 2,
  ADMIN: 3,
} as const;

export const RESOURCE_TYPES = {
  NOTE: 1,
  FILE: 2,
} as const;

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

export const NETWORK_CONFIG = {
  // Current active network
  CURRENT_NETWORK: 'TESTNET' as keyof typeof CONTRACT_PACKAGES,

  // RPC endpoints
  RPC_ENDPOINTS: {
    DEVNET: 'https://fullnode.devnet.sui.io:443',
    TESTNET: 'https://fullnode.testnet.sui.io:443',
    MAINNET: 'https://fullnode.mainnet.sui.io:443',
  },

  // Explorer URLs for different networks
  EXPLORER_URLS: {
    DEVNET: 'https://suiscan.xyz/devnet',
    TESTNET: 'https://suiscan.xyz/testnet',
    MAINNET: 'https://suiscan.xyz/mainnet',
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the current active package ID based on network configuration
 */
export const getCurrentPackageId = (): string => {
  return CONTRACT_PACKAGES[NETWORK_CONFIG.CURRENT_NETWORK];
};

/**
 * Get the current RPC endpoint
 */
export const getCurrentRpcEndpoint = (): string => {
  return NETWORK_CONFIG.RPC_ENDPOINTS[NETWORK_CONFIG.CURRENT_NETWORK];
};

/**
 * Get the current explorer base URL
 */
export const getCurrentExplorerUrl = (): string => {
  return NETWORK_CONFIG.EXPLORER_URLS[NETWORK_CONFIG.CURRENT_NETWORK];
};

/**
 * Build explorer URL for a specific object/transaction/account
 */
export const buildExplorerUrl = (objectId: string, type: 'object' | 'tx' | 'account' = 'object'): string => {
  const baseUrl = getCurrentExplorerUrl();
  return `${baseUrl}/${type}/${objectId}`;
};

// =============================================================================
// CONTRACT FUNCTION TARGETS - Commonly used contract functions
// =============================================================================

export const CONTRACT_FUNCTIONS = {
  // Organization functions
  ORG: {
    CREATE_ORG: `${getCurrentPackageId()}::org::create_org`,
  },

  // Profile functions
  PROFILE: {
    CREATE_PROFILE: `${getCurrentPackageId()}::profile::create_profile`,
  },

  // Interaction Log functions
  INTERACTION: {
    LOG_INTERACTION: `${getCurrentPackageId()}::interaction_log::log_interaction`,
  },

  // CRM Access Control functions
  ACCESS_CONTROL: {
    CREATE_ORG_REGISTRY: `${getCurrentPackageId()}::crm_access_control::create_org_registry`,
    CREATE_ORG_AND_REGISTRY: `${getCurrentPackageId()}::crm_access_control::create_org_and_registry`,
    ADD_ORG_MEMBER: `${getCurrentPackageId()}::crm_access_control::add_org_member`,
    UPDATE_MEMBER_ROLE: `${getCurrentPackageId()}::crm_access_control::update_member_role`,
    REMOVE_ORG_MEMBER: `${getCurrentPackageId()}::crm_access_control::remove_org_member`,
    REGISTER_PROFILE: `${getCurrentPackageId()}::crm_access_control::register_profile`,
    CREATE_AND_REGISTER_PROFILE: `${getCurrentPackageId()}::crm_access_control::create_and_register_profile`,
    CREATE_ENCRYPTED_RESOURCE: `${getCurrentPackageId()}::crm_access_control::create_encrypted_resource`,
    SEAL_APPROVE: `${getCurrentPackageId()}::crm_access_control::seal_approve`,
  },
} as const;

// =============================================================================
// ENOKI SPONSORSHIP — Whitelisted CRM move call targets
// =============================================================================

/**
 * All CRM user-facing move call targets permitted in sponsored transactions.
 * Add every entry here to the Enoki portal's "Allowed Move Call Targets" list.
 * seal_approve is intentionally excluded (called by Seal nodes, not users).
 */
export const CRM_SPONSORED_TARGETS: string[] = [
  CONTRACT_FUNCTIONS.ORG.CREATE_ORG,
  CONTRACT_FUNCTIONS.ACCESS_CONTROL.CREATE_ORG_REGISTRY,
  CONTRACT_FUNCTIONS.ACCESS_CONTROL.CREATE_ORG_AND_REGISTRY,
  CONTRACT_FUNCTIONS.ACCESS_CONTROL.ADD_ORG_MEMBER,
  CONTRACT_FUNCTIONS.ACCESS_CONTROL.UPDATE_MEMBER_ROLE,
  CONTRACT_FUNCTIONS.ACCESS_CONTROL.REMOVE_ORG_MEMBER,
  CONTRACT_FUNCTIONS.ACCESS_CONTROL.REGISTER_PROFILE,
  CONTRACT_FUNCTIONS.ACCESS_CONTROL.CREATE_AND_REGISTER_PROFILE,
  CONTRACT_FUNCTIONS.ACCESS_CONTROL.CREATE_ENCRYPTED_RESOURCE,
  CONTRACT_FUNCTIONS.PROFILE.CREATE_PROFILE,
  CONTRACT_FUNCTIONS.INTERACTION.LOG_INTERACTION,
  // EncryptedResource is frozen (immutable) so any org member can reference it in seal_approve
  '0x2::transfer::public_freeze_object',
];

// =============================================================================
// EVENT TYPES - Contract event identifiers
// =============================================================================

export const EVENT_TYPES = {
  // Organization events
  ORG_MEMBER_ADDED: `${getCurrentPackageId()}::crm_access_control::OrgMemberAdded`,
  ORG_MEMBER_REMOVED: `${getCurrentPackageId()}::crm_access_control::OrgMemberRemoved`,

  // Profile events
  PROFILE_REGISTERED: `${getCurrentPackageId()}::crm_access_control::ProfileRegistered`,

  // Resource events (notes/files)
  RESOURCE_CREATED: `${getCurrentPackageId()}::crm_access_control::ResourceCreated`,

  // Interaction events
  INTERACTION_EVENT: `${getCurrentPackageId()}::interaction_log::InteractionEvent`,
} as const;

// =============================================================================
// GAS CONFIGURATION
// =============================================================================

export const GAS_CONFIG = {
  // Standard gas budget for most operations (create profile, log interaction)
  STANDARD_GAS_BUDGET: 10_000_000, // 10M MIST

  // Higher gas budget for complex operations (create org with registry)
  HIGH_GAS_BUDGET: 50_000_000, // 50M MIST

  // Gas budget for encrypted resource creation
  ENCRYPTED_RESOURCE_GAS_BUDGET: 20_000_000, // 20M MIST
} as const;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate if an object ID has the correct format
 */
export const isValidObjectId = (objectId: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(objectId);
};

/**
 * Validate if a package ID matches the current network
 */
export const isCurrentPackage = (packageId: string): boolean => {
  return packageId === getCurrentPackageId();
};

// =============================================================================
// EXPORT DEFAULT CONFIG
// =============================================================================

export const CONTRACT_CONFIG = {
  PACKAGES: CONTRACT_PACKAGES,
  SHARED_OBJECTS,
  NETWORK: NETWORK_CONFIG,
  FUNCTIONS: CONTRACT_FUNCTIONS,
  EVENTS: EVENT_TYPES,
  ROLES: CRM_ROLES,
  RESOURCE_TYPES,
  GAS: GAS_CONFIG,
  SPONSORED_TARGETS: CRM_SPONSORED_TARGETS,
} as const;

export default CONTRACT_CONFIG;