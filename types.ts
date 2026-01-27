
export enum GameState {
  LANDING = 'LANDING',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type PowerUpType = 'MAGNET' | 'SHIELD' | 'SLOW_MO';

export interface Entity {
  pos: Point;
  size: Size;
  color: string;
  type: 'PLAYER' | 'SPIKE' | 'BLOCK' | 'PAD' | 'COLLECTABLE' | 'MOVING_BLOCK' | 'DESTRUCTIBLE_BLOCK' | PowerUpType;
  id?: string;
  movementRange?: number;
  movementSpeed?: number;
  initialY?: number;
  isDestroyed?: boolean;
  destructionTime?: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  endTime: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  selectedSkinId: string;
  totalCores: number;
  unlockedSkinIds: string[];
  hasGamePass: boolean;
  nftImage?: string;
  nftVideoUrl?: string;
}

export interface HighScore {
  score: number;
  timestamp: number;
}

export interface Level {
  id: string;
  name: string;
  obstacles: Entity[];
  length: number; // in pixels
}

export interface PlayerSkin {
  id: string;
  name: string;
  primaryColor: string;
  glowColor: string;
  innerColor: string;
  cost: number;
}
