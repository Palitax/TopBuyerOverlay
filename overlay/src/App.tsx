import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { RaidOverlay } from './components/RaidOverlay';
import { RaidAdminDeck } from './components/RaidAdminDeck';
import { Shield, Swords } from 'lucide-react';

export const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const pathname = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const searchMode = new URLSearchParams(window.location.search).get('mode');
    return (
      pathname === '/admin' ||
      pathname.endsWith('/admin') ||
      hash === '#admin' ||
      searchMode === 'admin'
    );
  });

  const { status, state, latestHit, sendMessage } = useWebSocket();

  useEffect(() => {
    const checkRoute = () => {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const searchMode = new URLSearchParams(window.location.search).get('mode');
      setIsAdmin(
        pathname === '/admin' ||
        pathname.endsWith('/admin') ||
        hash === '#admin' ||
        searchMode === 'admin'
      );
    };

    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);

    // Keyboard shortcut: Press 'a' or 'A' to toggle admin mode easily without button on stream
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'a' || e.key === 'A') {
        const nextState = !isAdmin;
        setIsAdmin(nextState);
        window.location.hash = nextState ? 'admin' : '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAdmin]);

  const toggleView = () => {
    const next = !isAdmin;
    setIsAdmin(next);
    if (next) {
      window.location.hash = 'admin';
    } else {
      window.location.hash = '';
      if (window.location.pathname === '/admin') {
        window.history.pushState(null, '', '/');
      }
    }
  };

  if (isAdmin) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-white">
        {/* Floating Quick Switch Button back to Overlay */}
        <button
          onClick={toggleView}
          className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-black font-black rounded-xl shadow-2xl text-xs flex items-center gap-2 border border-amber-300 transition"
        >
          <Swords className="w-4 h-4 fill-black" />
          <span>Zum OBS Overlay View</span>
        </button>

        <RaidAdminDeck state={state} status={status} onSendMessage={sendMessage} />
      </div>
    );
  }

  // Pure Transparent OBS Overlay View: Zero stream clutter
  return (
    <main className="min-h-screen w-full bg-transparent p-2 flex flex-col items-start justify-start relative select-none">
      {/* Floating Button for Testing Admin in Browser (Press 'A' or Click) */}
      <button
        onClick={toggleView}
        title="Admin-Deck öffnen (oder Taste 'A' drücken)"
        className="fixed bottom-2 right-2 opacity-20 hover:opacity-100 transition-opacity z-50 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1.5"
      >
        <Shield className="w-3 h-3 text-amber-400" />
        <span>Admin Deck</span>
      </button>

      {/* Main Raid Boss Encounter Overlay */}
      <RaidOverlay state={state} latestHit={latestHit} />
    </main>
  );
};

export default App;
