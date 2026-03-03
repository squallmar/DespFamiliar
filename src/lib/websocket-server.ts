import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { getDatabase } from './database';

let wss: WebSocketServer | null = null;

interface Client {
  ws: WebSocket;
  userId: string;
  familyId: string;
  lastActivity: Date;
}

const clients = new Map<string, Client[]>();

interface WebSocketMessage {
  type: string;
  payload: any;
  userId?: string;
  timestamp?: string;
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(port: number = 3001) {
  if (wss) {
    console.log('WebSocket server already running');
    return wss;
  }

  wss = new WebSocketServer({ port });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    console.log('New WebSocket connection');

    // Extract userId and familyId from query params
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    const familyId = url.searchParams.get('familyId');

    if (!userId || !familyId) {
      ws.close(1008, 'userId and familyId are required');
      return;
    }

    // Register client
    const client: Client = {
      ws,
      userId,
      familyId,
      lastActivity: new Date(),
    };

    if (!clients.has(familyId)) {
      clients.set(familyId, []);
    }
    clients.get(familyId)!.push(client);

    console.log(
      `User ${userId} connected to family ${familyId}. Total clients: ${clients.get(familyId)!.length}`
    );

    // Send connection confirmation
    sendToClient(ws, {
      type: 'connected',
      payload: {
        userId,
        familyId,
        connectedUsers: getConnectedUsers(familyId),
      },
    });

    // Broadcast user presence
    broadcastToFamily(familyId, {
      type: 'user:joined',
      payload: {
        userId,
        timestamp: new Date().toISOString(),
      },
    });

    // Handle incoming messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        await handleMessage(familyId, userId, message);
      } catch (error) {
        console.error('Error handling message:', error);
        sendToClient(ws, {
          type: 'error',
          payload: { message: 'Invalid message format' },
        });
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log(`User ${userId} disconnected from family ${familyId}`);

      // Remove client
      const familyClients = clients.get(familyId);
      if (familyClients) {
        const index = familyClients.findIndex((c) => c.userId === userId && c.ws === ws);
        if (index !== -1) {
          familyClients.splice(index, 1);
        }

        if (familyClients.length === 0) {
          clients.delete(familyId);
        }
      }

      // Broadcast user left
      broadcastToFamily(familyId, {
        type: 'user:left',
        payload: {
          userId,
          timestamp: new Date().toISOString(),
        },
      });
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // 30 seconds
  });

  console.log(`✓ WebSocket server started on port ${port}`);
  return wss;
}

/**
 * Handle incoming WebSocket messages
 */
async function handleMessage(
  familyId: string,
  userId: string,
  message: WebSocketMessage
) {
  const { type, payload } = message;

  switch (type) {
    case 'expense:created':
      // Broadcast new expense to all family members
      broadcastToFamily(
        familyId,
        {
          type: 'expense:created',
          payload: {
            ...payload,
            createdBy: userId,
            timestamp: new Date().toISOString(),
          },
        },
        userId // Exclude sender
      );
      break;

    case 'expense:updated':
      // Broadcast expense update
      broadcastToFamily(
        familyId,
        {
          type: 'expense:updated',
          payload: {
            ...payload,
            updatedBy: userId,
            timestamp: new Date().toISOString(),
          },
        },
        userId
      );
      break;

    case 'expense:deleted':
      // Broadcast expense deletion
      broadcastToFamily(
        familyId,
        {
          type: 'expense:deleted',
          payload: {
            ...payload,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
          },
        },
        userId
      );
      break;

    case 'expense:editing':
      // Notify others that user is editing an expense
      broadcastToFamily(
        familyId,
        {
          type: 'expense:editing',
          payload: {
            expenseId: payload.expenseId,
            userId,
            timestamp: new Date().toISOString(),
          },
        },
        userId
      );
      break;

    case 'expense:viewing':
      // Track which expenses are being viewed
      broadcastToFamily(
        familyId,
        {
          type: 'expense:viewing',
          payload: {
            expenseId: payload.expenseId,
            userId,
            timestamp: new Date().toISOString(),
          },
        },
        userId
      );
      break;

    case 'typing':
      // Broadcast typing indicator
      broadcastToFamily(
        familyId,
        {
          type: 'typing',
          payload: {
            userId,
            isTyping: payload.isTyping,
            field: payload.field,
            timestamp: new Date().toISOString(),
          },
        },
        userId
      );
      break;

    case 'ping':
      // Update last activity
      updateClientActivity(familyId, userId);
      break;

    default:
      console.warn(`Unknown message type: ${type}`);
  }
}

/**
 * Send message to specific client
 */
function sendToClient(ws: WebSocket, message: WebSocketMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast message to all clients in a family
 */
export function broadcastToFamily(
  familyId: string,
  message: WebSocketMessage,
  excludeUserId?: string
) {
  const familyClients = clients.get(familyId);
  if (!familyClients) return;

  familyClients.forEach((client) => {
    if (excludeUserId && client.userId === excludeUserId) return;
    sendToClient(client.ws, message);
  });
}

/**
 * Send message to specific user
 */
export function sendToUser(userId: string, message: WebSocketMessage) {
  for (const [familyId, familyClients] of clients.entries()) {
    const userClients = familyClients.filter((c) => c.userId === userId);
    userClients.forEach((client) => {
      sendToClient(client.ws, message);
    });
  }
}

/**
 * Get list of connected users in a family
 */
function getConnectedUsers(familyId: string): string[] {
  const familyClients = clients.get(familyId);
  if (!familyClients) return [];

  const uniqueUsers = new Set(familyClients.map((c) => c.userId));
  return Array.from(uniqueUsers);
}

/**
 * Update client's last activity timestamp
 */
function updateClientActivity(familyId: string, userId: string) {
  const familyClients = clients.get(familyId);
  if (!familyClients) return;

  familyClients
    .filter((c) => c.userId === userId)
    .forEach((c) => {
      c.lastActivity = new Date();
    });
}

/**
 * Get WebSocket server statistics
 */
export function getWebSocketStats() {
  let totalConnections = 0;
  let totalFamilies = clients.size;

  for (const [familyId, familyClients] of clients.entries()) {
    totalConnections += familyClients.length;
  }

  return {
    totalConnections,
    totalFamilies,
    families: Array.from(clients.entries()).map(([familyId, familyClients]) => ({
      familyId,
      connections: familyClients.length,
      users: Array.from(new Set(familyClients.map((c) => c.userId))),
    })),
  };
}

/**
 * Close WebSocket server
 */
export function closeWebSocketServer() {
  if (wss) {
    wss.close();
    wss = null;
    clients.clear();
    console.log('WebSocket server closed');
  }
}

/**
 * Notify family members about budget alert
 */
export async function notifyBudgetAlertWS(
  familyId: string,
  category: string,
  percentage: number,
  spent: number,
  limit: number
) {
  broadcastToFamily(familyId, {
    type: 'alert:budget',
    payload: {
      category,
      percentage,
      spent,
      limit,
      severity: percentage >= 100 ? 'critical' : percentage >= 80 ? 'warning' : 'info',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Notify family members about new insight
 */
export async function notifyInsightWS(familyId: string, insight: any) {
  broadcastToFamily(familyId, {
    type: 'insight:new',
    payload: {
      ...insight,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Notify family members about anomaly detection
 */
export async function notifyAnomalyWS(familyId: string, anomaly: any) {
  broadcastToFamily(familyId, {
    type: 'anomaly:detected',
    payload: {
      ...anomaly,
      timestamp: new Date().toISOString(),
    },
  });
}
