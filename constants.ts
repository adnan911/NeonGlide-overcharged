
import { PlayerSkin, Entity } from './types';

export const COLORS = {
  bg: '#020617', 
  player: '#00f2ff', 
  spike: '#ff0055', 
  block: '#1e293b', 
  movingBlock: '#334155', 
  destructibleBlock: '#475569', 
  pad: '#facc15', 
  accent: '#7c3aed', 
  energy: 'rgba(0, 242, 255, 0.15)',
  core: '#00f2ff',
  magnet: '#38bdf8',
  shield: '#facc15',
  slowMo: '#db2777',
};

export const PHYSICS = {
  GRAVITY: 0.85,
  JUMP_FORCE: -13,
  DOUBLE_JUMP_FORCE: -11,
  MAX_JUMPS: 3, 
  ROTATION_SPEED: 0.1,
  PLAYER_SIZE: 40,
  BASE_SPEED: 8,
  MAX_SPEED: 25,
  SPEED_INCREMENT: 0.003,
  MAGNET_RADIUS: 300,
  MAGNET_STRENGTH: 12,
  SLOW_MO_FACTOR: 0.5,
  POWER_UP_DURATION: 8000, // 8 seconds
};

export const STORAGE_KEYS = {
  SETTINGS: 'neon_glide_overcharged_settings',
  HIGH_SCORES: 'neon_glide_overcharged_high_scores',
};

export const SKINS: PlayerSkin[] = [
  { id: 'classic', name: 'Classic Cyan', primaryColor: '#00f2ff', glowColor: '#00f2ff', innerColor: '#ffffff', cost: 0 },
  { id: 'voltage', name: 'Voltage Rose', primaryColor: '#ff0055', glowColor: '#ff0055', innerColor: '#ffffff', cost: 100 },
  { id: 'plasma', name: 'Plasma Purple', primaryColor: '#7c3aed', glowColor: '#a855f7', innerColor: '#ffffff', cost: 150 },
  { id: 'spark', name: 'Spark Yellow', primaryColor: '#facc15', glowColor: '#fbbf24', innerColor: '#ffffff', cost: 200 },
  { id: 'toxic', name: 'Toxic Waste', primaryColor: '#22c55e', glowColor: '#4ade80', innerColor: '#ffffff', cost: 250 },
  { id: 'frost', name: 'Frostbite', primaryColor: '#38bdf8', glowColor: '#7dd3fc', innerColor: '#ffffff', cost: 300 },
  { id: 'molten', name: 'Molten Core', primaryColor: '#f97316', glowColor: '#fb923c', innerColor: '#ffffff', cost: 350 },
  { id: 'void', name: 'Void Walker', primaryColor: '#475569', glowColor: '#94a3b8', innerColor: '#ffffff', cost: 400 },
  { id: 'gold', name: 'Golden Surge', primaryColor: '#eab308', glowColor: '#fde047', innerColor: '#ffffff', cost: 500 },
  { id: 'emerald', name: 'Emerald Flash', primaryColor: '#059669', glowColor: '#34d399', innerColor: '#ffffff', cost: 600 },
  { id: 'nebula', name: 'Nebula Pink', primaryColor: '#db2777', glowColor: '#f472b6', innerColor: '#ffffff', cost: 700 },
  { id: 'crimson', name: 'Crimson Bolt', primaryColor: '#dc2626', glowColor: '#f87171', innerColor: '#ffffff', cost: 800 },
  { id: 'stellar', name: 'Stellar White', primaryColor: '#f8fafc', glowColor: '#ffffff', innerColor: '#e2e8f0', cost: 900 },
  { id: 'abyss', name: 'Abyss Teal', primaryColor: '#0d9488', glowColor: '#2dd4bf', innerColor: '#ffffff', cost: 1000 },
  { id: 'acid', name: 'Acid Rain', primaryColor: '#84cc16', glowColor: '#bef264', innerColor: '#ffffff', cost: 1100 },
  { id: 'royal', name: 'Royal Electric', primaryColor: '#4f46e5', glowColor: '#818cf8', innerColor: '#ffffff', cost: 1200 },
  { id: 'sunset', name: 'Sunset Aura', primaryColor: '#ec4899', glowColor: '#f472b6', innerColor: '#fde68a', cost: 1300 },
  { id: 'midnight', name: 'Midnight', primaryColor: '#1e1b4b', glowColor: '#3730a3', innerColor: '#ffffff', cost: 1500 },
  { id: 'stealth', name: 'Shadow Ops', primaryColor: '#0f172a', glowColor: '#1e293b', innerColor: '#00f2ff', cost: 2000 },
  { id: 'prism', name: 'Prism Overload', primaryColor: '#ffffff', glowColor: '#00f2ff', innerColor: '#ff0055', cost: 5000 },
];

export const generateLevel = (length: number = 500000) => {
  const obstacles: Entity[] = [];
  let currentX = 1500;
  let entityId = 0;
  
  while (currentX < length) {
    const difficultyFactor = Math.min(currentX / 100000, 1.0); 
    const spacing = 200 + (1 - difficultyFactor) * 300 + Math.random() * 200;
    
    // Core distribution (Collectables)
    if (Math.random() < 0.4) {
      const count = Math.floor(Math.random() * 3) + 1;
      for(let i = 0; i < count; i++) {
        obstacles.push({
          id: `core-${entityId++}`,
          type: 'COLLECTABLE',
          pos: { x: currentX - (spacing * 0.4) + (i * 60), y: 60 + Math.random() * 120 },
          size: { width: 24, height: 24 },
          color: COLORS.core
        });
      }
    }

    // Power Ups distribution
    if (Math.random() < 0.05) {
      const types: ('MAGNET' | 'SHIELD' | 'SLOW_MO')[] = ['MAGNET', 'SHIELD', 'SLOW_MO'];
      const type = types[Math.floor(Math.random() * types.length)];
      obstacles.push({
        id: `powerup-${entityId++}`,
        type,
        pos: { x: currentX + spacing / 2, y: 120 + Math.random() * 100 },
        size: { width: 36, height: 36 },
        color: type === 'MAGNET' ? COLORS.magnet : type === 'SHIELD' ? COLORS.shield : COLORS.slowMo
      });
    }

    const typeRoll = Math.random();

    if (typeRoll < 0.2) { // Cluster of Spikes
      const count = difficultyFactor > 0.6 ? 3 : (difficultyFactor > 0.3 ? 2 : 1);
      for (let i = 0; i < count; i++) {
        obstacles.push({
          id: `spike-${entityId++}`,
          type: 'SPIKE',
          pos: { x: currentX + (i * 40), y: 0 },
          size: { width: 40, height: 40 },
          color: COLORS.spike
        });
      }
      currentX += count * 40;
    } 
    else if (typeRoll < 0.4) { // Plasma Gate
      const gapY = 60 + Math.random() * 70; 
      const gapHeight = 140 + (1 - difficultyFactor) * 60;
      
      obstacles.push({
        id: `gate-top-${entityId++}`,
        type: 'BLOCK',
        pos: { x: currentX, y: gapY + gapHeight },
        size: { width: 60, height: 400 },
        color: COLORS.block
      });
      obstacles.push({
        id: `gate-bot-${entityId++}`,
        type: 'BLOCK',
        pos: { x: currentX, y: 0 },
        size: { width: 60, height: gapY },
        color: COLORS.block
      });
      currentX += 60;
    }
    else if (typeRoll < 0.6) { // Moving Platform Sequence
      const platformWidth = 120 + Math.random() * 100;
      const height = 80 + Math.random() * 90; 
      obstacles.push({
        id: `moving-${entityId++}`,
        type: 'MOVING_BLOCK',
        pos: { x: currentX, y: height },
        initialY: height,
        size: { width: platformWidth, height: 40 },
        color: COLORS.movingBlock,
        movementRange: 40 + difficultyFactor * 60,
        movementSpeed: 0.002 + difficultyFactor * 0.002
      });
      
      if (difficultyFactor > 0.5 && Math.random() > 0.5) {
        obstacles.push({
          id: `moving-spike-${entityId++}`,
          type: 'SPIKE',
          pos: { x: currentX + (platformWidth / 2) - 20, y: height + 40 }, 
          size: { width: 40, height: 40 },
          color: COLORS.spike
        });
      }
      currentX += platformWidth;
    }
    else if (typeRoll < 0.8) { // Destructible Bridge
      const bridgeLen = Math.floor(Math.random() * 3) + 2;
      const height = 100 + Math.random() * 40;
      for (let i = 0; i < bridgeLen; i++) {
        obstacles.push({
          id: `bridge-${entityId++}`,
          type: 'DESTRUCTIBLE_BLOCK',
          pos: { x: currentX + (i * 100), y: height },
          size: { width: 95, height: 40 },
          color: COLORS.destructibleBlock,
          isDestroyed: false
        });
      }
      currentX += bridgeLen * 100;
    }
    else { // Aerial Spikes
      const droneY = 140 + Math.random() * 140;
      obstacles.push({
        id: `drone-${entityId++}`,
        type: 'SPIKE',
        pos: { x: currentX, y: droneY },
        size: { width: 40, height: 40 },
        color: COLORS.spike
      });
      if (difficultyFactor > 0.7) {
         obstacles.push({
          id: `drone-2-${entityId++}`,
          type: 'SPIKE',
          pos: { x: currentX + 80, y: droneY - 60 },
          size: { width: 40, height: 40 },
          color: COLORS.spike
        });
      }
      currentX += 120;
    }

    currentX += spacing;
  }
  return obstacles;
};
