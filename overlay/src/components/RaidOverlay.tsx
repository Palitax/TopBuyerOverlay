import React from 'react';
import { RaidState, RaidHitEvent } from '../types';
import { BossFrame } from './BossFrame';
import { BossHealthbar } from './BossHealthbar';
import { FloatingCombatText } from './FloatingCombatText';
import { TopAttackers } from './TopAttackers';
import { ChestRewardModal } from './ChestRewardModal';

interface RaidOverlayProps {
  state: RaidState | null;
  latestHit: RaidHitEvent | null;
}

export const RaidOverlay: React.FC<RaidOverlayProps> = ({ state, latestHit }) => {
  if (!state || !state.boss) return null;

  const { boss, topAttackers, totalDamageDealt } = state;

  return (
    <div className="relative w-full max-w-2xl flex flex-col items-center gap-3 p-3 bg-transparent select-none">
      {/* Floating Combat Text Layer */}
      <FloatingCombatText latestHit={latestHit} />

      {/* Main Boss Frame */}
      <BossFrame boss={boss} latestHit={latestHit} />

      {/* Segmented Healthbar & Damage Trail + Shield */}
      <BossHealthbar
        currentHp={boss.currentHp}
        maxHp={boss.maxHp}
        shieldHp={boss.shieldHp}
        maxShieldHp={boss.maxShieldHp}
        isEnraged={boss.isEnraged}
        phase={boss.phase}
      />

      {/* Top Attackers Podium */}
      <TopAttackers attackers={topAttackers} totalDamage={totalDamageDealt} />

      {/* Raid Cleared & KGA Chest Unlock Modal */}
      <ChestRewardModal
        isDefeated={boss.isDefeated}
        kga={boss.unlockedKga}
        topAttackers={topAttackers}
      />
    </div>
  );
};
