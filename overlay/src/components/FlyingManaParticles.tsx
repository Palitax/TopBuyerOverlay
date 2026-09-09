import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FlyingParticleGroup {
  id: string;
  startX: number;
  startY: number;
  targetX: number | null; // null means despawn in air
  targetY: number | null;
  targetWidth?: number;
  count: number;
  isUserPresent: boolean;
  username?: string;
}

interface FlyingManaParticlesProps {
  groups: FlyingParticleGroup[];
  onComplete: (id: string, isUserPresent: boolean, username?: string) => void;
}

export const FlyingManaParticles: React.FC<FlyingManaParticlesProps> = ({ groups, onComplete }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {groups.map((group) => (
          <ParticleStream
            key={group.id}
            group={group}
            onDone={() => onComplete(group.id, group.isUserPresent, group.username)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ParticleStream: React.FC<{ group: FlyingParticleGroup; onDone: () => void }> = ({
  group,
  onDone
}) => {
  const [particles] = useState(() => {
    return Array.from({ length: group.count }).map((_, i) => ({
      id: i,
      delay: i * 0.032, // Staggered stream
      arcOffsetX: (Math.random() - 0.5) * 45,
      arcOffsetY: (Math.random() - 0.5) * 30 - 15,
      // Distribute particles across the length of the target Mana-Bar
      targetDistributeOffset: (Math.random() - 0.5) * ((group.targetWidth || 220) * 0.7),
      size: Math.random() * 3.5 + 4,
      despawnAngle: (i / group.count) * Math.PI * 2,
      despawnDist: Math.random() * 55 + 30
    }));
  });

  useEffect(() => {
    // Ensure all particles finish their flight + splash before cleaning up
    const maxDelay = group.count * 0.032;
    const flightDuration = 0.75;
    const totalMs = (maxDelay + flightDuration + 0.15) * 1000;

    const timer = setTimeout(() => {
      onDone();
    }, totalMs);

    return () => clearTimeout(timer);
  }, [group.count, onDone]);

  return (
    <>
      {particles.map((p) => {
        if (group.isUserPresent && group.targetX !== null && group.targetY !== null) {
          // Travel directly into the user's Mana-Bar and disappear into the blue fluid
          const endX = group.targetX + p.targetDistributeOffset;
          const endY = group.targetY;
          const midX = (group.startX + endX) / 2 + p.arcOffsetX;
          const midY = (group.startY + endY) / 2 + p.arcOffsetY;

          return (
            <motion.div
              key={p.id}
              initial={{
                x: group.startX,
                y: group.startY,
                scale: 0.3,
                opacity: 0
              }}
              animate={{
                x: [group.startX, midX, endX],
                y: [group.startY, midY, endY],
                scale: [0.3, 1.4, 0.2],
                opacity: [0, 1, 0.95, 0] // Stays radiant until it plunges into the bar
              }}
              transition={{
                duration: 0.75,
                delay: p.delay,
                ease: [0.25, 1, 0.35, 1] // Suction curve into bar
              }}
              style={{
                width: p.size,
                height: p.size
              }}
              className="absolute rounded-full bg-cyan-200 shadow-[0_0_12px_#38bdf8,0_0_24px_#2563eb,0_0_35px_#1d4ed8]"
            >
              {/* Inner white-hot core */}
              <div className="absolute inset-0 rounded-full bg-white blur-[0.5px]" />
            </motion.div>
          );
        } else {
          // Despawn gently into mist when user is not on leaderboard
          const despawnX = group.startX + Math.cos(p.despawnAngle) * p.despawnDist;
          const despawnY = group.startY + Math.sin(p.despawnAngle) * p.despawnDist - 25;

          return (
            <motion.div
              key={p.id}
              initial={{
                x: group.startX,
                y: group.startY,
                scale: 0.4,
                opacity: 0
              }}
              animate={{
                x: despawnX,
                y: despawnY,
                scale: [0.4, 1.2, 0],
                opacity: [0, 0.85, 0]
              }}
              transition={{
                duration: 0.85,
                delay: p.delay,
                ease: 'easeOut'
              }}
              style={{
                width: p.size * 0.9,
                height: p.size * 0.9
              }}
              className="absolute rounded-full bg-sky-300 shadow-[0_0_10px_#38bdf8]"
            />
          );
        }
      })}
    </>
  );
};
