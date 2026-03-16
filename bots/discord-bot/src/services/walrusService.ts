// ---------------------------------------------------------------------------
// Walrus blob upload / download — server-side (Node.js)
// ---------------------------------------------------------------------------

const NUM_EPOCH = 1;

const WALRUS_PUBLISHERS = [
  "https://publisher.testnet.walrus.atalma.io",
  "https://publisher.walrus-01.tududes.com",
  "https://publisher.walrus-testnet.walrus.space",
  "https://sui-walrus-testnet-publisher.bwarelabs.com",
  "https://walrus-testnet-publisher.nodes.guru",
  "https://walrus-testnet-publisher.nodeinfra.com",
  "https://walrus-testnet-publisher.stakin-nodes.com",
];

const WALRUS_AGGREGATORS = [
  "https://aggregator.walrus-testnet.walrus.space",
  "https://wal-aggregator-testnet.staketab.org",
  "https://sui-walrus-tn-aggregator.bwarelabs.com",
  "https://walrus-testnet-aggregator.nodes.guru",
  "https://walrus-testnet-aggregator.nodeinfra.com",
];

// ── Upload ──────────────────────────────────────────────────────────────────

export async function uploadBlob(
  data: Uint8Array,
): Promise<{ blobId: string; suiRef: string }> {
  let lastError: Error | null = null;

  for (const pub of WALRUS_PUBLISHERS) {
    try {
      const url = `${pub}/v1/blobs?epochs=${NUM_EPOCH}`;
      const res = await fetch(url, {
        method: "PUT",
        body: Buffer.from(data),
        headers: { "Content-Type": "application/octet-stream" },
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const info = await res.json();

      if ("alreadyCertified" in info) {
        return {
          blobId: info.alreadyCertified.blobId,
          suiRef: info.alreadyCertified.event.txDigest,
        };
      }
      if ("newlyCreated" in info) {
        return {
          blobId: info.newlyCreated.blobObject.blobId,
          suiRef: info.newlyCreated.blobObject.id,
        };
      }

      throw new Error("Unexpected Walrus response format");
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`⚠️  Publisher ${pub} failed: ${lastError.message}`);
    }
  }

  throw new Error(`All Walrus publishers failed. Last: ${lastError?.message}`);
}

// ── Download ────────────────────────────────────────────────────────────────

export async function downloadBlob(blobId: string): Promise<Uint8Array> {
  let lastError: Error | null = null;

  for (const agg of WALRUS_AGGREGATORS) {
    try {
      const url = `${agg}/v1/blobs/${blobId}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
        headers: { Accept: "application/octet-stream, */*" },
      });

      if (res.ok) {
        return new Uint8Array(await res.arrayBuffer());
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`⚠️  Aggregator ${agg} failed: ${lastError.message}`);
    }
  }

  throw new Error(`All Walrus aggregators failed. Last: ${lastError?.message}`);
}
