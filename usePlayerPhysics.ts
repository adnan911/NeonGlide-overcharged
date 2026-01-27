
import { useRef, useCallback } from 'react';
import { PHYSICS } from './constants';
import { Point, ActivePowerUp, PowerUpType } from './types';

export interface PlayerPhysicsState {
  pos: Point;
  vel: Point;
  rotation: number;
  isGrounded: boolean;
  width: number;
  height: number;
  jumpsRemaining: number;
  activePowerUps: ActivePowerUp[];
}

/**
 * usePlayerPhysics
 * Encapsulates all player-specific physical logic. 
 * Provides a clean API for state updates and collision resolution.
 */
export const usePlayerPhysics = () => {
  const playerRef = useRef<PlayerPhysicsState>({
    pos: { x: 100, y: 300 },
    vel: { x: PHYSICS.BASE_SPEED, y: 0 },
    rotation: 0,
    isGrounded: false,
    width: PHYSICS.PLAYER_SIZE,
    height: PHYSICS.PLAYER_SIZE,
    jumpsRemaining: PHYSICS.MAX_JUMPS,
    activePowerUps: []
  });

  const reset = useCallback((initialX: number = 100, initialY: number = 300) => {
    playerRef.current = {
      pos: { x: initialX, y: initialY },
      vel: { x: PHYSICS.BASE_SPEED, y: 0 },
      rotation: 0,
      isGrounded: false,
      width: PHYSICS.PLAYER_SIZE,
      height: PHYSICS.PLAYER_SIZE,
      jumpsRemaining: PHYSICS.MAX_JUMPS,
      activePowerUps: []
    };
  }, []);

  const jump = useCallback(() => {
    const p = playerRef.current;
    if (p.jumpsRemaining > 0) {
      const isInitialJump = p.jumpsRemaining === PHYSICS.MAX_JUMPS;
      p.vel.y = isInitialJump ? PHYSICS.JUMP_FORCE : PHYSICS.DOUBLE_JUMP_FORCE;
      p.jumpsRemaining -= 1;
      p.isGrounded = false;
      return { success: true, isInitialJump };
    }
    return { success: false, isInitialJump: false };
  }, []);

  const update = useCallback((dt: number, targetSpeed: number, groundY: number) => {
    const p = playerRef.current;
    
    // 1. Expire Power-ups
    const now = Date.now();
    p.activePowerUps = p.activePowerUps.filter(pu => pu.endTime > now);

    // 2. Apply Physics Modifiers
    const isSlowMo = p.activePowerUps.some(pu => pu.type === 'SLOW_MO');
    const effectiveSpeed = isSlowMo ? targetSpeed * PHYSICS.SLOW_MO_FACTOR : targetSpeed;

    // 3. Update Vectors
    p.vel.x = effectiveSpeed;
    p.pos.x += p.vel.x * dt;
    
    p.vel.y += PHYSICS.GRAVITY * dt;
    p.pos.y += p.vel.y * dt;

    // 4. Ground Constraint
    if (p.pos.y + p.height > groundY) {
      p.pos.y = groundY - p.height;
      p.vel.y = 0;
      p.isGrounded = true;
      p.jumpsRemaining = PHYSICS.MAX_JUMPS;
      // Procedural alignment on landing
      p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
    } else {
      p.isGrounded = false;
      // Air rotation scales with horizontal velocity
      const rotFactor = effectiveSpeed / PHYSICS.BASE_SPEED;
      p.rotation += PHYSICS.ROTATION_SPEED * rotFactor * dt;
    }
  }, []);

  const landOnPlatform = useCallback((platformY: number) => {
    const p = playerRef.current;
    if (p.vel.y >= 0) {
      p.pos.y = platformY - p.height;
      p.vel.y = 0;
      p.isGrounded = true;
      p.jumpsRemaining = PHYSICS.MAX_JUMPS;
      p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
    }
  }, []);

  const addPowerUp = useCallback((type: PowerUpType) => {
    const p = playerRef.current;
    const existing = p.activePowerUps.find(pu => pu.type === type);
    if (existing) {
      existing.endTime = Date.now() + PHYSICS.POWER_UP_DURATION;
    } else {
      p.activePowerUps.push({
        type,
        endTime: Date.now() + PHYSICS.POWER_UP_DURATION
      });
    }
  }, []);

  const removePowerUp = useCallback((type: PowerUpType) => {
    const p = playerRef.current;
    p.activePowerUps = p.activePowerUps.filter(pu => pu.type !== type);
  }, []);

  return {
    playerRef,
    reset,
    jump,
    update,
    landOnPlatform,
    addPowerUp,
    removePowerUp
  };
};
