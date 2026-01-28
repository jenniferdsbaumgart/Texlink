import Dexie, { Table } from 'dexie';

export interface PendingMessage {
  id: string; // tempId
  orderId: string;
  type: 'TEXT' | 'PROPOSAL';
  content?: string;
  proposedPrice?: number;
  proposedQuantity?: number;
  proposedDeadline?: string;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed' | 'sent';
  error?: string;
}

export class ChatDatabase extends Dexie {
  pendingMessages!: Table<PendingMessage, string>;

  constructor() {
    super('ChatDB');

    this.version(1).stores({
      pendingMessages: 'id, orderId, timestamp, status',
    });
  }
}

export const chatDb = new ChatDatabase();
