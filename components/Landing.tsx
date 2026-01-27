
import React, { useState, useRef, useEffect } from 'react';
import { Play, Info, Volume2, VolumeX, Trophy, Zap, ShoppingBag, X, Check, Lock, Sparkles, ShieldCheck, Loader2, Cpu, Wallet } from 'lucide-react';
import { GameSettings, HighScore, PlayerSkin } from '../types';
import { SKINS, COLORS } from '../constants';
import { web3Service } from '../services/web3Service';
import nftPreview from '../Public/neon_glide_nft.png';

const NFTCard3D: React.FC<{ imageUrl?: string; videoUrl?: string }> = ({ imageUrl, videoUrl }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const degX = (y - centerY) / 10;
    const degY = (centerX - x) / 10;
    setRotateX(degX);
    setRotateY(degY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div className="perspective-container w-full h-full flex items-center justify-center p-4">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="nft-card relative w-full h-full rounded-[2.5rem] overflow-hidden bg-slate-800 border-2 border-white/20 shadow-2xl transition-transform duration-200 ease-out"
        style={{ transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)` }}
      >
        <div className="holo-shine" />

        {videoUrl ? (
          <video src={videoUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : imageUrl ? (
          <img src={imageUrl} alt="NFT Pass" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <Cpu className="text-white/10 w-20 h-20" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 p-6 flex flex-col justify-between pointer-events-none">
          <div className="flex justify-between items-start">
            <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
              <Zap size={10} className="text-cyan-400 fill-cyan-400" />
              <span className="text-[8px] font-black uppercase tracking-widest text-white">GRID PASS v2.5</span>
            </div>
            <ShieldCheck size={20} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]" />
          </div>

          <div className="space-y-1">
            <div className="text-[7px] font-black text-cyan-400/80 uppercase tracking-[0.4em]">Authorization ID</div>
            <div className="text-xs font-mono text-white opacity-60">GRID_{Math.random().toString(36).substring(7).toUpperCase()}</div>
            <div className="pt-2 flex justify-between items-end">
              <div className="text-lg font-orbitron font-black italic text-white leading-none">NEON GLIDE</div>
              <div className="text-[9px] font-black text-white/40 uppercase tracking-tighter">Plasma Shard</div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 border-[8px] border-white/5 pointer-events-none rounded-[2.5rem]" />
      </div>
    </div>
  );
};

interface LandingProps {
  onStart: (settings: GameSettings) => void;
  highScores: HighScore[];
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
}

const Landing: React.FC<LandingProps> = ({ onStart, highScores, settings, onUpdateSettings }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState("");
  const [mintError, setMintError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const initWeb3 = async () => {
      // Automatic connection check for Base/Coinbase Wallet apps
      const addr = await web3Service.autoConnect();
      if (addr) setWalletAddress(addr);
    };
    initWeb3();
  }, []);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    const addr = await web3Service.connect();
    if (addr) setWalletAddress(addr);
    setIsConnecting(false);
  };

  const handleBuyOrSelect = (skin: PlayerSkin) => {
    const isUnlocked = settings.unlockedSkinIds.includes(skin.id);
    if (isUnlocked) {
      onUpdateSettings({ ...settings, selectedSkinId: skin.id });
    } else {
      if (settings.totalCores >= skin.cost) {
        onUpdateSettings({
          ...settings,
          totalCores: settings.totalCores - skin.cost,
          unlockedSkinIds: [...settings.unlockedSkinIds, skin.id],
          selectedSkinId: skin.id
        });
      }
    }
  };

  const handleMintPass = async () => {
    if (!walletAddress) {
      handleConnectWallet();
      return;
    }
    setIsMinting(true);
    setMintError(null);
    setMintStatus("Connecting to Plasma Grid...");

    try {
      setMintStatus("Connecting to Grid...");

      // Attempt on-chain minting
      const txSuccess = await web3Service.mint();

      if (txSuccess === true) {
        setMintStatus("Transaction Confirmed. Verifying...");
        // Wait a bit for effect
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else if (txSuccess === null) {
        // Contract not deployed/configured -> Fallback to simulation for demo/dev
        console.log("Contract not configured, falling back to local simulation.");
        await new Promise(resolve => setTimeout(resolve, 800));
        setMintStatus("Synthesizing Energy Pass (Dev Mode)...");
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        // Explicit failure
        throw new Error("Minting transaction failed or was rejected.");
      }

      // Use static preview as the "minted" image
      onUpdateSettings({
        ...settings,
        hasGamePass: true,
        nftImage: nftPreview
      });
      setMintStatus("");
    } catch (error: any) {
      console.error("Minting failed:", error);
      setMintError(error.message || "Grid connection failed. Please try again.");
    } finally {
      setIsMinting(false);
    }
  };

  const handleStart = () => {
    onStart(settings);
  };

  const truncatedAddress = walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 sm:p-6 relative overflow-hidden">
      {/* Wallet Indicator */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={handleConnectWallet}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 backdrop-blur-xl transition-all duration-300 ${walletAddress ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400'}`}
        >
          {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
          <span className="text-[10px] font-black uppercase tracking-widest">
            {walletAddress ? truncatedAddress : 'Connect Base'}
          </span>
        </button>
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] animate-pulse delay-700"></div>
      </div>

      <div className="z-10 flex flex-col items-center space-y-8 max-w-md w-full text-center">
        <div className="relative group w-full">
          <div className="absolute -inset-8 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-all duration-700"></div>
          <div className="relative space-y-2 flex flex-col items-center">
            <div className="flex items-center justify-center gap-3 mb-[-10px]">
              <Zap className="text-cyan-400 fill-cyan-400 animate-pulse" size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-cyan-400/60">Plasma Grid v2.5</span>
              <Zap className="text-cyan-400 fill-cyan-400 animate-pulse" size={14} />
            </div>

            <div className="flex flex-col items-center select-none w-full">
              <span className="text-5xl sm:text-7xl font-black font-orbitron italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-flicker uppercase">NEON</span>
              <div className="relative h-24 sm:h-40 w-full mt-[-30px] sm:mt-[-45px]">
                <svg className="w-full h-full overflow-visible animate-glide-sparkle" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <filter id="electricGlow"><feGaussianBlur stdDeviation="3.5" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
                    <clipPath id="textPath"><text x="50%" y="85" textAnchor="middle" className="font-orbitron italic font-black text-[100px] sm:text-[120px]">GLIDE</text></clipPath>
                    <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00f2ff" />
                      <stop offset="50%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  <text x="50%" y="85" textAnchor="middle" className="font-orbitron italic font-black text-[100px] sm:text-[120px] fill-transparent stroke-cyan-400 stroke-[4px] opacity-20" style={{ filter: 'url(#electricGlow)' }}>GLIDE</text>
                  <g clipPath="url(#textPath)">
                    <path d="M-100,50 Q50,0 200,50 T500,50" fill="none" stroke="url(#neonGradient)" strokeWidth="12" className="animate-flow-1 opacity-60" style={{ filter: 'blur(5px)' }} />
                    <path d="M-100,70 Q50,120 200,70 T500,70" fill="none" stroke="#ff0055" strokeWidth="8" className="animate-flow-2 opacity-50" style={{ filter: 'blur(3px)' }} />
                    <path d="M-100,60 C50,10 150,110 500,60" fill="none" stroke="white" strokeWidth="3" className="animate-flow-1 opacity-70" />
                  </g>
                  <text x="50%" y="85" textAnchor="middle" className="font-orbitron italic font-black text-[100px] sm:text-[120px] fill-white/10 stroke-white/40 stroke-[1px]">GLIDE</text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/40 px-6 py-3 rounded-full border border-white/5 backdrop-blur-xl">
          <div className="w-6 h-6 bg-cyan-400 rounded shadow-[0_0_10px_rgba(0,242,255,0.8)]" />
          <span className="font-orbitron font-black text-2xl text-cyan-400">{settings.totalCores}</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cores</span>
        </div>

        <div className="w-full space-y-4">
          <button
            onClick={handleStart}
            className={`group hover-jitter relative w-full overflow-hidden rounded-[2rem] p-[2px] active:scale-95 transition-all duration-300 ${settings.hasGamePass ? 'animate-surge bg-slate-900 shadow-[0_0_30px_rgba(0,242,255,0.2)]' : 'bg-cyan-500/20 shadow-[0_0_20px_rgba(0,242,255,0.1)]'}`}
          >
            {settings.hasGamePass && (
              <div className="absolute inset-[-1000%] animate-[spin_1.5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00f2ff_0%,#7c3aed_25%,#ff0055_50%,#7c3aed_75%,#00f2ff_100%)] opacity-80" />
            )}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-0" />
            <div className="relative flex h-full w-full items-center justify-center rounded-[1.9rem] bg-slate-950/80 px-8 py-6 text-2xl font-black text-white backdrop-blur-3xl group-hover:bg-slate-900/20 transition-colors">
              <Play className="mr-3 w-8 h-8 fill-current text-cyan-400" />
              <span className="tracking-tighter italic uppercase">{settings.hasGamePass ? 'Initiate Overcharge' : 'Initiate Surge'}</span>
            </div>
          </button>

          <div className="flex gap-3">
            <button onClick={() => setShowShop(true)} className="flex-1 py-5 bg-slate-900/60 border border-purple-500/30 rounded-3xl hover:bg-slate-800 transition-all flex flex-col items-center justify-center text-purple-400 group hover-jitter">
              <ShoppingBag size={18} /><span className="font-black uppercase text-[8px] mt-1 tracking-widest">Shop</span>
            </button>
            <button onClick={() => setShowMintModal(true)} className={`flex-1 py-5 border rounded-3xl transition-all flex flex-col items-center justify-center group hover-jitter ${settings.hasGamePass ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-900/60 border-rose-500/30 text-rose-400'}`}>
              <ShieldCheck size={18} /><span className="font-black uppercase text-[8px] mt-1 tracking-widest">Pass</span>
            </button>
            <button onClick={() => onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })} className="flex-1 py-5 bg-slate-900/60 border border-white/5 rounded-3xl hover:bg-slate-800 transition-all flex flex-col items-center justify-center text-slate-400 group hover-jitter">
              {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}<span className="font-black uppercase text-[8px] mt-1 tracking-widest">Audio</span>
            </button>
            <button onClick={() => setShowInfo(true)} className="flex-1 py-5 bg-slate-900/60 border border-white/5 rounded-3xl hover:bg-slate-800 transition-all flex flex-col items-center justify-center text-slate-400 group hover-jitter">
              <Info size={18} /><span className="font-black uppercase text-[8px] mt-1 tracking-widest">Help</span>
            </button>
          </div>
        </div>
      </div>

      {showMintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-3xl overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-8 max-w-md w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden my-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            <button onClick={() => setShowMintModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-500/10 rounded-[2rem] border border-cyan-500/20 mb-2">
                <ShieldCheck className="text-cyan-400" size={32} />
              </div>
              <h2 className="text-3xl font-black font-orbitron italic text-white tracking-tighter uppercase">Grid Pass</h2>
              <p className="text-slate-400 text-xs leading-relaxed">Synthesize an optional 3D Game Pass to showcase your presence on the grid. This is a unique aesthetic asset.</p>
            </div>

            <div className="aspect-[9/16] rounded-[2.5rem] bg-slate-800/20 flex items-center justify-center relative overflow-hidden">
              {settings.nftImage ? (
                <NFTCard3D imageUrl={settings.nftImage} />
              ) : isMinting ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse" size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 animate-pulse text-center">{mintStatus}</span>
                </div>
              ) : (
                <img src={nftPreview} alt="Grid Pass" className="w-full h-full object-contain" />
              )}
            </div>

            {mintError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-[10px] font-bold text-center">{mintError}</div>
            )}

            {!settings.nftImage ? (
              <button
                disabled={isMinting}
                onClick={handleMintPass}
                className="group relative w-full overflow-hidden rounded-[2rem] p-[2px] transition-all duration-300 active:scale-95 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-cyan-500 animate-spark-1 opacity-80" />
                <div className="relative flex w-full items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 py-5 rounded-[1.9rem] text-white font-black text-xl">
                  {isMinting ? <Loader2 className="animate-spin" size={20} /> : (walletAddress ? <Sparkles size={20} className="text-cyan-400" /> : <Wallet size={20} className="text-cyan-400" />)}
                  <span className="tracking-widest uppercase">{isMinting ? "Synthesizing..." : (walletAddress ? "Mint Energy Pass" : "Connect to Mint")}</span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setShowMintModal(false)}
                className="w-full py-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-2xl rounded-[2rem] transition-all shadow-xl shadow-cyan-500/30 active:scale-95 flex items-center justify-center gap-3 uppercase"
              >Return to Terminal <Check size={20} /></button>
            )}
          </div>
        </div>
      )}

      {showShop && (
        <div className="fixed inset-0 z-50 flex flex-col items-center bg-slate-950/95 backdrop-blur-2xl overflow-y-auto p-8">
          <div className="bg-slate-900/50 border border-white/10 rounded-[3rem] p-8 max-w-2xl w-full space-y-8 my-auto relative animate-in zoom-in-95 duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowShop(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors z-20"><X size={28} /></button>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-4xl font-black font-orbitron italic text-white tracking-tighter uppercase">Surge Shop</h2>
                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Select your combat chassis</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-800 px-5 py-2 rounded-2xl border border-white/5">
                <div className="w-4 h-4 bg-cyan-400 rounded" />
                <span className="font-orbitron font-black text-xl text-cyan-400">{settings.totalCores}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
              {SKINS.map((skin) => {
                const isUnlocked = settings.unlockedSkinIds.includes(skin.id);
                const isSelected = settings.selectedSkinId === skin.id;
                const canAfford = settings.totalCores >= skin.cost;
                return (
                  <button key={skin.id} onClick={() => handleBuyOrSelect(skin)} disabled={!isUnlocked && !canAfford} className={`group relative aspect-square rounded-3xl p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 border ${isSelected ? 'bg-white/10 border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.1)]' : isUnlocked ? 'bg-white/5 border-white/5 hover:bg-white/10' : canAfford ? 'bg-slate-800/40 border-purple-500/20' : 'bg-slate-900 border-transparent opacity-60 grayscale'} hover-jitter`}>
                    <div className="w-12 h-12 rounded-lg border-2 flex items-center justify-center" style={{ backgroundColor: skin.primaryColor, borderColor: skin.innerColor, boxShadow: isUnlocked ? `0 0 20px ${skin.glowColor}` : 'none' }}>{!isUnlocked && <Lock size={16} className="text-white/40" />}</div>
                    <div className="text-[10px] font-black uppercase tracking-tight text-center leading-none">{skin.name}</div>
                    {!isUnlocked && <div className="flex items-center gap-1 text-[10px] font-black text-cyan-400 mt-0.5"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-sm" />{skin.cost}</div>}
                    {isSelected && <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-slate-950"><Check size={12} strokeWidth={4} /></div>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowShop(false)} className="group relative w-full overflow-hidden rounded-2xl p-[2px] transition-all duration-300 hover:scale-[1.02] active:scale-95 hover-jitter">
              <div className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#7c3aed_0%,#00f2ff_50%,#7c3aed_100%)]" />
              <div className="relative flex w-full items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 py-5 rounded-[0.9rem] text-white font-black text-xl transition-colors uppercase tracking-widest">Equip Module</div>
            </button>
          </div>
        </div>
      )}

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowInfo(false)}>
          <div className="bg-slate-900 border border-cyan-500/30 rounded-[3rem] p-12 max-w-sm w-full space-y-8 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="space-y-2"><Zap className="text-cyan-400 mb-1" size={24} /><h2 className="text-4xl font-black font-orbitron italic text-white tracking-tighter uppercase">Operations</h2></div>
            <div className="space-y-6">
              <div className="flex gap-5"><div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center font-black text-cyan-400 border border-cyan-500/20 flex-shrink-0">1</div><p className="text-slate-400 text-sm leading-relaxed">TAP or SPACE to Jump. Constant velocity. Navigate through the overcharged spikes.</p></div>
              <div className="flex gap-5"><div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center font-black text-cyan-400 border border-cyan-500/20 flex-shrink-0">2</div><p className="text-slate-400 text-sm leading-relaxed">Collect Plasma Cores to unlock new combat chassis in the Shop.</p></div>
            </div>
            <button onClick={() => setShowInfo(false)} className="w-full py-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xl rounded-[1.5rem] transition-all hover-jitter uppercase tracking-widest">Acknowledged</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
