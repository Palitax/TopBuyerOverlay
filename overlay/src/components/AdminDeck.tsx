import React, { useState } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Plus,
  Minus,
  Trash2,
  Send,
  Zap,
  Crown,
  Settings,
  Copy,
  Check,
  Music,
  ExternalLink,
  Flame,
  Gem
} from 'lucide-react';
import { LeaderboardState } from '../types';
import { RankBadge } from './RankBadge';
import { useSoundEffects } from '../hooks/useSoundEffects';

interface AdminDeckProps {
  state: LeaderboardState | null;
  status: string;
  onSendMessage: (type: any, payload: any) => void;
}

export const AdminDeck: React.FC<AdminDeckProps> = ({ state, status, onSendMessage }) => {
  const { playManaSound, playRankUpSound } = useSoundEffects();

  // Form states
  const [customUser, setCustomUser] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [customPrice, setCustomPrice] = useState('2.50 €');
  const [customQuantity, setCustomQuantity] = useState(1);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const leaderboard = state?.leaderboard || [];
  const config = state?.config;

  // Helper to preview rarity from price input
  const getPriceNum = (priceStr: string) => {
    const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || parsed <= 0 ? 2.5 : parsed;
  };

  const previewPriceNum = getPriceNum(customPrice);
  const previewRarity = previewPriceNum <= 5 ? 'rare' : previewPriceNum <= 100 ? 'epic' : 'legendary';
  const previewBonus = Math.round(10 * Math.sqrt(previewPriceNum));

  const handleSimulateRandom = (rarityType?: 'rare' | 'epic' | 'legendary') => {
    const randomUsers = [
      'GamerKnight',
      'MysticMage',
      'CardCollector99',
      'AnimeVault',
      'DragonSlayer',
      'PokeMaster',
      'RetroGamer',
      'ShadowBinder'
    ];
    const rareItems = ['Pikachu Common Single', 'Trainer Bulk Card', 'Reverse Holo Energy', '1€ Mystery Single'];
    const epicItems = ['Charizard VMAX Slab', 'One Piece Booster Box', 'PSA 9 Japanese Holo', 'Silver Tempest ETB'];
    const legendaryItems = ['1st Edition Base Set Charizard', 'Vintage Booster Pack 1999', 'PSA 10 Gold Star Rayquaza'];

    const chosenRarity = rarityType || (Math.random() > 0.7 ? 'epic' : Math.random() > 0.9 ? 'legendary' : 'rare');
    const randomUser = randomUsers[Math.floor(Math.random() * randomUsers.length)];

    let itemTitle = rareItems[Math.floor(Math.random() * rareItems.length)];
    let price = '2.50 €';

    if (chosenRarity === 'epic') {
      itemTitle = epicItems[Math.floor(Math.random() * epicItems.length)];
      price = rarityType === 'epic' ? '35.00 €' : `${(Math.floor(Math.random() * 50) + 15).toFixed(2)} €`;
    } else if (chosenRarity === 'legendary') {
      itemTitle = legendaryItems[Math.floor(Math.random() * legendaryItems.length)];
      price = rarityType === 'legendary' ? '150.00 €' : `${(Math.floor(Math.random() * 250) + 120).toFixed(2)} €`;
    }

    onSendMessage('NEW_PURCHASE', {
      username: randomUser,
      itemTitle,
      price,
      quantity: 1
    });
  };

  const handleSendCustomPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUser.trim()) return;

    onSendMessage('NEW_PURCHASE', {
      username: customUser.trim(),
      itemTitle: customItem.trim() || 'Whatnot Stream Item',
      price: customPrice.trim(),
      quantity: customQuantity
    });

    setCustomUser('');
    setCustomItem('');
  };

  const handleQuickAdjust = (username: string, delta: number, currentPurchases: number) => {
    const newCount = Math.max(0, currentPurchases + delta);
    onSendMessage('MANUAL_ADJUST', {
      username,
      purchases: newCount
    });
  };

  const handleDeleteUser = (username: string) => {
    if (window.confirm(`Möchtest du @${username} wirklich aus der Bestenliste entfernen?`)) {
      onSendMessage('DELETE_USER', { username });
    }
  };

  const handleResetSession = () => {
    if (window.confirm('Möchtest du die gesamte Stream-Session wirklich zurücksetzen? Alle Mana-Punkte werden auf 0 gesetzt.')) {
      onSendMessage('RESET_SESSION', {});
    }
  };

  const handleUpdateConfig = (key: string, value: any) => {
    onSendMessage('UPDATE_CONFIG', {
      [key]: value
    });
  };

  const handleCopyObsUrl = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-outfit">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold font-cinzel text-white flex items-center gap-2">
                <span>🔮 Whatnot Mana Streamer Deck</span>
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  status === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-sky-400'
                  }`}
                />
                {status === 'connected'
                  ? 'Relay Server Verbunden'
                  : 'Browser-Testmodus aktiv (Käufe direkt im Browser)'}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              3 Rarity-Stufen (Rare 1-5€, Epic 5-100€, Legendary &gt;100€) mit Wurzel-Dämpfung & Combo-Streak
            </p>
          </div>

          {/* Quick OBS URL & Reset Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyObsUrl}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium transition"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedUrl ? 'Kopiert!' : 'OBS URL Kopieren'}</span>
            </button>

            <button
              onClick={handleResetSession}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/60 text-rose-200 rounded-xl text-xs font-medium transition shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Session Reset</span>
            </button>
          </div>
        </div>

        {/* Top Grid: Simulator & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Kauf Simulator */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-sky-400 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Live Kauf Simulator</span>
              </h2>
            </div>

            {/* Quick Preset Buttons for 3 Rarities */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleSimulateRandom('rare')}
                className="py-1.5 px-2 bg-sky-950/60 hover:bg-sky-900/70 border border-sky-500/40 text-sky-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
              >
                <Zap className="w-3 h-3 text-sky-400" />
                <span>🔵 Rare (2€)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateRandom('epic')}
                className="py-1.5 px-2 bg-purple-950/60 hover:bg-purple-900/70 border border-purple-500/40 text-purple-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>🟣 Epic (35€)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateRandom('legendary')}
                className="py-1.5 px-2 bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
              >
                <Gem className="w-3 h-3 text-amber-400" />
                <span>🟡 Grail (150€)</span>
              </button>
            </div>

            <form onSubmit={handleSendCustomPurchase} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Whatnot Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 text-sm">@</span>
                  <input
                    type="text"
                    required
                    placeholder="KäuferName"
                    value={customUser}
                    onChange={(e) => setCustomUser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Artikel (Opt.)</label>
                  <input
                    type="text"
                    placeholder="z.B. Pokémon Card"
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Preis</label>
                  <input
                    type="text"
                    placeholder="2.50 €"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Anzahl</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={customQuantity}
                    onChange={(e) => setCustomQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Rarity & Bonus Live Preview */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]">
                <span className="text-slate-400">
                  Stufe:{' '}
                  <strong
                    className={
                      previewRarity === 'legendary'
                        ? 'text-amber-400 font-bold'
                        : previewRarity === 'epic'
                        ? 'text-purple-400 font-bold'
                        : 'text-sky-400 font-bold'
                    }
                  >
                    {previewRarity.toUpperCase()}
                  </strong>
                </span>
                <span className="text-slate-400">
                  Wert-Bonus: <strong className="text-amber-300 font-mono">+{previewBonus} MP</strong>
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-lg"
              >
                <Send className="w-4 h-4" />
                <span>Kauf-Event senden</span>
              </button>
            </form>
          </div>

          {/* Card 2: Audio & Effekte */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-purple-400 flex items-center gap-2">
                <Music className="w-4 h-4" />
                <span>Audio & Soundeffekte</span>
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Soundeffekte im Overlay</span>
                <button
                  onClick={() => handleUpdateConfig('soundEnabled', !config?.soundEnabled)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    config?.soundEnabled
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {config?.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{config?.soundEnabled ? 'Aktiviert' : 'Stumm'}</span>
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Lautstärke</span>
                  <span>{Math.round((config?.soundVolume || 0.7) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config?.soundVolume ?? 0.7}
                  onChange={(e) => handleUpdateConfig('soundVolume', parseFloat(e.target.value))}
                  className="w-full accent-purple-500 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => playManaSound(config?.soundVolume ?? 0.7)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-sky-300 flex items-center justify-center gap-1 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Mana Sound Test</span>
                </button>
                <button
                  onClick={() => playRankUpSound(5, config?.soundVolume ?? 0.8)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-amber-300 flex items-center justify-center gap-1 transition"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Rank Up Fanfare</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Overlay Einstellungen */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span>Overlay Konfiguration</span>
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max angezeigte Käufer im Overlay</label>
                <select
                  value={config?.maxDisplayCount || 5}
                  onChange={(e) => handleUpdateConfig('maxDisplayCount', parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={3}>Top 3 Käufer</option>
                  <option value={5}>Top 5 Käufer</option>
                  <option value={8}>Top 8 Käufer</option>
                  <option value={10}>Top 10 Käufer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Basis-Mana pro Kauf</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  step="10"
                  value={config?.manaMultiplier || 100}
                  onChange={(e) => handleUpdateConfig('manaMultiplier', parseInt(e.target.value, 10) || 100)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Overlay in neuem Tab öffnen</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Table: Live Buyer List & Manual Mana Adjustments */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-cinzel">
              <span>Aktuelle Käufer-Rangliste ({leaderboard.length} Käufer)</span>
            </h2>
            <span className="text-xs text-slate-400">
              Gesamt: <strong className="text-amber-400">{state?.totalMana.toLocaleString()} MP</strong> (
              {state?.totalPurchases} Käufe)
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Noch keine Käufe in dieser Stream-Session erfasst. Nutze den Simulator oben!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-800">
                    <th className="pb-3 px-3">Rang</th>
                    <th className="pb-3 px-3">Käufer</th>
                    <th className="pb-3 px-3">Aktueller Titel</th>
                    <th className="pb-3 px-3">Käufe & Streak</th>
                    <th className="pb-3 px-3">Gesamt-Mana</th>
                    <th className="pb-3 px-3 text-right">Manuelle Anpassung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leaderboard.map((b) => (
                    <tr key={b.username} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-400">#{b.position}</td>
                      <td className="py-3 px-3 font-bold text-white">@{b.username}</td>
                      <td className="py-3 px-3">
                        <RankBadge tier={b.tier} title={b.rankTitle} badgeEmoji={b.rankBadge} size="sm" />
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span>{b.purchaseCount}x</span>
                          {b.streakMultiplier && b.streakMultiplier > 1.0 && (
                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-400/30">
                              <Flame className="w-2.5 h-2.5" />
                              x{b.streakMultiplier}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-300 font-bold">{b.mana.toLocaleString()} MP</td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleQuickAdjust(b.username, -1, b.purchaseCount)}
                          disabled={b.purchaseCount <= 0}
                          title="1 Kauf abziehen"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-300 transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleQuickAdjust(b.username, 1, b.purchaseCount)}
                          title="1 Kauf hinzufügen"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-emerald-400 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(b.username)}
                          title="Käufer löschen"
                          className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 rounded-lg text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
