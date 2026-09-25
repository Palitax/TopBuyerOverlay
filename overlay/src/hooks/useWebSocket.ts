import { useEffect, useRef, useState, useCallback } from 'react';
import { RaidState, RaidHitEvent, WSMessage, WSMessageType, RaidConfig, UnlockedKGA } from '../types';
import { useRaidAudio } from './useRaidAudio';
import { getInitialDemoState, simulateClientHit } from '../utils/simulation';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

const BROADCAST_BUS_NAME = 'whatnot_raid_boss_bus';
const DEFAULT_CLOUD_ROOM = 'whatnot_raid_boss_palitax_sync';

export function getSyncRoom(): string {
  if (typeof window === 'undefined') return DEFAULT_CLOUD_ROOM;
  const params = new URLSearchParams(window.location.search);
  return params.get('room') || localStorage.getItem('whatnot_raid_sync_room') || DEFAULT_CLOUD_ROOM;
}

export function useWebSocket(customUrl?: string) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [state, setState] = useState<RaidState>(() => {
    try {
      const saved = localStorage.getItem('whatnot_raid_state');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return getInitialDemoState();
  });

  const [latestHit, setLatestHit] = useState<RaidHitEvent | null>(null);

  const clientIdRef = useRef<string>('raid_client_' + Math.random().toString(36).substring(2, 9));
  const wsRef = useRef<WebSocket | null>(null);
  const cloudSseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const processedHitIds = useRef<Set<string>>(new Set());

  const { playSlash, playCrit, playDefeat, playChest } = useRaidAudio();

  const getEndpoints = useCallback(() => {
    if (customUrl) {
      const httpOrigin = customUrl.replace(/^ws(s)?:/, 'http$1:');
      return { wsUrl: customUrl, httpOrigin, hasDedicatedBackend: true };
    }

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const serverParam = urlParams?.get('server') || urlParams?.get('backend');
    const envBackend = (import.meta as any).env?.VITE_BACKEND_URL;
    let targetHost = serverParam || envBackend;

    if (targetHost) {
      targetHost = targetHost.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/$/, '');
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const isSecure = isHttps || targetHost.includes('onrender.com') || targetHost.includes('railway.app');
      const wsProto = isSecure ? 'wss:' : 'ws:';
      const httpProto = isSecure ? 'https:' : 'http:';
      return {
        wsUrl: `${wsProto}//${targetHost}`,
        httpOrigin: `${httpProto}//${targetHost}`,
        hasDedicatedBackend: true
      };
    }

    const hostname = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
    const isCloudHost = hostname.includes('vercel.app') || hostname.includes('netlify.app');

    if (isCloudHost) {
      return {
        wsUrl: '',
        httpOrigin: '',
        hasDedicatedBackend: false
      };
    }

    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const wsProto = isHttps ? 'wss:' : 'ws:';
    const httpProto = isHttps ? 'https:' : 'http:';
    return {
      wsUrl: `${wsProto}//${hostname}:8080`,
      httpOrigin: `${httpProto}//${hostname}:8080`,
      hasDedicatedBackend: true
    };
  }, [customUrl]);

  // Unified incoming message handler
  const handleIncomingMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case 'INIT_STATE':
        case 'RAID_STATE_UPDATE': {
          if (msg.payload && msg.payload.boss) {
            setState(msg.payload);
            try {
              localStorage.setItem('whatnot_raid_state', JSON.stringify(msg.payload));
            } catch (e) {}
          }
          break;
        }

        case 'HIT_ALERT': {
          const hit: RaidHitEvent = msg.payload;
          if (!hit) break;

          if (hit.id && processedHitIds.current.has(hit.id)) {
            break;
          }
          if (hit.id) {
            processedHitIds.current.add(hit.id);
            if (processedHitIds.current.size > 100) {
              const oldest = processedHitIds.current.values().next().value;
              if (oldest) processedHitIds.current.delete(oldest);
            }
          }

          setLatestHit(hit);

          // Audio triggers
          const soundEnabled = state.config?.soundEnabled ?? true;
          const soundVolume = state.config?.soundVolume ?? 0.8;

          if (soundEnabled) {
            if (hit.triggeredDefeat || hit.newHp === 0) {
              playDefeat(soundVolume);
              setTimeout(() => playChest(soundVolume), 1200);
            } else if (hit.isCrit || hit.tier === 'LEGENDARY' || hit.comboMultiplier >= 1.3) {
              playCrit(soundVolume);
            } else {
              playSlash(soundVolume * 0.9);
            }
          }
          break;
        }

        default:
          break;
      }
    },
    [state.config?.soundEnabled, state.config?.soundVolume, playSlash, playCrit, playDefeat, playChest]
  );

  // Cloud Sync Broadcast (ntfy.sh)
  const broadcastCloudSync = useCallback(async (data: any) => {
    const room = getSyncRoom();
    try {
      await fetch(`https://ntfy.sh/${room}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Title': 'Whatnot Raid Boss Sync'
        },
        body: JSON.stringify({
          ...data,
          senderId: clientIdRef.current,
          timestamp: Date.now()
        })
      });
    } catch (err) {}
  }, []);

  // 1. Cloud SSE Listener
  useEffect(() => {
    const room = getSyncRoom();
    const cloudUrl = `https://ntfy.sh/${room}/sse`;
    let sse: EventSource | null = null;

    fetch(`https://ntfy.sh/${room}/json?poll=1`)
      .then((res) => res.text())
      .then((text) => {
        if (!text) return;
        const lines = text.trim().split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const item = JSON.parse(lines[i]);
            if (item.message) {
              const parsed = JSON.parse(item.message);
              if (parsed.type === 'SYNC_STATE' && parsed.nextState) {
                setState(parsed.nextState);
                try {
                  localStorage.setItem('whatnot_raid_state', JSON.stringify(parsed.nextState));
                } catch (e) {}
                break;
              }
            }
          } catch (e) {}
        }
      })
      .catch(() => {});

    try {
      sse = new EventSource(cloudUrl);
      cloudSseRef.current = sse;

      sse.onopen = () => {
        setStatus('connected');
      };

      sse.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === 'message' && parsed.message) {
            const data = JSON.parse(parsed.message);
            if (data.senderId === clientIdRef.current) return;

            if (data.type === 'SYNC_STATE' && data.nextState) {
              setState(data.nextState);
              try {
                localStorage.setItem('whatnot_raid_state', JSON.stringify(data.nextState));
              } catch (e) {}

              if (data.event) {
                handleIncomingMessage({
                  type: 'HIT_ALERT',
                  payload: data.event
                });
              }
            } else if (data.type === 'SYNC_PURCHASE' && data.purchase) {
              // Purchase relayed from extension -> trigger hit
              setState((curr) => {
                const tier = data.purchase.price?.includes('€')
                  ? parseFloat(data.purchase.price.replace(/[^\d.,]/g, '').replace(',', '.')) > 10
                    ? 'LEGENDARY'
                    : parseFloat(data.purchase.price.replace(/[^\d.,]/g, '').replace(',', '.')) > 5
                    ? 'EPIC'
                    : 'RARE'
                  : 'RARE';

                const result = simulateClientHit(curr, {
                  buyer: data.purchase.username,
                  tier,
                  itemTitle: data.purchase.itemTitle,
                  price: data.purchase.price
                });

                handleIncomingMessage({
                  type: 'HIT_ALERT',
                  payload: result.event
                });

                try {
                  localStorage.setItem('whatnot_raid_state', JSON.stringify(result.nextState));
                } catch (e) {}
                return result.nextState;
              });
            }
          }
        } catch (err) {}
      };
    } catch (e) {}

    return () => {
      if (sse) sse.close();
      cloudSseRef.current = null;
    };
  }, [handleIncomingMessage]);

  // 2. BroadcastChannel + Storage Event Listener
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BROADCAST_BUS_NAME);
      bc.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'CROSS_TAB_HIT') {
          if (data.nextState) setState(data.nextState);
          if (data.event) {
            handleIncomingMessage({
              type: 'HIT_ALERT',
              payload: data.event
            });
          }
        } else if (data.type === 'CROSS_TAB_STATE') {
          if (data.nextState) setState(data.nextState);
        }
      };
    } catch (e) {}

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'whatnot_raid_cross_tab_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.nextState) setState(parsed.nextState);
          if (parsed.event) {
            handleIncomingMessage({
              type: 'HIT_ALERT',
              payload: parsed.event
            });
          }
        } catch (err) {}
      }
      if (e.key === 'whatnot_raid_state' && e.newValue) {
        try {
          const parsedState = JSON.parse(e.newValue);
          setState(parsedState);
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [handleIncomingMessage]);

  // 3. Connect local WebSocket Server
  const connectWs = useCallback(() => {
    const { wsUrl, hasDedicatedBackend } = getEndpoints();
    if (!hasDedicatedBackend || !wsUrl) return;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          handleIncomingMessage(msg);
        } catch (err) {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWs();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {}
  }, [getEndpoints, handleIncomingMessage]);

  useEffect(() => {
    connectWs();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWs]);

  // Send message / action (optimistic update + WS + CloudSync)
  const sendMessage = useCallback(
    (type: WSMessageType, payload: any = {}) => {
      // 1. Send via local WebSocket if available
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type,
            payload,
            timestamp: Date.now()
          })
        );
      }

      // 2. Client-side optimistic handling
      if (type === 'RAID_HIT') {
        setState((curr) => {
          const result = simulateClientHit(curr, payload);

          handleIncomingMessage({
            type: 'HIT_ALERT',
            payload: result.event
          });

          try {
            localStorage.setItem('whatnot_raid_state', JSON.stringify(result.nextState));
            localStorage.setItem(
              'whatnot_raid_cross_tab_event',
              JSON.stringify({
                event: result.event,
                nextState: result.nextState,
                timestamp: Date.now()
              })
            );
          } catch (e) {}

          try {
            const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
            bc.postMessage({
              type: 'CROSS_TAB_HIT',
              event: result.event,
              nextState: result.nextState
            });
            bc.close();
          } catch (e) {}

          broadcastCloudSync({
            type: 'SYNC_STATE',
            event: result.event,
            nextState: result.nextState
          });

          return result.nextState;
        });
      } else if (type === 'SHIELD_BOSS') {
        setState((curr) => {
          const amount = payload.amount || 100;
          const nextShield = Math.min(curr.boss.maxShieldHp || 2000, curr.boss.shieldHp + amount);
          const nextState: RaidState = {
            ...curr,
            boss: { ...curr.boss, shieldHp: nextShield }
          };

          try {
            localStorage.setItem('whatnot_raid_state', JSON.stringify(nextState));
          } catch (e) {}

          try {
            const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
            bc.postMessage({ type: 'CROSS_TAB_STATE', nextState });
            bc.close();
          } catch (e) {}

          broadcastCloudSync({ type: 'SYNC_STATE', nextState });
          return nextState;
        });
      } else if (type === 'TOGGLE_ENRAGE') {
        setState((curr) => {
          const nextEnraged = payload.active !== undefined ? payload.active : !curr.boss.isEnraged;
          const nextState: RaidState = {
            ...curr,
            boss: {
              ...curr.boss,
              isEnraged: nextEnraged,
              phase: nextEnraged ? 2 : curr.boss.phase
            }
          };

          try {
            localStorage.setItem('whatnot_raid_state', JSON.stringify(nextState));
          } catch (e) {}

          try {
            const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
            bc.postMessage({ type: 'CROSS_TAB_STATE', nextState });
            bc.close();
          } catch (e) {}

          broadcastCloudSync({ type: 'SYNC_STATE', nextState });
          return nextState;
        });
      } else if (type === 'UNDO_HIT') {
        // If WebSocket is offline, undo from recent hits
        setState((curr) => {
          if (curr.recentHits.length === 0) return curr;
          const lastHit = curr.recentHits[0];
          const remainingHits = curr.recentHits.slice(1);

          const restoredHp = Math.min(curr.boss.maxHp, curr.boss.currentHp + lastHit.hpDamage);
          const restoredShield = Math.min(curr.boss.maxShieldHp || 2000, curr.boss.shieldHp + lastHit.shieldAbsorbed);

          const nextState: RaidState = {
            ...curr,
            boss: {
              ...curr.boss,
              currentHp: restoredHp,
              shieldHp: restoredShield,
              isDefeated: restoredHp === 0,
              unlockedKga: {
                ...curr.boss.unlockedKga,
                isRevealed: restoredHp === 0
              }
            },
            recentHits: remainingHits,
            totalDamageDealt: Math.max(0, curr.totalDamageDealt - lastHit.totalDamage),
            totalHits: Math.max(0, curr.totalHits - 1)
          };

          try {
            localStorage.setItem('whatnot_raid_state', JSON.stringify(nextState));
          } catch (e) {}

          try {
            const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
            bc.postMessage({ type: 'CROSS_TAB_STATE', nextState });
            bc.close();
          } catch (e) {}

          broadcastCloudSync({ type: 'SYNC_STATE', nextState });
          return nextState;
        });
      } else if (type === 'RESET_RAID') {
        const fresh = getInitialDemoState();
        if (payload.hp) {
          fresh.boss.maxHp = payload.hp;
          fresh.boss.currentHp = payload.hp;
        }
        setState(fresh);

        try {
          localStorage.setItem('whatnot_raid_state', JSON.stringify(fresh));
          localStorage.setItem(
            'whatnot_raid_cross_tab_event',
            JSON.stringify({ nextState: fresh, timestamp: Date.now() })
          );
        } catch (e) {}

        try {
          const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
          bc.postMessage({ type: 'CROSS_TAB_STATE', nextState: fresh });
          bc.close();
        } catch (e) {}

        broadcastCloudSync({ type: 'SYNC_STATE', nextState: fresh });
      } else if (type === 'UPDATE_CONFIG') {
        setState((curr) => {
          const updatedConfig: RaidConfig = { ...curr.config, ...payload };
          const nextState: RaidState = { ...curr, config: updatedConfig };

          try {
            localStorage.setItem('whatnot_raid_state', JSON.stringify(nextState));
          } catch (e) {}

          try {
            const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
            bc.postMessage({ type: 'CROSS_TAB_STATE', nextState });
            bc.close();
          } catch (e) {}

          broadcastCloudSync({ type: 'SYNC_STATE', nextState });
          return nextState;
        });
      } else if (type === 'UPDATE_KGA') {
        setState((curr) => {
          const updatedKga: UnlockedKGA = { ...curr.boss.unlockedKga, ...payload };
          const nextState: RaidState = {
            ...curr,
            boss: { ...curr.boss, unlockedKga: updatedKga }
          };

          try {
            localStorage.setItem('whatnot_raid_state', JSON.stringify(nextState));
          } catch (e) {}

          try {
            const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
            bc.postMessage({ type: 'CROSS_TAB_STATE', nextState });
            bc.close();
          } catch (e) {}

          broadcastCloudSync({ type: 'SYNC_STATE', nextState });
          return nextState;
        });
      }
    },
    [broadcastCloudSync, handleIncomingMessage]
  );

  const clearLatestHit = useCallback(() => {
    setLatestHit(null);
  }, []);

  return {
    status,
    state,
    latestHit,
    sendMessage,
    clearLatestHit
  };
}
