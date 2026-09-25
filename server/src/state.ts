import {
  RaidState,
  RaidConfig,
  BossState,
  RaidHitEvent,
  RaidTier,
  AttackerStats,
  RaidStateSnapshot,
  UnlockedKGA
} from './types.js';
import {
  loadRaidState,
  saveRaidState,
  getDefaultRaidState,
  DEFAULT_BOSS
} from './storage.js';

const COMBO_EXPIRY_MS = 45000; // 45 seconds combo window

export class RaidBossManager {
  private state: RaidState;
  private undoStack: RaidStateSnapshot[] = [];

  constructor() {
    this.state = loadRaidState();
    this.recalculateLeaderboard();
  }

  public getState(): RaidState {
    return this.state;
  }

  public getConfig(): RaidConfig {
    return this.state.config;
  }

  public updateConfig(newConfig: Partial<RaidConfig>): RaidConfig {
    this.state.config = {
      ...this.state.config,
      ...newConfig
    };
    if (newConfig.bossMaxHp && newConfig.bossMaxHp !== this.state.boss.maxHp) {
      const ratio = this.state.boss.currentHp / this.state.boss.maxHp;
      this.state.boss.maxHp = newConfig.bossMaxHp;
      this.state.boss.currentHp = Math.round(newConfig.bossMaxHp * ratio);
    }
    this.persist();
    return this.state.config;
  }

  public updateKga(kga: Partial<UnlockedKGA>): UnlockedKGA {
    this.state.boss.unlockedKga = {
      ...this.state.boss.unlockedKga,
      ...kga
    };
    this.persist();
    return this.state.boss.unlockedKga;
  }

  public resetRaid(options?: { hp?: number; bossName?: string; kgaTitle?: string }): RaidState {
    const maxHp = options?.hp || this.state.config.bossMaxHp || 3000;
    this.state = {
      ...getDefaultRaidState(),
      config: this.state.config,
      boss: {
        ...DEFAULT_BOSS,
        name: options?.bossName || DEFAULT_BOSS.name,
        maxHp: maxHp,
        currentHp: maxHp,
        shieldHp: 0,
        isDefeated: false,
        isEnraged: false,
        phase: 1,
        unlockedKga: {
          ...DEFAULT_BOSS.unlockedKga,
          title: options?.kgaTitle || this.state.config.kgaRewardTitle || DEFAULT_BOSS.unlockedKga.title,
          isRevealed: false
        }
      }
    };
    this.undoStack = [];
    this.persist();
    return this.state;
  }

  public addShield(amount: number = 100): BossState {
    this.saveSnapshot();
    const maxShield = this.state.boss.maxShieldHp || 2000;
    this.state.boss.shieldHp = Math.min(maxShield, Math.max(0, this.state.boss.shieldHp + amount));
    this.persist();
    return this.state.boss;
  }

  public toggleEnrage(forceActive?: boolean): BossState {
    this.saveSnapshot();
    const nextEnraged = forceActive !== undefined ? forceActive : !this.state.boss.isEnraged;
    this.state.boss.isEnraged = nextEnraged;
    if (nextEnraged) {
      this.state.boss.phase = 2;
    }
    this.persist();
    return this.state.boss;
  }

  private saveSnapshot(lastHit?: RaidHitEvent) {
    const snapshot: RaidStateSnapshot = {
      boss: JSON.parse(JSON.stringify(this.state.boss)),
      attackers: JSON.parse(JSON.stringify(this.state.attackers)),
      totalDamageDealt: this.state.totalDamageDealt,
      totalHits: this.state.totalHits,
      currentCombo: { ...this.state.currentCombo },
      lastHitEvent: lastHit
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 20) {
      this.undoStack.shift();
    }
  }

  public undoLastHit(): { success: boolean; undoneHit?: RaidHitEvent } {
    if (this.undoStack.length === 0) {
      return { success: false };
    }
    const snapshot = this.undoStack.pop()!;
    this.state.boss = snapshot.boss;
    this.state.attackers = snapshot.attackers;
    this.state.totalDamageDealt = snapshot.totalDamageDealt;
    this.state.totalHits = snapshot.totalHits;
    this.state.currentCombo = snapshot.currentCombo;
    
    if (this.state.recentHits.length > 0) {
      this.state.recentHits.shift();
    }

    this.recalculateLeaderboard();
    this.persist();
    return { success: true, undoneHit: snapshot.lastHitEvent };
  }

  public recordHit(params: {
    buyer: string;
    tier?: RaidTier | string;
    customDamage?: number;
    itemTitle?: string;
    price?: string;
  }): { event: RaidHitEvent; boss: BossState; isDefeated: boolean; isPhase2: boolean } {
    const cleanBuyer = (params.buyer || 'Hero').trim().replace(/^@/, '');
    if (!cleanBuyer) {
      throw new Error('Buyer username is required');
    }

    // Determine Tier & Base Damage
    let tier: RaidTier = 'RARE';
    if (params.tier) {
      const upper = params.tier.toUpperCase();
      if (upper === 'EPIC') tier = 'EPIC';
      else if (upper === 'LEGENDARY' || upper === 'GRAIL') tier = 'LEGENDARY';
      else if (upper === 'CUSTOM') tier = 'CUSTOM';
      else tier = 'RARE';
    }

    let baseDamage = 100;
    if (params.customDamage && params.customDamage > 0) {
      baseDamage = params.customDamage;
    } else if (tier === 'LEGENDARY') {
      baseDamage = this.state.config.legendaryDamage || 500;
    } else if (tier === 'EPIC') {
      baseDamage = this.state.config.epicDamage || 250;
    } else {
      baseDamage = this.state.config.rareDamage || 100;
    }

    // Combo system
    const now = Date.now();
    let comboCount = 1;
    let comboMultiplier = 1.0;

    if (this.state.currentCombo.expiresAt > now) {
      comboCount = this.state.currentCombo.count + 1;
    } else {
      comboCount = 1;
    }

    if (comboCount >= 10) {
      comboMultiplier = 1.3;
    } else if (comboCount >= 5) {
      comboMultiplier = 1.2;
    } else if (comboCount >= 3) {
      comboMultiplier = 1.1;
    } else {
      comboMultiplier = 1.0;
    }

    this.state.currentCombo = {
      count: comboCount,
      multiplier: comboMultiplier,
      lastBuyer: cleanBuyer,
      expiresAt: now + COMBO_EXPIRY_MS
    };

    const isCrit = tier === 'LEGENDARY' || comboMultiplier >= 1.3;
    const totalDamage = Math.round(baseDamage * comboMultiplier);

    // Save snapshot for undo BEFORE mutating HP
    this.saveSnapshot();

    const previousHp = this.state.boss.currentHp;
    const previousShield = this.state.boss.shieldHp;

    // Apply against shield first, then HP
    let shieldAbsorbed = 0;
    let hpDamage = totalDamage;

    if (this.state.boss.shieldHp > 0) {
      shieldAbsorbed = Math.min(this.state.boss.shieldHp, totalDamage);
      this.state.boss.shieldHp -= shieldAbsorbed;
      hpDamage = totalDamage - shieldAbsorbed;
    }

    const newHp = Math.max(0, this.state.boss.currentHp - hpDamage);
    this.state.boss.currentHp = newHp;

    const triggeredPhase2 =
      !this.state.boss.isEnraged &&
      this.state.boss.phase === 1 &&
      newHp > 0 &&
      newHp <= this.state.boss.maxHp * 0.5;

    if (triggeredPhase2) {
      this.state.boss.phase = 2;
      this.state.boss.isEnraged = true;
    }

    const triggeredDefeat = previousHp > 0 && newHp === 0;
    if (triggeredDefeat) {
      this.state.boss.isDefeated = true;
      this.state.boss.unlockedKga.isRevealed = true;
    }

    // Update attacker stats
    if (!this.state.attackers[cleanBuyer]) {
      this.state.attackers[cleanBuyer] = {
        username: cleanBuyer,
        totalDamage: 0,
        hitCount: 0,
        lastHitTimestamp: now,
        highestCrit: 0,
        rank: 1,
        percentage: 0
      };
    }

    const attacker = this.state.attackers[cleanBuyer];
    attacker.totalDamage += totalDamage;
    attacker.hitCount += 1;
    attacker.lastHitTimestamp = now;
    if (totalDamage > attacker.highestCrit) {
      attacker.highestCrit = totalDamage;
    }

    this.state.totalDamageDealt += totalDamage;
    this.state.totalHits += 1;

    const event: RaidHitEvent = {
      id: `${now}-${Math.random().toString(36).substring(2, 8)}`,
      buyer: cleanBuyer,
      tier,
      rawDamage: baseDamage,
      comboMultiplier,
      totalDamage,
      shieldAbsorbed,
      hpDamage,
      isCrit,
      comboCount,
      timestamp: now,
      itemTitle: params.itemTitle,
      price: params.price,
      previousHp,
      newHp,
      previousShield,
      newShield: this.state.boss.shieldHp,
      triggeredPhase2,
      triggeredDefeat
    };

    this.state.recentHits = [event, ...this.state.recentHits.slice(0, 24)];

    this.recalculateLeaderboard();
    this.persist();

    return {
      event,
      boss: this.state.boss,
      isDefeated: this.state.boss.isDefeated,
      isPhase2: this.state.boss.phase === 2
    };
  }

  private recalculateLeaderboard() {
    const attackersList = Object.values(this.state.attackers);
    attackersList.sort((a, b) => {
      if (b.totalDamage !== a.totalDamage) return b.totalDamage - a.totalDamage;
      return a.lastHitTimestamp - b.lastHitTimestamp;
    });

    const totalDmg = this.state.totalDamageDealt || 1;
    attackersList.forEach((att, idx) => {
      att.rank = idx + 1;
      att.percentage = Math.round((att.totalDamage / totalDmg) * 100);
      this.state.attackers[att.username] = att;
    });

    this.state.topAttackers = attackersList.slice(0, 10);
  }

  private persist() {
    saveRaidState(this.state);
  }
}
