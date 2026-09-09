import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { LeaderboardManager } from './state.js';
import { WSMessage, PurchaseEvent, OverlayConfig } from './types.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const manager = new LeaderboardManager();

// Track Server-Sent Events (SSE) connections for OBS browser sources
const sseClients = new Set<express.Response>();

/**
 * Broadcast message to all connected WebSocket clients AND Server-Sent Events (SSE) clients.
 */
function broadcast(msg: WSMessage) {
  const dataStr = JSON.stringify({
    ...msg,
    timestamp: Date.now()
  });

  // 1. WebSocket Broadcast
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(dataStr);
      } catch (err) {
        console.warn('[WS] Error sending to client:', err);
      }
    }
  });

  // 2. Server-Sent Events (SSE) Broadcast
  const sseChunk = `data: ${dataStr}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(sseChunk);
    } catch {
      sseClients.delete(client);
    }
  }
}

function broadcastLeaderboardUpdate() {
  const leaderboard = manager.getLeaderboard();
  const state = manager.getState();
  broadcast({
    type: 'LEADERBOARD_UPDATE',
    payload: {
      leaderboard,
      totalPurchases: state.totalPurchases,
      totalMana: state.totalMana,
      config: state.config,
      recentPurchases: state.recentPurchases
    }
  });
}

// REST Endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connections: wss.clients.size,
    sseConnections: sseClients.size,
    uptime: process.uptime()
  });
});

/**
 * Server-Sent Events (SSE) stream for instant real-time OBS Browser Source updates
 */
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial full state immediately upon connection
  const state = manager.getState();
  const initMsg = {
    type: 'INIT_STATE',
    payload: {
      leaderboard: manager.getLeaderboard(),
      totalPurchases: state.totalPurchases,
      totalMana: state.totalMana,
      config: state.config,
      recentPurchases: state.recentPurchases
    },
    timestamp: Date.now()
  };
  res.write(`data: ${JSON.stringify(initMsg)}\n\n`);

  sseClients.add(res);
  console.log(`[SSE] Client connected. Total SSE: ${sseClients.size}`);

  // Heartbeat comment every 15s to keep connections alive through reverse proxies & OBS CEF
  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    console.log(`[SSE] Client disconnected. Total SSE: ${sseClients.size}`);
  });
});

app.get('/api/state', (req, res) => {
  const state = manager.getState();
  const leaderboard = manager.getLeaderboard();
  res.json({
    success: true,
    state: {
      ...state,
      leaderboard
    },
    leaderboard,
    totalPurchases: state.totalPurchases,
    totalMana: state.totalMana,
    config: state.config,
    recentPurchases: state.recentPurchases
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json(manager.getLeaderboard());
});

app.post('/api/purchase', (req, res) => {
  try {
    const { username, itemTitle, price, quantity, customMana } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const result = manager.recordPurchase({
      username,
      itemTitle,
      price,
      quantity: quantity ? parseInt(quantity, 10) : 1,
      customMana: customMana ? parseInt(customMana, 10) : undefined
    });

    // Broadcast alerts
    broadcast({
      type: 'PURCHASE_ALERT',
      payload: result.event
    });

    if (result.isRankUp) {
      broadcast({
        type: 'RANK_UP_ALERT',
        payload: {
          username: result.event.username,
          oldTier: result.oldTier,
          newTier: result.newTier,
          newRankTitle: result.newRankTitle,
          purchaseEvent: result.event
        }
      });
    }

    // Broadcast full updated state
    broadcastLeaderboardUpdate();

    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[API] Purchase error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.post('/api/reset', (req, res) => {
  const state = manager.resetSession();
  broadcastLeaderboardUpdate();
  res.json({ success: true, message: 'Session reset', state });
});

app.post('/api/config', (req, res) => {
  const newConfig = manager.updateConfig(req.body);
  broadcastLeaderboardUpdate();
  res.json({ success: true, config: newConfig });
});

app.post('/api/adjust', (req, res) => {
  const { username, purchases, mana } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  const profile = manager.manualAdjust(username, purchases, mana);
  broadcastLeaderboardUpdate();
  res.json({ success: true, profile });
});

app.delete('/api/buyer/:username', (req, res) => {
  manager.deleteUser(req.params.username);
  broadcastLeaderboardUpdate();
  res.json({ success: true });
});

// WebSocket Connection Handling
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WS] Client connected from ${clientIp}. Total: ${wss.clients.size}`);

  // Send initial full state immediately
  const state = manager.getState();
  const initMsg: WSMessage = {
    type: 'INIT_STATE',
    payload: {
      leaderboard: manager.getLeaderboard(),
      totalPurchases: state.totalPurchases,
      totalMana: state.totalMana,
      config: state.config,
      recentPurchases: state.recentPurchases
    },
    timestamp: Date.now()
  };
  ws.send(JSON.stringify(initMsg));

  ws.on('message', (messageBuffer) => {
    try {
      const raw = messageBuffer.toString();
      const msg: WSMessage = JSON.parse(raw);

      switch (msg.type) {
        case 'NEW_PURCHASE': {
          const { username, itemTitle, price, quantity, customMana } = msg.payload;
          if (!username) break;

          const result = manager.recordPurchase({
            username,
            itemTitle,
            price,
            quantity,
            customMana
          });

          console.log(
            `[WS Event] Purchase by @${result.event.username} (${result.event.quantity}x, Rank: ${result.event.newRankTitle})`
          );

          broadcast({
            type: 'PURCHASE_ALERT',
            payload: result.event
          });

          if (result.isRankUp) {
            broadcast({
              type: 'RANK_UP_ALERT',
              payload: {
                username: result.event.username,
                oldTier: result.oldTier,
                newTier: result.newTier,
                newRankTitle: result.newRankTitle,
                purchaseEvent: result.event
              }
            });
          }

          broadcastLeaderboardUpdate();
          break;
        }

        case 'RESET_SESSION': {
          manager.resetSession();
          console.log('[WS Event] Session reset requested');
          broadcastLeaderboardUpdate();
          break;
        }

        case 'UPDATE_CONFIG': {
          manager.updateConfig(msg.payload as Partial<OverlayConfig>);
          console.log('[WS Event] Config updated');
          broadcastLeaderboardUpdate();
          break;
        }

        case 'MANUAL_ADJUST': {
          const { username, purchases, mana } = msg.payload;
          if (username) {
            manager.manualAdjust(username, purchases, mana);
            broadcastLeaderboardUpdate();
          }
          break;
        }

        case 'DELETE_USER': {
          if (msg.payload?.username) {
            manager.deleteUser(msg.payload.username);
            broadcastLeaderboardUpdate();
          }
          break;
        }

        case 'PING': {
          ws.send(JSON.stringify({ type: 'PONG', payload: {}, timestamp: Date.now() }));
          break;
        }

        default:
          console.warn('[WS] Unknown message type:', msg.type);
      }
    } catch (err) {
      console.error('[WS] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected. Total: ${wss.clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Client socket error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🔮 Whatnot Mana-Leaderboard Relay Server running!`);
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket:   ws://localhost:${PORT}`);
  console.log(`=======================================================`);
});
