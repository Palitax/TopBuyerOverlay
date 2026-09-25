export type RaidTier = 'RARE' | 'EPIC' | 'LEGENDARY' | 'CUSTOM';

export interface RaidHitEvent {
  id: string;
  buyer: string;
  tier: RaidTier;
  rawDamage: number;
  comboMultiplier: number;
  totalDamage: number;
  shieldAbsorbed: number;
  hpDamage: number;
  isCrit: boolean;
  comboCount: number;
  timestamp: number;
  itemTitle?: string;
  price?: string;
  previousHp: number;
  newHp: number;
  previousShield: number;
  newShield: number;
  triggeredPhase2?: boolean;
  triggeredDefeat?: boolean;
}

export interface UnlockedKGA {
  title: string;
  subtitle: string;
  code: string;
  isRevealed: boolean;
  itemImage?: string;
}

export interface BossState {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  maxHp: number;
  currentHp: number;
  shieldHp: number;
  maxShieldHp: number;
  isEnraged: boolean;
  isDefeated: boolean;
  phase: 1 | 2;
  unlockedKga: UnlockedKGA;
}

export interface AttackerStats {
  username: string;
  totalDamage: number;
  hitCount: number;
  lastHitTimestamp: number;
  highestCrit: number;
  rank: number;
  percentage: number;
}

export interface RaidConfig {
  overlayTitle: string;
  soundEnabled: boolean;
  soundVolume: number;
  rareDamage: number;
  epicDamage: number;
  legendaryDamage: number;
  bossMaxHp: number;
  kgaRewardTitle: string;
  kgaRewardSubtitle: string;
  kgaRewardCode: string;
}

export interface CurrentCombo {
  count: number;
  multiplier: number;
  lastBuyer: string;
  expiresAt: number;
}

export interface RaidStateSnapshot {
  boss: BossState;
  attackers: Record<string, AttackerStats>;
  totalDamageDealt: number;
  totalHits: number;
  currentCombo: CurrentCombo;
  lastHitEvent?: RaidHitEvent;
}

export interface RaidState {
  boss: BossState;
  attackers: Record<string, AttackerStats>;
  topAttackers: AttackerStats[];
  recentHits: RaidHitEvent[];
  config: RaidConfig;
  totalDamageDealt: number;
  totalHits: number;
  currentCombo: CurrentCombo;
  sessionStartTime: number;
}

export type WSMessageType =
  | 'INIT_STATE'
  | 'RAID_STATE_UPDATE'
  | 'RAID_HIT'
  | 'HIT_ALERT'
  | 'UNDO_HIT'
  | 'SHIELD_BOSS'
  | 'TOGGLE_ENRAGE'
  | 'RESET_RAID'
  | 'UPDATE_CONFIG'
  | 'UPDATE_KGA'
  | 'PING'
  | 'PONG';

export interface WSMessage<T = any> {
  type: WSMessageType;
  payload: T;
  timestamp?: number;
}
