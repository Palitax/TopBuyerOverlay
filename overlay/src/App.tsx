import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { ManaOverlay } from './components/ManaOverlay';
import { ManaAlert } from './components/ManaAlert';
import { AdminDeck } from './components/AdminDeck';
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return (
      window.location.hash === '#admin' ||
      new URLSearchParams(window.location.search).get('mode') === 'admin'
    );
  });

  const { status, state, latestPurchase, latestRankUp, sendMessage, clearAlerts } = useWebSocket();

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdmin(
        window.location.hash === '#admin' ||
        new URLSearchParams(window.location.search).get('mode') === 'admin'
      );
    };

    // Keyboard shortcut: Press 'a' or 'A' to toggle admin mode easily without button on stream
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'a' || e.key === 'A') {
        const nextState = !isAdmin;
        setIsAdmin(nextState);
        window.location.hash = nextState ? 'admin' : '';
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAdmin]);

  const toggleView = () => {
    const newIsAdmin = !isAdmin;
    setIsAdmin(newIsAdmin);
    window.location.hash = newIsAdmin ? 'admin' : '';
  };

  if (isAdmin) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-white">
        {/* Floating Quick Switch Button back to Overlay */}
        <button
          onClick={toggleView}
          className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-gradient-to-r from-sky-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-sky-400/40 transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Zum OBS Overlay View</span>
        </button>

        <AdminDeck state={state} status={status} onSendMessage={sendMessage} />
      </div>
    );
  }

  // Pure Transparent OBS Overlay View: Zero background boxes, zero stream clutter
  return (
    <main className="min-h-screen w-full bg-transparent p-1.5 flex flex-col items-start justify-start relative select-none">
      {/* Alert Popups & Confetti */}
      <ManaAlert
        purchase={latestPurchase}
        rankUp={latestRankUp}
        onDismiss={clearAlerts}
        onDissolve={(purchase) => {
          window.dispatchEvent(new CustomEvent('mana-alert-dissolve', { detail: purchase }));
        }}
      />

      {/* Main Leaderboard Widget */}
      <ManaOverlay state={state} status={status} />
    </main>
  );
};

export default App;
