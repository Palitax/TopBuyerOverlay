/**
 * Whatnot Mana Leaderboard Tracker - Content Script
 * Monitors Whatnot Stream DOM for new purchase events and relays them to ws://localhost:8080
 */

(function () {
  'use strict';

  console.log('🔮 [Mana Leaderboard] Whatnot Content Script active!');

  const RELAY_WS_URL = 'ws://localhost:8080';
  let socket = null;
  let isConnected = false;
  const processedEvents = new Set();
  const pendingQueue = [];

  // Connect to local WebSocket Relay Server
  function connectRelay() {
    try {
      socket = new WebSocket(RELAY_WS_URL);

      socket.onopen = () => {
        console.log('✅ [Mana Leaderboard] Connected to Relay Server at', RELAY_WS_URL);
        isConnected = true;
        showToast('🔮 Mana Overlay verbunden!', 'success');

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

  connectRelay();

  // Send purchase event to server
  function sendPurchaseEvent(purchaseData) {
    if (!purchaseData || !purchaseData.username) return;

    // Deduplication Key (within 30 seconds)
    const dedupKey = `${purchaseData.username}-${purchaseData.itemTitle || ''}-${purchaseData.price || ''}-${Math.floor(Date.now() / 15000)}`;
    if (processedEvents.has(dedupKey)) {
      return;
    }
    processedEvents.add(dedupKey);

    // Clean old entries after 1 minute
    setTimeout(() => {
      processedEvents.delete(dedupKey);
    }, 60000);

    const payload = {
      type: 'NEW_PURCHASE',
      payload: {
        username: purchaseData.username,
        itemTitle: purchaseData.itemTitle || 'Whatnot Stream Item',
        price: purchaseData.price,
        quantity: purchaseData.quantity || 1
      },
      timestamp: Date.now()
    };

    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      console.log('⚡ [Mana Leaderboard] Sent purchase for @' + purchaseData.username);
      showToast(`✨ @${purchaseData.username} Kauf an Leaderboard übertragen!`, 'mana');
    } else {
      console.log('⏳ [Mana Leaderboard] Queueing purchase (Relay disconnected):', purchaseData.username);
      pendingQueue.push(purchaseData);
    }
  }

  // Regex Patterns for parsing purchase notifications in chat/DOM
  const PURCHASE_PATTERNS = [
    /@?([a-zA-Z0-9_.-]+)\s+(?:bought|purchased|won|ordered|kaufte|ersteigerte)\s+(.+?)(?:\s+for\s+(\$[0-9,.]+))?$/i,
    /Sold to\s+@?([a-zA-Z0-9_.-]+)(?:\s+for\s+(\$[0-9,.]+))?/i,
    /Verkauft an\s+@?([a-zA-Z0-9_.-]+)/i,
    /@?([a-zA-Z0-9_.-]+)\s+just bought/i,
    /@?([a-zA-Z0-9_.-]+)\s+placed an order/i
  ];

  function extractPurchaseFromText(text) {
    if (!text || typeof text !== 'string') return null;
    const clean = text.trim();

    for (const pattern of PURCHASE_PATTERNS) {
      const match = clean.match(pattern);
      if (match) {
        const username = match[1];
        const itemTitle = match[2] && !match[2].startsWith('$') ? match[2] : 'Whatnot Stream Kauf';
        const price = match[3] || (match[2]?.startsWith('$') ? match[2] : undefined);

        return {
          username: username.replace(/^@/, ''),
          itemTitle: itemTitle?.trim(),
          price: price?.trim(),
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
    const className = el.className || '';

    // Check if it's a purchase celebration or system message
    const isPurchaseElement =
      testId.includes('sale') ||
      testId.includes('order') ||
      testId.includes('purchase') ||
      (typeof className === 'string' && (className.includes('sale') || className.includes('Order') || className.includes('Sold')));

    const fullText = (el.innerText || el.textContent || '').trim();

    // 1. Direct text pattern matching
    const parsed = extractPurchaseFromText(fullText) || (ariaLabel ? extractPurchaseFromText(ariaLabel) : null);
    if (parsed) {
      sendPurchaseEvent(parsed);
      return;
    }

    // 2. Structured Whatnot Card/Toast inspection
    if (isPurchaseElement || fullText.includes('bought') || fullText.includes('Sold') || fullText.includes('Kauf')) {
      // Look for username link or handle
      const userEl = el.querySelector('a[href*="/user/"], [data-testid*="username"], [class*="username"], [class*="buyer"]');
      if (userEl) {
        const username = (userEl.textContent || '').replace(/^@/, '').trim();
        if (username) {
          sendPurchaseEvent({
            username,
            itemTitle: 'Live Stream Kauf',
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
            // Also check inner children
            const potentialTargets = node.querySelectorAll(
              '[data-testid*="order"], [data-testid*="sale"], [class*="message"], [class*="Message"], [class*="notification"]'
            );
            potentialTargets.forEach((child) => inspectNode(child));
          }
        });
      }
    }
  });

  // Start observing once DOM is ready
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

  // Floating in-page notification Toast
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
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.95))',
      color: '#fff',
      border: '1px solid rgba(56, 189, 248, 0.5)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(168, 85, 247, 0.4)',
      borderRadius: '12px',
      padding: '10px 16px',
      fontSize: '13px',
      fontWeight: '600',
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
          price: '$20.00',
          quantity: 1
        });
        sendResponse({ success: true });
      }
      return true;
    });
  }
})();
