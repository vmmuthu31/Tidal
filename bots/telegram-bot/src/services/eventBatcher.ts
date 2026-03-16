import type { CommunityEvent } from "../types.js";
import { sendWebhook } from "../webhook.js";

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

const records = new Map<string, BatchRecord>();
let flushTimer: NodeJS.Timeout | undefined;
let flushing = false;

function stableKey(event: CommunityEvent): string {
  return [
    event.platform,
    event.kind,
    event.campaign_id || "no_campaign",
    event.external_id,
    String(event.metadata?.action || ""),
  ].join("|");
}

function withBatchMetadata(record: BatchRecord): CommunityEvent {
  return {
    ...record.event,
    metadata: {
      ...(record.event.metadata || {}),
      batch_count: record.count,
      batch_first_seen: new Date(record.firstSeen).toISOString(),
      batch_last_seen: new Date(record.lastSeen).toISOString(),
      kafka_topic: TOPIC,
      dedupe_key: stableKey(record.event),
    },
  };
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

    for (const record of recordsToFlush) {
      await sendWebhook(withBatchMetadata(record));
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
