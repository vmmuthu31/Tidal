import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("Please define MONGODB_URI in your environment variables.");

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

let client: MongoClient;
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClient) global._mongoClient = new MongoClient(MONGODB_URI);
  client = global._mongoClient;
} else {
  client = new MongoClient(MONGODB_URI);
}

export async function getDb(): Promise<Db> {
  await client.connect();
  return client.db("suicrm");
}

export interface UserRecord {
  _id?: string;
  suiAddress: string;
  googleSub: string;
  name: string;
  email: string;
  role: "admin" | "member";
  hasOrg: boolean;
  orgName?: string;           // cached from onboarding
  orgRegistryId?: string;     // on-chain OrgAccessRegistry object ID
  orgAdminAddress?: string;   // for members: points to their admin's suiAddress
  createdAt: Date;
  updatedAt: Date;
}

export interface InviteRecord {
  _id?: string;
  token: string;              // UUID used in the invite link
  adminAddress: string;
  adminName: string;
  orgName: string;
  inviteeName: string;
  inviteeEmail: string;
  role: "member";
  status: "pending" | "accepted" | "expired";
  expiresAt: Date;
  createdAt: Date;
}

export interface ContactRecord {
  _id?: string;
  adminAddress: string;       // org admin who owns this contact
  orgName: string;
  name: string;               // display name
  walletAddress: string;      // contact's Sui address
  tag: string;                // unique tag (e.g. CONTACT_001)
  twitter?: string;
  email?: string;
  company?: string;
  notes?: string;
  onchainTxDigest?: string;   // Sui tx digest of profile creation
  onchainObjectId?: string;   // profile object ID on-chain
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteRecord {
  _id?: string;
  contactId: string;          // MongoDB contact _id
  adminAddress: string;
  blobId: string;
  encryptionId: string;
  resourceObjectId: string;
  accessLevel: number;
  txDigest: string;
  createdAt: Date;
}

export interface FileRecord {
  _id?: string;
  contactId: string;
  adminAddress: string;
  filename: string;
  blobId: string;
  encryptionId: string;
  resourceObjectId: string;
  accessLevel: number;
  txDigest: string;
  createdAt: Date;
}

export interface InteractionRecord {
  _id?: string;
  contactId: string;
  adminAddress: string;
  type: string;               // message | call | meeting | other
  message: string;
  txDigest: string;
  createdAt: Date;
}
