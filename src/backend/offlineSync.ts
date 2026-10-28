import { isSupabaseConfigured, requireSupabase } from './client';

export interface PendingMutation {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'upsert' | 'rpc';
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

const QUEUE_STORAGE_KEY = 'avatr_pending_mutations_queue';

function readQueue(): PendingMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingMutation[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('Could not write to offline mutation queue:', err);
  }
}

export function getPendingMutationCount(): number {
  return readQueue().length;
}

export function enqueueMutation(
  table: string,
  action: PendingMutation['action'],
  payload: Record<string, unknown>
): PendingMutation {
  const mutation: PendingMutation = {
    id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    table,
    action,
    payload,
    timestamp: Date.now(),
    retries: 0,
  };
  const queue = readQueue();
  queue.push(mutation);
  writeQueue(queue);
  return mutation;
}

export async function processMutationQueue(): Promise<{ processed: number; failed: number }> {
  if (!navigator.onLine || !isSupabaseConfigured) {
    return { processed: 0, failed: 0 };
  }

  const queue = readQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  const client = requireSupabase();
  const remaining: PendingMutation[] = [];
  let processed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      if (item.action === 'rpc') {
        const { error } = await client.rpc(item.table, item.payload);
        if (error) throw error;
      } else if (item.action === 'upsert') {
        const { error } = await client.from(item.table).upsert(item.payload);
        if (error) throw error;
      } else if (item.action === 'insert') {
        const { error } = await client.from(item.table).insert(item.payload);
        if (error) throw error;
      } else if (item.action === 'update') {
        const id = item.payload.id as string | number | undefined;
        if (!id) throw new Error('Missing ID for update mutation');
        const { error } = await client.from(item.table).update(item.payload).eq('id', id);
        if (error) throw error;
      }
      processed++;
    } catch (err) {
      console.error(`Failed to process mutation ${item.id} on ${item.table}:`, err);
      item.retries += 1;
      if (item.retries < 5) {
        remaining.push(item);
      } else {
        failed++;
      }
    }
  }

  writeQueue(remaining);
  return { processed, failed };
}

// Auto-sync listener when browser comes back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processMutationQueue().catch((err) => {
      console.warn('Background sync error on reconnect:', err);
    });
  });
}
