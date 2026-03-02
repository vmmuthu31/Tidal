// Contract Configuration for SUI CRM
// This file contains all contract addresses and IDs used across the application

// =============================================================================
// PACKAGE IDs - Main contract packages deployed on different networks
// =============================================================================

export const CONTRACT_PACKAGES = {
  // Development network (not deployed yet)
  DEVNET: '0xTODO',

  // Testnet deployment - Update after deployment
  TESTNET: '0x4812b5ca085fd9b6b15c68bcf1fecbd7963bb5772b0fad30fe5db8cb1fd9f928',

  // Mainnet deployment (not deployed yet)
  MAINNET: '0xTODO',
} as const;

// =============================================================================
// REGISTRY & SHARED OBJECTS - Core CRM system objects
// =============================================================================

export const SHARED_OBJECTS = {
  // Profile Access Registry - Tracks profile ownership and org associations
  PROFILE_REGISTRY: '0x97ec5d19b9cdce34ff271ed23bf096959238169193b220cba93a45e563cf77f3',

  // Organization Access Registry - TestOrg created on Sui Testnet
  EXAMPLE_ORG_REGISTRY: '0x44688d0e99fef7b390b56665f9b97706cb24c7ce2bc3afd575b0116d3affd54a',

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
} as const;

export default CONTRACT_CONFIG;