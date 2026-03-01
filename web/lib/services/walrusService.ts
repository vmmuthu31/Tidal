// Configuration for Walrus
const NUM_EPOCH = 1;

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

export interface UploadResult {
    success: boolean;
    blobId?: string;
    suiRef?: string;
    error?: string;
    publisherUsed?: string;
}

export class WalrusService {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async tryPublisher(publisherUrl: string, data: Uint8Array): Promise<any> {
        const url = `${publisherUrl}/v1/blobs?epochs=${NUM_EPOCH}`;
        console.log(`📤 Trying publisher: ${publisherUrl}`);

        const response = await fetch(url, {
            method: 'PUT',
            body: Buffer.from(data),
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
    async storeBlob(data: Uint8Array): Promise<any> {
        console.log(`📤 Uploading ${data.length} bytes to Walrus with fallback...`);

        let lastError: Error | null = null;

        // Try each publisher until one succeeds
        for (const publisher of WALRUS_PUBLISHERS) {
            try {
                const result = await this.tryPublisher(publisher, data);
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

    async uploadText(text: string): Promise<UploadResult> {
        try {
            console.log('📝 Converting text to Uint8Array...');
            const encoder = new TextEncoder();
            const data = encoder.encode(text);

            const storageInfo = await this.storeBlob(data);

            if (!storageInfo) {
                throw new Error('Failed to upload text to any Walrus publisher');
            }

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
            console.log('📡 Publisher Used:', storageInfo.publisherUsed);

            return {
                success: true,
                blobId,
                suiRef,
                publisherUsed: storageInfo.publisherUsed
            };
        } catch (error) {
            console.error('❌ Text upload failed:', error);
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

    async fetchText(blobId: string, timeoutMs: number = 10000): Promise<string> {
        let lastError: Error | null = null;
        for (const aggregator of WALRUS_AGGREGATORS) {
            try {
                const url = `${aggregator}/v1/blobs/${blobId}`;
                console.log(`⬇️ Fetching from aggregator: ${url}`);
                const response = await fetch(url, {
                    signal: AbortSignal.timeout(timeoutMs)
                });

                if (response.ok) {
                    const text = await response.text();
                    return text;
                } else {
                    throw new Error(`HTTP ${response.status} from ${aggregator}`);
                }
            } catch (error) {
                console.warn(`⚠️ Aggregator ${aggregator} failed:`, error instanceof Error ? error.message : String(error));
                lastError = error instanceof Error ? error : new Error(String(error));
            }
        }
        console.error('❌ All aggregators failed');
        throw new Error(`All Walrus aggregators failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }
}

export const walrusService = new WalrusService();
