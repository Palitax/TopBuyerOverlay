/**
 * Whatnot Mana Leaderboard Tracker - Content Script
 * Monitors Whatnot Stream DOM for new purchase events and relays them to WebSocket & REST
 */

(function () {
  'use strict';

  console.log('🔮 [Mana Leaderboard] Whatnot Content Script active!');

  let RELAY_WS_URL = 'ws://localhost:8080';
  let RELAY_HTTP_URL = 'http://localhost:8080';
  let socket = null;
  let isConnected = false;
  const processedEvents = new Set();
  const pendingQueue = [];

  // Read configured relay URL from extension storage if available
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['relayUrl'], (result) => {
      if (result && result.relayUrl) {
        RELAY_WS_URL = result.relayUrl.replace(/^http/, 'ws');
        RELAY_HTTP_URL = result.relayUrl.replace(/^ws/, 'http');
        console.log('🔮 [Mana Leaderboard] Configured Relay URL:', RELAY_WS_URL);
      }
      connectRelay();
    });
  } else {
    connectRelay();
  }

  // Connect to local or remote WebSocket Relay Server
  function connectRelay() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      socket = new WebSocket(RELAY_WS_URL);

      socket.onopen = () => {
        console.log('✅ [Mana Leaderboard] Connected to Relay Server at', RELAY_WS_URL);
        isConnected = true;
        showToast('🔮 Mana Leaderboard verbunden!', 'success');

        // Flush any queued events
        while (pendingQueue.length > 0) {
          const event = pendingQueue.shift();
          sendPurchaseEvent(event);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PONG') {
            // Heartbeat
          }
        } catch (e) {}
      };

      socket.onclose = () => {
        if (isConnected) {
          console.warn('⚠️ [Mana Leaderboard] Disconnected from Relay Server. Retrying in 3s...');
        }
        isConnected = false;
        socket = null;
        setTimeout(connectRelay, 3000);
      };

      socket.onerror = (err) => {
        socket?.close();
      };
    } catch (e) {
      setTimeout(connectRelay, 3000);
    }
  }

  // Multi-currency price parser for Euro, Dollar, and Pound (e.g. 35,00 €, $45.00, 2.50€, 50 EUR)
  function extractPriceFromText(text) {
    if (!text || typeof text !== 'string') return undefined;

    // Matches: $35.00, 35.00 €, 35,00€, €35, 35 EUR, 35 USD, £25
    const match = text.match(/(?:[$€£]\s*([0-9]+(?:[.,][0-9]{1,2})?)|([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:[$€£]|EUR|USD|GBP))/i);
    if (match) {
      const numStr = match[1] || match[2];
      const normalized = numStr.replace(',', '.');
      const parsed = parseFloat(normalized);
      if (!isNaN(parsed) && parsed > 0) {
        return `${parsed.toFixed(2)} €`;
      }
    }
    return undefined;
  }

  // Send purchase event to server (via WebSocket with REST fallback)
  function sendPurchaseEvent(purchaseData) {
    if (!purchaseData || !purchaseData.username) return;

    const cleanUsername = purchaseData.username.trim().replace(/^@/, '');
    if (!cleanUsername || cleanUsername.length < 2) return;

    // Deduplication Key (within 30 seconds)
    const dedupKey = `${cleanUsername.toLowerCase()}-${purchaseData.itemTitle || ''}-${purchaseData.price || ''}-${Math.floor(Date.now() / 20000)}`;
    if (processedEvents.has(dedupKey)) {
      return;
    }
    processedEvents.add(dedupKey);

    setTimeout(() => {
      processedEvents.delete(dedupKey);
    }, 60000);

    const payload = {
      type: 'NEW_PURCHASE',
      payload: {
        username: cleanUsername,
        itemTitle: purchaseData.itemTitle || 'Whatnot Stream Item',
        price: purchaseData.price || '2.50 €',
        quantity: purchaseData.quantity || 1
      },
      timestamp: Date.now()
    };

    // Always push to Cloud Sync (Zero-config bridge to OBS on Vercel)
    try {
      fetch('https://ntfy.sh/whatnot_mana_palitax_sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Title': 'Whatnot Purchase Sync'
        },
        body: JSON.stringify({
          senderId: 'whatnot_ext_' + Math.random().toString(36).substring(2),
          type: 'SYNC_PURCHASE',
          purchase: payload.payload,
          timestamp: Date.now()
        })
      }).then(() => {
        console.log('⚡ [Mana Leaderboard] Broadcasted to Cloud Sync room!');
      }).catch(() => {});
    } catch (e) {}

    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      console.log('⚡ [Mana Leaderboard] Sent purchase for @' + cleanUsername + ' (' + (purchaseData.price || '2.50 €') + ')');
      showToast(`✨ @${cleanUsername} (${purchaseData.price || 'Kauf'}) an Overlay übertragen!`, 'mana');
    } else {
      // Direct REST fallback if WebSocket is temporarily reconnecting
      fetch(`${RELAY_HTTP_URL}/api/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.payload)
      })
        .then((res) => {
          if (res.ok) {
            console.log('⚡ [Mana Leaderboard] Sent purchase via REST for @' + cleanUsername);
            showToast(`✨ @${cleanUsername} (${purchaseData.price || 'Kauf'}) übertragen!`, 'mana');
          } else {
            throw new Error('REST fallback response not ok');
          }
        })
        .catch(() => {
          console.log('⏳ [Mana Leaderboard] Local server offline; event delivered via Cloud Sync to OBS.');
          showToast(`✨ @${cleanUsername} (${purchaseData.price || 'Kauf'}) via Cloud-Sync an OBS gesendet!`, 'mana');
        });
    }
  }

  // Multi-lingual Regex Patterns for Whatnot (English & German)
  const PURCHASE_PATTERNS = [
    // @User bought [Item] for [Price] / @User kaufte [Item] für [Price]
    /@?([a-zA-Z0-9_.-]+)\s+(?:bought|purchased|won|ordered|kaufte|ersteigerte|holte sich|hat)\s+(.+?)(?:\s+(?:for|für|um)\s+([$€£0-9,.\s]+(?:EUR|USD|GBP)?))?$/i,

    // Sold to @User for [Price] / Verkauft an @User für [Price]
    /(?:Sold to|Verkauft an)\s+@?([a-zA-Z0-9_.-]+)(?:\s+(?:for|für)\s+([$€£0-9,.\s]+(?:EUR|USD|GBP)?))?/i,

    // Winner: @User ($XX.XX) / Gewinner: @User (XX,XX €)
    /(?:Winner|Gewinner|Höchstbietender):\s+@?([a-zA-Z0-9_.-]+)(?:\s*\(([$€£0-9,.\s]+)\))?/i,

    // [Item] sold to @User for [Price]
    /(.+?)\s+(?:sold to|verkauft an)\s+@?([a-zA-Z0-9_.-]+)(?:\s+(?:for|für)\s+([$€£0-9,.\s]+))?/i,

    // Order by @User / Bestellung von @User
    /(?:Order|Bestellung)\s+(?:by|von)\s+@?([a-zA-Z0-9_.-]+)/i,

    // @User just bought! / @User hat gerade gekauft!
    /@?([a-zA-Z0-9_.-]+)\s+(?:just bought|hat gerade gekauft|placed an order)/i
  ];

  function extractPurchaseFromText(text) {
    if (!text || typeof text !== 'string') return null;
    const clean = text.trim().replace(/\s+/g, ' ');

    for (const pattern of PURCHASE_PATTERNS) {
      const match = clean.match(pattern);
      if (match) {
        // Find which group is the username (contains letters/numbers, no currency)
        let username = match[1];
        let itemTitle = match[2];
        let rawPrice = match[3];

        if (pattern.source.includes('sold to') && !pattern.source.startsWith('(?:Sold to')) {
          itemTitle = match[1];
          username = match[2];
          rawPrice = match[3];
        }

        const price = extractPriceFromText(rawPrice) || extractPriceFromText(clean);

        if (username) {
          return {
            username: username.replace(/^@/, '').trim(),
            itemTitle: itemTitle && !itemTitle.includes('€') && !itemTitle.includes('$') ? itemTitle.trim() : 'Whatnot Stream Kauf',
            price: price || '2.50 €',
            quantity: 1
          };
        }
      }
    }

    // Fallback: Check if message contains "bought" or "kaufte" or "sold" AND has a username mention
    if (
      (clean.includes('bought') || clean.includes('purchased') || clean.includes('kaufte') || clean.includes('Sold') || clean.includes('Verkauft')) &&
      clean.includes('@')
    ) {
      const userMatch = clean.match(/@([a-zA-Z0-9_.-]+)/);
      if (userMatch) {
        const username = userMatch[1];
        const price = extractPriceFromText(clean) || '2.50 €';
        return {
          username,
          itemTitle: 'Whatnot Stream Kauf',
          price,
          quantity: 1
        };
      }
    }

    return null;
  }

  // Inspect a DOM node for purchase events
  function inspectNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node;

    // Check specific Whatnot class names / test IDs or attributes
    const testId = el.getAttribute('data-testid') || '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const className = typeof el.className === 'string' ? el.className : '';

    // Check if it's a purchase celebration, sale toast, or system order message
    const isPurchaseElement =
      testId.includes('sale') ||
      testId.includes('order') ||
      testId.includes('purchase') ||
      testId.includes('buyer') ||
      className.includes('sale') ||
      className.includes('Order') ||
      className.includes('Sold') ||
      className.includes('purchase');

    const fullText = (el.innerText || el.textContent || '').trim();
    if (!fullText) return;

    // 1. Direct text pattern matching
    const parsed = extractPurchaseFromText(fullText) || (ariaLabel ? extractPurchaseFromText(ariaLabel) : null);
    if (parsed) {
      sendPurchaseEvent(parsed);
      return;
    }

    // 2. Structured Whatnot Card / Toast inspection
    if (
      isPurchaseElement ||
      fullText.includes('bought') ||
      fullText.includes('purchased') ||
      fullText.includes('Sold to') ||
      fullText.includes('Verkauft an') ||
      fullText.includes('kaufte')
    ) {
      // Look for username link or handle
      const userEl = el.querySelector('a[href*="/user/"], [data-testid*="username"], [class*="username"], [class*="buyer"]');
      if (userEl) {
        const username = (userEl.textContent || '').replace(/^@/, '').trim();
        const price = extractPriceFromText(fullText) || '2.50 €';
        const itemEl = el.querySelector('[data-testid*="product"], [class*="product"], [class*="title"], [class*="item"]');
        const itemTitle = itemEl ? (itemEl.textContent || '').trim() : 'Live Stream Kauf';

        if (username) {
          sendPurchaseEvent({
            username,
            itemTitle,
            price,
            quantity: 1
          });
        }
      }
    }
  }

  // Setup MutationObserver on the entire body
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          inspectNode(node);
          if (node.querySelectorAll) {
            // Also check inner children for fast batch renders
            const potentialTargets = node.querySelectorAll(
              '[data-testid*="order"], [data-testid*="sale"], [class*="message"], [class*="Message"], [class*="notification"], [class*="toast"]'
            );
            potentialTargets.forEach((child) => inspectNode(child));
          }
        });
      }
    }
  });

  function startObserver() {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    console.log('👀 [Mana Leaderboard] DOM MutationObserver active on Whatnot stream');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }

  // Floating in-page notification Toast on Whatnot
  function showToast(message, type = 'mana') {
    let container = document.getElementById('mana-overlay-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mana-overlay-toast-container';
      Object.assign(container.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '999999',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      });
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    Object.assign(toast.style, {
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 27, 75, 0.98))',
      color: '#fff',
      border: '1.5px solid rgba(56, 189, 248, 0.7)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8), 0 0 14px rgba(168, 85, 247, 0.5)',
      borderRadius: '12px',
      padding: '10px 16px',
      fontSize: '13px',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transform: 'translateY(10px)',
      opacity: '0',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    });

    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.transform = 'translateY(-10px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  // Listen for messages from popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'PING_STATUS') {
        sendResponse({ connected: isConnected });
      } else if (request.action === 'SIMULATE_TEST_PURCHASE') {
        sendPurchaseEvent({
          username: request.username || 'TestBuyer_' + Math.floor(Math.random() * 100),
          itemTitle: 'Whatnot Test Item',
          price: '35.00 €',
          quantity: 1
        });
        sendResponse({ success: true });
      }
      return true;
    });
  }
})();
