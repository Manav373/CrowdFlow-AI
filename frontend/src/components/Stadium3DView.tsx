import React, { useState, useMemo, useEffect } from 'react';
import type { Zone, GroupMember } from '../types';
import './Stadium3DView.css';
import { Activity, Shield, MapPin, Zap, Utensils, ShoppingBag, Clock, Heart, Navigation, ArrowLeft, Users } from 'lucide-react';

interface Stadium3DViewProps { 
  zones: Zone[]; 
  onZoneSelect?: (zone: Zone | null) => void; 
  onNavigate?: (zone: Zone) => void;
  friends?: GroupMember[];
  userLocation?: { lat: number, lng: number, name: string };
}

const BASE_LAT = 40.7128;
const BASE_LNG = -74.0060;
const OFFSET = 0.001;

// ── helpers ──────────────────────────────────────────────────────────────────
const CX=350, CY=355;
const toRad=(d:number)=>(d-90)*Math.PI/180;
const cpt=(r:number,d:number)=>({x:+(CX+r*Math.cos(toRad(d))).toFixed(2),y:+(CY+r*Math.sin(toRad(d))).toFixed(2)});
const span=(s:number,e:number)=>(e-s+360)%360||360;

const mapToSvg = (lat: number, lng: number) => {
  const dy = (lat - (BASE_LAT + 0.003)) / OFFSET;
  const dx = (lng - (BASE_LNG + 0.0025)) / OFFSET;
  return { x: CX + dx * 80, y: CY - dy * 80 };
};

const getAvatarColor = (name: string) => {
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

function arcD(or_:number,ir:number,s:number,e:number,gap=1.5):string{
  const sa=toRad((s+gap/2+360)%360), ea=toRad((e-gap/2+360)%360);
  const sp=span(s+gap/2,e-gap/2); const lg=sp>180?1:0;
  const f=(n:number)=>n.toFixed(2);
  const ox1=f(CX+or_*Math.cos(sa)),oy1=f(CY+or_*Math.sin(sa));
  const ox2=f(CX+or_*Math.cos(ea)),oy2=f(CY+or_*Math.sin(ea));
  const ix1=f(CX+ir*Math.cos(sa)), iy1=f(CY+ir*Math.sin(sa));
  const ix2=f(CX+ir*Math.cos(ea)), iy2=f(CY+ir*Math.sin(ea));
  return `M${ox1} ${oy1}A${or_} ${or_} 0 ${lg} 1 ${ox2} ${oy2}L${ix2} ${iy2}A${ir} ${ir} 0 ${lg} 0 ${ix1} ${iy1}Z`;
}

function midPt(r:number,s:number,e:number){const m=(s+span(s,e)/2+360)%360;return cpt(r,m);}
function dc(d:number){
  if(d>0.85)return{fill:'#ef4444',dim:'#7f1d1d',label:'CRITICAL',bg:'rgba(239,68,68,0.12)',pulse:true};
  if(d>0.5) return{fill:'#f59e0b',dim:'#78350f',label:'BUSY', bg:'rgba(245,158,11,0.12)',pulse:false};
  return           {fill:'#22c55e',dim:'#14532d',label:'CLEAR', bg:'rgba(34,197,94,0.12)',pulse:false};
}

// Map the granular backend zones to SVG sections
const RAW = [
  // North Stand
  {id:'s1-1', name:'Section A', s:330, e:355, t:'L', z:'s1'},
  {id:'s1-2', name:'Section A Upper', s:330, e:355, t:'U', z:'s1'},
  {id:'s8-1', name:'Press Gallery', s:355, e:5,   t:'L', z:'s8'},
  {id:'s2-1', name:'Section B', s:5,   e:30,  t:'L', z:'s2'},
  {id:'s2-2', name:'Section B Upper', s:5,   e:30,  t:'U', z:'s2'},

  // East Stand
  {id:'s3-1', name:'Section C North', s:40,  e:85,  t:'L', z:'s3'},
  {id:'s3-2', name:'Section C South', s:95,  e:140, t:'L', z:'s3'},
  {id:'s3-u', name:'East Upper', s:40,  e:140, t:'U', z:'s3'},

  // South Stand
  {id:'s4-1', name:'Section D', s:150, e:175, t:'L', z:'s4'},
  {id:'s4-2', name:'Section D Upper', s:150, e:175, t:'U', z:'s4'},
  {id:'s5-1', name:'Section E Main', s:185, e:215, t:'L', z:'s5'},
  {id:'s5-2', name:'Section E Upper', s:185, e:215, t:'U', z:'s5'},

  // West Stand
  {id:'s6-1', name:'Section F', s:225, e:260, t:'L', z:'s6'},
  {id:'s6-2', name:'Section F Upper', s:225, e:260, t:'U', z:'s6'},
  {id:'s7-1', name:'VIP Box', s:270, e:320, t:'L', z:'s7'},
  {id:'s7-2', name:'VIP Upper', s:270, e:320, t:'U', z:'s7'},

  // Gates
  {id:'g1', name:'North Gate (VIP)', s:355, e:5, t:'G', z:'g1'},
  {id:'g2', name:'East Gate', s:85, e:95, t:'G', z:'g2'},
  {id:'g3', name:'South Gate', s:175, e:185, t:'G', z:'g3'},
  {id:'g4', name:'West Gate', s:260, e:270, t:'G', z:'g4'},
] as const;

const AMEN = [
  {icon: <Utensils size={14}/>, a: 35, z:'f1', name:'Taco Bell', color: '#f59e0b'},
  {icon: <Utensils size={14}/>, a: 45, z:'f2', name:'Starbucks', color: '#10b981'},
  {icon: <Utensils size={14}/>, a: 145, z:'f3', name:'Burger King', color: '#f59e0b'},
  {icon: <Utensils size={14}/>, a: 155, z:'f4', name:'Beer Garden', color: '#f59e0b'},
  {icon: <Utensils size={14}/>, a: 220, z:'f5', name:'Pizza Hut', color: '#ef4444'},
  {icon: <ShoppingBag size={14}/>, a: 215, z:'m1', name:'Main Store', color: '#6366f1'},
  {icon: <ShoppingBag size={14}/>, a: 95, z:'m2', name:'Fan Merch', color: '#6366f1'},
  {icon: <Heart size={14}/>, a: 265, z:'med1', name:'Medical', color: '#ef4444'},
  {icon: <Clock size={14}/>, a: 355, z:'e1', name:'Exit North', color: '#fff'},
] as const;

function useSections(zones: Zone[]) {
  return useMemo(() => {
    const zm = Object.fromEntries(zones.map(z => [z.id, z]));
    const zspan: Record<string, number> = {};
    RAW.forEach(r => { if (r.t !== 'G') { const sp = span(r.s, r.e); zspan[r.z] = (zspan[r.z] || 0) + sp; } });
    return RAW.map(r => {
      const zone = zm[r.z];
      const sp = span(r.s, r.e);
      const ratio = zspan[r.z] > 0 ? sp / zspan[r.z] : 0;
      const people = zone ? Math.round(zone.current_people * ratio) : 0;
      const cap = zone ? Math.round(zone.capacity * ratio) : 50;
      const density = cap > 0 ? people / cap : 0;
      return { ...r, zone, people, cap, density, sp };
    });
  }, [zones]);
}

function Overview({ sections, zones, onSelect, friends = [], userLocation }: any) {
  const [hov, setHov] = useState<string | null>(null);
  const [isHeatmap, setIsHeatmap] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<GroupMember | null>(null);
  const zm = Object.fromEntries(zones.map((z: Zone) => [z.id, z]));

  return (
    <div className="s3-overview animate-fade-in">
      <div className="s3-controls-overlay">
        <div className="badge badge-accent shadow-lg mb-2">ENGINE v3.2 ACTIVE</div>
        <button className={`btn ${isHeatmap ? 'btn-primary' : 'btn-secondary'} w-full text-[0.65rem]`} onClick={() => setIsHeatmap(!isHeatmap)}>
          {isHeatmap ? '🔥 Heatmap Active' : '📊 Standard View'}
        </button>
      </div>

      <svg viewBox="0 0 700 710" className="s3-main-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bgG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#0f172a"/><stop offset="100%" stopColor="#020617"/></radialGradient>
          <radialGradient id="fieldG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#166534"/><stop offset="100%" stopColor="#064e3b"/></radialGradient>
          <pattern id="grassMow" x="0" y="0" width="100" height="40" patternUnits="userSpaceOnUse">
             <rect width="100" height="20" fill="rgba(255,255,255,0.03)"/>
          </pattern>
          <filter id="neon"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="fGlow"><feGaussianBlur stdDeviation="4"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.8 0 0 0 0 1 0 0 0 0.5 0"/></filter>
        </defs>

        {/* Stadium Structure Outer */}
        <circle cx={CX} cy={CY} r={345} fill="rgba(255,255,255,0.02)"/>
        <circle cx={CX} cy={CY} r={335} fill="url(#bgG)" stroke="#1e293b" strokeWidth="2"/>
        
        {/* Tier Backgrounds */}
        <circle cx={CX} cy={CY} r={320} fill="#0f172a" stroke="#1e293b" strokeWidth="4"/>
        <circle cx={CX} cy={CY} r={295} fill="#020617"/>
        <circle cx={CX} cy={CY} r={220} fill="#0f172a" stroke="#1e293b" strokeWidth="2"/>

        {/* Sections */}
        {sections.map((sec: any) => {
          const { fill, dim, pulse } = dc(sec.density);
          const isHov = hov === sec.id;
          const or_ = sec.t === 'U' ? 320 : 295;
          const ir = sec.t === 'U' ? 300 : 225;
          const isGate = sec.t === 'G';
          const mp = midPt((or_+ir)/2, sec.s, sec.e);
          
          return (
            <g key={sec.id} onMouseEnter={() => setHov(sec.id)} onMouseLeave={() => setHov(null)} onClick={() => onSelect(sec, sec.people, sec.cap, sec.density, sec.zone)} className="cursor-pointer transition-all">
              <path d={arcD(or_, ir, sec.s, sec.e, isGate ? 0.5 : 2)}
                fill={isGate ? '#334155' : (isHeatmap ? (pulse ? fill : dim) : (isHov ? fill : dim))}
                stroke={isHov ? fill : 'rgba(255,255,255,0.05)'}
                strokeWidth={isHov ? 2 : 1}
                className={isHeatmap && pulse ? 's3-pulse-zone' : ''}
              />
              {/* Density Dots Visualization */}
              {sec.t !== 'G' && Array.from({length: Math.floor(sec.density * 10)}).map((_, i) => {
                const dp = midPt((or_+ir)/2 + (Math.random()-0.5)*15, sec.s + (Math.random()*sec.sp), sec.s + (Math.random()*sec.sp));
                return <circle key={i} cx={dp.x} cy={dp.y} r={1.5} fill={fill} opacity={0.4}/>
              })}
              {isHov && !isGate && <text x={mp.x} y={mp.y+3} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="900" filter="url(#neon)">{Math.round(sec.density * 100)}%</text>}
            </g>
          );
        })}

        {/* Center Pitch & Turf */}
        <ellipse cx={CX} cy={CY} rx={210} ry={155} fill="#14532d" opacity={0.5}/>
        <ellipse cx={CX} cy={CY} rx={200} ry={145} fill="url(#fieldG)"/>
        <ellipse cx={CX} cy={CY} rx={200} ry={145} fill="url(#grassMow)"/>
        
        {/* Field Markings (Cricket Style) */}
        <ellipse cx={CX} cy={CY} rx={199} ry={144} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        <ellipse cx={CX} cy={CY} rx={80} ry={60} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="5 5"/>
        <rect x={CX-8} y={CY-50} width={16} height={100} rx={1} fill="#b45309" opacity={0.8}/>
        <line x1={CX-8} y1={CY-30} x2={CX+8} y2={CY-30} stroke="#fff" strokeWidth="1" opacity={0.5}/>
        <line x1={CX-8} y1={CY+30} x2={CX+8} y2={CY+30} stroke="#fff" strokeWidth="1" opacity={0.5}/>

        {/* Floodlights */}
        {[45, 135, 225, 315].map(deg => {
          const p = cpt(340, deg);
          return (
            <g key={deg}>
              <circle cx={p.x} cy={p.y} r={6} fill="#334155" stroke="#fff" strokeWidth="1"/>
              <path d={`M${p.x} ${p.y} L${CX} ${CY}`} stroke="url(#lightBeam)" strokeWidth="40" opacity={0.05}/>
            </g>
          );
        })}

        {/* Amenities Icons */}
        {AMEN.map((a, i) => {
          const zone = zm[a.z];
          const d = zone ? zone.current_people / zone.capacity : 0;
          const { fill } = dc(d);
          const p = cpt(262, a.a);
          const isH = hov === `amen-${i}`;
          return (
            <g key={i} onMouseEnter={() => setHov(`amen-${i}`)} onMouseLeave={() => setHov(null)} onClick={() => zone && onSelect({id:`amen-${i}`, name:a.name, t:'A', z:a.z} as any, zone.current_people, zone.capacity, d, zone)} className="cursor-pointer">
              <circle cx={p.x} cy={p.y} r={14} fill="#020617" stroke={isH ? a.color : fill} strokeWidth="2" className={d > 0.8 ? 's3-pulse-zone' : ''}/>
              <foreignObject x={p.x-7} y={p.y-7} width="14" height="14">
                <div style={{ color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a.icon}</div>
              </foreignObject>
              {isH && (
                <g>
                   <rect x={p.x-40} y={p.y-40} width={80} height={20} rx={10} fill="rgba(0,0,0,0.9)" />
                   <text x={p.x} y={p.y-27} textAnchor="middle" fill="#fff" fontSize="7" fontWeight="800">{a.name}</text>
                </g>
              )}
            </g>
          );
        })}

        {/* Scoreboards */}
        <rect x={CX-100} y={CY-280} width={200} height={30} rx={4} fill="#000" stroke="#334155"/>
        <text x={CX} y={CY-262} textAnchor="middle" fill="var(--success)" fontSize="10" className="font-mono animate-pulse">HOME 124/2 (15.2) • CR-FLOW ARENA</text>

        {/* Friends */}
        {friends.map(friend => {
          const { x, y } = mapToSvg(friend.lat, friend.lng);
          const color = getAvatarColor(friend.name);
          return (
            <g key={friend.userId} onClick={(e) => { e.stopPropagation(); setSelectedFriend(friend === selectedFriend ? null : friend); }} className="cursor-pointer">
              <circle cx={x} cy={y} r={12} fill={color} stroke="#fff" strokeWidth="2" filter="url(#fGlow)"/>
              <text x={x} y={y+4} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="900">{friend.name[0]}</text>
              {selectedFriend?.userId === friend.userId && (
                <g className="animate-slide-up">
                  <rect x={x-45} y={y-45} width={90} height={28} rx={14} fill="rgba(0,0,0,0.9)" stroke={color} strokeWidth="1"/>
                  <text x={x} y={y-27} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="800">{friend.name}</text>
                </g>
              )}
            </g>
          );
        })}

        {/* Current User Marker */}
        {userLocation && (
          <g className="user-marker" style={{ pointerEvents: 'none' }}>
            {(() => {
              const { x, y } = mapToSvg(userLocation.lat, userLocation.lng);
              return (
                <>
                  <circle cx={x} cy={y} r="20" fill="var(--accent)" fillOpacity="0.1" className="animate-ping" />
                  <circle cx={x} cy={y} r="8" fill="var(--accent)" stroke="white" strokeWidth="2" />
                  <text x={x} y={y - 12} textAnchor="middle" className="text-[10px] font-black fill-white uppercase tracking-widest drop-shadow-lg">{userLocation.name}</text>
                </>
              );
            })()}
          </g>
        )}

        <text x={CX} y={20} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="14" fontWeight="900" letterSpacing="8" className="font-display">CROWDFLOW ARENA</text>
      </svg>
    </div>
  );
}

function DetailView({ secName, tier, people, cap, density, zone, onBack, onNavigate }: any) {
  const { fill, label, bg } = dc(density);
  const pct = Math.round(density * 100);
  const wait = zone ? Math.ceil(zone.current_people / (zone.service_rate || 1)) : 0;
  
  // Randomize seats based on density for a more organic look
  const seats = useMemo(() => {
    return Array.from({ length: 12 }, () => 
      Array.from({ length: 18 }, () => Math.random() < density)
    );
  }, [density, zone?.id]);

  return (
    <div className="s3-detail animate-slide-up">
      <div className="s3-detail-header" style={{ borderColor: fill, background: `linear-gradient(180deg, ${fill}22 0%, transparent 100%)` }}>
        <button className="icon-btn" onClick={onBack}><ArrowLeft size={18}/></button>
        <div className="flex-1 px-4">
          <div className="text-xl font-black">{secName}</div>
          <div className="text-[0.6rem] font-bold opacity-50 uppercase tracking-widest">{tier === 'U' ? 'Upper Deck' : tier === 'L' ? 'Field Level' : 'Arena Service'}</div>
        </div>
        <div className="badge" style={{ background: fill, color: '#000' }}>{label}</div>
      </div>

      <div className="stat-row-4 gap-3 mb-8 stagger">
        {[
          { v: people, l: 'PRESENT', c: fill, i: Users, bg: 'rgba(255,255,255,0.03)' },
          { v: cap, l: 'MAX_CAP', c: '#94a3b8', i: Shield, bg: 'rgba(255,255,255,0.03)' },
          { v: `${wait}m`, l: 'WAIT_EST', c: wait > 10 ? 'var(--warning)' : 'var(--success)', i: Clock, bg: 'rgba(255,255,255,0.03)' },
          { v: `${pct}%`, l: 'LOAD_FAC', c: fill, i: Activity, bg: 'rgba(255,255,255,0.03)' },
        ].map((s, i) => (
          <div key={i} className="card p-4 flex flex-col items-center border-white/5 shadow-xl hover:translate-y-[-4px] transition-all duration-300 animate-float" style={{ background: s.bg, animationDelay: `${i * 0.1}s` }}>
            <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center shadow-inner" style={{ background: `${s.c}15`, border: `1px solid ${s.c}30` }}>
              <s.i size={18} color={s.c} />
            </div>
            <div className="font-black text-lg tracking-tighter" style={{ color: s.c }}>{s.v}</div>
            <div className="text-[0.55rem] font-black opacity-30 tracking-widest mt-1 uppercase">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="s3-seat-stage mb-6">
        <div className="s3-stadium-lights">
           <div className="s3-light-beam" style={{ '--color': fill } as any} />
        </div>
        <div className="s3-tribune-container">
           <div className="s3-seat-grid" style={{ gridTemplateColumns: 'repeat(18, 1fr)' }}>
             {seats.map((row, ri) => (
               <div key={ri} className="s3-seat-row">
                 {row.map((occ, ci) => (
                   <div key={ci} className={`s3-seat ${occ ? 's3-seat--occ' : 's3-seat--free'}`} style={{ '--sc': fill } as any}>
                      <div className="s3-seat-back" />
                      <div className="s3-seat-cushion" />
                   </div>
                 ))}
               </div>
             ))}
           </div>
        </div>
      </div>

      <div className="flex gap-4 mt-4">
        <button className="btn btn-secondary flex-1 py-4 rounded-2xl font-black tracking-widest" onClick={onBack}>RETURN</button>
        {zone && (
          <button className="btn btn-primary flex-[2] py-4 rounded-2xl font-black tracking-widest shadow-[0_8px_30px_var(--accent-glow)]" onClick={() => onNavigate(zone)}>
            INITIATE NAVIGATION <Navigation size={16} className="ml-2 animate-pulse"/>
          </button>
        )}
      </div>
    </div>
  );
}

export default function Stadium3DView({ zones, onZoneSelect, onNavigate, friends }: Stadium3DViewProps) {
  const sections = useSections(zones);
  const [sel, setSel] = useState<any>(null);
  const handleSelect = (sec: any, people: number, cap: number, density: number, zone: any) => {
    setSel({ name: sec.name, tier: sec.t, people, cap, density, zone });
    onZoneSelect?.(zone || null);
  };
  return (
    <div className="s3-root">
      {sel
        ? <DetailView secName={sel.name} tier={sel.tier} people={sel.people} cap={sel.cap} density={sel.density} zone={sel.zone} onBack={() => setSel(null)} onNavigate={onNavigate} />
        : <Overview sections={sections} zones={zones} onSelect={handleSelect} friends={friends} />
      }
    </div>
  );
}
