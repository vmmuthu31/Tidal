// Shared types for SUI CRM frontend

export type OrgRole = 1 | 2 | 3; // VIEWER, MANAGER, ADMIN

export interface Organization {
  id: string;
  name: string;
  registryId?: string;
}

export interface OrgMember {
  address: string;
  role: OrgRole;
  roleLabel: string;
}

export interface ContactProfile {
  id: string;
  owner: string;
  walletAddress: string;
  twitter?: string;
  createdAt?: string;
}

export interface EncryptedResource {
  id: string;
  profileId: string;
  orgId: string;
  resourceType: 1 | 2; // NOTE | FILE
  accessLevel: OrgRole;
  createdAt: string;
  walrusBlobId?: string;
  encryptionId?: string;
  filename?: string;
}

export interface InteractionLog {
  id: string;
  profileId: string;
  type: string;
  message: string;
  txDigest?: string;
  createdAt: string;
}

export const ROLE_LABELS: Record<OrgRole, string> = {
  1: "Viewer",
  2: "Manager",
  3: "Admin",
};

export const ACCESS_LEVEL_OPTIONS: { value: OrgRole; label: string }[] = [
  { value: 1, label: "Viewers and above" },
  { value: 2, label: "Managers and above" },
  { value: 3, label: "Admins only" },
];
