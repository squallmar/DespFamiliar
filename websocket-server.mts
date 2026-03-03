/**
 * WebSocket Server Initialization Script
 * Run this separately from Next.js server:
 *   npx tsx websocket-server.mts
 * 
 * Or integrate with Next.js custom server
 */

import { initializeWebSocketServer } from './src/lib/websocket-server';
import { startEmailScheduler } from './src/lib/email-scheduler';

const WS_PORT = parseInt(process.env.WS_PORT || '3001', 10);

console.log('🚀 Starting DespFamiliar Backend Services...');

// Initialize WebSocket server
try {
  initializeWebSocketServer(WS_PORT);
  console.log(`✓ WebSocket server running on port ${WS_PORT}`);
} catch (error) {
  console.error('Failed to start WebSocket server:', error);
}

// Start email scheduler (cron jobs)
try {
  startEmailScheduler();
  console.log('✓ Email scheduler initialized');
} catch (error) {
  console.error('Failed to start email scheduler:', error);
}

console.log('\n📡 Backend services running. Press Ctrl+C to stop.\n');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down backend services...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down backend services...');
  process.exit(0);
});
