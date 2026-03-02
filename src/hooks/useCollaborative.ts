import { useEffect, useRef, useCallback, useState } from 'react';

export interface UserPresence {
  userId: string;
  userName: string;
  userEmail: string;
  lastActive: string;
  isOnline: boolean;
  currentPage?: string;
  editingExpenseId?: string;
  color: string;
}

interface SyncChange {
  type: 'expense' | 'category' | 'goal' | 'bill';
  action: 'create' | 'update' | 'delete';
  id: string;
  userId: string;
  userName: string;
  data?: any;
  timestamp: string;
}

type PresenceListener = (users: UserPresence[]) => void;
type SyncListener = (change: SyncChange) => void;
type ConnectionListener = (connected: boolean) => void;

class CollaborativeConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private presenceListeners: Set<PresenceListener> = new Set();
  private syncListeners: Set<SyncListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor(wsUrl: string) {
    this.url = wsUrl;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ Connected to collaboration server');
          this.reconnectAttempts = 0;
          this.notifyConnectionListeners(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'presence') {
              this.notifyPresenceListeners(message.users);
            } else if (message.type === 'sync') {
              this.notifySyncListeners(message.change);
            }
          } catch (err) {
            console.error('Error parsing message:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('❌ Disconnected from collaboration server');
          this.notifyConnectionListeners(false);
          this.attemptReconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private attemptReconnect = () => {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `🔄 Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      setTimeout(() => {
        this.connect().catch((err) => console.error('Reconnection failed:', err));
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  };

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  updatePresence(data: Partial<UserPresence>): void {
    this.send({
      type: 'presence-update',
      data,
    });
  }

  notifySync(change: SyncChange): void {
    this.send({
      type: 'sync-notify',
      change,
    });
  }

  onPresenceChange(listener: PresenceListener): () => void {
    this.presenceListeners.add(listener);
    return () => this.presenceListeners.delete(listener);
  }

  onSyncChange(listener: SyncListener): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  private notifyPresenceListeners = (users: UserPresence[]) => {
    this.presenceListeners.forEach((listener) => listener(users));
  };

  private notifySyncListeners = (change: SyncChange) => {
    this.syncListeners.forEach((listener) => listener(change));
  };

  private notifyConnectionListeners = (connected: boolean) => {
    this.connectionListeners.forEach((listener) => listener(connected));
  };

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Global connection instance
let globalConnection: CollaborativeConnection | null = null;

export function useCollaborative() {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const syncListenersRef = useRef<Set<SyncListener>>(new Set());

  useEffect(() => {
    const wsUrl = `${
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'
    }/api/collaborative/ws`;

    if (!globalConnection) {
      globalConnection = new CollaborativeConnection(wsUrl);

      globalConnection
        .connect()
        .catch((err) => console.error('Failed to connect:', err));
    }

    const unsubscribePresence = globalConnection.onPresenceChange((users) => {
      setOnlineUsers(users);
    });

    const unsubscribeConnection = globalConnection.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    const unsubscribeSync = globalConnection.onSyncChange((change) => {
      syncListenersRef.current.forEach((listener) => listener(change));
    });

    return () => {
      unsubscribePresence();
      unsubscribeConnection();
      unsubscribeSync();
    };
  }, []);

  const updatePresence = useCallback((data: Partial<UserPresence>) => {
    globalConnection?.updatePresence(data);
  }, []);

  const notifySync = useCallback((change: SyncChange) => {
    globalConnection?.notifySync(change);
  }, []);

  const onSync = useCallback((listener: SyncListener): (() => void) => {
    syncListenersRef.current.add(listener);
    return () => syncListenersRef.current.delete(listener);
  }, []);

  return {
    onlineUsers,
    isConnected,
    updatePresence,
    notifySync,
    onSync,
  };
}
