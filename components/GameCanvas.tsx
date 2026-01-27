
import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, GameSettings, Entity, Point, PowerUpType, ActivePowerUp } from '../types';
import { COLORS, PHYSICS, generateLevel, SKINS } from '../constants';
import { audioService } from '../services/audioService';
import { usePlayerPhysics } from '../usePlayerPhysics';

interface GameCanvasProps {
  gameState: GameState;
  settings: GameSettings;
  onGameOver: (score: number, cores: number) => void;
  onScoreUpdate: (score: number) => void;
  onCoreCollect: (count: number) => void;
  onPowerUpsUpdate?: (powerUps: ActivePowerUp[]) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  type?: 'spark' | 'sparkle' | 'shockwave' | 'debris' | 'electric' | 'trail' | 'powerup' | 'magnet-trail';
  radius?: number;
}

const VIEW_SCALE = 0.65;
const PLAYER_LEFT_OFFSET = 80;

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  settings,
  onGameOver,
  onScoreUpdate,
  onCoreCollect,
  onPowerUpsUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number | null>(null);
  const flashOpacityRef = useRef(0);
  const gameStateRef = useRef(gameState);
  const deathTimeRef = useRef<number | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<Point[]>([]);
  const collectedInRunRef = useRef(0);

  const {
    playerRef,
    reset: resetPlayer,
    jump: performJump,
    update: updatePhysics,
    landOnPlatform,
    addPowerUp,
    removePowerUp
  } = usePlayerPhysics();

  const selectedSkin = SKINS.find(s => s.id === settings.selectedSkinId) || SKINS[0];

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const levelRef = useRef<Entity[]>([]);
  const scoreRef = useRef(0);
  const worldXRef = useRef(0);
  const lastSpeedTierRef = useRef(1);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      levelRef.current = generateLevel(500000);
      resetPlayer(100, 300);
      scoreRef.current = 0;
      worldXRef.current = 0;
      lastTimeRef.current = null;
      lastSpeedTierRef.current = 1;
      flashOpacityRef.current = 0;
      deathTimeRef.current = null;
      particlesRef.current = [];
      trailRef.current = [];
      collectedInRunRef.current = 0;
      onScoreUpdate(0);
      onCoreCollect(0);
      audioService.init();
      audioService.setEnabled(settings.soundEnabled);
    }
  }, [gameState, settings.soundEnabled, onScoreUpdate, onCoreCollect, resetPlayer]);

  const createParticlesAtPlayer = useCallback((isInitialJump: boolean) => {
    const p = playerRef.current;
    if (isInitialJump) {
      for (let i = 0; i < 8; i++) {
        particlesRef.current.push({
          x: p.pos.x + p.width / 2,
          y: p.pos.y + p.height / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 0.8,
          color: selectedSkin.glowColor
        });
      }
    } else {
      for (let i = 0; i < 15; i++) {
        particlesRef.current.push({
          x: p.pos.x + p.width / 2,
          y: p.pos.y + p.height / 2,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          life: 0.7,
          color: '#ffffff',
          type: 'sparkle'
        });
      }
      particlesRef.current.push({
        x: p.pos.x + p.width / 2,
        y: p.pos.y + p.height / 2,
        vx: 0,
        vy: 0,
        life: 0.5,
        color: selectedSkin.glowColor,
        type: 'shockwave',
        radius: 100
      });
    }
  }, [selectedSkin, playerRef]);

  const createCollectBurst = useCallback((x: number, y: number, color: string) => {
    const tier = lastSpeedTierRef.current;
    const count = 10 + tier * 5;
    const spread = 5 + tier * 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random()) * spread;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        color: Math.random() > 0.4 ? color : '#ffffff',
        type: 'electric'
      });
    }
  }, []);

  const drawElectricArc = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, intensity: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = (0.5 + Math.random() * 2) * intensity;
    ctx.globalAlpha = 0.3 + Math.random() * 0.7;
    ctx.moveTo(x1, y1);

    const segments = 4;
    for (let i = 1; i <= segments; i++) {
      const tx = x1 + (x2 - x1) * (i / segments);
      const ty = y1 + (y2 - y1) * (i / segments);
      const jitter = (Math.random() - 0.5) * 15 * intensity;
      ctx.lineTo(tx + jitter, ty + jitter);
    }
    ctx.stroke();
    ctx.restore();
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const tier = lastSpeedTierRef.current;
    const intensity = Math.min((tier - 1) / 8, 1.0);
    const time = Date.now();
    const pulse = Math.sin(time / 200) * 0.5 + 0.5;
    const groundY = canvas.height * 0.75;

    const p = playerRef.current;
    const isSlowMo = p.activePowerUps.some(pu => pu.type === 'SLOW_MO');
    const hasShield = p.activePowerUps.some(pu => pu.type === 'SHIELD');
    const hasMagnet = p.activePowerUps.some(pu => pu.type === 'MAGNET');

    ctx.save();

    if (deathTimeRef.current) {
      const elapsed = time - deathTimeRef.current;
      const shake = Math.max(0, 25 * (1 - elapsed / 500) * (1 + intensity));
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isSlowMo) {
      const slowGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width);
      slowGrad.addColorStop(0, 'rgba(124, 58, 237, 0)');
      slowGrad.addColorStop(1, 'rgba(124, 58, 237, 0.25)');
      ctx.fillStyle = slowGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.scale(VIEW_SCALE, VIEW_SCALE);
    const verticalOffset = (canvas.height * (1 - VIEW_SCALE)) / 2;
    ctx.translate(0, verticalOffset / VIEW_SCALE);

    // Grid System
    ctx.strokeStyle = intensity > 0.6 ? `rgba(0, 242, 255, ${0.05 + intensity * 0.1})` : '#0f172a';
    ctx.lineWidth = 1;
    const gridSize = 100;
    const gridXOffset = (worldXRef.current * 0.8) % gridSize;
    for (let x = -gridXOffset; x < canvas.width / VIEW_SCALE; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height / VIEW_SCALE); ctx.stroke();
    }

    // Ground
    ctx.strokeStyle = intensity > 0.5 ? selectedSkin.glowColor : '#1e293b';
    ctx.lineWidth = 6 + intensity * 12;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(canvas.width / VIEW_SCALE, groundY); ctx.stroke();

    ctx.save();
    ctx.translate(-worldXRef.current, 0);

    // Dynamic Trail
    if (trailRef.current.length > 1) {
      const trailCount = trailRef.current.length;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Pass 1: Heat Glow (Larger, more transparent)
      for (let i = 0; i < trailCount - 1; i++) {
        const pt = trailRef.current[i];
        const nextPt = trailRef.current[i + 1];
        const ratio = i / trailCount;

        ctx.beginPath();
        ctx.strokeStyle = selectedSkin.glowColor;
        ctx.globalAlpha = (0.15 + intensity * 0.2) * ratio;
        ctx.lineWidth = (p.width * 0.9 * ratio) + (intensity * 35);
        ctx.moveTo(pt.x + p.width / 2, pt.y + p.height / 2);
        ctx.lineTo(nextPt.x + p.width / 2, nextPt.y + p.height / 2);
        ctx.stroke();
      }

      // Pass 2: High-Energy Core (Narrower, brighter)
      for (let i = 0; i < trailCount - 1; i++) {
        const pt = trailRef.current[i];
        const nextPt = trailRef.current[i + 1];
        const ratio = i / trailCount;

        ctx.beginPath();
        // At high intensity, the core starts to turn white
        ctx.strokeStyle = (intensity > 0.75 && Math.random() > 0.6) ? '#ffffff' : selectedSkin.glowColor;
        ctx.globalAlpha = (0.5 + intensity * 0.4) * ratio;
        ctx.lineWidth = (p.width * 0.6 * ratio) + (intensity * 15);

        if (intensity > 0.5) {
          ctx.shadowBlur = 8 + intensity * 12;
          ctx.shadowColor = selectedSkin.glowColor;
        }

        ctx.moveTo(pt.x + p.width / 2, pt.y + p.height / 2);
        ctx.lineTo(nextPt.x + p.width / 2, nextPt.y + p.height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      ctx.globalAlpha = 1.0;
    }

    // Obstacles
    for (const obj of levelRef.current) {
      const visibleRange = canvas.width / VIEW_SCALE + 600;
      if (obj.pos.x < worldXRef.current - 200 || obj.pos.x > worldXRef.current + visibleRange) continue;
      const objY = groundY - (obj.pos.y + obj.size.height);

      ctx.save();

      if (obj.type === 'SPIKE') {
        ctx.fillStyle = obj.color;
        ctx.shadowBlur = 10 + (intensity * 20);
        ctx.shadowColor = obj.color;
        ctx.beginPath();
        ctx.moveTo(obj.pos.x, objY + obj.size.height);
        ctx.lineTo(obj.pos.x + obj.size.width / 2, objY);
        ctx.lineTo(obj.pos.x + obj.size.width, objY + obj.size.height);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.3 + pulse * 0.4;
        ctx.beginPath();
        ctx.arc(obj.pos.x + obj.size.width / 2, objY, 4 + intensity * 6, 0, Math.PI * 2);
        ctx.fill();
        if (Math.random() > 0.95 - (intensity * 0.1)) {
          drawElectricArc(ctx, obj.pos.x + obj.size.width / 2, objY, obj.pos.x + (Math.random() - 0.5) * 40, objY + 30, 'white', 1 + intensity);
        }
      } else if (['BLOCK', 'MOVING_BLOCK', 'DESTRUCTIBLE_BLOCK'].includes(obj.type)) {
        ctx.fillStyle = obj.color;
        ctx.shadowBlur = intensity > 0.4 ? 15 : 0;
        ctx.shadowColor = obj.color;
        ctx.fillRect(obj.pos.x, objY, obj.size.width, obj.size.height);
        ctx.strokeStyle = 'white';
        ctx.globalAlpha = 0.1 + intensity * 0.3;
        ctx.lineWidth = 1;
        ctx.strokeRect(obj.pos.x + 5, objY + 5, obj.size.width - 10, obj.size.height - 10);
        const scanPos = (time % 2000) / 2000;
        ctx.fillStyle = intensity > 0.5 ? 'white' : selectedSkin.glowColor;
        ctx.globalAlpha = 0.2 + intensity * 0.4;
        ctx.fillRect(obj.pos.x, objY + (obj.size.height * scanPos), obj.size.width, 2);
        if (obj.type === 'DESTRUCTIBLE_BLOCK') {
          ctx.fillStyle = '#ff0055';
          ctx.globalAlpha = 0.2 + pulse * 0.3;
          ctx.fillRect(obj.pos.x + 10, objY + 10, obj.size.width - 20, obj.size.height - 20);
        }
        if (intensity > 0.6 && Math.random() > 0.98) {
          drawElectricArc(ctx, obj.pos.x, objY, obj.pos.x + 10, objY + 10, 'white', 1.5);
        }
      } else if (obj.type === 'COLLECTABLE') {
        ctx.save();
        ctx.translate(obj.pos.x + obj.size.width / 2, objY + obj.size.height / 2);
        ctx.rotate(time / 600);
        ctx.shadowBlur = 10 + pulse * 10;
        ctx.shadowColor = COLORS.core;
        ctx.fillStyle = COLORS.core;
        ctx.fillRect(-obj.size.width / 2, -obj.size.height / 2, obj.size.width, obj.size.height);
        ctx.restore();
      } else if (['MAGNET', 'SHIELD', 'SLOW_MO'].includes(obj.type)) {
        ctx.save();
        ctx.translate(obj.pos.x + obj.size.width / 2, objY + obj.size.height / 2);
        ctx.shadowBlur = 20;
        ctx.shadowColor = obj.color;
        ctx.fillStyle = obj.color;
        ctx.beginPath(); ctx.arc(0, 0, obj.size.width / 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      if (p.type === 'electric') {
        const jitter = (Math.random() - 0.5) * 4;
        ctx.fillRect(p.x + jitter, p.y + jitter, 2, 2);
      } else {
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
    });
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // Player
    if (!deathTimeRef.current) {
      ctx.save();
      const pScreenX = p.pos.x - worldXRef.current + p.width / 2;
      const pScreenY = p.pos.y + p.height / 2;
      ctx.translate(pScreenX, pScreenY);
      if (hasShield) {
        ctx.strokeStyle = COLORS.shield; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, p.width, 0, Math.PI * 2); ctx.stroke();
      }
      if (hasMagnet) {
        ctx.strokeStyle = COLORS.magnet; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, 0, PHYSICS.MAGNET_RADIUS * pulse, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.rotate(p.rotation);
      ctx.shadowBlur = 20 + pulse * 15 + intensity * 20;
      ctx.shadowColor = selectedSkin.glowColor;
      ctx.fillStyle = selectedSkin.primaryColor;
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      ctx.restore();
    }
    ctx.restore();
  }, [selectedSkin, lastSpeedTierRef, playerRef]);

  const update = useCallback((time: number) => {
    if (lastTimeRef.current === null) lastTimeRef.current = time;
    const dt = Math.min(time - (lastTimeRef.current || time), 100) / 16.66;
    lastTimeRef.current = time;

    if (gameStateRef.current !== GameState.PLAYING) return;

    if (deathTimeRef.current !== null) {
      const elapsed = time - deathTimeRef.current;
      particlesRef.current.forEach(part => { part.x += part.vx * dt; part.y += part.vy * dt; part.life -= 0.02 * dt; });
      particlesRef.current = particlesRef.current.filter(part => part.life > 0);
      render();
      if (elapsed > 1000) onGameOver(scoreRef.current, collectedInRunRef.current);
      else requestRef.current = requestAnimationFrame(update);
      return;
    }

    const p = playerRef.current;
    const targetSpeed = Math.min(PHYSICS.BASE_SPEED + (scoreRef.current * PHYSICS.SPEED_INCREMENT), PHYSICS.MAX_SPEED);
    const groundY = (canvasRef.current?.height || 600) * 0.75;

    updatePhysics(dt, targetSpeed, groundY);
    if (onPowerUpsUpdate) onPowerUpsUpdate([...p.activePowerUps]);

    // Dynamic Trail Limit: More points at higher speeds for a longer trail
    const tier = lastSpeedTierRef.current;
    trailRef.current.push({ x: p.pos.x, y: p.pos.y });
    const maxTrailPoints = 15 + tier * 5;
    if (trailRef.current.length > maxTrailPoints) trailRef.current.shift();

    worldXRef.current = p.pos.x - PLAYER_LEFT_OFFSET;

    particlesRef.current.forEach(part => {
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.life -= (part.type === 'electric' ? 0.03 : 0.015) * dt;
    });
    particlesRef.current = particlesRef.current.filter(part => part.life > 0);

    for (let i = levelRef.current.length - 1; i >= 0; i--) {
      const obj = levelRef.current[i];
      if (obj.pos.x < worldXRef.current - 500 || obj.pos.x > worldXRef.current + 3000) continue;

      const objY = groundY - (obj.pos.y + obj.size.height);
      const isColliding =
        p.pos.x < obj.pos.x + obj.size.width && p.pos.x + p.width > obj.pos.x &&
        p.pos.y < objY + obj.size.height && p.pos.y + p.height > objY;

      if (isColliding) {
        if (obj.type === 'COLLECTABLE') {
          collectedInRunRef.current += 1; onCoreCollect(collectedInRunRef.current);
          audioService.playScore();
          createCollectBurst(obj.pos.x + obj.size.width / 2, objY + obj.size.height / 2, obj.color || COLORS.core);
          levelRef.current.splice(i, 1); continue;
        }

        if (['MAGNET', 'SHIELD', 'SLOW_MO'].includes(obj.type)) {
          addPowerUp(obj.type as PowerUpType);
          audioService.playScore();
          createCollectBurst(obj.pos.x + obj.size.width / 2, objY + obj.size.height / 2, obj.color || '#ffffff');
          levelRef.current.splice(i, 1); continue;
        }

        if (['BLOCK', 'MOVING_BLOCK', 'DESTRUCTIBLE_BLOCK'].includes(obj.type) && p.vel.y >= 0 && p.pos.y + p.height < objY + 25) {
          landOnPlatform(objY); continue;
        }

        if (p.activePowerUps.some(pu => pu.type === 'SHIELD')) {
          removePowerUp('SHIELD'); flashOpacityRef.current = 0.5; audioService.playJump();
          if (obj.type === 'SPIKE') levelRef.current.splice(i, 1); continue;
        }

        audioService.playDeath(); deathTimeRef.current = time; flashOpacityRef.current = 0.8;
        for (let k = 0; k < 30; k++) {
          particlesRef.current.push({ x: p.pos.x + p.width / 2, y: p.pos.y + p.height / 2, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 1.0, color: selectedSkin.primaryColor });
        }
        requestRef.current = requestAnimationFrame(update);
        return;
      }
    }

    const newScore = Math.floor(p.pos.x / 10);
    if (newScore > scoreRef.current) {
      scoreRef.current = newScore;
      onScoreUpdate(newScore);
      lastSpeedTierRef.current = Math.floor(newScore / 500) + 1;
    }

    render();
    requestRef.current = requestAnimationFrame(update);
  }, [onGameOver, onScoreUpdate, onCoreCollect, selectedSkin, updatePhysics, landOnPlatform, render, addPowerUp, removePowerUp, onPowerUpsUpdate, playerRef, createCollectBurst]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, update]);

  useEffect(() => {
    const handleInput = (e?: any) => {
      if (gameStateRef.current !== GameState.PLAYING || deathTimeRef.current !== null) return;
      if (e instanceof KeyboardEvent && !['Space', 'ArrowUp', 'KeyW'].includes(e.code)) return;
      if (e && e.cancelable) e.preventDefault();
      const { success, isInitialJump } = performJump();
      if (success) { audioService.playJump(); createParticlesAtPlayer(isInitialJump); }
    };
    const canvas = canvasRef.current;
    if (canvas) canvas.addEventListener('pointerdown', handleInput, { passive: false });
    window.addEventListener('keydown', handleInput, { passive: false });
    return () => {
      if (canvas) canvas.removeEventListener('pointerdown', handleInput);
      window.removeEventListener('keydown', handleInput);
    };
  }, [performJump, createParticlesAtPlayer]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none outline-none select-none" tabIndex={0} style={{ touchAction: 'none' }} />;
};

export default GameCanvas;
