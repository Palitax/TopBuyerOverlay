import { RaidState, RaidHitEvent, RaidTier, BossState } from '../types';

export const DEFAULT_DEMO_BOSS: BossState = {
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

export const getInitialDemoState = (): RaidState => ({
  boss: { ...DEFAULT_DEMO_BOSS, unlockedKga: { ...DEFAULT_DEMO_BOSS.unlockedKga } },
  attackers: {
    ShadowSlayer: {
      username: 'ShadowSlayer',
      totalDamage: 450,
      hitCount: 3,
      lastHitTimestamp: Date.now() - 120000,
      highestCrit: 250,
      rank: 1,
      percentage: 53
    },
    FireMage99: {
      username: 'FireMage99',
      totalDamage: 250,
      hitCount: 1,
      lastHitTimestamp: Date.now() - 80000,
      highestCrit: 250,
      rank: 2,
      percentage: 29
    },
    CardCollector: {
      username: 'CardCollector',
      totalDamage: 150,
      hitCount: 1,
      lastHitTimestamp: Date.now() - 30000,
      highestCrit: 150,
      rank: 3,
      percentage: 18
    }
  },
  topAttackers: [
    {
      username: 'ShadowSlayer',
      totalDamage: 450,
      hitCount: 3,
      lastHitTimestamp: Date.now() - 120000,
      highestCrit: 250,
      rank: 1,
      percentage: 53
    },
    {
      username: 'FireMage99',
      totalDamage: 250,
      hitCount: 1,
      lastHitTimestamp: Date.now() - 80000,
      highestCrit: 250,
      rank: 2,
      percentage: 29
    },
    {
      username: 'CardCollector',
      totalDamage: 150,
      hitCount: 1,
      lastHitTimestamp: Date.now() - 30000,
      highestCrit: 150,
      rank: 3,
      percentage: 18
    }
  ],
  recentHits: [],
  config: {
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
  },
  totalDamageDealt: 850,
  totalHits: 5,
  currentCombo: {
    count: 0,
    multiplier: 1.0,
    lastBuyer: '',
    expiresAt: 0
  },
  sessionStartTime: Date.now()
});

export function simulateClientHit(
  currentState: RaidState,
  params: {
    buyer: string;
    tier?: RaidTier | string;
    customDamage?: number;
    itemTitle?: string;
    price?: string;
  }
): { event: RaidHitEvent; nextState: RaidState; isDefeated: boolean; isPhase2: boolean } {
  const cleanBuyer = (params.buyer || 'Hero').trim().replace(/^@/, '');
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
    baseDamage = currentState.config.legendaryDamage || 500;
  } else if (tier === 'EPIC') {
    baseDamage = currentState.config.epicDamage || 250;
  } else {
    baseDamage = currentState.config.rareDamage || 100;
  }

  const now = Date.now();
  let comboCount = 1;
  let comboMultiplier = 1.0;

  if (currentState.currentCombo.expiresAt > now) {
    comboCount = currentState.currentCombo.count + 1;
  } else {
    comboCount = 1;
  }

  if (comboCount >= 10) comboMultiplier = 1.3;
  else if (comboCount >= 5) comboMultiplier = 1.2;
  else if (comboCount >= 3) comboMultiplier = 1.1;
  else comboMultiplier = 1.0;

  const totalDamage = Math.round(baseDamage * comboMultiplier);
  const isCrit = tier === 'LEGENDARY' || comboMultiplier >= 1.3;

  const previousHp = currentState.boss.currentHp;
  const previousShield = currentState.boss.shieldHp;

  let shieldAbsorbed = 0;
  let hpDamage = totalDamage;
  let newShield = previousShield;

  if (previousShield > 0) {
    shieldAbsorbed = Math.min(previousShield, totalDamage);
    newShield = previousShield - shieldAbsorbed;
    hpDamage = totalDamage - shieldAbsorbed;
  }

  const newHp = Math.max(0, previousHp - hpDamage);
  const isDefeated = newHp === 0;

  const triggeredPhase2 =
    !currentState.boss.isEnraged &&
    currentState.boss.phase === 1 &&
    newHp > 0 &&
    newHp <= currentState.boss.maxHp * 0.5;

  const newPhase: 1 | 2 = triggeredPhase2 || currentState.boss.phase === 2 ? 2 : 1;
  const isEnraged = triggeredPhase2 || currentState.boss.isEnraged;

  const updatedBoss: BossState = {
    ...currentState.boss,
    currentHp: newHp,
    shieldHp: newShield,
    isDefeated,
    phase: newPhase,
    isEnraged,
    unlockedKga: {
      ...currentState.boss.unlockedKga,
      isRevealed: isDefeated ? true : currentState.boss.unlockedKga.isRevealed
    }
  };

  const updatedAttackers = { ...currentState.attackers };
  if (!updatedAttackers[cleanBuyer]) {
    updatedAttackers[cleanBuyer] = {
      username: cleanBuyer,
      totalDamage: 0,
      hitCount: 0,
      lastHitTimestamp: now,
      highestCrit: 0,
      rank: 1,
      percentage: 0
    };
  }

  const attacker = { ...updatedAttackers[cleanBuyer] };
  attacker.totalDamage += totalDamage;
  attacker.hitCount += 1;
  attacker.lastHitTimestamp = now;
  if (totalDamage > attacker.highestCrit) attacker.highestCrit = totalDamage;
  updatedAttackers[cleanBuyer] = attacker;

  const totalDmgDealt = currentState.totalDamageDealt + totalDamage;
  const totalHitsCount = currentState.totalHits + 1;

  const attackersList = Object.values(updatedAttackers);
  attackersList.sort((a, b) => {
    if (b.totalDamage !== a.totalDamage) return b.totalDamage - a.totalDamage;
    return a.lastHitTimestamp - b.lastHitTimestamp;
  });

  attackersList.forEach((att, idx) => {
    att.rank = idx + 1;
    att.percentage = Math.round((att.totalDamage / (totalDmgDealt || 1)) * 100);
    updatedAttackers[att.username] = att;
  });

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
    newShield,
    triggeredPhase2,
    triggeredDefeat: isDefeated
  };

  const nextState: RaidState = {
    ...currentState,
    boss: updatedBoss,
    attackers: updatedAttackers,
    topAttackers: attackersList.slice(0, 10),
    recentHits: [event, ...currentState.recentHits.slice(0, 24)],
    totalDamageDealt: totalDmgDealt,
    totalHits: totalHitsCount,
    currentCombo: {
      count: comboCount,
      multiplier: comboMultiplier,
      lastBuyer: cleanBuyer,
      expiresAt: now + 45000
    }
  };

  return {
    event,
    nextState,
    isDefeated,
    isPhase2: newPhase === 2
  };
}
