import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, MapPin, ArrowUp, X, Zap, Target, 
  Compass, Radio, Layers, Maximize2, Info, Activity,
  Shield, Signal, Wifi, Battery, AlertCircle, ChevronDown,
  Clock, Heart, Share2, Settings, Search, Layout,
  Trophy, CloudSun
} from 'lucide-react';
import type { Zone } from '../types';

interface ARViewProps {
  onClose: () => void;
  destination: Zone | null;
}

export default function ARView({ onClose, destination }: ARViewProps) {
  const [distance, setDistance] = useState(54.2);
  const [rotation, setRotation] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize REAL Camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    }
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Simulated live updates for HUD
  useEffect(() => {
    const timer = setInterval(() => {
      setDistance(d => Math.max(1.5, d - 0.05));
      setRotation(r => (r + 0.2) % 360);
      if (Math.random() > 0.98) setIsLocked(l => !l);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[5000] bg-black overflow-hidden select-none font-mono text-white">
      
      {/* 1. REAL CAMERA FEED */}
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: isLocked ? 'brightness(0.5) contrast(1.4) saturate(0.5)' : 'brightness(0.7) contrast(1.1)' }}
      />
      
      {/* 2. OVERLAY FX (Neural Noise, Scanlines, Vignette) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        {/* Subtle Scanlines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))', backgroundSize: '100% 4px, 3px 100%' }} />
      </div>

      {/* 3. COMPREHENSIVE HUD OVERLAY */}
      <div className="absolute inset-0 z-20 flex flex-col pointer-events-none p-6">
        
        {/* Top Section: System & Exit */}
        <div className="flex justify-between items-start w-full">
           <div className="flex flex-col gap-2 stagger">
             <div className="flex items-center gap-3">
               <div className={`w-2.5 h-2.5 rounded-full ${isLocked ? 'bg-danger shadow-[0_0_15px_var(--danger)] animate-pulse' : 'bg-accent shadow-[0_0_15px_var(--accent)] animate-pulse'}`} />
               <div className="flex flex-col">
                 <span className="text-[0.75rem] font-black tracking-[0.3em] text-white uppercase font-display">OPTIC_NEURAL_LINK</span>
                 <span className={`text-[0.6rem] font-bold tracking-widest mt-0.5 ${isLocked ? 'text-danger' : 'text-accent'}`}>
                   STATUS: {isLocked ? 'LOCKED_TARGET' : 'SCANNING_ENVIRONMENT'}
                 </span>
               </div>
             </div>
             <div className="flex gap-4 opacity-50 pl-6">
                <div className="flex items-center gap-1.5"><Signal size={10} className="text-accent"/><span className="text-[0.55rem] font-black">5G_ULTRA</span></div>
                <div className="flex items-center gap-1.5"><Battery size={10} className="text-success"/><span className="text-[0.55rem] font-black">84%</span></div>
             </div>
           </div>

           <div className="px-5 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-3 shadow-2xl">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              <span className="text-[0.65rem] font-black tracking-[0.15em] text-white/80 font-mono">40.7128° N // 74.0060° W</span>
           </div>

           <button 
             onClick={onClose}
             className="pointer-events-auto flex items-center gap-4 group"
           >
             <div className="flex flex-col items-end group-hover:scale-105 transition-transform">
               <span className="text-[0.7rem] font-black tracking-[0.25em] text-white/40 group-hover:text-danger transition-colors uppercase">Terminate</span>
               <span className="text-[0.5rem] font-bold text-white/20 tracking-widest uppercase">Override_0x4</span>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-danger/20 group-hover:border-danger/40 group-hover:rotate-90 transition-all shadow-xl">
               <X size={20} className="text-white/60 group-hover:text-white" />
             </div>
           </button>
        </div>

        {/* Middle Section: Navigation HUD */}
        <div className="flex-1 flex items-center justify-between px-4">
           {/* Left Telemetry */}
           <div className="flex flex-col gap-6 stagger">
              <div className="px-5 py-3 bg-black/60 backdrop-blur-xl border-l-4 border-accent shadow-2xl rounded-r-xl">
                 <div className="text-[0.55rem] font-black text-accent mb-1 tracking-widest uppercase opacity-70">Elevation_Z</div>
                 <div className="text-2xl font-black tabular-nums tracking-tighter text-white">14.2<span className="text-[0.75rem] ml-1 opacity-30 font-bold">M</span></div>
              </div>
              <div className="px-5 py-3 bg-black/60 backdrop-blur-xl border-l-4 border-accent shadow-2xl rounded-r-xl">
                 <div className="text-[0.55rem] font-black text-accent mb-1 tracking-widest uppercase opacity-70">Velocity_X</div>
                 <div className="text-2xl font-black tabular-nums tracking-tighter text-white">0.8<span className="text-[0.75rem] ml-1 opacity-30 font-bold">M/S</span></div>
              </div>
           </div>

           {/* Center Reticle */}
           <div className={`relative flex flex-col items-center gap-8 transition-all duration-700 ${isLocked ? 'scale-110' : 'scale-100'}`}>
              <div className={`w-32 h-32 rounded-full border-[3px] flex items-center justify-center transition-all relative ${isLocked ? 'border-danger shadow-[0_0_60px_var(--danger)]' : 'border-accent shadow-[0_0_40px_var(--accent-glow)]'}`}>
                 <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-10" />
                 <Target size={48} className={isLocked ? 'text-danger animate-pulse' : 'text-accent'} />
                 
                 {/* Reticle Accents */}
                 <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-4 bg-accent/40" />
                 <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-4 bg-accent/40" />
                 <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-1 bg-accent/40" />
                 <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-1 bg-accent/40" />
              </div>
              
              <div className="flex flex-col items-center gap-3 animate-bounce">
                 <ArrowUp size={44} className="text-accent drop-shadow-[0_0_15px_var(--accent-glow)]" />
                 <div className="px-6 py-2 bg-accent/30 backdrop-blur-md border border-accent/40 rounded-xl shadow-2xl">
                    <span className="text-[0.75rem] font-black text-white tracking-[0.25em] uppercase font-display">Proceed_North</span>
                 </div>
              </div>
           </div>

           {/* Right Telemetry */}
           <div className="flex flex-col gap-6 stagger items-end">
              <div className="px-5 py-3 bg-black/60 backdrop-blur-xl border-r-4 border-accent shadow-2xl rounded-l-xl text-right">
                 <div className="text-[0.55rem] font-black text-accent mb-1 tracking-widest uppercase opacity-70">Heading_N</div>
                 <div className="text-2xl font-black tabular-nums tracking-tighter text-white">342°<span className="text-[0.75rem] ml-1 opacity-30 font-bold">NW</span></div>
              </div>
              <div className="px-5 py-3 bg-black/60 backdrop-blur-xl border-r-4 border-accent shadow-2xl rounded-l-xl text-right">
                 <div className="text-[0.55rem] font-black text-accent mb-1 tracking-widest uppercase opacity-70">ETA_Sync</div>
                 <div className="text-2xl font-black tabular-nums tracking-tighter text-white">01:12<span className="text-[0.75rem] ml-1 opacity-30 font-bold">MIN</span></div>
              </div>
           </div>
        </div>

        {/* Bottom Section: Map & Info */}
        <div className="flex justify-between items-end w-full">
           {/* Mini-Map */}
           <div className="w-28 h-28 rounded-3xl bg-black/70 border border-white/20 overflow-hidden relative shadow-2xl pointer-events-auto cursor-pointer group">
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-success rounded-full animate-pulse shadow-[0_0_15px_var(--success)]" />
              <div className="absolute top-[20%] left-[65%] w-2 h-2 bg-accent rounded-full opacity-40" />
              <div className="absolute bottom-[30%] left-[25%] w-2 h-2 bg-accent rounded-full opacity-60" />
              <div className="absolute inset-0 border-2 border-white/0 group-hover:border-accent/60 transition-all rounded-3xl" />
              <div className="absolute bottom-2 left-3 text-[0.45rem] font-black opacity-30 uppercase tracking-widest">Sector_014</div>
           </div>

           {/* Destination Info Card */}
           {destination && (
             <div className="pointer-events-auto animate-slide-up">
                <div className="card p-10 w-[420px] relative overflow-hidden border-accent/40 bg-black/70 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-[40px]">
                   <div className="absolute -right-24 -top-24 w-48 h-48 bg-accent/15 blur-[100px]" />
                   <div className="flex justify-between items-start mb-8">
                     <div>
                       <div className="flex items-center gap-2.5 mb-2.5">
                          <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                          <span className="text-[0.65rem] font-black tracking-[0.3em] text-accent uppercase font-display">Target_Acquired</span>
                       </div>
                       <h2 className="text-3xl font-black tracking-tight leading-none text-white">{destination.name}</h2>
                       <div className="flex items-center gap-2 mt-3 opacity-40">
                          <MapPin size={12} />
                          <span className="text-[0.6rem] font-bold tracking-[0.2em] uppercase">Stadium_Sector_0{destination.id}</span>
                       </div>
                     </div>
                     <div className="text-right">
                        <div className="text-5xl font-black tabular-nums tracking-tighter text-white">{distance.toFixed(1)}<span className="text-lg opacity-30 ml-2">M</span></div>
                        <span className="text-[0.6rem] font-black opacity-30 tracking-[0.4em] uppercase">Range_Direct</span>
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
                      <div className="flex items-center gap-5 group">
                         <div className="w-14 h-14 rounded-2xl bg-success/15 flex items-center justify-center text-success group-hover:scale-110 transition-transform shadow-lg"><Activity size={24} /></div>
                         <div><div className="text-[0.55rem] font-black opacity-30 uppercase tracking-widest mb-1">Flow_Stat</div><div className="text-sm font-black text-success">OPTIMAL_FLOW</div></div>
                      </div>
                      <div className="flex items-center gap-5 group">
                         <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center text-accent group-hover:scale-110 transition-transform shadow-lg"><Clock size={24} /></div>
                         <div><div className="text-[0.55rem] font-black opacity-30 uppercase tracking-widest mb-1">Wait_Est</div><div className="text-sm font-black text-accent">~2.4 MIN</div></div>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* Compass */}
           <div className="relative w-28 h-28 flex items-center justify-center pointer-events-auto">
             <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
             <Compass size={44} className="text-white/20" style={{ transform: `rotate(${rotation}deg)` }} />
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-2 h-2 bg-accent rounded-full shadow-[0_0_20px_var(--accent)]" />
             <span className="absolute top-4 text-[0.7rem] font-black text-accent">N</span>
             <div className="absolute bottom-4 text-[0.55rem] font-mono opacity-40 font-black">{Math.round(rotation)}°</div>
           </div>
        </div>
      </div>

      {/* 7. SCAN EFFECT */}
      <div className="absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b from-accent/10 to-transparent animate-scan pointer-events-none" />

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .animate-scan { animation: scan 4s linear infinite; }
        .animate-spin-slow { animation: spin 15s linear infinite; }
        .animate-pulse-slow { animation: pulse 4s ease-in-out infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.05); } }
      `}</style>
    </div>
  );
}
