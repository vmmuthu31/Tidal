import type { CommunityEvent } from "../types.js";
import { sendWebhook } from "../webhook.js";
import { encryptAndUpload, isConfigured as isSealConfigured } from "./sealService.js";

interface BatchRecord {
  event: CommunityEvent;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

const TOPIC = process.env.KAFKA_TOPIC || "campaign.events";
const FLUSH_INTERVAL_MS = Number(process.env.BATCH_FLUSH_INTERVAL_MS || 15000);
const MAX_BUFFER_KEYS = Number(process.env.BATCH_MAX_KEYS || 100);
const RETENTION_MS = Number(process.env.BATCH_RETENTION_MS || 30 * 60 * 1000);
const ENABLE_WALRUS_ARCHIVE = process.env.BATCH_WALRUS_ARCHIVE === "true";

const records = new Map<string, BatchRecord>();
let flushTimer: NodeJS.Timeout | undefined;
let flushing = false;

function stableKey(event: CommunityEvent): string {
  const reaction = typeof event.metadata?.reaction === "string" ? event.metadata.reaction : "";
  return [
    event.platform,
    event.kind,
    event.campaign_id || "no_campaign",
    event.external_id,
    reaction,
  ].join("|");
}

function withBatchMetadata(
  record: BatchRecord,
  walrus?: { blobId: string; encryptionId: string; suiRef: string },
): CommunityEvent {
  return {
    ...record.event,
    metadata: {
      ...(record.event.metadata || {}),
      batch_count: record.count,
      batch_first_seen: new Date(record.firstSeen).toISOString(),
      batch_last_seen: new Date(record.lastSeen).toISOString(),
      kafka_topic: TOPIC,
      dedupe_key: stableKey(record.event),
      walrus_blob_id: walrus?.blobId,
      walrus_encryption_id: walrus?.encryptionId,
      walrus_sui_ref: walrus?.suiRef,
    },
  };
}

async function archiveBatch(recordsToFlush: BatchRecord[]): Promise<{ blobId: string; encryptionId: string; suiRef: string } | undefined> {
  if (!ENABLE_WALRUS_ARCHIVE || !isSealConfigured()) {
    return undefined;
  }

  try {
    const payload = JSON.stringify(
      recordsToFlush.map((record) => ({
        event: record.event,
        count: record.count,
        firstSeen: new Date(record.firstSeen).toISOString(),
        lastSeen: new Date(record.lastSeen).toISOString(),
      })),
    );

    return await encryptAndUpload(new TextEncoder().encode(payload));
  } catch (error) {
    console.error("Failed to archive batch to Walrus:", error);
    return undefined;
  }
}

export async function flushEventBatch(): Promise<void> {
  if (flushing || records.size === 0) return;
  flushing = true;

  try {
    const now = Date.now();
    const recordsToFlush = Array.from(records.values()).filter(
      (record) => now - record.lastSeen <= RETENTION_MS,
    );

    records.clear();

    if (recordsToFlush.length === 0) {
      return;
    }

    const walrusArchive = await archiveBatch(recordsToFlush);

    for (const record of recordsToFlush) {
      const eventToSend = withBatchMetadata(record, walrusArchive);
      await sendWebhook(eventToSend);
    }
  } finally {
    flushing = false;
  }
}

export async function enqueueCommunityEvent(event: CommunityEvent): Promise<void> {
  const key = stableKey(event);
  const now = Date.now();
  const existing = records.get(key);

  if (existing) {
    existing.count += 1;
    existing.lastSeen = now;
    if (event.timestamp > existing.event.timestamp) {
      existing.event = event;
    }
  } else {
    records.set(key, {
      event,
      count: 1,
      firstSeen: now,
      lastSeen: now,
    });
  }

  if (records.size >= MAX_BUFFER_KEYS) {
    await flushEventBatch();
  }
}

export function startEventBatcher(): void {
  if (flushTimer) return;

  flushTimer = setInterval(() => {
    void flushEventBatch();
  }, FLUSH_INTERVAL_MS);

  process.on("SIGINT", () => {
    void flushEventBatch();
  });

  process.on("SIGTERM", () => {
    void flushEventBatch();
  });
}
