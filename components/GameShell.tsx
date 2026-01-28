import React, { useState, useCallback, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import nftPreview from '../Public/neon_glide_nft.webp';
import Landing from './Landing';
import GameCanvas from './GameCanvas';
import { GameState, GameSettings, HighScore, ActivePowerUp, PowerUpType } from '../types';
import { getSettings, saveSettings, getHighScores, saveHighScore } from '../services/persistence';
import { Pause, RotateCcw, Home, SkipForward, Zap, Trophy, CloudLightning, Loader2, Shield, Magnet, Timer, Download } from 'lucide-react';
import { SKINS, COLORS, PHYSICS } from '../constants';
import { web3Service } from '../services/web3Service';

const PowerUpHUD: React.FC<{ activePowerUps: ActivePowerUp[] }> = ({ activePowerUps }) => {
  if (activePowerUps.length === 0) return null;

  const getPowerUpConfig = (type: PowerUpType) => {
    switch (type) {
      case 'MAGNET': return { icon: <Magnet size={16} />, color: 'text-sky-400', label: 'Magnet', bg: 'bg-sky-500/10', border: 'border-sky-500/30' };
      case 'SHIELD': return { icon: <Shield size={16} />, color: 'text-yellow-400', label: 'Shield', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
      case 'SLOW_MO': return { icon: <Timer size={16} />, color: 'text-purple-400', label: 'Slow-Mo', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
    }
  };

  return (
    <div className="absolute top-40 right-10 flex flex-col gap-3 pointer-events-none z-20">
      {activePowerUps.map((pu, idx) => {
        const config = getPowerUpConfig(pu.type);
        const remaining = Math.max(0, pu.endTime - Date.now());
        const progress = (remaining / PHYSICS.POWER_UP_DURATION) * 100;

        return (
          <div key={`${pu.type}-${idx}`} className={`flex items-center gap-4 px-4 py-2 rounded-2xl border ${config.bg} ${config.border} backdrop-blur-xl animate-in slide-in-from-right-4 duration-300`}>
            <div className={`${config.color}`}>{config.icon}</div>
            <div className="flex flex-col gap-1 w-24">
              <span className={`text-[9px] font-black uppercase tracking-widest ${config.color}`}>{config.label}</span>
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.color.replace('text', 'bg')} transition-all duration-100 ease-linear`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const GameShell: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LANDING);
  const [settings, setSettings] = useState<GameSettings>(getSettings());
  const [highScores, setHighScores] = useState<HighScore[]>(getHighScores());
  const [currentScore, setCurrentScore] = useState(0);
  const [currentRunCores, setCurrentRunCores] = useState(0);
  const [activePowerUps, setActivePowerUps] = useState<ActivePowerUp[]>([]);
  const [isOnchainSyncing, setIsOnchainSyncing] = useState(false);
  const [onchainStatus, setOnchainStatus] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#020617',
        scale: 2, // High res for the fixed size
        width: 450,
        height: 800,
        windowWidth: 450,
        windowHeight: 800,
        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector('[data-card-ref="true"]') as HTMLElement;
          if (el) {
            // Remove animations and 3D transforms for clean capture
            el.style.animation = 'none';
            el.style.transform = 'none';
            el.style.transition = 'none';

            // Force Image Dimensions & Styling
            el.style.width = '450px';
            el.style.height = '800px';
            el.style.maxWidth = 'none';
            el.style.maxHeight = 'none';
            el.style.margin = '0';
            el.style.padding = '40px';
            el.style.justifyContent = 'center';

            // Custom Look for the Card Image
            el.style.borderRadius = '0'; // Full image fill
            el.style.border = '4px solid #06b6d4'; // Cyan border
            el.style.background = '#020617'; // Ensure dark bg fills 450x800
            el.style.boxSizing = 'border-box'; // Ensure padding/border is included in width
            el.style.boxShadow = 'inset 0 0 30px rgba(6, 182, 212, 0.4)'; // Inset neon glow
          }
        },
        logging: false,
        useCORS: true
      });
      setPreviewUrl(canvas.toDataURL('image/png'));
      setShowPreviewModal(true);
    } catch (err) {
      console.error("Failed to generate card image", err);
      alert("Failed to generate preview. Try again.");
    }
  };

  const handleDownloadFile = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = `neon-glide-access-card-${Date.now()}.png`;
    link.href = previewUrl;
    link.click();
  };

  const handleMintFromPreview = async () => {
    if (!previewUrl) return;
    try {
      await web3Service.mint();
      alert("Minting Initiated! Check your wallet.");
    } catch (e) {
      console.error(e);
    }
  };

  const startGame = (newSettings: GameSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    setCurrentScore(0);
    setCurrentRunCores(0);
    setActivePowerUps([]);
    setOnchainStatus(null);
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = useCallback(async (finalScore: number, finalCores: number) => {
    setCurrentScore(finalScore);
    setCurrentRunCores(finalCores);
    saveHighScore(finalScore);

    const updatedSettings = {
      ...settings,
      totalCores: settings.totalCores + finalCores
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);

    setHighScores(getHighScores());
    setGameState(GameState.GAME_OVER);

    if (web3Service.getAddress()) {
      setIsOnchainSyncing(true);
      setOnchainStatus("Broadcasting to Grid...");
      const success = await web3Service.submitScoreOnChain(finalScore);
      if (success) {
        setOnchainStatus("Grid Sync Complete");
      } else {
        setOnchainStatus("Grid Sync Failed");
      }
      setIsOnchainSyncing(false);
    }
  }, [settings]);

  const togglePause = () => {
    if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
    else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
  };

  const handleRetry = () => {
    setCurrentScore(0);
    setCurrentRunCores(0);
    setActivePowerUps([]);
    setOnchainStatus(null);
    setGameState(GameState.PLAYING);
  };

  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const speedTier = Math.floor(currentScore / 500) + 1;
  const progressToNext = (currentScore % 500) / 500 * 100;

  const getTierTheme = (tier: number) => {
    if (tier >= 7) return {
      color: 'text-amber-400',
      border: 'border-amber-500/50',
      bg: 'bg-amber-500/10',
      shadow: 'shadow-[0_0_40px_rgba(251,191,36,0.3)]',
      label: 'MAX VOLTAGE',
      accent: 'bg-amber-400'
    };
    if (tier >= 4) return {
      color: 'text-purple-400',
      border: 'border-purple-500/50',
      bg: 'bg-purple-500/10',
      shadow: 'shadow-[0_0_40px_rgba(168,85,247,0.3)]',
      label: 'OVERDRIVE',
      accent: 'bg-purple-400'
    };
    return {
      color: 'text-cyan-400',
      border: 'border-cyan-500/50',
      bg: 'bg-cyan-500/10',
      shadow: 'shadow-[0_0_40px_rgba(0,242,255,0.3)]',
      label: 'CHARGED',
      accent: 'bg-cyan-400'
    };
  };

  const theme = getTierTheme(speedTier);
  const selectedSkin = SKINS.find(s => s.id === settings.selectedSkinId) || SKINS[0];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 select-none font-inter">
      {gameState !== GameState.LANDING && (
        <>
          <GameCanvas
            gameState={gameState}
            settings={settings}
            onGameOver={handleGameOver}
            onScoreUpdate={setCurrentScore}
            onCoreCollect={setCurrentRunCores}
            onPowerUpsUpdate={setActivePowerUps}
          />
          <PowerUpHUD activePowerUps={activePowerUps} />
        </>
      )}

      {gameState === GameState.LANDING && (
        <Landing
          onStart={startGame}
          highScores={highScores}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {gameState === GameState.PLAYING && (
        <div className="absolute top-0 left-0 right-0 p-10 flex justify-between items-start pointer-events-none z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-[-6px]">
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-slate-500 text-[10px] font-black tracking-[0.4em] uppercase">Energy Output</span>
            </div>
            <span
              className="text-6xl font-black font-orbitron text-white italic"
              style={{ filter: `drop-shadow(0 0 20px ${selectedSkin.glowColor})` }}
            >
              {currentScore.toFixed(0)}<span className="text-2xl ml-1 text-cyan-400/80">M</span>
            </span>
            <div className="flex gap-2 mt-2">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl border ${theme.border} ${theme.bg} ${theme.color} w-fit backdrop-blur-md`}>
                <Zap size={14} className="fill-current" />
                <span className="text-xs font-black uppercase tracking-widest">TIER {speedTier}</span>
              </div>
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl border border-white/5 bg-slate-900/60 text-cyan-400 w-fit backdrop-blur-md shadow-lg shadow-cyan-500/10`}>
                <div className="w-2.5 h-2.5 bg-cyan-400 rounded-sm" />
                <span className="text-xs font-black uppercase tracking-widest">{currentRunCores}</span>
              </div>
            </div>
          </div>
          <button
            onClick={togglePause}
            className="pointer-events-auto w-16 h-16 bg-slate-900/40 backdrop-blur-2xl rounded-3xl hover:bg-slate-800 transition-all border border-white/5 active:scale-90 flex items-center justify-center shadow-2xl"
          >
            <Pause className="text-white fill-current" size={32} />
          </button>
        </div>
      )}

      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-2xl">
          <div className="flex flex-col items-center space-y-12 animate-in fade-in zoom-in-95 duration-300">
            <div className="space-y-3 text-center">
              <div className="text-cyan-400 text-sm font-black tracking-[0.6em] uppercase animate-pulse">Flow Suspended</div>
              <h2 className="text-8xl font-black text-white italic font-orbitron tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">GRID LOCK</h2>
            </div>
            <div className="flex space-x-8">
              <button
                onClick={() => setGameState(GameState.PLAYING)}
                className="w-24 h-24 flex items-center justify-center bg-cyan-500 rounded-[2.5rem] hover:scale-110 transition-all shadow-[0_0_50px_rgba(0,242,255,0.5)] active:scale-95"
              >
                <SkipForward size={44} className="text-slate-950 fill-current ml-1" />
              </button>
              <button
                onClick={() => setGameState(GameState.LANDING)}
                className="w-24 h-24 flex items-center justify-center bg-slate-800/80 rounded-[2.5rem] hover:scale-110 transition-all border border-white/10 active:scale-95 backdrop-blur-xl"
              >
                <Home size={40} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-3xl p-4 overflow-y-auto perspective-[1000px]">
          <div
            ref={cardRef}
            data-card-ref="true"
            className="flex flex-col items-center p-5 sm:p-6 bg-slate-900/90 rounded-[2rem] sm:rounded-[3rem] border border-white/10 shadow-[0_0_50px_rgba(6,182,212,0.15)] space-y-3 sm:space-y-6 max-w-xs sm:max-w-sm w-full my-auto animate-in zoom-in-95 duration-500 relative overflow-hidden transform-style-3d hover:rotate-x-2 hover:rotate-y-2 transition-transform duration-300 max-h-[85vh]"
            style={{
              animation: 'float 6s ease-in-out infinite',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.1) inset'
            }}
          >
            <style>{`
              @keyframes float {
                0%, 100% { transform: translateY(0) rotateX(0); }
                50% { transform: translateY(-20px) rotateX(2deg); }
              }
            `}</style>
            {/* Download Watermark (Visible only on download potentially, but fine here) */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
            <div className="text-center w-full space-y-6">
              <div className="space-y-2">
                <div className="text-rose-500 text-xs font-black tracking-[0.6em] uppercase animate-pulse">Critical Arc Failure</div>
                <h2 className="text-rose-500 font-black text-4xl sm:text-6xl font-orbitron tracking-tighter italic drop-shadow-[0_0_20px_rgba(244,63,94,0.4)]">SHORTED</h2>
              </div>

              <div className="flex flex-col gap-3">
                <div className={`flex flex-col items-center p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border ${theme.border} ${theme.bg} ${theme.shadow} space-y-3 sm:space-y-4 backdrop-blur-2xl`}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme.color} opacity-70`}>Energy State: {theme.label}</div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-orbitron">TIER {speedTier}</div>
                  </div>
                  <div className="w-full space-y-2">
                    <div className="relative w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/5 p-0.5">
                      <div className={`h-full ${theme.accent} transition-all duration-1500 ease-out shadow-[0_0_20px_rgba(255,255,255,0.5)] rounded-full`} style={{ width: `${progressToNext}%` }} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full">
                  <div className="bg-slate-800/50 p-3 rounded-[1.2rem] border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Score</span>
                    <span className="text-xl sm:text-2xl font-black text-white font-orbitron tabular-nums">{currentScore.toFixed(0)}<span className="text-[10px] ml-1 text-slate-500 italic">M</span></span>
                  </div>
                  <div className="bg-cyan-500/10 p-3 rounded-[1.2rem] border border-cyan-500/20 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-black text-cyan-500/60 uppercase tracking-widest mb-0.5">Cores</span>
                    <span className="text-xl sm:text-2xl font-black text-cyan-400 font-orbitron tabular-nums">+{currentRunCores}</span>
                  </div>
                </div>

                <div className="col-span-2 bg-slate-900/50 p-2 rounded-[1.5rem] border border-white/5 flex flex-col items-center relative overflow-hidden group">
                  <div className="w-full h-20 sm:h-28 z-10 flex items-center justify-center">
                    <img src={nftPreview} alt="Grid Pass" className="h-full object-contain" loading="lazy" />
                  </div>
                  <div className="absolute bottom-1 right-3 text-[8px] font-mono text-white/20">NFT-721</div>
                </div>
              </div>
            </div>

            {onchainStatus && (
              <div className={`flex items-center gap-3 px-5 py-2 rounded-2xl border ${onchainStatus.includes('Complete') ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/40 border-white/5 text-slate-400'} text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2`}>
                {isOnchainSyncing ? <Loader2 size={14} className="animate-spin" /> : <CloudLightning size={14} />}
                {onchainStatus}
              </div>
            )}

            {highScores.length > 0 && currentScore >= highScores[0].score && (
              <div className="flex items-center gap-4 px-6 py-3 bg-yellow-400/5 border border-yellow-400/20 rounded-3xl text-yellow-400 text-[10px] font-black animate-bounce tracking-widest uppercase">
                <Trophy size={16} className="fill-yellow-400/20" />
                Peak Voltage Record!
              </div>
            )}


            <div className="w-full space-y-4" data-html2canvas-ignore="true">
              <button
                onClick={handleRetry}
                className="w-full py-3 sm:py-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xl sm:text-2xl rounded-3xl transition-all shadow-2xl shadow-cyan-500/20 active:scale-95 flex items-center justify-center gap-4 group"
              >
                <RotateCcw size={24} className="group-hover:rotate-[-90deg] transition-transform duration-500" />
                RE-ENERGIZE
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGameState(GameState.LANDING)}
                  className="w-full py-3 sm:py-4 bg-slate-800/40 hover:bg-slate-800 text-slate-400 font-black text-xs sm:text-sm rounded-3xl transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3 border border-white/5 hover:text-white"
                >
                  <Home size={18} />
                  TERMINATE
                </button>
                <button
                  onClick={handleDownloadCard}
                  className="w-full py-3 sm:py-4 bg-slate-800/40 hover:bg-slate-800 text-cyan-400 font-black text-xs sm:text-sm rounded-3xl transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3 border border-white/5 hover:border-cyan-500/30 group"
                >
                  <Download size={18} className="group-hover:scale-110 transition-transform" />
                  DOWNLOAD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="flex flex-col items-center space-y-6 max-w-sm w-full">
            <div className="relative w-full aspect-[9/16] max-h-[60vh] rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.3)] border-2 border-cyan-500/50">
              <img src={previewUrl} className="w-full h-full object-contain bg-slate-950" alt="Card Preview" />
            </div>

            <div className="w-full space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-black font-orbitron italic text-white/90 uppercase">Own It</h3>
                <div className="h-1 w-12 bg-cyan-500 mx-auto rounded-full" />
              </div>

              <div className="flex gap-3">
                <button onClick={handleMintFromPreview} className="flex-1 py-4 bg-slate-900 border border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 rounded-2xl font-black uppercase text-sm transition-all active:scale-95">
                  [Onchain]
                </button>
                <button onClick={handleDownloadFile} className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-2xl font-black uppercase text-sm transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
                  [Offchain]
                </button>
              </div>

              <button onClick={() => setShowPreviewModal(false)} className="w-full py-3 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameShell;
