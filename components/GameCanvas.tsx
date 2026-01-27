
import React, { useRef, useEffect, useCallback, useState } from 'react';
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
  type?: 'spark' | 'sparkle' | 'shockwave' | 'debris' | 'electric' | 'trail' | 'powerup' | 'magnet-trail' | 'streak' | 'trail-flake';
  width?: number;
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
  const shakeRef = useRef(0);

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
      shakeRef.current = 0;
      onScoreUpdate(0);
      onCoreCollect(0);
      audioService.init();
      audioService.setEnabled(settings.soundEnabled);
    }
  }, [gameState, settings.soundEnabled, onScoreUpdate, onCoreCollect, resetPlayer]);

  const addShake = (amount: number) => {
    shakeRef.current = Math.min(shakeRef.current + amount, 40);
  };

  const createParticlesAtPlayer = useCallback((isInitialJump: boolean) => {
    const p = playerRef.current;
    addShake(isInitialJump ? 3 : 8);
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
    }
  }, [selectedSkin, playerRef]);

  const createCollectBurst = useCallback((x: number, y: number, color: string) => {
    const tier = lastSpeedTierRef.current;
    const count = 10 + tier * 5;
    const spread = 5 + tier * 2;
    addShake(4);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random()) * spread;
      particlesRef.current.push({
        x, y,
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
    const segments = Math.max(2, Math.floor(4 * intensity));
    for (let i = 1; i <= segments; i++) {
      const tx = x1 + (x2 - x1) * (i / segments);
      const ty = y1 + (y2 - y1) * (i / segments);
      const jitter = (Math.random() - 0.5) * 20 * intensity;
      ctx.lineTo(tx + jitter, ty + jitter);
    }
    ctx.stroke();
    ctx.restore();
  };

  const drawCircuitLines = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, intensity: number) => {
    ctx.save();
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.1 + intensity * 0.4;

    // Draw procedural grid-like circuit lines
    const step = 15;
    for (let lx = step; lx < w; lx += step) {
      if (Math.random() > 0.5) {
        ctx.beginPath();
        ctx.moveTo(x + lx, y);
        ctx.lineTo(x + lx, y + h);
        ctx.stroke();
      }
    }
    for (let ly = step; ly < h; ly += step) {
      if (Math.random() > 0.5) {
        ctx.beginPath();
        ctx.moveTo(x, y + ly);
        ctx.lineTo(x + w, y + ly);
        ctx.stroke();
      }
    }
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
    const energyOscillation = Math.sin(time / 50) * 5; // Fast jitter for electrical effect
    const groundY = canvas.height * 0.75;

    const p = playerRef.current;
    const hasShield = p.activePowerUps.some(pu => pu.type === 'SHIELD');
    const hasMagnet = p.activePowerUps.some(pu => pu.type === 'MAGNET');

    ctx.save();

    // Global Camera Shake
    const currentShake = deathTimeRef.current ? 25 : shakeRef.current;
    if (currentShake > 0.1) {
      ctx.translate((Math.random() - 0.5) * currentShake, (Math.random() - 0.5) * currentShake);
    }

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Kinetic Speed Streaks (Background Pass)
    ctx.save();
    ctx.scale(VIEW_SCALE, VIEW_SCALE);
    const streakCount = Math.floor(intensity * 15);
    if (streakCount > 0) {
      ctx.strokeStyle = selectedSkin.glowColor;
      for (let i = 0; i < streakCount; i++) {
        const sx = (Math.random() * canvas.width / VIEW_SCALE);
        const sy = (Math.random() * canvas.height / VIEW_SCALE);
        const slen = 50 + intensity * 200;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.05 + intensity * 0.1;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + slen, sy); ctx.stroke();
      }
    }
    ctx.restore();

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

    // ENHANCED DYNAMIC TRAIL: Multi-Layer Energy Ribbon
    if (trailRef.current.length > 1) {
      const trailCount = trailRef.current.length;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      const playerCenterX = p.width / 2;
      const playerCenterY = p.height / 2;

      // Pass 1: Volumetric Plasma Glow (Wide)
      for (let i = 0; i < trailCount - 1; i++) {
        const pt = trailRef.current[i];
        const nextPt = trailRef.current[i + 1];
        const ratio = i / trailCount;
        ctx.beginPath();
        ctx.strokeStyle = selectedSkin.glowColor;
        ctx.globalAlpha = (0.1 + intensity * 0.15) * ratio;
        ctx.lineWidth = (p.width * 1.2 * ratio) + (intensity * 45) + energyOscillation;
        ctx.moveTo(pt.x + playerCenterX, pt.y + playerCenterY);
        ctx.lineTo(nextPt.x + playerCenterX, nextPt.y + playerCenterY);
        ctx.stroke();
      }

      // Pass 2: High-Frequency Energy Core (Oscillating)
      for (let i = 0; i < trailCount - 1; i++) {
        const pt = trailRef.current[i];
        const nextPt = trailRef.current[i + 1];
        const ratio = i / trailCount;
        ctx.beginPath();
        // At high intensity, the core turns white-hot
        const coreColor = (intensity > 0.8 && Math.random() > 0.4) ? '#ffffff' : selectedSkin.glowColor;
        ctx.strokeStyle = coreColor;
        ctx.globalAlpha = (0.4 + intensity * 0.5) * ratio;
        ctx.lineWidth = (p.width * 0.5 * ratio) + (intensity * 12) + (Math.random() * 4);

        if (intensity > 0.4) {
          ctx.shadowBlur = 10 + intensity * 15;
          ctx.shadowColor = selectedSkin.glowColor;
        }

        ctx.moveTo(pt.x + playerCenterX, pt.y + playerCenterY);
        ctx.lineTo(nextPt.x + playerCenterX, nextPt.y + playerCenterY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Pass 3: Lightning Arcs (High Tier Only)
      if (tier >= 4) {
        for (let i = 0; i < trailCount - 1; i += 2) {
          if (Math.random() > 0.7 - (intensity * 0.3)) {
            const pt = trailRef.current[i];
            const nextPt = trailRef.current[i + 1];
            const ratio = i / trailCount;

            ctx.beginPath();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1 + (intensity * 2);
            ctx.globalAlpha = (0.3 + intensity * 0.4) * ratio;

            const startX = pt.x + playerCenterX;
            const startY = pt.y + playerCenterY;
            const endX = nextPt.x + playerCenterX;
            const endY = nextPt.y + playerCenterY;

            const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 30 * intensity;
            const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 30 * intensity;

            ctx.moveTo(startX, startY);
            ctx.lineTo(midX, midY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // Obstacles
    for (const obj of levelRef.current) {
      const visibleRange = canvas.width / VIEW_SCALE + 600;
      if (obj.pos.x < worldXRef.current - 200 || obj.pos.x > worldXRef.current + visibleRange) continue;
      const objY = groundY - (obj.pos.y + obj.size.height);

      ctx.save();

      if (obj.type === 'SPIKE') {
        // Base Glow
        ctx.shadowBlur = 10 + (intensity * 30);
        ctx.shadowColor = obj.color;

        // Spike Body
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.moveTo(obj.pos.x, objY + obj.size.height);
        ctx.lineTo(obj.pos.x + obj.size.width / 2, objY);
        ctx.lineTo(obj.pos.x + obj.size.width, objY + obj.size.height);
        ctx.closePath();
        ctx.fill();

        // Pulsing Tip
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.4 + pulse * 0.5;
        ctx.beginPath();
        ctx.arc(obj.pos.x + obj.size.width / 2, objY, 4 + intensity * 8, 0, Math.PI * 2);
        ctx.fill();

        // Tier-Scaled Arcs
        const arcChance = 0.95 - (intensity * 0.2);
        if (Math.random() > arcChance) {
          const arcEndOffset = (Math.random() - 0.5) * 60;
          drawElectricArc(ctx, obj.pos.x + obj.size.width / 2, objY, obj.pos.x + obj.size.width / 2 + arcEndOffset, objY + 40, 'white', 1 + intensity);
        }

        // Secondary "Aura" Ring
        if (intensity > 0.6) {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.1 * pulse;
          ctx.beginPath();
          ctx.arc(obj.pos.x + obj.size.width / 2, objY, 20 + intensity * 20, 0, Math.PI * 2);
          ctx.stroke();
        }

      } else if (['BLOCK', 'MOVING_BLOCK', 'DESTRUCTIBLE_BLOCK'].includes(obj.type)) {
        // Block Body
        ctx.fillStyle = obj.color;
        ctx.shadowBlur = 10 + intensity * 20;
        ctx.shadowColor = obj.color;
        ctx.fillRect(obj.pos.x, objY, obj.size.width, obj.size.height);

        // Internal Circuitry
        drawCircuitLines(ctx, obj.pos.x, objY, obj.size.width, obj.size.height, intensity);

        // Edge Highlights
        ctx.strokeStyle = 'white';
        ctx.globalAlpha = 0.2 + intensity * 0.4;
        ctx.lineWidth = 2;
        ctx.strokeRect(obj.pos.x + 2, objY + 2, obj.size.width - 4, obj.size.height - 4);

        // Sweeping Energy Scan
        const scanPos = (time % 1500) / 1500;
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.1 + intensity * 0.3;
        ctx.fillRect(obj.pos.x, objY + (obj.size.height * scanPos), obj.size.width, 3);

        // Corner Crackle
        if (intensity > 0.7 && Math.random() > 0.97) {
          const corner = Math.floor(Math.random() * 4);
          let cx = obj.pos.x, cy = objY;
          if (corner === 1) cx += obj.size.width;
          else if (corner === 2) { cx += obj.size.width; cy += obj.size.height; }
          else if (corner === 3) cy += obj.size.height;
          drawElectricArc(ctx, cx, cy, cx + (Math.random() - 0.5) * 30, cy + (Math.random() - 0.5) * 30, 'white', 1.2);
        }

        if (obj.type === 'DESTRUCTIBLE_BLOCK') {
          // Destructible Core Glow
          const corePulse = Math.sin(time / 100) * 0.5 + 0.5;
          ctx.fillStyle = '#ff0055';
          ctx.globalAlpha = 0.1 + corePulse * 0.3;
          ctx.fillRect(obj.pos.x + 8, objY + 8, obj.size.width - 16, obj.size.height - 16);
          // Crackle warning lines
          if (corePulse > 0.8) {
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 1;
            ctx.strokeRect(obj.pos.x + 4, objY + 4, obj.size.width - 8, obj.size.height - 8);
          }
        }
      } else if (obj.type === 'COLLECTABLE') {
        ctx.save();
        ctx.translate(obj.pos.x + obj.size.width / 2, objY + obj.size.height / 2);
        ctx.rotate(time / 600);
        ctx.shadowBlur = 10 + pulse * 15;
        ctx.shadowColor = COLORS.core;
        ctx.fillStyle = COLORS.core;
        ctx.fillRect(-obj.size.width / 2, -obj.size.height / 2, obj.size.width, obj.size.height);

        // Inner white shine
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.4;
        ctx.fillRect(-obj.size.width / 4, -obj.size.height / 4, obj.size.width / 2, obj.size.height / 2);
        ctx.restore();
      }
      ctx.restore();
    }

    // Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
      if (p.type === 'electric') { const jitter = (Math.random() - 0.5) * 4; ctx.fillRect(p.x + jitter, p.y + jitter, 2, 2); }
      else if (p.type === 'trail-flake') { ctx.fillRect(p.x - 1, p.y - 1, 2, 2); }
      else ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // Player Rendering
    if (!deathTimeRef.current) {
      ctx.save();
      let pScreenX = p.pos.x - worldXRef.current + p.width / 2;
      let pScreenY = p.pos.y + p.height / 2;

      // Speed Glitch Effect
      if (intensity > 0.85 && Math.random() > 0.96) {
        pScreenX += (Math.random() - 0.5) * 15;
      }

      ctx.translate(pScreenX, pScreenY);

      if (hasShield) { ctx.strokeStyle = COLORS.shield; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, p.width, 0, Math.PI * 2); ctx.stroke(); }
      if (hasMagnet) { ctx.strokeStyle = COLORS.magnet; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(0, 0, PHYSICS.MAGNET_RADIUS * pulse, 0, Math.PI * 2); ctx.stroke(); }

      // Player Discharge
      if (intensity > 0.5 && Math.random() > 0.9) {
        drawElectricArc(ctx, 0, 0, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, 'white', intensity);
      }

      ctx.rotate(p.rotation);
      ctx.shadowBlur = 20 + pulse * 15 + intensity * 20;
      ctx.shadowColor = selectedSkin.glowColor;
      ctx.fillStyle = selectedSkin.primaryColor;
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      ctx.restore();
    }
    ctx.restore();

    // Decay Shake
    shakeRef.current *= 0.9;
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

    const wasGrounded = p.isGrounded;
    updatePhysics(dt, targetSpeed, groundY);
    if (!wasGrounded && p.isGrounded) addShake(4);

    if (onPowerUpsUpdate) onPowerUpsUpdate([...p.activePowerUps]);

    const tier = lastSpeedTierRef.current;
    const intensity = Math.min((tier - 1) / 8, 1.0);

    trailRef.current.push({ x: p.pos.x, y: p.pos.y });
    const maxTrailPoints = 15 + tier * 6; // Scales trail length with speed
    if (trailRef.current.length > maxTrailPoints) trailRef.current.shift();

    // Spawn trail flakes at high intensity
    if (intensity > 0.4 && Math.random() > 0.7) {
      particlesRef.current.push({
        x: p.pos.x + (p.width / 2),
        y: p.pos.y + (p.height / 2) + (Math.random() - 0.5) * 20,
        vx: -2 - Math.random() * 5,
        vy: (Math.random() - 0.5) * 2,
        life: 0.5,
        color: selectedSkin.glowColor,
        type: 'trail-flake'
      });
    }

    worldXRef.current = p.pos.x - PLAYER_LEFT_OFFSET;
    particlesRef.current.forEach(part => {
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.life -= (part.type === 'electric' ? 0.03 : part.type === 'trail-flake' ? 0.05 : 0.015) * dt;
    });
    particlesRef.current = particlesRef.current.filter(part => part.life > 0);

    for (let i = levelRef.current.length - 1; i >= 0; i--) {
      const obj = levelRef.current[i];
      if (obj.pos.x < worldXRef.current - 500 || obj.pos.x > worldXRef.current + 3000) continue;
      const objY = groundY - (obj.pos.y + obj.size.height);
      const isColliding = p.pos.x < obj.pos.x + obj.size.width && p.pos.x + p.width > obj.pos.x && p.pos.y < objY + obj.size.height && p.pos.y + p.height > objY;

      if (isColliding) {
        if (obj.type === 'COLLECTABLE') {
          collectedInRunRef.current += 1; onCoreCollect(collectedInRunRef.current);
          audioService.playScore(); createCollectBurst(obj.pos.x + obj.size.width / 2, objY + obj.size.height / 2, obj.color || COLORS.core);
          levelRef.current.splice(i, 1); continue;
        }
        if (['MAGNET', 'SHIELD', 'SLOW_MO'].includes(obj.type)) {
          addPowerUp(obj.type as PowerUpType); audioService.playScore(); createCollectBurst(obj.pos.x + obj.size.width / 2, objY + obj.size.height / 2, obj.color || '#ffffff');
          levelRef.current.splice(i, 1); continue;
        }
        if (['BLOCK', 'MOVING_BLOCK', 'DESTRUCTIBLE_BLOCK'].includes(obj.type) && p.vel.y >= 0 && p.pos.y + p.height < objY + 25) {
          landOnPlatform(objY); addShake(3); continue;
        }
        if (p.activePowerUps.some(pu => pu.type === 'SHIELD')) {
          removePowerUp('SHIELD'); flashOpacityRef.current = 0.5; audioService.playJump(); addShake(15);
          if (obj.type === 'SPIKE') levelRef.current.splice(i, 1); continue;
        }
        audioService.playDeath(); deathTimeRef.current = time; flashOpacityRef.current = 0.8; addShake(25);
        for (let k = 0; k < 30; k++) { particlesRef.current.push({ x: p.pos.x + p.width / 2, y: p.pos.y + p.height / 2, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 1.0, color: selectedSkin.primaryColor }); }
        requestRef.current = requestAnimationFrame(update); return;
      }
    }

    const newScore = Math.floor(p.pos.x / 10);
    if (newScore > scoreRef.current) { scoreRef.current = newScore; onScoreUpdate(newScore); lastSpeedTierRef.current = Math.floor(newScore / 500) + 1; }
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
