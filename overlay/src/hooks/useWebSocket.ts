import { useEffect, useRef, useState, useCallback } from 'react';
import { LeaderboardState, PurchaseEvent, WSMessage, WSMessageType } from '../types';
import { useSoundEffects } from './useSoundEffects';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface RankUpEventPayload {
  username: string;
  oldTier: number;
  newTier: number;
  newRankTitle: string;
  purchaseEvent: PurchaseEvent;
}

export function useWebSocket(customUrl?: string) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [state, setState] = useState<LeaderboardState | null>(null);
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
      // Normalize targetHost (strip protocol and trailing slash)
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

    // If loaded from Vercel or Netlify, default OBS / local browser to connecting to local relay server
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
          }
          break;
        }

        case 'PURCHASE_ALERT': {
          const purchase: PurchaseEvent = msg.payload;
          if (!purchase) break;

          // Deduplicate across WS and SSE streams
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

          if (state?.config.soundEnabled ?? true) {
            playManaSound(state?.config.soundVolume ?? 0.7);
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

          if (state?.config.soundEnabled ?? true) {
            playRankUpSound(rankUp.newTier, state?.config.soundVolume ?? 0.8);
          }
          break;
        }

        case 'PONG':
          break;

        default:
          break;
      }
    },
    [state?.config.soundEnabled, state?.config.soundVolume, playManaSound, playRankUpSound]
  );

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
        console.log('[Realtime] WS disconnected. Retrying in 2.5s...');
        wsRef.current = null;
        setStatus((curr) => (curr === 'connected' ? 'connecting' : curr));
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWs();
        }, 2500);
      };

      ws.onerror = (err) => {
        console.warn('[Realtime] WS error (SSE fallback remains active):', err);
        ws.close();
      };
    } catch (e) {
      console.warn('[Realtime] Could not create WebSocket:', e);
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
        console.log('[Realtime] SSE event stream connected to:', `${httpOrigin}/api/events`);
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
        // EventSource will automatically attempt reconnection
        console.warn('[Realtime] SSE connection interrupted; native auto-reconnect active');
      };
    } catch (e) {
      console.warn('[Realtime] SSE not supported or blocked:', e);
    }
  }, [getEndpoints, handleIncomingMessage]);

  // Fetch state via REST endpoint
  const fetchCurrentState = useCallback(() => {
    const { httpOrigin } = getEndpoints();
    fetch(`${httpOrigin}/api/state`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const rawState = data.state || data;
          const leaderboard = data.leaderboard || rawState.leaderboard || [];
          setState({
            ...rawState,
            leaderboard
          });
          setStatus('connected');
        }
      })
      .catch((err) => {
        console.warn('[Realtime] Polling fetch error:', err);
      });
  }, [getEndpoints]);

  useEffect(() => {
    // 1. Fetch initial state immediately
    fetchCurrentState();

    // 2. Connect WebSocket
    connectWs();

    // 3. Connect Server-Sent Events (SSE) pipeline as dual-redundant stream
    connectSSE();

    // 4. Background safety-net polling every 2.5 seconds
    const pollInterval = window.setInterval(() => {
      fetchCurrentState();
    }, 2500);

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

  const sendMessage = useCallback((type: WSMessageType, payload: any = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type,
          payload,
          timestamp: Date.now()
        })
      );
    } else {
      // If WebSocket is temporarily down, send via REST fallback
      const { httpOrigin } = getEndpoints();
      if (type === 'NEW_PURCHASE') {
        fetch(`${httpOrigin}/api/purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch((err) => console.error('[Realtime] REST purchase fallback error:', err));
      } else if (type === 'RESET_SESSION') {
        fetch(`${httpOrigin}/api/reset`, { method: 'POST' }).catch(console.error);
      } else if (type === 'UPDATE_CONFIG') {
        fetch(`${httpOrigin}/api/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(console.error);
      }
    }
  }, [getEndpoints]);

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
