
import { GameSettings, HighScore } from '../types';
import { STORAGE_KEYS } from '../constants';

export const saveSettings = (settings: GameSettings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const getSettings = (): GameSettings => {
  const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return saved ? JSON.parse(saved) : {
    soundEnabled: true,
    reducedMotion: false,
    selectedSkinId: 'classic',
    totalCores: 0,
    unlockedSkinIds: ['classic'],
    hasGamePass: false
  };
};

export const saveHighScore = (score: number) => {
  const scores = getHighScores();
  const newScore: HighScore = { score, timestamp: Date.now() };
  scores.push(newScore);
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(scores.slice(0, 5)));
};

export const getHighScores = (): HighScore[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES);
  return saved ? JSON.parse(saved) : [];
};
