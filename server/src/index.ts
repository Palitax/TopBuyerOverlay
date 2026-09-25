import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { RaidBossManager } from './state.js';
import { WSMessage, RaidConfig, RaidTier } from './types.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const manager = new RaidBossManager();

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

function broadcastStateUpdate() {
  const state = manager.getState();
  broadcast({
    type: 'RAID_STATE_UPDATE',
    payload: state
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connections: wss.clients.size,
    sseConnections: sseClients.size,
    bossHp: manager.getState().boss.currentHp,
    bossMaxHp: manager.getState().boss.maxHp,
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

  // Send initial full state immediately
  const state = manager.getState();
  const initMsg = {
    type: 'INIT_STATE',
    payload: state,
    timestamp: Date.now()
  };
  res.write(`data: ${JSON.stringify(initMsg)}\n\n`);

  sseClients.add(res);
  console.log(`[SSE] Client connected. Total SSE: ${sseClients.size}`);

  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    console.log(`[SSE] Client disconnected. Total SSE: ${sseClients.size}`);
  });
});

// Full state endpoint
app.get('/api/state', (req, res) => {
  res.json({
    success: true,
    state: manager.getState()
  });
});

/**
 * Direct Stream Deck & Webhook HTTP Hit Endpoints:
 * GET or POST /api/hit?tier=RARE&buyer=XYZ
 * Optional query/body params: tier, buyer, damage, itemTitle, price
 */
const handleHitRequest = (req: express.Request, res: express.Response) => {
  try {
    const buyer = (req.query.buyer as string) || req.body?.buyer || (req.query.user as string) || req.body?.user || 'StreamRaider';
    const tier = (req.query.tier as string) || req.body?.tier || 'RARE';
    const rawDamage = req.query.damage ? parseInt(req.query.damage as string, 10) : req.body?.damage;
    const itemTitle = (req.query.item as string) || req.body?.itemTitle || 'Stream Purchase';
    const price = (req.query.price as string) || req.body?.price;

    const result = manager.recordHit({
      buyer,
      tier: tier as RaidTier,
      customDamage: rawDamage,
      itemTitle,
      price
    });

    console.log(
      `[Hit Event] 💥 ${result.event.buyer} dealt ${result.event.totalDamage} DMG (${result.event.tier}) -> Boss HP: ${result.boss.currentHp}/${result.boss.maxHp}`
    );

    // Broadcast individual hit alert
    broadcast({
      type: 'HIT_ALERT',
      payload: result.event
    });

    // Broadcast full updated state
    broadcastStateUpdate();

    return res.json({
      success: true,
      hit: result.event,
      boss: result.boss,
      isDefeated: result.isDefeated,
      isPhase2: result.isPhase2
    });
  } catch (err: any) {
    console.error('[API Hit Error]', err);
    return res.status(500).json({ error: err.message || 'Internal Hit Error' });
  }
};

app.get('/api/hit', handleHitRequest);
app.post('/api/hit', handleHitRequest);

/**
 * Shield Endpoints (GET & POST /api/shield?amount=100)
 */
const handleShieldRequest = (req: express.Request, res: express.Response) => {
  const amount = req.query.amount ? parseInt(req.query.amount as string, 10) : req.body?.amount ? parseInt(req.body.amount, 10) : 100;
  const boss = manager.addShield(amount);
  console.log(`[Shield Event] 🛡️ Shield adjusted by +${amount} -> Total Shield: ${boss.shieldHp}`);
  broadcastStateUpdate();
  res.json({ success: true, shieldHp: boss.shieldHp, boss });
};

app.get('/api/shield', handleShieldRequest);
app.post('/api/shield', handleShieldRequest);

/**
 * Undo Last Hit Endpoints (GET & POST /api/undo)
 */
const handleUndoRequest = (req: express.Request, res: express.Response) => {
  const result = manager.undoLastHit();
  console.log(`[Undo Event] ↩️ Last hit reverted! Success: ${result.success}`);
  broadcastStateUpdate();
  res.json({ success: result.success, undoneHit: result.undoneHit, state: manager.getState() });
};

app.get('/api/undo', handleUndoRequest);
app.post('/api/undo', handleUndoRequest);

/**
 * Enrage Toggle Endpoints (GET & POST /api/enrage?active=true)
 */
const handleEnrageRequest = (req: express.Request, res: express.Response) => {
  const activeParam = req.query.active !== undefined ? req.query.active === 'true' : req.body?.active;
  const boss = manager.toggleEnrage(activeParam);
  console.log(`[Enrage Event] ⚡ Enrage set to ${boss.isEnraged}`);
  broadcastStateUpdate();
  res.json({ success: true, isEnraged: boss.isEnraged, phase: boss.phase, boss });
};

app.get('/api/enrage', handleEnrageRequest);
app.post('/api/enrage', handleEnrageRequest);

/**
 * Reset Raid Endpoints (GET & POST /api/reset?hp=3000)
 */
const handleResetRequest = (req: express.Request, res: express.Response) => {
  const hp = req.query.hp ? parseInt(req.query.hp as string, 10) : req.body?.hp;
  const bossName = (req.query.boss as string) || req.body?.bossName;
  const kgaTitle = (req.query.kga as string) || req.body?.kgaTitle;

  const state = manager.resetRaid({ hp, bossName, kgaTitle });
  console.log(`[Reset Event] 🔄 Raid Boss Reset! Max HP: ${state.boss.maxHp}`);
  broadcastStateUpdate();
  res.json({ success: true, message: 'Raid boss reset to full HP', state });
};

app.get('/api/reset', handleResetRequest);
app.post('/api/reset', handleResetRequest);

/**
 * Sound Config Toggle Endpoints (GET & POST /api/sound?enabled=true)
 */
const handleSoundRequest = (req: express.Request, res: express.Response) => {
  const enabled = req.query.enabled !== undefined ? req.query.enabled === 'true' : req.body?.enabled;
  const volume = req.query.volume ? parseFloat(req.query.volume as string) : req.body?.volume;
  const config = manager.updateConfig({
    ...(enabled !== undefined ? { soundEnabled: enabled } : {}),
    ...(volume !== undefined ? { soundVolume: volume } : {})
  });
  broadcastStateUpdate();
  res.json({ success: true, soundEnabled: config.soundEnabled, soundVolume: config.soundVolume });
};

app.get('/api/sound', handleSoundRequest);
app.post('/api/sound', handleSoundRequest);

/**
 * KGA Reward update (GET & POST /api/kga)
 */
const handleKgaRequest = (req: express.Request, res: express.Response) => {
  const title = (req.query.title as string) || req.body?.title;
  const subtitle = (req.query.subtitle as string) || req.body?.subtitle;
  const code = (req.query.code as string) || req.body?.code;
  const isRevealed = req.query.revealed !== undefined ? req.query.revealed === 'true' : req.body?.isRevealed;

  const kga = manager.updateKga({
    ...(title ? { title } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(code ? { code } : {}),
    ...(isRevealed !== undefined ? { isRevealed } : {})
  });
  broadcastStateUpdate();
  res.json({ success: true, kga });
};

app.get('/api/kga', handleKgaRequest);
app.post('/api/kga', handleKgaRequest);

app.post('/api/config', (req, res) => {
  const newConfig = manager.updateConfig(req.body);
  broadcastStateUpdate();
  res.json({ success: true, config: newConfig });
});

// WebSocket Connection Handling
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WS] Client connected from ${clientIp}. Total: ${wss.clients.size}`);

  // Send initial full state immediately
  const state = manager.getState();
  const initMsg: WSMessage = {
    type: 'INIT_STATE',
    payload: state,
    timestamp: Date.now()
  };
  ws.send(JSON.stringify(initMsg));

  ws.on('message', (messageBuffer) => {
    try {
      const raw = messageBuffer.toString();
      const msg: WSMessage = JSON.parse(raw);

      switch (msg.type) {
        case 'RAID_HIT': {
          const { buyer, tier, customDamage, itemTitle, price } = msg.payload || {};
          if (!buyer) break;

          const result = manager.recordHit({
            buyer,
            tier,
            customDamage,
            itemTitle,
            price
          });

          broadcast({
            type: 'HIT_ALERT',
            payload: result.event
          });

          broadcastStateUpdate();
          break;
        }

        case 'UNDO_HIT': {
          manager.undoLastHit();
          broadcastStateUpdate();
          break;
        }

        case 'SHIELD_BOSS': {
          const amount = msg.payload?.amount || 100;
          manager.addShield(amount);
          broadcastStateUpdate();
          break;
        }

        case 'TOGGLE_ENRAGE': {
          manager.toggleEnrage(msg.payload?.active);
          broadcastStateUpdate();
          break;
        }

        case 'RESET_RAID': {
          manager.resetRaid(msg.payload);
          broadcastStateUpdate();
          break;
        }

        case 'UPDATE_CONFIG': {
          manager.updateConfig(msg.payload as Partial<RaidConfig>);
          broadcastStateUpdate();
          break;
        }

        case 'UPDATE_KGA': {
          manager.updateKga(msg.payload);
          broadcastStateUpdate();
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
  console.log(`⚔️  Whatnot RPG Raid Boss Relay Server running!`);
  console.log(`📡 HTTP API:  http://localhost:${PORT}`);
  console.log(`⚡ WebSocket: ws://localhost:${PORT}`);
  console.log(`🎯 Hit API:   http://localhost:${PORT}/api/hit?tier=RARE&buyer=Hero`);
  console.log(`=======================================================`);
});
