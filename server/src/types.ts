export type CardRarity = 'rare' | 'epic' | 'legendary';

export interface RankTier {
  tier: number;
  title: string;
  minPurchases: number;
  color: string;
  glowColor: string;
  badge: string; // Emoji or icon identifier
  description: string;
}

export interface BuyerProfile {
  username: string;
  purchaseCount: number;
  mana: number;
  tier: number;
  rankTitle: string;
  rankColor: string;
  rankBadge: string;
  lastPurchaseTimestamp: number;
  lastItemTitle?: string;
  lastPrice?: string;
  lastRarity?: CardRarity;
  totalSpent?: number;
}

export interface LeaderboardEntry extends BuyerProfile {
  position: number;
  progressToNextTier: number; // 0 to 100%
  nextTierTitle?: string;
  purchasesNeededForNextTier?: number;
  streakMultiplier?: number;
}

export interface PurchaseEvent {
  id: string;
  username: string;
  itemTitle?: string;
  price?: string;
  priceNum: number;
  quantity?: number;
  timestamp: number;
  rarity: CardRarity;
  baseMana: number;
  priceBonus?: number;
  streakMultiplier: number;
  currentStreak: number;
  manaGained: number;
  isRankUp?: boolean;
  oldTier?: number;
  newTier?: number;
  newRankTitle?: string;
}

export interface OverlayConfig {
  overlayTitle: string;
  streamerName: string;
  maxDisplayCount: number;
  soundEnabled: boolean;
  soundVolume: number;
  manaMultiplier: number; // Base mana per purchase (default: 100)
  ranks: RankTier[];
}

export interface LeaderboardState {
  buyers: Record<string, BuyerProfile>;
  recentPurchases: PurchaseEvent[];
  config: OverlayConfig;
  totalPurchases: number;
  totalMana: number;
  sessionStartTime: number;
}

export type WSMessageType =
  | 'INIT_STATE'
  | 'NEW_PURCHASE'
  | 'LEADERBOARD_UPDATE'
  | 'PURCHASE_ALERT'
  | 'RANK_UP_ALERT'
  | 'RESET_SESSION'
  | 'UPDATE_CONFIG'
  | 'MANUAL_ADJUST'
  | 'DELETE_USER'
  | 'PING'
  | 'PONG';

export interface WSMessage<T = any> {
  type: WSMessageType;
  payload: T;
  timestamp?: number;
}
