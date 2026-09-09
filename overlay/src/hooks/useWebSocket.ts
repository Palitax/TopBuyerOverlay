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

  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const processedAlertIds = useRef<Set<string>>(new Set());
  const { playManaSound, playRankUpSound } = useSoundEffects();

  // Dynamic host determination so LAN, OBS, Vercel, and cloud backends work automatically
  const getEndpoints = useCallback(() => {
    if (customUrl) {
      const httpOrigin = customUrl.replace(/^ws(s)?:/, 'http$1:');
      return { wsUrl: customUrl, httpOrigin };
    }

    // 1. Check URL query parameters: ?server=xxx or ?backend=xxx
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const serverParam = urlParams?.get('server') || urlParams?.get('backend');

    // 2. Check Vite environment variable: VITE_BACKEND_URL
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
        httpOrigin: `${httpProto}//${targetHost}`
      };
    }

    // 3. Detect hostname and cloud hosting
    const hostname = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const wsProto = isHttps ? 'wss:' : 'ws:';
    const httpProto = isHttps ? 'https:' : 'http:';

    const isCloudHost = hostname.includes('vercel.app') || hostname.includes('netlify.app');
    const effectiveHost = isCloudHost ? 'localhost' : hostname;

    const wsUrl = `${wsProto}//${effectiveHost}:8080`;
    const httpOrigin = `${httpProto}//${effectiveHost}:8080`;
    return { wsUrl, httpOrigin };
  }, [customUrl]);

  // Unified message handler for both WebSocket and Server-Sent Events (SSE)
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

  // Cross-tab / Cross-window broadcast listener (OBS + AdminDeck on Vercel without page refresh)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BROADCAST_BUS_NAME);
      bc.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'CROSS_TAB_PURCHASE') {
          if (data.nextState) {
            setState(data.nextState);
          }
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
          if (data.nextState) {
            setState(data.nextState);
          }
        }
      };
    } catch (e) {
      console.warn('[Realtime] BroadcastChannel unavailable, using storage fallback', e);
    }

    // Storage event listener fallback (for separate browser contexts)
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'whatnot_mana_cross_tab_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.nextState) {
            setState(parsed.nextState);
          }
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

  // Connect WebSocket
  const connectWs = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const { wsUrl } = getEndpoints();
    setStatus('connecting');

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
        setStatus('disconnected');
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWs();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setStatus('disconnected');
    }
  }, [getEndpoints, handleIncomingMessage]);

  // Connect Server-Sent Events (SSE) stream for infallible OBS CEF updates
  const connectSSE = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
    }

    const { httpOrigin } = getEndpoints();
    try {
      const sse = new EventSource(`${httpOrigin}/api/events`);
      sseRef.current = sse;

      sse.onopen = () => {
        setStatus('connected');
      };

      sse.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          handleIncomingMessage(msg);
        } catch (err) {
          console.error('[Realtime] Error parsing SSE event:', err);
        }
      };

      sse.onerror = () => {
        // EventSource automatically reconnects
      };
    } catch (e) {
      // Ignored if offline
    }
  }, [getEndpoints, handleIncomingMessage]);

  // Fetch state via REST endpoint
  const fetchCurrentState = useCallback(() => {
    const { httpOrigin } = getEndpoints();
    fetch(`${httpOrigin}/api/state`)
      .then((res) => {
        if (!res.ok) throw new Error('HTTP error');
        return res.json();
      })
      .then((data) => {
        if (data) {
          const rawState = data.state || data;
          const leaderboard = data.leaderboard || rawState.leaderboard || [];
          const merged: LeaderboardState = {
            ...rawState,
            leaderboard
          };
          setState(merged);
          setStatus('connected');
          try {
            localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(merged));
          } catch (e) {}
        }
      })
      .catch(() => {
        // Keep current state or demo state
      });
  }, [getEndpoints]);

  useEffect(() => {
    fetchCurrentState();
    connectWs();
    connectSSE();

    const pollInterval = window.setInterval(() => {
      fetchCurrentState();
    }, 3000);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      window.clearInterval(pollInterval);
    };
  }, [connectWs, connectSSE, fetchCurrentState]);

  const sendMessage = useCallback(
    (type: WSMessageType, payload: any = {}) => {
      const { httpOrigin } = getEndpoints();

      // If WebSocket is open, send to backend
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type,
            payload,
            timestamp: Date.now()
          })
        );
        return;
      }

      // Try REST fallback
      if (type === 'NEW_PURCHASE') {
        fetch(`${httpOrigin}/api/purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then((res) => {
            if (!res.ok) throw new Error('REST failed');
          })
          .catch(() => {
            // Standalone Browser Simulation (e.g. running on Vercel without a local server)
            console.log('[Realtime] Server offline: Executing purchase and broadcasting cross-tab.');
            setState((curr) => {
              const result = simulateClientPurchase(curr, payload);

              // 1. Trigger local alerts & audio
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

              // 2. Broadcast via BroadcastChannel so any open OBS window or tab updates with 0ms delay!
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

              // 3. Save to localStorage + trigger storage event for cross-browser sync
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

              return result.nextState;
            });
          });
      } else if (type === 'RESET_SESSION') {
        fetch(`${httpOrigin}/api/reset`, { method: 'POST' }).catch(() => {
          const fresh = getInitialDemoState();
          setState(fresh);

          try {
            const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
            bc.postMessage({
              type: 'CROSS_TAB_STATE',
              nextState: fresh
            });
            bc.close();
          } catch (e) {}

          try {
            localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(fresh));
            localStorage.setItem(
              'whatnot_mana_cross_tab_event',
              JSON.stringify({
                nextState: fresh,
                timestamp: Date.now()
              })
            );
          } catch (e) {}
        });
      } else if (type === 'MANUAL_ADJUST') {
        fetch(`${httpOrigin}/api/adjust`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {
          setState((curr) => {
            const { username, purchases } = payload;
            const updated = curr.leaderboard.map((b) =>
              b.username.toLowerCase() === username.toLowerCase()
                ? { ...b, purchaseCount: purchases }
                : b
            );
            const next = { ...curr, leaderboard: updated };

            try {
              const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
              bc.postMessage({
                type: 'CROSS_TAB_STATE',
                nextState: next
              });
              bc.close();
            } catch (e) {}

            try {
              localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(next));
            } catch (e) {}

            return next;
          });
        });
      } else if (type === 'DELETE_USER') {
        fetch(`${httpOrigin}/api/buyer/${payload.username}`, { method: 'DELETE' }).catch(() => {
          setState((curr) => {
            const updated = curr.leaderboard.filter(
              (b) => b.username.toLowerCase() !== payload.username.toLowerCase()
            );
            const next = { ...curr, leaderboard: updated };

            try {
              const bc = new BroadcastChannel(BROADCAST_BUS_NAME);
              bc.postMessage({
                type: 'CROSS_TAB_STATE',
                nextState: next
              });
              bc.close();
            } catch (e) {}

            try {
              localStorage.setItem('whatnot_mana_demo_state', JSON.stringify(next));
            } catch (e) {}

            return next;
          });
        });
      }
    },
    [getEndpoints, handleIncomingMessage]
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
