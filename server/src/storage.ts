import fs from 'fs';
import path from 'path';
import { RaidState, RaidConfig, BossState } from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'raid_state.json');

export const DEFAULT_CONFIG: RaidConfig = {
  overlayTitle: '🔥 COMMUNITY RAID BOSS BATTLE 🔥',
  soundEnabled: true,
  soundVolume: 0.8,
  rareDamage: 100,
  epicDamage: 250,
  legendaryDamage: 500,
  bossMaxHp: 3000,
  kgaRewardTitle: 'KGA #01 UNLOCKED: MYSTERY VMAX SLAB',
  kgaRewardSubtitle: 'Herzlichen Glückwunsch an den Raid! KGA ist freigeschaltet!',
  kgaRewardCode: 'KGA-RAID-VICTORY'
};

export const DEFAULT_BOSS: BossState = {
  id: 'boss_vodkor',
  name: "VOD'KOR DER INFERNO-FÜRST",
  title: 'Höllenschmied des Untergangs • World Boss',
  avatarUrl: '/boss.png',
  maxHp: 3000,
  currentHp: 3000,
  shieldHp: 0,
  maxShieldHp: 1000,
  isEnraged: false,
  isDefeated: false,
  phase: 1,
  unlockedKga: {
    title: 'KGA #01 UNLOCKED: MYSTERY VMAX SLAB',
    subtitle: 'Raid erfolgreich abgeschlossen! Neues KGA freigeschaltet.',
    code: 'KGA-RAID-VICTORY',
    isRevealed: false,
    itemImage: '/boss.png'
  }
};

export const getDefaultRaidState = (): RaidState => ({
  boss: { ...DEFAULT_BOSS, unlockedKga: { ...DEFAULT_BOSS.unlockedKga } },
  attackers: {},
  topAttackers: [],
  recentHits: [],
  config: { ...DEFAULT_CONFIG },
  totalDamageDealt: 0,
  totalHits: 0,
  currentCombo: {
    count: 0,
    multiplier: 1.0,
    lastBuyer: '',
    expiresAt: 0
  },
  sessionStartTime: Date.now()
});

export function saveRaidState(state: RaidState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Storage] Error saving raid state:', error);
  }
}

export function loadRaidState(): RaidState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(data) as RaidState;
      if (parsed.boss && parsed.config) {
        parsed.config = { ...DEFAULT_CONFIG, ...parsed.config };
        return parsed;
      }
    }
  } catch (error) {
    console.error('[Storage] Error loading raid state, starting fresh:', error);
  }
  return getDefaultRaidState();
}
