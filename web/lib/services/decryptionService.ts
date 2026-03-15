import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { Transaction } from '@mysten/sui/transactions';
import { SealClient, SessionKey, EncryptedObject } from '@mysten/seal';
import { fromHex } from '@mysten/sui/utils';
import { getCurrentPackageId, getCurrentRpcEndpoint, SHARED_OBJECTS } from '@/lib/config/contracts';

// Configuration matching the encryption service - Using centralized contract config
const SUI_CLIENT = new SuiJsonRpcClient({ url: getCurrentRpcEndpoint(), network: 'testnet' }) as any;
const PACKAGE_ID = getCurrentPackageId();

// Profile registry ID from centralized config
const PROFILE_REGISTRY_ID = SHARED_OBJECTS.PROFILE_REGISTRY;

// Walrus configuration
const WALRUS_AGGREGATOR_URL = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL;

// Seal server configurations
const serverObjectIds = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', // mysten-testnet-1
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', // mysten-testnet-2
  '0x6068c0acb197dddbacd4746a9de7f025b2ed5a5b6c1b1ab44dade4426d141da2', // Ruby Nodes
  '0x5466b7df5c15b508678d51496ada8afab0d6f70a01c10613123382b1b8131007'  // NodeInfra
];

// Initialize Seal client
const sealClient = new SealClient({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suiClient: SUI_CLIENT as any, // Type assertion to handle SDK version mismatch
  serverConfigs: serverObjectIds.map((id) => ({
    objectId: id,
    weight: 1,
  })),
  verifyKeyServers: false,
});

export interface DecryptionResult {
  success: boolean;
  decryptedFileUrls?: string[];
  error?: string;
  personalMessage?: string;
  sessionKey?: SessionKey;
}

export interface ResourceMetadata {
  resource_id: string;
  profile_id: string;
  org_id: string;
  resource_type: 'note' | 'file';
  blob_id: string;
  encryption_id: string;
  access_level: number;
  file_name?: string;
  created_at: string;
  created_by: string;
  walrus_url: string;
  sui_explorer_url: string;
}

export type MoveCallConstructor = (tx: Transaction, id: string) => void;

export class DocumentDecryptionService {
  private TTL_MIN = 10;

  /**
   * Creates a session key for decryption
   */
  async createSessionKey(userAddress: string): Promise<SessionKey> {
    return await SessionKey.create({
      address: userAddress,
      packageId: PACKAGE_ID,
      ttlMin: this.TTL_MIN,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      suiClient: SUI_CLIENT as any,
    });
  }

  /**
   * Creates the move call constructor for CRM access control authorization
   * This calls seal_approve with the resource, org registry, and profile registry
   */
  private createMoveCallConstructor(
    resourceId: string,
    orgRegistryId: string,
    profileRegistryId: string
  ): MoveCallConstructor {
    return (tx: Transaction, fullId: string) => {
      // First arg MUST be the Seal encryption ID as vector<u8> bytes (without 0x prefix)
      const idHex = fullId.startsWith('0x') ? fullId.slice(2) : fullId;
      console.log('🔐 seal_approve args:', { resourceId, orgRegistryId, profileRegistryId, fullId });
      tx.moveCall({
        target: `${PACKAGE_ID}::crm_access_control::seal_approve`,
        arguments: [
          tx.pure.vector('u8', fromHex(idHex)),  // id: vector<u8> — REQUIRED first param
          tx.object(resourceId),                  // resource: &EncryptedResource
          tx.object(orgRegistryId),               // org_registry: &OrgAccessRegistry
          tx.object(profileRegistryId)            // profile_registry: &ProfileAccessRegistry
        ],
      });
    };
  }

  /**
   * Downloads and decrypts CRM resources (notes/files) using Seal SDK
   */
  async downloadAndDecryptResources(
    resources: ResourceMetadata[],
    orgRegistryId: string,
    sessionKey: SessionKey,
    onProgress?: (progress: string) => void
  ): Promise<DecryptionResult> {
    try {
      console.log('🔓 Starting CRM resource decryption process...');
      console.log('📄 Resources to decrypt:', resources.length);

      if (!resources.length) {
        return {
          success: false,
          error: 'No resources provided for decryption'
        };
      }

      // Check if session key is expired
      if (sessionKey.isExpired()) {
        return {
          success: false,
          error: 'Session key has expired. Please sign a new personal message.'
        };
      }

      const decryptedFileUrls: string[] = [];

      // Process each resource
      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        const fileName = resource.file_name || `${resource.resource_type}_${i + 1}`;
        onProgress?.(`Decrypting resource ${i + 1}/${resources.length}: ${fileName}...`);

        // Validate resource_id is a real object ID
        if (!resource.resource_id || resource.resource_id.length < 10) {
          console.error(`⚠️ Invalid resource_id for ${fileName}: "${resource.resource_id}" — skipping`);
          continue;
        }

        const moveCallConstructor = this.createMoveCallConstructor(
          resource.resource_id,
          orgRegistryId,
          PROFILE_REGISTRY_ID
        );

        try {
          // Step 1: Download encrypted file from Walrus
          const encryptedData = await this.downloadEncryptedFile(resource.blob_id, onProgress);

          if (!encryptedData) {
            console.error(`Failed to download blob ${resource.blob_id}`);
            continue;
          }

          // Step 2: Parse encrypted object and decrypt using Seal SDK
          console.log(`🔓 Decrypting with Seal SDK for blob ${resource.blob_id}`);
          console.log(`🔑 Using encryption ID: ${resource.encryption_id}`);
          console.log(`📦 Encrypted data size: ${encryptedData.byteLength} bytes`);

          // Convert ArrayBuffer to Uint8Array if needed
          const encryptedBytes = encryptedData instanceof ArrayBuffer
            ? new Uint8Array(encryptedData)
            : encryptedData;

          console.log(`📦 Encrypted bytes length: ${encryptedBytes.length}`);

          // Parse the encrypted object to get the full ID (same as main frontend)
          let fullId = EncryptedObject.parse(encryptedBytes).id;
          if (!fullId.startsWith('0x')) {
            fullId = '0x' + fullId;
          }
          console.log(`🆔 Full ID from encrypted object: ${fullId}`);

          // Create transaction for move call (same as main frontend)
          const tx = new Transaction();
          moveCallConstructor(tx, fullId);
          const txBytes = await tx.build({ client: SUI_CLIENT, onlyTransactionKind: true });

          // Retry logic: Seal key servers may not see recently created/modified objects immediately
          let decryptedData: Uint8Array | null = null;
          let lastError: unknown = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              decryptedData = await sealClient.decrypt({
                data: encryptedBytes,
                sessionKey,
                txBytes,
              });
              break; // Success
            } catch (err) {
              lastError = err;
              const errMsg = err instanceof Error ? err.message : String(err);
              if (errMsg.includes('newly created object') || errMsg.includes('InvalidParameter')) {
                console.warn(`⏳ Seal retry ${attempt + 1}/3 — FN may not have indexed object yet`);
                onProgress?.(`Waiting for network sync (attempt ${attempt + 1}/3)...`);
                await new Promise((r) => setTimeout(r, 3000 * (attempt + 1))); // 3s, 6s, 9s
              } else {
                throw err; // Non-retryable error
              }
            }
          }

          if (!decryptedData) {
            throw lastError ?? new Error('Decryption failed after retries');
          }

          console.log(`✅ Decryption successful for ${fileName}`);

          // Step 3: Create blob URL for decrypted data
          const mimeType = this.getMimeType(fileName);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const blob = new Blob([decryptedData as any], { type: mimeType });
          const url = URL.createObjectURL(blob);
          decryptedFileUrls.push(url);

        } catch (error) {
          console.error(`Failed to decrypt ${fileName}:`, error);
          // Continue with other resources even if one fails
        }
      }

      if (decryptedFileUrls.length === 0) {
        return {
          success: false,
          error: 'Failed to decrypt any resources. Check if you have proper authorization.'
        };
      }

      onProgress?.(`Successfully decrypted ${decryptedFileUrls.length} of ${resources.length} resources.`);

      return {
        success: true,
        decryptedFileUrls,
        sessionKey
      };

    } catch (error) {
      console.error('❌ Decryption process failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Downloads a single encrypted file from Walrus
   */
  private async downloadEncryptedFile(
    blobId: string,
    onProgress?: (progress: string) => void
  ): Promise<ArrayBuffer | null> {
    // Comprehensive list of Walrus testnet aggregators for maximum reliability
    const reliableAggregators = [
      WALRUS_AGGREGATOR_URL, // Primary aggregator from env
      // HTTPS aggregators
      'https://agg.test.walrus.eosusa.io',
      'https://aggregator.testnet.walrus.atalma.io',
      'https://aggregator.testnet.walrus.mirai.cloud',
      'https://aggregator.walrus-01.tududes.com',
      'https://aggregator.walrus-testnet.h2o-nodes.com',
      'https://aggregator.walrus-testnet.walrus.space',
      'https://aggregator.walrus.banansen.dev',
      'https://aggregator.walrus.testnet.mozcomputing.dev',
      'https://sm1-walrus-testnet-aggregator.stakesquid.com',
      'https://sui-walrus-tn-aggregator.bwarelabs.com',
      'https://suiftly-testnet-agg.mhax.io',
      'https://testnet-aggregator-walrus.kiliglab.io',
      'https://testnet-aggregator.walrus.graphyte.dev',
      'https://testnet-walrus.globalstake.io',
      'https://testnet.aggregator.walrus.silentvalidator.com',
      'https://wal-aggregator-testnet.staketab.org',
      'https://walrus-agg-test.bucketprotocol.io',
      'https://walrus-agg-testnet.chainode.tech:9002',
      'https://walrus-agg.testnet.obelisk.sh',
      'https://walrus-aggregator-testnet.cetus.zone',
      'https://walrus-aggregator-testnet.haedal.xyz',
      'https://walrus-aggregator-testnet.n1stake.com',
      'https://walrus-aggregator-testnet.staking4all.org',
      'https://walrus-aggregator-testnet.suisec.tech',
      'https://walrus-aggregator.thcloud.dev',
      'https://walrus-test-aggregator.thepassivetrust.com',
      'https://walrus-testnet-aggregator-1.zkv.xyz',
      'https://walrus-testnet-aggregator.brightlystake.com',
      'https://walrus-testnet-aggregator.chainbase.online',
      'https://walrus-testnet-aggregator.chainflow.io',
      'https://walrus-testnet-aggregator.crouton.digital',
      'https://walrus-testnet-aggregator.dzdaic.com',
      'https://walrus-testnet-aggregator.everstake.one',
      'https://walrus-testnet-aggregator.luckyresearch.org',
      'https://walrus-testnet-aggregator.natsai.xyz',
      'https://walrus-testnet-aggregator.nodeinfra.com',
      'https://walrus-testnet-aggregator.nodes.guru',
      'https://walrus-testnet-aggregator.redundex.com',
      'https://walrus-testnet-aggregator.rpc101.org',
      'https://walrus-testnet-aggregator.rubynodes.io',
      'https://walrus-testnet-aggregator.stakecraft.com',
      'https://walrus-testnet-aggregator.stakeengine.co.uk',
      'https://walrus-testnet-aggregator.stakely.io',
      'https://walrus-testnet-aggregator.stakeme.pro',
      'https://walrus-testnet-aggregator.stakin-nodes.com',
      'https://walrus-testnet-aggregator.stakingdefenseleague.com',
      'https://walrus-testnet-aggregator.starduststaking.com',
      'https://walrus-testnet-aggregator.talentum.id',
      'https://walrus-testnet-aggregator.trusted-point.com',
      'https://walrus-testnet.blockscope.net',
      'https://walrus-testnet.lionscraft.blockscape.network:9000',
      'https://walrus-testnet.validators.services.kyve.network/aggregate',
      'https://walrus-testnet.veera.com',
      'https://walrus-tn.juicystake.io:9443',
      'https://walrus.testnet.aggregator.stakepool.dev.br',
      'https://walrusagg.testnet.pops.one'
    ].filter(Boolean); // Remove any undefined/null values

    console.log(`📡 Trying ${reliableAggregators.length} aggregators for blob ${blobId}`);

    for (let i = 0; i < reliableAggregators.length; i++) {
      const aggregatorBase = reliableAggregators[i];

      // Skip if aggregatorBase is undefined/null
      if (!aggregatorBase) continue;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // Increased timeout

        const aggregatorUrl = `${aggregatorBase}/v1/blobs/${blobId}`;
        console.log(`[${i + 1}/${reliableAggregators.length}] Attempting download from ${aggregatorBase}`);
        onProgress?.(`Trying aggregator ${i + 1}/${reliableAggregators.length}: ${aggregatorBase}`);

        const response = await fetch(aggregatorUrl, {
          signal: controller.signal,
          mode: 'cors',
          headers: {
            'Accept': 'application/octet-stream, */*'
          }
        });

        clearTimeout(timeout);

        if (response.ok) {
          console.log(`✅ Successfully downloaded from ${aggregatorBase} (${response.status})`);
          onProgress?.(`✅ Download successful from ${aggregatorBase}`);
          return await response.arrayBuffer();
        } else {
          console.log(`❌ Failed from ${aggregatorBase}: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.log(`❌ Failed from ${aggregatorBase}: ${errorMsg}`);
        continue;
      }
    }

    console.error(`❌ All ${reliableAggregators.length} download attempts failed for blob ${blobId}`);
    onProgress?.(`❌ All ${reliableAggregators.length} aggregators failed for blob ${blobId}`);
    return null;
  }

  /**
   * Helper to determine mime type from filename
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Cleanup function to revoke blob URLs
   */
  static cleanupBlobUrls(urls: string[]): void {
    urls.forEach(url => URL.revokeObjectURL(url));
  }

  /**
   * Helper method to get Walrus blob URL
   */
  static getBlobUrl(blobId: string): string {
    return `https://sui-walrus-tn-aggregator.bwarelabs.com/v1/blobs/${blobId}`;
  }

  /**
   * Helper method to get Sui explorer URL
   */
  static getSuiExplorerUrl(objectId: string, type: 'tx' | 'object' = 'object'): string {
    const baseUrl = type === 'tx'
      ? 'https://suiscan.xyz/testnet/tx'
      : 'https://suiscan.xyz/testnet/object';
    return `${baseUrl}/${objectId}`;
  }
}

export const crmDecryptionService = new DocumentDecryptionService();