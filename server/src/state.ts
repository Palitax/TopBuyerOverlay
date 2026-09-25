import {
  BuyerProfile,
  CardRarity,
  LeaderboardEntry,
  LeaderboardState,
  OverlayConfig,
  PurchaseEvent,
  RankTier
} from './types.js';
import {
  loadState,
  saveState,
  getDefaultState,
  RANK_ERZMAGUS,
  RANK_MAGISTER,
  RANK_AKOLYTH,
  RANK_NOVIZE
} from './storage.js';

export function parsePrice(price?: string | number): number {
  if (typeof price === 'number') {
    return Math.max(0, price);
  }
  if (!price || typeof price !== 'string') {
    return 3.0; // Default to typical 3€ rare card
  }
  // Strip non-numeric chars except . and ,
  const cleaned = price.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) || parsed <= 0 ? 3.0 : parsed;
}

export function getRarity(priceNum: number): CardRarity {
  if (priceNum <= 5.0) {
    return 'rare';
  }
  if (priceNum <= 100.0) {
    return 'epic';
  }
  return 'legendary';
}

export function getBaseManaForRarity(rarity: CardRarity): number {
  switch (rarity) {
    case 'legendary':
      return 500;
    case 'epic':
      return 250;
    case 'rare':
    default:
      return 100;
  }
}

export function getStreakMultiplier(purchaseCount: number): number {
  if (purchaseCount >= 10) {
    return 1.3; // +30% Stream-Legende (3x Fire 🔥🔥🔥)
  }
  if (purchaseCount >= 5) {
    return 1.2; // +20% Power-Supporter (2x Fire 🔥🔥)
  }
  if (purchaseCount >= 3) {
    return 1.1; // +10% Combo-Streak (1x Fire 🔥)
  }
  return 1.0;
}

export class LeaderboardManager {
  private state: LeaderboardState;

  constructor() {
    this.state = loadState();
    this.recalculateAllRanks();
  }

  public getState(): LeaderboardState {
    return this.state;
  }

  public getConfig(): OverlayConfig {
    return this.state.config;
  }

  public updateConfig(newConfig: Partial<OverlayConfig>): OverlayConfig {
    this.state.config = {
      ...this.state.config,
      ...newConfig
    };
    this.recalculateAllRanks();
    this.persist();
    return this.state.config;
  }

  public resetSession(): LeaderboardState {
    this.state = {
      ...getDefaultState(),
      config: this.state.config
    };
    this.persist();
    return this.state;
  }

  /**
   * Returns exclusive rank by position:
   * Position 1 -> Erzmagus
   * Position 2 -> Magister
   * Position 3 -> Akolyth
   * Position 4+ -> Novize
   */
  public getRankForPosition(position: number): RankTier {
    switch (position) {
      case 1:
        return RANK_ERZMAGUS;
      case 2:
        return RANK_MAGISTER;
      case 3:
        return RANK_AKOLYTH;
      default:
        return RANK_NOVIZE;
    }
  }

  private getSortedBuyersList(): BuyerProfile[] {
    const buyers = Object.values(this.state.buyers);
    // Sort descending by mana (or purchaseCount), then on tie earlier buyer stays ahead
    buyers.sort((a, b) => {
      if (b.mana !== a.mana) {
        return b.mana - a.mana;
      }
      if (b.purchaseCount !== a.purchaseCount) {
        return b.purchaseCount - a.purchaseCount;
      }
      return a.lastPurchaseTimestamp - b.lastPurchaseTimestamp;
    });
    return buyers;
  }

  private recalculateAllRanks() {
    const sorted = this.getSortedBuyersList();
    sorted.forEach((buyer, index) => {
      const pos = index + 1;
      const rank = this.getRankForPosition(pos);
      buyer.tier = rank.tier;
      buyer.rankTitle = rank.title;
      buyer.rankColor = rank.color;
      buyer.rankBadge = rank.badge;
      this.state.buyers[buyer.username] = buyer;
    });
  }

  /**
   * Process an incoming purchase event with Rarity, Square-Root Value Damping & Combo Streak.
   */
  public recordPurchase(params: {
    username: string;
    itemTitle?: string;
    price?: string | number;
    quantity?: number;
    customMana?: number;
  }): { event: PurchaseEvent; isRankUp: boolean; oldTier: number; newTier: number; newRankTitle: string } {
    const rawUsername = params.username.trim();
    if (!rawUsername) {
      throw new Error('Username is required');
    }
    const username = rawUsername.startsWith('@') ? rawUsername.substring(1) : rawUsername;

    const quantity = Math.max(1, params.quantity || 1);
    const priceNum = parsePrice(params.price);
    const rarity = getRarity(priceNum);

    const existing = this.state.buyers[username];
    const oldTier = existing ? existing.tier : 0;
    const oldPurchases = existing ? existing.purchaseCount : 0;
    const newPurchases = oldPurchases + quantity;

    // Calculate Flat Mana Points per Rarity (Rare 100, Epic 250, Legendary 500)
    const baseManaPerUnit = getBaseManaForRarity(rarity);
    const baseMana = baseManaPerUnit * quantity;
    const streakMultiplier = getStreakMultiplier(newPurchases);

    let manaGain: number;
    if (params.customMana !== undefined && params.customMana > 0) {
      manaGain = params.customMana;
    } else {
      manaGain = Math.round(baseMana * streakMultiplier);
    }

    const newTotalMana = (existing ? existing.mana : 0) + manaGain;
    const newTotalSpent = (existing ? (existing.totalSpent || 0) : 0) + (priceNum * quantity);

    // Update Buyer Profile
    this.state.buyers[username] = {
      username,
      purchaseCount: newPurchases,
      mana: newTotalMana,
      tier: existing ? existing.tier : 1,
      rankTitle: existing ? existing.rankTitle : 'Novize',
      rankColor: existing ? existing.rankColor : RANK_NOVIZE.color,
      rankBadge: existing ? existing.rankBadge : RANK_NOVIZE.badge,
      lastPurchaseTimestamp: Date.now(),
      lastItemTitle: params.itemTitle || existing?.lastItemTitle,
      lastPrice: typeof params.price === 'string' ? params.price : `${priceNum.toFixed(2)} €`,
      lastRarity: rarity,
      totalSpent: newTotalSpent
    };

    // Re-evaluate positions & exclusive ranks for everyone
    this.recalculateAllRanks();

    const updatedProfile = this.state.buyers[username];
    const newTier = updatedProfile.tier;
    const isRankUp = newTier > oldTier && oldTier > 0;

    this.state.totalPurchases += quantity;
    this.state.totalMana += manaGain;

    const event: PurchaseEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      username,
      itemTitle: params.itemTitle,
      price: typeof params.price === 'string' ? params.price : `${priceNum.toFixed(2)} €`,
      priceNum,
      quantity,
      timestamp: Date.now(),
      rarity,
      baseMana,
      streakMultiplier,
      currentStreak: newPurchases,
      manaGained: manaGain,
      isRankUp,
      oldTier,
      newTier,
      newRankTitle: updatedProfile.rankTitle
    };

    this.state.recentPurchases = [event, ...this.state.recentPurchases.slice(0, 29)];
    this.persist();

    return {
      event,
      isRankUp,
      oldTier,
      newTier,
      newRankTitle: updatedProfile.rankTitle
    };
  }

  /**
   * Manual override of a buyer's purchases or mana.
   */
  public manualAdjust(username: string, purchases: number, mana?: number): BuyerProfile {
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    const newPurchases = Math.max(0, purchases);
    const calculatedMana = mana ?? newPurchases * (this.state.config.manaMultiplier || 100);

    this.state.buyers[cleanUsername] = {
      username: cleanUsername,
      purchaseCount: newPurchases,
      mana: calculatedMana,
      tier: 1,
      rankTitle: 'Novize',
      rankColor: RANK_NOVIZE.color,
      rankBadge: RANK_NOVIZE.badge,
      lastPurchaseTimestamp: this.state.buyers[cleanUsername]?.lastPurchaseTimestamp || Date.now()
    };

    this.recalculateAllRanks();
    this.recalculateTotals();
    this.persist();
    return this.state.buyers[cleanUsername];
  }

  public deleteUser(username: string): void {
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    delete this.state.buyers[cleanUsername];
    this.recalculateAllRanks();
    this.recalculateTotals();
    this.persist();
  }

  private recalculateTotals() {
    let totalPurchases = 0;
    let totalMana = 0;
    for (const buyer of Object.values(this.state.buyers)) {
      totalPurchases += buyer.purchaseCount;
      totalMana += buyer.mana;
    }
    this.state.totalPurchases = totalPurchases;
    this.state.totalMana = totalMana;
  }

  /**
   * Get sorted Leaderboard with dynamic overtaking / dethroning progress calculation based on Mana.
   */
  public getLeaderboard(): LeaderboardEntry[] {
    const sortedBuyers = this.getSortedBuyersList();

    return sortedBuyers.map((buyer, index) => {
      const position = index + 1;
      const rank = this.getRankForPosition(position);
      const streakMultiplier = getStreakMultiplier(buyer.purchaseCount);

      let progress = 100;
      let purchasesNeeded = 0;
      let nextTierTitle: string | undefined = undefined;

      if (position === 1) {
        progress = 100;
        purchasesNeeded = 0;
        nextTierTitle = undefined;
      } else if (position === 2) {
        const targetBuyer = sortedBuyers[0]; // Platz 1
        const targetMana = targetBuyer.mana;
        const manaNeeded = Math.max(1, (targetMana + 1) - buyer.mana);
        // Average mana per purchase (~120 MP) to estimate purchases needed
        purchasesNeeded = Math.max(1, Math.ceil(manaNeeded / 120));
        progress = Math.min(95, Math.max(8, Math.round((buyer.mana / (targetMana + 1)) * 100)));
        nextTierTitle = 'Erzmagus';
      } else if (position === 3) {
        const targetBuyer = sortedBuyers[1]; // Platz 2
        const targetMana = targetBuyer.mana;
        const manaNeeded = Math.max(1, (targetMana + 1) - buyer.mana);
        purchasesNeeded = Math.max(1, Math.ceil(manaNeeded / 120));
        progress = Math.min(95, Math.max(8, Math.round((buyer.mana / (targetMana + 1)) * 100)));
        nextTierTitle = 'Magister';
      } else {
        const targetBuyer = sortedBuyers[2]; // Platz 3
        const targetMana = targetBuyer ? targetBuyer.mana : 100;
        const manaNeeded = Math.max(1, (targetMana + 1) - buyer.mana);
        purchasesNeeded = Math.max(1, Math.ceil(manaNeeded / 120));
        progress = Math.min(95, Math.max(8, Math.round((buyer.mana / (targetMana + 1)) * 100)));
        nextTierTitle = 'Akolyth';
      }

      return {
        ...buyer,
        position,
        tier: rank.tier,
        rankTitle: rank.title,
        rankColor: rank.color,
        rankBadge: rank.badge,
        progressToNextTier: progress,
        nextTierTitle,
        purchasesNeededForNextTier: purchasesNeeded,
        streakMultiplier
      };
    });
  }

  private persist() {
    saveState(this.state);
  }
}
