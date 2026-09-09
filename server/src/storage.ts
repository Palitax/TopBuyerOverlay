import fs from 'fs';
import path from 'path';
import { LeaderboardState, OverlayConfig, RankTier } from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'session.json');

export const RANK_ERZMAGUS: RankTier = {
  tier: 5,
  title: 'Erzmagus',
  minPurchases: 1,
  color: '#fbbf24', // amber-400 gold
  glowColor: 'rgba(251, 191, 36, 0.9)',
  badge: '🌟',
  description: 'Exklusiver Platz 1 des Streams.'
};

export const RANK_MAGISTER: RankTier = {
  tier: 4,
  title: 'Magister',
  minPurchases: 1,
  color: '#c084fc', // purple-400
  glowColor: 'rgba(192, 132, 252, 0.8)',
  badge: '🔮',
  description: 'Exklusiver Platz 2 des Streams.'
};

export const RANK_AKOLYTH: RankTier = {
  tier: 3,
  title: 'Akolyth',
  minPurchases: 1,
  color: '#38bdf8', // sky-400
  glowColor: 'rgba(56, 189, 248, 0.7)',
  badge: '⚡',
  description: 'Exklusiver Platz 3 des Streams.'
};

export const RANK_NOVIZE: RankTier = {
  tier: 1,
  title: 'Novize',
  minPurchases: 1,
  color: '#94a3b8', // slate-400
  glowColor: 'rgba(148, 163, 184, 0.5)',
  badge: '📜',
  description: 'Herausforderer auf dem Weg zum Podest.'
};

export const DEFAULT_RANKS: RankTier[] = [
  RANK_NOVIZE,
  RANK_AKOLYTH,
  RANK_MAGISTER,
  RANK_ERZMAGUS
];

export const DEFAULT_CONFIG: OverlayConfig = {
  overlayTitle: '✨ Fantasy Mana Leaderboard ✨',
  streamerName: 'Whatnot Streamer',
  maxDisplayCount: 3,
  soundEnabled: true,
  soundVolume: 0.7,
  manaMultiplier: 100, // 1 purchase = 100 mana
  ranks: DEFAULT_RANKS
};

export const getDefaultState = (): LeaderboardState => ({
  buyers: {},
  recentPurchases: [],
  config: DEFAULT_CONFIG,
  totalPurchases: 0,
  totalMana: 0,
  sessionStartTime: Date.now()
});

export function saveState(state: LeaderboardState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Storage] Error saving state:', error);
  }
}

export function loadState(): LeaderboardState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(data) as LeaderboardState;
      parsed.config = { ...DEFAULT_CONFIG, ...parsed.config };
      return parsed;
    }
  } catch (error) {
    console.error('[Storage] Error loading state, starting fresh:', error);
  }
  return getDefaultState();
}
