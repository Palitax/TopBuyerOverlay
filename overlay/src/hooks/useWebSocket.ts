import { useEffect, useRef, useState, useCallback } from 'react';
import { LeaderboardState, PurchaseEvent, WSMessage, WSMessageType } from '../types';
import { useSoundEffects } from './useSoundEffects';
import { getInitialDemoState, simulateClientPurchase } from '../utils/simulation';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface RankUpEventPayload {
  username: string;
  oldTier: number;
  newTier: number;
  newRankTitle: string;
  purchaseEvent: PurchaseEvent;
}

const BROADCAST_BUS_NAME = 'top_buyer_mana_bus';
const DEFAULT_CLOUD_ROOM = 'whatnot_mana_palitax_sync';

export function getSyncRoom(): string {
  if (typeof window === 'undefined') return DEFAULT_CLOUD_ROOM;
  const params = new URLSearchParams(window.location.search);
  return params.get('room') || localStorage.getItem('whatnot_mana_sync_room') || DEFAULT_CLOUD_ROOM;
}

export function useWebSocket(customUrl?: string) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [state, setState] = useState<LeaderboardState>(() => {
    try {
      const saved = localStorage.getItem('whatnot_mana_demo_state');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return getInitialDemoState();
  });

  const [latestPurchase, setLatestPurchase] = useState<PurchaseEvent | null>(null);
  const [latestRankUp, setLatestRankUp] = useState<RankUpEventPayload | null>(null);

  const clientIdRef = useRef<string>('client_' + Math.random().toString(36).substring(2, 9));
  const wsRef = useRef<WebSocket | null>(null);
  const cloudSseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const processedAlertIds = useRef<Set<string>>(new Set());
  const { playManaSound, playRankUpSound } = useSoundEffects();

  // Dynamic host determination for optional local/cloud backend server
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
    
    // On Vercel without ?server param, we don't have a local backend port 8080 running in cloud
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
        case 'LEADERBOARD_UPDATE': {
          if (msg.payload) {
            const normalizedPayload: LeaderboardState = {
              ...msg.payload,
              leaderboard: msg.payload.leaderboard || []
            };
            setState(normalizedPayload);
            try {
              localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(normalizedPayload));
            } catch (e) {}
          }
          break;
        }

        case 'PURCHASE_ALERT': {
          const purchase: PurchaseEvent = msg.payload;
          if (!purchase) break;

          if (purchase.id && processedAlertIds.current.has(purchase.id)) {
            break;
          }
          if (purchase.id) {
            processedAlertIds.current.add(purchase.id);
            if (processedAlertIds.current.size > 100) {
              const oldest = processedAlertIds.current.values().next().value;
              if (oldest) processedAlertIds.current.delete(oldest);
            }
          }

          setLatestPurchase(purchase);

          if (state?.config?.soundEnabled ?? true) {
            playManaSound(state?.config?.soundVolume ?? 0.7);
          }
          break;
        }

        case 'RANK_UP_ALERT': {
          const rankUp: RankUpEventPayload = msg.payload;
          if (!rankUp) break;

          const alertKey = `rankup-${rankUp.username}-${rankUp.newTier}-${rankUp.purchaseEvent?.id || ''}`;
          if (processedAlertIds.current.has(alertKey)) {
            break;
          }
          processedAlertIds.current.add(alertKey);
          if (processedAlertIds.current.size > 100) {
            const oldest = processedAlertIds.current.values().next().value;
            if (oldest) processedAlertIds.current.delete(oldest);
          }

          setLatestRankUp(rankUp);

          if (state?.config?.soundEnabled ?? true) {
            playRankUpSound(rankUp.newTier, state?.config?.soundVolume ?? 0.8);
          }
          break;
        }

        default:
          break;
      }
    },
    [state?.config?.soundEnabled, state?.config?.soundVolume, playManaSound, playRankUpSound]
  );

  // Cloud Sync Publisher (Cross-PC, Cross-Browser, OBS CEF sync via ntfy.sh)
  const broadcastCloudSync = useCallback(async (data: any) => {
    const room = getSyncRoom();
    try {
      await fetch(`https://ntfy.sh/${room}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Title': 'Whatnot Mana Leaderboard'
        },
        body: JSON.stringify({
          ...data,
          senderId: clientIdRef.current,
          timestamp: Date.now()
        })
      });
    } catch (err) {
      console.warn('[CloudSync] Broadcast error:', err);
    }
  }, []);

  // 1. Cloud Sync SSE Listener (Works anywhere, connecting Chrome & OBS across all PCs)
  useEffect(() => {
    const room = getSyncRoom();
    const cloudUrl = `https://ntfy.sh/${room}/sse`;
    let sse: EventSource | null = null;

    // Immediately restore latest synced state from Cloud on load / refresh
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
                console.log('⚡ [CloudSync] Restored latest state from cloud:', parsed.nextState);
                setState(parsed.nextState);
                try {
                  localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(parsed.nextState));
                } catch (e) {}
                break;
              }
            }
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.warn('[CloudSync] Poll error:', err);
      });

    try {
      sse = new EventSource(cloudUrl);
      cloudSseRef.current = sse;

      sse.onopen = () => {
        console.log('⚡ [CloudSync] Connected to real-time room:', room);
        setStatus('connected');
      };

      sse.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === 'message' && parsed.message) {
            const data = JSON.parse(parsed.message);

            // Ignore messages sent by this client instance
            if (data.senderId === clientIdRef.current) {
              return;
            }

            if (data.type === 'SYNC_STATE' && data.nextState) {
              setState(data.nextState);
              try {
                localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(data.nextState));
              } catch (e) {}

              if (data.event) {
                handleIncomingMessage({
                  type: 'PURCHASE_ALERT',
                  payload: data.event
                });
              }
              if (data.rankUp) {
                handleIncomingMessage({
                  type: 'RANK_UP_ALERT',
                  payload: data.rankUp
                });
              }
            } else if (data.type === 'SYNC_PURCHASE' && data.purchase) {
              // Direct purchase event received from Chrome extension
              setState((curr) => {
                const result = simulateClientPurchase(curr, data.purchase);
                handleIncomingMessage({
                  type: 'PURCHASE_ALERT',
                  payload: result.event
                });
                if (result.isRankUp && result.rankUpPayload) {
                  handleIncomingMessage({
                    type: 'RANK_UP_ALERT',
                    payload: result.rankUpPayload
                  });
                }
                try {
                  localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(result.nextState));
                } catch (e) {}
                return result.nextState;
              });
            }
          }
        } catch (err) {
          // Keepalive or unformatted frame
        }
      };

      sse.onerror = () => {
        // EventSource auto-reconnects
      };
    } catch (e) {
      console.warn('[CloudSync] Failed to initialize SSE:', e);
    }

    return () => {
      if (sse) sse.close();
      cloudSseRef.current = null;
    };
  }, [handleIncomingMessage]);

  // 2. BroadcastChannel + Storage Event Listener (Local tabs/windows in same browser)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BROADCAST_BUS_NAME);
      bc.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'CROSS_TAB_PURCHASE') {
          if (data.nextState) setState(data.nextState);
          if (data.event) {
            handleIncomingMessage({
              type: 'PURCHASE_ALERT',
              payload: data.event
            });
          }
          if (data.rankUp) {
            handleIncomingMessage({
              type: 'RANK_UP_ALERT',
              payload: data.rankUp
            });
          }
        } else if (data.type === 'CROSS_TAB_STATE') {
          if (data.nextState) setState(data.nextState);
        }
      };
    } catch (e) {}

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'whatnot_mana_cross_tab_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.nextState) setState(parsed.nextState);
          if (parsed.event) {
            handleIncomingMessage({
              type: 'PURCHASE_ALERT',
              payload: parsed.event
            });
          }
          if (parsed.rankUp) {
            handleIncomingMessage({
              type: 'RANK_UP_ALERT',
              payload: parsed.rankUp
            });
          }
        } catch (err) {}
      }
      if (e.key === 'whatnot_mana_demo_state' && e.newValue) {
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

  // 3. Connect local or custom WebSocket server (if running)
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
        console.log('[Realtime] WebSocket connected:', wsUrl);
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
        } catch (err) {
          console.error('[Realtime] Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWs();
        }, 4000);
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

  // Send message or mutation (Optimistic local update + Instant Cloud/Broadcast Sync)
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

      // 2. Perform instant optimistic local update & sync across tabs/OBS
      if (type === 'NEW_PURCHASE') {
        setState((curr) => {
          const result = simulateClientPurchase(curr, payload);

          // Local audio & visual trigger
          handleIncomingMessage({
            type: 'PURCHASE_ALERT',
            payload: result.event
          });
          if (result.isRankUp && result.rankUpPayload) {
            handleIncomingMessage({
              type: 'RANK_UP_ALERT',
              payload: result.rankUpPayload
            });
          }

          // Save to local storage
          try {
            localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(result.nextState));
            localStorage.setItem(
              'whatnot_mana_cross_tab_event',
              JSON.stringify({
                event: result.event,
                rankUp: result.rankUpPayload,
                nextState: result.nextState,
                timestamp: Date.now()
              })
            );
          } catch (e) {}

          // Local BroadcastChannel
          try {
            const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
            bc.postMessage({
              type: 'CROSS_TAB_PURCHASE',
              event: result.event,
              rankUp: result.rankUpPayload,
              nextState: result.nextState
            });
            bc.close();
          } catch (e) {}

          // Cloud Sync across PCs & OBS CEF
          broadcastCloudSync({
            type: 'SYNC_STATE',
            event: result.event,
            rankUp: result.rankUpPayload,
            nextState: result.nextState
          });

          return result.nextState;
        });
      } else if (type === 'UPDATE_CONFIG') {
        setState((curr) => {
          const updatedConfig = { ...curr.config, ...payload };
          const nextState = { ...curr, config: updatedConfig };

          try {
            localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(nextState));
          } catch (e) {}

          try {
            const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
            bc.postMessage({ type: 'CROSS_TAB_STATE', nextState });
            bc.close();
          } catch (e) {}

          broadcastCloudSync({ type: 'SYNC_STATE', nextState });
          return nextState;
        });
      } else if (type === 'RESET_SESSION') {
        const fresh = getInitialDemoState();
        setState(fresh);

        try {
          localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(fresh));
          localStorage.setItem(
            'whatnot_mana_cross_tab_event',
            JSON.stringify({ nextState: fresh, timestamp: Date.now() })
          );
        } catch (e) {}

        try {
          const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
          bc.postMessage({ type: 'CROSS_TAB_STATE', nextState: fresh });
          bc.close();
        } catch (e) {}

        broadcastCloudSync({ type: 'SYNC_STATE', nextState: fresh });
      } else if (type === 'MANUAL_ADJUST') {
        setState((curr) => {
          const { username, purchases } = payload;
          const updated = curr.leaderboard.map((b) =>
            b.username.toLowerCase() === username.toLowerCase()
              ? { ...b, purchaseCount: purchases }
              : b
          );
          const nextState = { ...curr, leaderboard: updated };

          try {
            localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(nextState));
          } catch (e) {}

          try {
            const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
            bc.postMessage({ type: 'CROSS_TAB_STATE', nextState });
            bc.close();
          } catch (e) {}

          broadcastCloudSync({ type: 'SYNC_STATE', nextState });
          return nextState;
        });
      } else if (type === 'DELETE_USER') {
        setState((curr) => {
          const updated = curr.leaderboard.filter(
            (b) => b.username.toLowerCase() !== payload.username.toLowerCase()
          );
          const nextState = { ...curr, leaderboard: updated };

          try {
            localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(nextState));
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

  const clearAlerts = useCallback(() => {
    setLatestPurchase(null);
    setLatestRankUp(null);
  }, []);

  return {
    status,
    state,
    latestPurchase,
    latestRankUp,
    sendMessage,
    clearAlerts
  };
}
