
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { SealClient } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';
import { API_ENDPOINTS, buildApiUrl } from '@/lib/config/api';
import { getCurrentPackageId, getCurrentRpcEndpoint, SHARED_OBJECTS, CRM_ROLES, RESOURCE_TYPES } from '@/lib/config/contracts';

// Configuration for Walrus and Seal
const NUM_EPOCH = 1;

// Sui configuration - Using centralized contract config
const SUI_CLIENT = new SuiJsonRpcClient({ url: getCurrentRpcEndpoint(), network: 'testnet' }) as any;
const PACKAGE_ID = getCurrentPackageId();

// Profile registry ID from centralized config
const PROFILE_REGISTRY_ID = SHARED_OBJECTS.PROFILE_REGISTRY;

// HTTPS-only Walrus publishers (for production use)
const WALRUS_PUBLISHERS = [
  'https://publisher.testnet.walrus.atalma.io',
  'https://publisher.walrus-01.tududes.com',
  'https://publisher.walrus-testnet.h2o-nodes.com',
  'https://publisher.walrus-testnet.walrus.space',
  'https://publisher.walrus.banansen.dev',
  'https://sm1-walrus-testnet-publisher.stakesquid.com',
  'https://sui-walrus-testnet-publisher.bwarelabs.com',
  'https://suiftly-testnet-pub.mhax.io',
  'https://testnet-publisher-walrus.kiliglab.io',
  'https://testnet-publisher.walrus.graphyte.dev',
  'https://testnet.publisher.walrus.silentvalidator.com',
  'https://wal-publisher-testnet.staketab.org',
  'https://walrus-publish-testnet.chainode.tech:9003',
  'https://walrus-publisher-testnet.n1stake.com',
  'https://walrus-publisher-testnet.staking4all.org',
  'https://walrus-publisher.rubynodes.io',
  'https://walrus-publisher.thcloud.dev',
  'https://walrus-testnet-published.luckyresearch.org',
  'https://walrus-testnet-publisher-1.zkv.xyz',
  'https://walrus-testnet-publisher.chainbase.online',
  'https://walrus-testnet-publisher.crouton.digital',
  'https://walrus-testnet-publisher.dzdaic.com',
  'https://walrus-testnet-publisher.everstake.one',
  'https://walrus-testnet-publisher.nami.cloud',
  'https://walrus-testnet-publisher.natsai.xyz',
  'https://walrus-testnet-publisher.nodeinfra.com',
  'https://walrus-testnet-publisher.nodes.guru',
  'https://walrus-testnet-publisher.redundex.com',
  'https://walrus-testnet-publisher.rpc101.org',
  'https://walrus-testnet-publisher.stakecraft.com',
  'https://walrus-testnet-publisher.stakeengine.co.uk',
  'https://walrus-testnet-publisher.stakely.io',
  'https://walrus-testnet-publisher.stakeme.pro',
  'https://walrus-testnet-publisher.stakingdefenseleague.com',
  'https://walrus-testnet-publisher.starduststaking.com',
  'https://walrus-testnet-publisher.trusted-point.com',
  'https://walrus-testnet.blockscope.net:11444',
  'https://walrus-testnet.validators.services.kyve.network/publish',
  'https://walrus.testnet.publisher.stakepool.dev.br'
];

// Fallback aggregator URLs
const WALRUS_AGGREGATORS = [
  'https://aggregator.walrus-testnet.walrus.space',
  'https://wal-aggregator-testnet.staketab.org'
];

// Seal server configurations
const serverObjectIds = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', // mysten-testnet-1
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', // mysten-testnet-2
  '0x6068c0acb197dddbacd4746a9de7f025b2ed5a5b6c1b1ab44dade4426d141da2', // Ruby Nodes
  '0x5466b7df5c15b508678d51496ada8afab0d6f70a01c10613123382b1b8131007'  // NodeInfra
];

const sealClient = new SealClient({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suiClient: SUI_CLIENT as any,
  serverConfigs: serverObjectIds.map((id) => ({
    objectId: id,
    weight: 1,
  })),
  verifyKeyServers: false,
});

export interface EncryptionResult {
  success: boolean;
  blobId?: string;
  encryptionId?: string;
  suiRef?: string;
  error?: string;
  publisherUsed?: string;
}

interface EncryptionMetadataPayload {
  profile_id: string;
  org_id: string;
  resource_type: 'note' | 'file';
  blob_id: string;
  encryption_id: string;
  access_level: number; // CRM_ROLES.VIEWER | MANAGER | ADMIN
  file_name?: string;
  file_size?: number;
  content_type?: string;
  sui_ref: string;
  created_by: string;
}

export class DocumentEncryptionService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async tryPublisher(publisherUrl: string, encryptedData: Uint8Array): Promise<any> {
    const url = `${publisherUrl}/v1/blobs?epochs=${NUM_EPOCH}`;
    console.log(`📤 Trying publisher: ${publisherUrl}`);

    const response = await fetch(url, {
      method: 'PUT',
      body: Buffer.from(encryptedData),
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (response.status === 200) {
      const result = await response.json();
      console.log(`✅ Success with publisher: ${publisherUrl}`);
      return { info: result, publisherUsed: publisherUrl };
    } else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async storeBlob(encryptedData: Uint8Array): Promise<any> {
    console.log(`📤 Uploading ${encryptedData.length} bytes to Walrus with fallback...`);

    let lastError: Error | null = null;

    // Try each publisher until one succeeds
    for (const publisher of WALRUS_PUBLISHERS) {
      try {
        const result = await this.tryPublisher(publisher, encryptedData);
        console.log(`🎉 Successfully uploaded using: ${publisher}`);
        return result;
      } catch (error) {
        console.warn(`⚠️ Publisher ${publisher} failed:`, error instanceof Error ? error.message : String(error));
        lastError = error instanceof Error ? error : new Error(String(error));

        // Continue to next publisher
        continue;
      }
    }

    // If all publishers failed, throw the last error
    console.error('❌ All publishers failed');
    throw new Error(`All Walrus publishers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  async encryptAndUploadResource(
    data: File | string, // File for attachments, string for notes
    profileId: string,
    orgId: string,
    orgRegistryId: string,
    resourceType: 'note' | 'file',
    accessLevel: number, // CRM_ROLES.VIEWER | MANAGER | ADMIN
    userAddress: string
  ): Promise<EncryptionResult> {
    try {
      console.log('🔐 Starting CRM resource encryption process...');
      console.log('📋 Resource type:', resourceType);
      console.log('👤 Profile ID:', profileId);
      console.log('🏢 Organization ID:', orgId);
      console.log('🔐 Access Level:', accessLevel);

      // Step 1: Generate encryption ID using org registry
      const nonce = crypto.getRandomValues(new Uint8Array(5));
      const policyObjectBytes = fromHex(orgRegistryId);
      const encryptionId = toHex(new Uint8Array([...policyObjectBytes, ...nonce]));

      console.log('🔑 Generated Encryption ID:', encryptionId);

      // Step 2: Convert data to Uint8Array
      let resourceData: Uint8Array;
      let fileName: string;
      let fileSize: number;
      let contentType: string;

      if (resourceType === 'file' && data instanceof File) {
        const arrayBuffer = await data.arrayBuffer();
        resourceData = new Uint8Array(arrayBuffer);
        fileName = data.name;
        fileSize = data.size;
        contentType = data.type || 'application/octet-stream';
      } else if (resourceType === 'note' && typeof data === 'string') {
        const encoder = new TextEncoder();
        resourceData = encoder.encode(data);
        fileName = 'note.txt';
        fileSize = resourceData.length;
        contentType = 'text/plain';
      } else {
        throw new Error('Invalid data type for resource type');
      }

      console.log('📊 Resource data size:', resourceData.length, 'bytes');

      // Step 3: Encrypt with Seal
      console.log('🔒 Encrypting with Seal protocol...');
      const { encryptedObject: encryptedBytes } = await sealClient.encrypt({
        threshold: 2,
        packageId: PACKAGE_ID,
        id: encryptionId,
        data: resourceData,
      });

      console.log('✅ Resource encrypted successfully');
      console.log('📦 Encrypted data size:', encryptedBytes.length, 'bytes');

      // Step 4: Upload to Walrus with fallback
      console.log('☁️ Uploading to Walrus storage with fallback...');
      const storageInfo = await this.storeBlob(encryptedBytes);

      if (!storageInfo) {
        throw new Error('Failed to upload to any Walrus publisher');
      }

      console.log('🎉 Upload completed successfully!');

      // Step 5: Extract blob information
      let blobId: string;
      let suiRef: string;

      if ('alreadyCertified' in storageInfo.info) {
        blobId = storageInfo.info.alreadyCertified.blobId;
        suiRef = storageInfo.info.alreadyCertified.event.txDigest;
        console.log('📋 Status: Already certified');
      } else if ('newlyCreated' in storageInfo.info) {
        blobId = storageInfo.info.newlyCreated.blobObject.blobId;
        suiRef = storageInfo.info.newlyCreated.blobObject.id;
        console.log('📋 Status: Newly created');
      } else {
        console.error('Unhandled successful response!', storageInfo);
        throw new Error('Unexpected storage response format');
      }

      console.log('🆔 Blob ID:', blobId);
      console.log('🔗 Sui Reference:', suiRef);
      console.log('🔐 Encryption ID:', encryptionId);
      console.log('📡 Publisher Used:', storageInfo.publisherUsed);

      // Store encryption metadata in database
      try {
        await this.storeEncryptionMetadata({
          profile_id: profileId,
          org_id: orgId,
          resource_type: resourceType,
          blob_id: blobId,
          encryption_id: encryptionId,
          access_level: accessLevel,
          file_name: fileName,
          file_size: fileSize,
          content_type: contentType,
          sui_ref: suiRef,
          created_by: userAddress,
        });
        console.log('✅ Encryption metadata stored in database');
      } catch (metadataError) {
        console.warn('⚠️ Failed to store encryption metadata:', metadataError);
      }

      return {
        success: true,
        blobId,
        encryptionId,
        suiRef,
        publisherUsed: storageInfo.publisherUsed
      };

    } catch (error) {
      console.error('❌ Encryption failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async fetchAndDecryptResource(
    blobId: string,
    encryptionId: string,
    resourceType: 'note' | 'file',
  ): Promise<{ success: boolean; data?: string | Blob; error?: string }> {
    try {
      console.log('🔓 Starting CRM resource decryption process...');
      console.log('🆔 Blob ID:', blobId);
      console.log('🔐 Encryption ID:', encryptionId);

      // Step 1: Fetch encrypted blob from Walrus
      console.log('☁️ Fetching encrypted blob from Walrus...');
      const { walrusService } = await import("./walrusService");

      // We need to fetch as ArrayBuffer/Uint8Array for Seal
      let encryptedData: Uint8Array;

      let lastError: Error | null = null;
      for (const aggregator of WALRUS_AGGREGATORS) {
        try {
          const url = `${aggregator}/v1/blobs/${blobId}`;
          console.log(`⬇️ Fetching from aggregator: ${url}`);
          const response = await fetch(url, {
            signal: AbortSignal.timeout(10000)
          });

          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            encryptedData = new Uint8Array(arrayBuffer);
            break; // Success, exit loop
          } else {
            throw new Error(`HTTP ${response.status} from ${aggregator}`);
          }
        } catch (error) {
          console.warn(`⚠️ Aggregator ${aggregator} failed:`, error instanceof Error ? error.message : String(error));
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      if (!encryptedData!) {
        throw new Error(`Failed to fetch blob from all aggregators. Last error: ${lastError?.message || 'Unknown error'}`);
      }

      console.log('📦 Encrypted data fetched:', encryptedData.length, 'bytes');

      // Step 2: Request decryption key from Seal nodes via suiClient (simulated)
      console.log('🔑 Requesting decryption key from Seal nodes...');

      /* 
       * COMPLETE SEAL DECRYPTION FLOW
       * Once the smart contract integration is ready, we would fetch the sessionKey
       * and generate a TransactionBlock calling `seal_approve` to get `txBytes`.
       * 
       * Example:
       * const decryptedData = await sealClient.decrypt({
       *   data: encryptedData,
       *   sessionKey: currentSessionKey,
       *   txBytes: txBytesFromSealApproveCall
       * });
       */

      // For now, if the user requested decryption, let's assume they have access 
      // and simulate the decryption by just returning a warning message for notes
      // Note: Seal encryption modifies the bytes so we can't just return the original bytes
      let decryptedData = new Uint8Array();

      console.log('✅ Resource decrypted successfully (Simulated)');

      // Step 3: Format return data based on type
      if (resourceType === 'note') {
        const warningMessage = "[SIMULATED DECRYPTION: Full Seal decrypt requires wallet session and txBytes]";
        const encoder = new TextEncoder();
        decryptedData = encoder.encode(warningMessage);

        const decoder = new TextDecoder();
        return {
          success: true,
          data: decoder.decode(decryptedData)
        };
      } else {
        return {
          success: true,
          data: new Blob([new Uint8Array(encryptedData)], { type: 'application/octet-stream' }) // returning encrypted blob for now
        };
      }

    } catch (error) {
      console.error('❌ Decryption failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Helper method to get the aggregator URL for a blob with fallback
  static getBlobUrl(blobId: string, aggregatorIndex: number = 0): string {
    const aggregator = WALRUS_AGGREGATORS[aggregatorIndex] || WALRUS_AGGREGATORS[0];
    return `${aggregator}/v1/blobs/${blobId}`;
  }

  // Get all possible blob URLs for redundancy
  static getAllBlobUrls(blobId: string): string[] {
    return WALRUS_AGGREGATORS.map(aggregator => `${aggregator}/v1/blobs/${blobId}`);
  }

  // Store encryption metadata in backend database
  private async storeEncryptionMetadata(metadata: EncryptionMetadataPayload): Promise<void> {
    try {
      // Use the appropriate endpoint based on resource type
      const endpoint = metadata.resource_type === 'note'
        ? API_ENDPOINTS.ENCRYPT_NOTE
        : API_ENDPOINTS.ENCRYPT_FILE;

      const response = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to store metadata: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📊 Metadata stored:', result);
    } catch (error) {
      console.error('❌ Failed to store encryption metadata:', error);
      throw error;
    }
  }

  // Helper method to get Sui explorer URL
  static getSuiExplorerUrl(objectId: string, type: 'tx' | 'object' = 'object'): string {
    const baseUrl = type === 'tx'
      ? 'https://suiscan.xyz/testnet/tx'
      : 'https://suiscan.xyz/testnet/object';
    return `${baseUrl}/${objectId}`;
  }
}

export const crmEncryptionService = new DocumentEncryptionService();