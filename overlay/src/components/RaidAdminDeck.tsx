import React, { useState } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Send,
  Zap,
  Copy,
  Check,
  Flame,
  Shield,
  Undo2,
  Swords,
  Gift,
  Key
} from 'lucide-react';
import { RaidState, RaidTier } from '../types';
import { useRaidAudio } from '../hooks/useRaidAudio';

interface RaidAdminDeckProps {
  state: RaidState | null;
  status: string;
  onSendMessage: (type: any, payload: any) => void;
}

export const RaidAdminDeck: React.FC<RaidAdminDeckProps> = ({ state, status, onSendMessage }) => {
  const { playSlash, playCrit, playDefeat, playChest } = useRaidAudio();

  // Form states
  const [buyerInput, setBuyerInput] = useState('');
  const [itemInput, setItemInput] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // KGA Edit State
  const [kgaTitle, setKgaTitle] = useState(state?.boss?.unlockedKga?.title || '');
  const [kgaSubtitle, setKgaSubtitle] = useState(state?.boss?.unlockedKga?.subtitle || '');
  const [kgaCode, setKgaCode] = useState(state?.boss?.unlockedKga?.code || '');

  const boss = state?.boss;
  const config = state?.config;
  const attackers = state?.topAttackers || [];
  const recentHits = state?.recentHits || [];

  // Recent unique buyer handles for 1-tap chip selection
  const recentBuyerNames = Array.from(
    new Set([
      ...attackers.map((a) => a.username),
      ...recentHits.map((h) => h.buyer),
      'GamerHero',
      'PokeCollector',
      'DragonKnight',
      'MysticMage'
    ])
  ).slice(0, 8);

  const handleTriggerHit = (tier: RaidTier) => {
    const buyer = buyerInput.trim() || 'Hero_' + Math.floor(Math.random() * 90 + 10);
    onSendMessage('RAID_HIT', {
      buyer,
      tier,
      itemTitle: itemInput.trim() || undefined,
      price: customPrice.trim() || undefined
    });

    // Don't clear buyer immediately to allow quick multi-hits, but clear item
    setItemInput('');
    setCustomPrice('');
  };

  const handleCustomHit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerInput.trim()) return;

    let tier: RaidTier = 'RARE';
    if (customPrice) {
      const num = parseFloat(customPrice.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (num > 10) tier = 'LEGENDARY';
      else if (num > 5) tier = 'EPIC';
    }

    handleTriggerHit(tier);
  };

  const handleUndo = () => {
    onSendMessage('UNDO_HIT', {});
  };

  const handleAddShield = (amount: number = 100) => {
    onSendMessage('SHIELD_BOSS', { amount });
  };

  const handleToggleEnrage = () => {
    onSendMessage('TOGGLE_ENRAGE', { active: !boss?.isEnraged });
  };

  const handleResetRaid = () => {
    if (window.confirm('Möchtest du den Raid Boss wirklich auf 100% Leben zurücksetzen?')) {
      onSendMessage('RESET_RAID', { hp: config?.bossMaxHp || 3000 });
    }
  };

  const handleToggleSound = () => {
    onSendMessage('UPDATE_CONFIG', { soundEnabled: !config?.soundEnabled });
  };

  const handleSaveKga = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage('UPDATE_KGA', {
      title: kgaTitle,
      subtitle: kgaSubtitle,
      code: kgaCode
    });
    alert('KGA Belohnung erfolgreich gespeichert!');
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
  const apiBaseUrl = baseUrl.includes(':5173') ? 'http://localhost:8080' : baseUrl;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 md:p-6 font-outfit">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black font-cinzel text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                <span>Raid Boss Admin & Stream Deck</span>
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                  status === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
                {status === 'connected' ? 'Online' : 'Lokal / Cloud-Sync'}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Optimiert für Smartphone & Stream Deck • Quick Hits • Shield • Undo • Enrage • KGA Unlock
            </p>
          </div>

          {/* Quick Actions & Sound Toggle */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <button
              onClick={handleToggleSound}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                config?.soundEnabled
                  ? 'bg-purple-950/70 text-purple-300 border-purple-500/60'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {config?.soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
              <span>{config?.soundEnabled ? 'Sound AN' : 'Sound STUMM'}</span>
            </button>

            <button
              onClick={handleResetRaid}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/60 text-rose-200 rounded-xl text-xs font-bold transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Raid</span>
            </button>
          </div>
        </div>

        {/* Live Boss Status Card */}
        {boss && (
          <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={boss.avatarUrl || '/boss.png'}
                alt={boss.name}
                className="w-14 h-14 rounded-xl object-cover border border-amber-500/40 shadow-md"
              />
              <div>
                <h3 className="font-cinzel font-bold text-sm md:text-base text-amber-300">
                  {boss.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>
                    HP: <strong className="text-white">{boss.currentHp.toLocaleString()}</strong> / {boss.maxHp.toLocaleString()}
                  </span>
                  {boss.shieldHp > 0 && (
                    <span className="text-cyan-300 font-bold">
                      (+{boss.shieldHp} Shield)
                    </span>
                  )}
                  {boss.isEnraged && (
                    <span className="text-red-400 font-black animate-pulse">
                      🔥 ENRAGED
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Utility Buttons */}
            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleUndo}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Undo2 className="w-4 h-4 text-sky-400" />
                <span>Undo Hit</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddShield(100)}
                className="px-3 py-2 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>+100 Shield</span>
              </button>

              <button
                type="button"
                onClick={handleToggleEnrage}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 border ${
                  boss.isEnraged
                    ? 'bg-red-600 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
              >
                <Flame className="w-4 h-4 text-red-400" />
                <span>{boss.isEnraged ? 'Enrage AUS' : 'Enrage AN'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Action Hits & Buyer Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Column 1: Quick Action Attack Deck */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2 font-cinzel">
                <Swords className="w-4 h-4 text-amber-400" />
                <span>Raid Attack Buttons (Quick-Actions)</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Wähle Käufer & klicke Schaden
              </span>
            </div>

            {/* Buyer Handle Input & 1-Tap Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Käufer Handle (für Schaden & Combo)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-sm">@</span>
                <input
                  type="text"
                  placeholder="KäuferName (oder aus Chips wählen)"
                  value={buyerInput}
                  onChange={(e) => setBuyerInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* 1-Tap Recent Buyer Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-medium">Kürzliche Käufer:</span>
                {recentBuyerNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setBuyerInput(name)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition border ${
                      buyerInput.toLowerCase() === name.toLowerCase()
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    @{name}
                  </button>
                ))}
              </div>
            </div>

            {/* 3 Main Tier Hit Buttons */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {/* Rare Button */}
              <button
                type="button"
                onClick={() => handleTriggerHit('RARE')}
                className="py-3 px-2 bg-gradient-to-b from-sky-950 via-slate-900 to-sky-950 hover:from-sky-900 hover:to-slate-900 border-2 border-sky-500/60 rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg transition active:scale-95 group"
              >
                <div className="flex items-center gap-1 text-sky-300 font-extrabold text-sm font-cinzel">
                  <Zap className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
                  <span>🔵 RARE</span>
                </div>
                <span className="text-xs font-mono font-black text-white">
                  -100 DMG
                </span>
                <span className="text-[10px] text-sky-400/80 font-medium">
                  &lt; 5 €
                </span>
              </button>

              {/* Epic Button */}
              <button
                type="button"
                onClick={() => handleTriggerHit('EPIC')}
                className="py-3 px-2 bg-gradient-to-b from-purple-950 via-slate-900 to-purple-950 hover:from-purple-900 hover:to-slate-900 border-2 border-purple-500/60 rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg transition active:scale-95 group"
              >
                <div className="flex items-center gap-1 text-purple-300 font-extrabold text-sm font-cinzel">
                  <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
                  <span>🟣 EPIC</span>
                </div>
                <span className="text-xs font-mono font-black text-white">
                  -250 DMG
                </span>
                <span className="text-[10px] text-purple-400/80 font-medium">
                  5 - 10 €
                </span>
              </button>

              {/* Legendary Button */}
              <button
                type="button"
                onClick={() => handleTriggerHit('LEGENDARY')}
                className="py-3 px-2 bg-gradient-to-b from-amber-950 via-slate-900 to-amber-950 hover:from-amber-900 hover:to-slate-900 border-2 border-amber-400/80 rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg transition active:scale-95 group"
              >
                <div className="flex items-center gap-1 text-amber-300 font-extrabold text-sm font-cinzel">
                  <Flame className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
                  <span>🟡 GRAIL</span>
                </div>
                <span className="text-xs font-mono font-black text-white">
                  -500 DMG
                </span>
                <span className="text-[10px] text-amber-400/80 font-medium">
                  &gt; 10 €
                </span>
              </button>
            </div>

            {/* Optional Custom Damage Form */}
            <form onSubmit={handleCustomHit} className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="Artikel (optional)"
                value={itemInput}
                onChange={(e) => setItemInput(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                placeholder="Preis (z.B. 15.00 €)"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Angriff senden</span>
              </button>
            </form>
          </div>

          {/* Column 2: Stream Deck HTTP Endpoints & Sound Test */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h2 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <Key className="w-4 h-4" />
                <span>Stream Deck Tasten-URLs</span>
              </h2>
            </div>

            <p className="text-xs text-slate-400">
              Kopiere diese URLs in Stream Deck als <strong>Website (GET)</strong> für physische Hardware-Tasten:
            </p>

            <div className="space-y-1.5">
              {[
                { label: 'Rare Hit (<5€)', url: `${apiBaseUrl}/api/hit?tier=RARE` },
                { label: 'Epic Hit (5-10€)', url: `${apiBaseUrl}/api/hit?tier=EPIC` },
                { label: 'Legendary Hit (>10€)', url: `${apiBaseUrl}/api/hit?tier=LEGENDARY` },
                { label: 'Undo Hit', url: `${apiBaseUrl}/api/undo` },
                { label: 'Shield (+100)', url: `${apiBaseUrl}/api/shield?amount=100` },
                { label: 'Enrage Toggle', url: `${apiBaseUrl}/api/enrage` },
                { label: 'Reset Raid', url: `${apiBaseUrl}/api/reset` }
              ].map(({ label, url }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleCopyText(url, label)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs transition group"
                >
                  <span className="font-semibold text-slate-300 truncate">{label}</span>
                  <span className="text-[10px] text-sky-400 font-mono flex items-center gap-1 shrink-0">
                    {copiedUrl === label ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-500 group-hover:text-sky-300" />
                    )}
                    <span>{copiedUrl === label ? 'Kopiert' : 'Kopieren'}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Sound Test Panel */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-purple-300 mb-2">
                <span>Soundeffekte testen</span>
                <span className="text-[10px] text-slate-400">
                  Vol: {Math.round((config?.soundVolume || 0.8) * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => playSlash(config?.soundVolume || 0.8)}
                  className="px-2 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-sky-300 font-bold transition"
                >
                  ⚔️ Slash Sound
                </button>
                <button
                  type="button"
                  onClick={() => playCrit(config?.soundVolume || 0.8)}
                  className="px-2 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-amber-300 font-bold transition"
                >
                  💥 Crit Sound
                </button>
                <button
                  type="button"
                  onClick={() => playDefeat(config?.soundVolume || 0.8)}
                  className="px-2 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-red-300 font-bold transition"
                >
                  ☠️ Defeat Sound
                </button>
                <button
                  type="button"
                  onClick={() => playChest(config?.soundVolume || 0.8)}
                  className="px-2 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-yellow-300 font-bold transition"
                >
                  🎁 Chest Fanfare
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: KGA Reward Configuration & Recent Hits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: KGA Reward Settings */}
          <form onSubmit={handleSaveKga} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2 font-cinzel border-b border-slate-800 pb-2.5">
              <Gift className="w-4 h-4" />
              <span>KGA Belohnung & Truhen-Inhalt anpassen</span>
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">KGA Titel (beim Truhen-Drop)</label>
              <input
                type="text"
                value={kgaTitle}
                onChange={(e) => setKgaTitle(e.target.value)}
                placeholder="z.B. KGA #01: Glurak VMAX PSA 10"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Beschreibung / Untertitel</label>
              <input
                type="text"
                value={kgaSubtitle}
                onChange={(e) => setKgaSubtitle(e.target.value)}
                placeholder="z.B. Herzlichen Glückwunsch an den Raid!"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Promo-Code / Claim-Code</label>
              <input
                type="text"
                value={kgaCode}
                onChange={(e) => setKgaCode(e.target.value)}
                placeholder="z.B. KGA-GLURAK-99"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-black font-extrabold rounded-lg text-xs tracking-wider transition shadow-lg"
            >
              KGA Daten speichern
            </button>
          </form>

          {/* Card 2: Recent Hits Log */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Letzte Raid-Treffer ({recentHits.length})</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Gesamt: <strong className="text-amber-400">{state?.totalHits} Treffer</strong>
              </span>
            </div>

            {recentHits.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Noch keine Treffer verzeichnet.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {recentHits.slice(0, 10).map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-black text-[10px] px-1.5 py-0.5 rounded ${
                          h.tier === 'LEGENDARY'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : h.tier === 'EPIC'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}
                      >
                        {h.tier}
                      </span>
                      <span className="font-bold text-white">@{h.buyer}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-amber-400 font-bold">-{h.totalDamage} DMG</span>
                      {h.comboMultiplier > 1 && (
                        <span className="text-[10px] text-amber-300 bg-amber-950 px-1 rounded">
                          x{h.comboMultiplier}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
