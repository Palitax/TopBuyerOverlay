import { LeaderboardState, PurchaseEvent, CardRarity, RankTier, LeaderboardEntry, BuyerProfile } from '../types';
import { RankUpEventPayload } from '../hooks/useWebSocket';

export const DEFAULT_RANKS: RankTier[] = [
  { tier: 1, title: 'Novize', minPurchases: 1, color: '#94a3b8', glowColor: 'rgba(148, 163, 184, 0.5)', badge: '📜', description: 'Beginnt die arkanen Künste des Sammelns.' },
  { tier: 2, title: 'Adept', minPurchases: 2, color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.6)', badge: '🧪', description: 'Beherrscht grundlegende Mana-Flüsse.' },
  { tier: 3, title: 'Akolyth', minPurchases: 3, color: '#38bdf8', glowColor: 'rgba(56, 189, 248, 0.7)', badge: '⚡', description: 'Kanalisiert pure elektrische Mana-Energie.' },
  { tier: 4, title: 'Magister', minPurchases: 6, color: '#c084fc', glowColor: 'rgba(192, 132, 252, 0.8)', badge: '🔮', description: 'Ein wahrer Meister der Arkanmagie.' },
  { tier: 5, title: 'Erzmagus', minPurchases: 10, color: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.9)', badge: '🌟', description: 'Legende des Streams. Grenzenlose Mana-Macht.' }
];

export function getInitialDemoState(): LeaderboardState {
  const initialBuyers: LeaderboardEntry[] = [
    {
      username: 'ShadowBinder',
      purchaseCount: 3,
      mana: 534,
      tier: 5,
      rankTitle: 'Erzmagus',
      rankColor: '#fbbf24',
      rankBadge: '🌟',
      lastPurchaseTimestamp: Date.now() - 60000,
      lastItemTitle: 'Lugia Alternate Art',
      lastPrice: '80.00 €',
      lastRarity: 'epic',
      totalSpent: 160,
      position: 1,
      progressToNextTier: 100,
      purchasesNeededForNextTier: 0,
      streakMultiplier: 1.1
    },
    {
      username: 'CardCollector99',
      purchaseCount: 2,
      mana: 287,
      tier: 4,
      rankTitle: 'Magister',
      rankColor: '#c084fc',
      rankBadge: '🔮',
      lastPurchaseTimestamp: Date.now() - 30000,
      lastItemTitle: 'Charizard EX',
      lastPrice: '50.00 €',
      lastRarity: 'epic',
      totalSpent: 52.5,
      position: 2,
      progressToNextTier: 65,
      nextTierTitle: 'Erzmagus',
      purchasesNeededForNextTier: 3,
      streakMultiplier: 1.0
    },
    {
      username: 'DragonSlayer',
      purchaseCount: 1,
      mana: 116,
      tier: 3,
      rankTitle: 'Akolyth',
      rankColor: '#38bdf8',
      rankBadge: '⚡',
      lastPurchaseTimestamp: Date.now() - 90000,
      lastItemTitle: 'Trainer Bulk Card',
      lastPrice: '2.50 €',
      lastRarity: 'rare',
      totalSpent: 2.5,
      position: 3,
      progressToNextTier: 40,
      nextTierTitle: 'Magister',
      purchasesNeededForNextTier: 2,
      streakMultiplier: 1.0
    }
  ];

  return {
    leaderboard: initialBuyers,
    totalPurchases: 6,
    totalMana: 937,
    recentPurchases: [],
    config: {
      overlayTitle: '✨ Fantasy Mana Leaderboard ✨',
      streamerName: 'Whatnot Streamer',
      maxDisplayCount: 3,
      soundEnabled: true,
      soundVolume: 0.7,
      manaMultiplier: 100,
      ranks: DEFAULT_RANKS
    }
  };
}

export function parsePrice(price?: string | number): number {
  if (typeof price === 'number') return Math.max(0, price);
  if (!price || typeof price !== 'string') return 3.0;
  const cleaned = price.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) || parsed <= 0 ? 3.0 : parsed;
}

export function getRarity(priceNum: number): CardRarity {
  if (priceNum <= 5.0) return 'rare';
  if (priceNum <= 100.0) return 'epic';
  return 'legendary';
}

export function getStreakMultiplier(purchaseCount: number): number {
  if (purchaseCount >= 10) return 1.3;
  if (purchaseCount >= 5) return 1.2;
  if (purchaseCount >= 3) return 1.1;
  return 1.0;
}

export function simulateClientPurchase(
  currentState: LeaderboardState,
  payload: { username: string; itemTitle?: string; price?: string | number; quantity?: number }
): {
  nextState: LeaderboardState;
  event: PurchaseEvent;
  isRankUp: boolean;
  rankUpPayload?: RankUpEventPayload;
} {
  const username = payload.username.trim().replace(/^@/, '');
  const priceNum = parsePrice(payload.price);
  const quantity = Math.max(1, payload.quantity || 1);
  const rarity = getRarity(priceNum);
  const itemTitle = payload.itemTitle || (rarity === 'rare' ? 'Rare Booster Single' : rarity === 'epic' ? 'Epic Card Slab' : 'Legendary 1st Edition');

  const existingIndex = currentState.leaderboard.findIndex(
    (b) => b.username.toLowerCase() === username.toLowerCase()
  );
  const existing = existingIndex !== -1 ? currentState.leaderboard[existingIndex] : null;

  const newPurchaseCount = (existing ? existing.purchaseCount : 0) + quantity;
  const streakMultiplier = getStreakMultiplier(newPurchaseCount);
  const baseMana = 100 * quantity;
  const priceBonus = Math.round(10 * Math.sqrt(priceNum) * quantity);
  const manaGained = Math.round((baseMana + priceBonus) * streakMultiplier);

  const newTotalMana = (existing ? existing.mana : 0) + manaGained;
  const newTotalSpent = (existing ? existing.totalSpent || 0 : 0) + priceNum * quantity;

  const event: PurchaseEvent = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    username,
    itemTitle,
    price: typeof payload.price === 'string' ? payload.price : `${priceNum.toFixed(2)} €`,
    priceNum,
    quantity,
    timestamp: Date.now(),
    rarity,
    baseMana,
    priceBonus,
    streakMultiplier,
    currentStreak: newPurchaseCount,
    manaGained
  };

  const buyersMap = new Map<string, BuyerProfile>();
  currentState.leaderboard.forEach((b) => {
    buyersMap.set(b.username.toLowerCase(), { ...b });
  });

  const updatedProfile: BuyerProfile = {
    username: existing ? existing.username : username,
    purchaseCount: newPurchaseCount,
    mana: newTotalMana,
    tier: existing ? existing.tier : 1,
    rankTitle: existing ? existing.rankTitle : 'Novize',
    rankColor: existing ? existing.rankColor : '#94a3b8',
    rankBadge: existing ? existing.rankBadge : '📜',
    lastPurchaseTimestamp: Date.now(),
    lastItemTitle: itemTitle,
    lastPrice: event.price,
    lastRarity: rarity,
    totalSpent: newTotalSpent
  };
  buyersMap.set(username.toLowerCase(), updatedProfile);

  const sorted = Array.from(buyersMap.values()).sort((a, b) => {
    if (b.mana !== a.mana) return b.mana - a.mana;
    return a.lastPurchaseTimestamp - b.lastPurchaseTimestamp;
  });

  let isRankUp = false;
  let rankUpPayload: RankUpEventPayload | undefined;

  const newLeaderboard: LeaderboardEntry[] = sorted.map((profile, idx) => {
    const position = idx + 1;
    let rankInfo = DEFAULT_RANKS[0];
    if (position === 1) rankInfo = DEFAULT_RANKS[4];
    else if (position === 2) rankInfo = DEFAULT_RANKS[3];
    else if (position === 3) rankInfo = DEFAULT_RANKS[2];

    const oldTier = profile.tier;
    const newTier = rankInfo.tier;

    if (profile.username.toLowerCase() === username.toLowerCase() && newTier > oldTier) {
      isRankUp = true;
      event.isRankUp = true;
      event.oldTier = oldTier;
      event.newTier = newTier;
      event.newRankTitle = rankInfo.title;

      rankUpPayload = {
        username: profile.username,
        oldTier,
        newTier,
        newRankTitle: rankInfo.title,
        purchaseEvent: event
      };
    }

    let progressToNextTier = 100;
    let nextTierTitle: string | undefined;
    let purchasesNeededForNextTier = 0;

    if (position === 3) {
      const leaderAhead = sorted[1];
      const gap = leaderAhead ? leaderAhead.mana - profile.mana : 100;
      progressToNextTier = Math.min(95, Math.max(15, Math.round(100 - (gap / (gap + profile.mana)) * 100)));
      nextTierTitle = 'Magister';
      purchasesNeededForNextTier = 1;
    } else if (position === 2) {
      const leaderAhead = sorted[0];
      const gap = leaderAhead ? leaderAhead.mana - profile.mana : 100;
      progressToNextTier = Math.min(95, Math.max(20, Math.round(100 - (gap / (gap + profile.mana)) * 100)));
      nextTierTitle = 'Erzmagus';
      purchasesNeededForNextTier = 2;
    }

    return {
      ...profile,
      position,
      tier: newTier,
      rankTitle: rankInfo.title,
      rankColor: rankInfo.color,
      rankBadge: rankInfo.badge,
      progressToNextTier,
      nextTierTitle,
      purchasesNeededForNextTier,
      streakMultiplier: getStreakMultiplier(profile.purchaseCount)
    };
  });

  const nextState: LeaderboardState = {
    ...currentState,
    leaderboard: newLeaderboard,
    totalPurchases: currentState.totalPurchases + quantity,
    totalMana: currentState.totalMana + manaGained,
    recentPurchases: [event, ...currentState.recentPurchases.slice(0, 19)]
  };

  return { nextState, event, isRankUp, rankUpPayload };
}
