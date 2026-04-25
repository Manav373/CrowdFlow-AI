import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Zone, Alert, GroupMember, Ticket } from '../types.ts';
import Stadium3DView from '../components/Stadium3DView.tsx';
import ARView from '../components/ARView.tsx';
import VoiceAssistant from '../components/VoiceAssistant.tsx';
import { 
  Bell, MapPin, Clock, ArrowLeft, Navigation, Utensils, Send,
  Navigation as NavigationIcon, LocateFixed, Users, ShoppingBag, 
  BarChart3, Camera, Mic, Ticket as TicketIcon, Sparkles, LogOut,
  ChevronRight, Info, Zap, AlertTriangle, ShieldCheck, MessageSquare,
  Search, Heart, Shield, Activity, Filter, Home, CloudSun, Trophy
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { io, Socket } from 'socket.io-client';

const BASE_LAT = 40.7128;
const BASE_LNG = -74.0060;

interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  text: string;
  timestamp: number;
}

export default function AttendeeApp({ stadiumState }: { stadiumState: { zones: Zone[], alerts: Alert[] } }) {
  const { user } = useUser();
  const userId = user?.id || 'anonymous';
  const userName = user?.firstName || user?.username || 'Fan';

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'explore' | 'group' | 'safety' | 'analytics'>('map');
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const [isCelebration, setIsCelebration] = useState(false);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'FOOD' | 'MERCH' | 'RESTROOM' | 'SEATING'>('ALL');

  // States for features
  const [isAROpen, setIsAROpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [groupCode, setGroupCode] = useState('');
  const [myGroup, setMyGroup] = useState<{ id: string, members: GroupMember[] } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [myTicket, setMyTicket] = useState<Ticket | null>(null);
  const [destination, setDestination] = useState<Zone | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Geolocation state
  const [userLat, setUserLat] = useState<number>(BASE_LAT);
  const [userLng, setUserLng] = useState<number>(BASE_LNG);
  const [isMocking, setIsMocking] = useState(true);
  const [currentUserZone, setCurrentUserZone] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 0. Initialize Socket
  useEffect(() => {
    socketRef.current = io('http://localhost:3001');
    socketRef.current.on('connect', () => {
      if (myGroup?.id) socketRef.current?.emit('joinGroup', myGroup.id);
    });

    socketRef.current.on('global-event', (data: { type: string, message: string }) => {
      if (data.type === 'CELEBRATE') {
        setIsCelebration(true);
        document.body.classList.add('celebration-flash');
        setTimeout(() => {
          setIsCelebration(false);
          document.body.classList.remove('celebration-flash');
        }, 5000);
      }
    });

    return () => { socketRef.current?.disconnect(); };
  }, [myGroup?.id]);

  // 1. Alert Sync
  useEffect(() => {
    if (stadiumState.alerts) {
      setNotifications(stadiumState.alerts.slice(0, 3));
    }
  }, [stadiumState.alerts]);

  // 2. GPS / Mock Location Sync & Zone Detection
  useEffect(() => {
    let watchId: number;
    let mockInterval: ReturnType<typeof setInterval>;

    const sendLocation = (lat: number, lng: number) => {
      if (isOffline || !socketRef.current) return;
      socketRef.current.emit('updateLocation', {
        userId, name: userName, groupId: myGroup?.id,
        latitude: lat, longitude: lng, timestamp: Date.now()
      });

      const zone = stadiumState.zones.find(z => 
        lat >= z.latMin && lat <= z.latMax && lng >= z.lngMin && lng <= z.lngMax
      );
      if (zone?.id !== currentUserZone) {
        setCurrentUserZone(zone?.id || null);
        if (zone) {
          document.body.classList.add('zone-transition');
          setTimeout(() => document.body.classList.remove('zone-transition'), 500);
        }
      }
    };

    if (isMocking) {
      mockInterval = setInterval(() => {
        const newLat = userLat + (Math.random() - 0.5) * 0.0003;
        const newLng = userLng + (Math.random() - 0.5) * 0.0003;
        setUserLat(newLat); setUserLng(newLng);
        sendLocation(newLat, newLng);
      }, 3000);
    } else {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition((p) => {
          setUserLat(p.coords.latitude); setUserLng(p.coords.longitude);
          sendLocation(p.coords.latitude, p.coords.longitude);
        }, undefined, { enableHighAccuracy: true });
      }
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (mockInterval) clearInterval(mockInterval);
    };
  }, [isMocking, isOffline, userLat, userLng, myGroup?.id, userName, userId, stadiumState.zones, currentUserZone]);

  // 3. Group Tracking & Chat Logic
  useEffect(() => {
    if (myGroup?.id && socketRef.current) {
      const groupEvent = `group-${myGroup.id}`;
      const msgEvent = `squad-msg-${myGroup.id}`;

      socketRef.current.on(groupEvent, (data: { members: Record<string, any> }) => {
        const members: GroupMember[] = Object.entries(data.members).map(([id, info]: [string, any]) => ({
          userId: id, name: info.name, lat: info.lat, lng: info.lng, zone: info.zone
        }));
        setMyGroup(prev => prev ? { ...prev, members } : null);
      });

      socketRef.current.on(msgEvent, (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
      });

      return () => {
        socketRef.current?.off(groupEvent);
        socketRef.current?.off(msgEvent);
      };
    }
  }, [myGroup?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateGroup = async () => {
    try {
      const res = await fetch('http://localhost:3001/create-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      setGroupCode(data.code);
      setMyGroup({ id: data.groupId, members: [{ userId, name: userName, lat: userLat, lng: userLng }] });
      socketRef.current?.emit('joinGroup', data.groupId);
    } catch (e) { console.error(e); }
  };

  const handleJoinGroup = async (code: string) => {
    try {
      const res = await fetch('http://localhost:3001/join-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code })
      });
      const data = await res.json();
      if (data.groupId) {
        setMyGroup({ id: data.groupId, members: [] });
        socketRef.current?.emit('joinGroup', data.groupId);
      }
    } catch (e) { console.error(e); }
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !myGroup?.id) return;
    socketRef.current?.emit('squadMessage', { groupId: myGroup.id, userId, name: userName, text: chatInput });
    setChatInput('');
  };

  const handleScanTicket = () => {
    const mockTicket: Ticket = { gate: 'North Gate (VIP)', section: 'Section A', seat: 'Row 12, Seat 4', zoneId: 's1' };
    setMyTicket(mockTicket);
    const zone = stadiumState.zones.find(z => z.id === mockTicket.zoneId);
    if (zone) setDestination(zone);
  };

  const aiInsights = useMemo(() => {
    const zones = stadiumState.zones;
    if (!zones.length) return [];
    const insights = [];
    const gates = zones.filter(z => z.type === 'GATE');
    const bestGate = gates.reduce((prev, curr) => (curr.current_people / curr.capacity < prev.current_people / prev.capacity) ? curr : prev, gates[0]);
    if (bestGate) insights.push({ type: 'ROUTE', title: 'OPTIMAL ENTRY', message: `Use ${bestGate.name}. Only ${Math.round((bestGate.current_people/bestGate.capacity)*100)}% full.`, target: bestGate, icon: Navigation });
    const facilities = zones.filter(z => z.type === 'FOOD' || z.type === 'MERCH');
    const quickest = facilities.reduce((prev, curr) => (curr.current_people / curr.service_rate < prev.current_people / prev.service_rate) ? curr : prev, facilities[0]);
    if (quickest) insights.push({ type: 'QUICK', title: 'FASTEST SERVICE', message: `${quickest.name}: Estimated wait ${Math.ceil(quickest.current_people/quickest.service_rate)}m.`, target: quickest, icon: Zap });
    return insights;
  }, [stadiumState.zones]);

  const zoneTheme = useMemo(() => {
    const zone = stadiumState.zones.find(z => z.id === currentUserZone);
    if (!zone) return { color: 'var(--accent)', bg: 'var(--bg-primary)', label: 'SEARCHING...' };
    if (zone.type === 'FOOD') return { color: 'var(--warning)', bg: 'rgba(245,158,11,0.05)', label: zone.name };
    if (zone.type === 'SEATING') return { color: 'var(--success)', bg: 'rgba(16,185,129,0.05)', label: zone.name };
    if (zone.type === 'GATE') return { color: 'var(--info)', bg: 'rgba(59,130,246,0.05)', label: zone.name };
    return { color: 'var(--accent)', bg: 'var(--bg-primary)', label: zone.name };
  }, [currentUserZone, stadiumState.zones]);

  const filteredZones = useMemo(() => {
    return stadiumState.zones.filter(z => {
      const matchSearch = z.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = activeFilter === 'ALL' || z.type === activeFilter;
      return matchSearch && matchFilter;
    });
  }, [stadiumState.zones, searchQuery, activeFilter]);

  const TabButton = ({ id, icon: Icon, label }: any) => (
    <button className={`nav-item ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)} style={{ '--active-color': zoneTheme.color } as any}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="mobile-container animate-fade-in" style={{ '--dynamic-accent': zoneTheme.color, background: zoneTheme.bg } as any}>
      
      {/* 🏟️ ULTIMATE HEADER */}
      <header className="glass-header shadow-2xl p-6" style={{ borderBottom: `1px solid ${zoneTheme.color}33`, background: `${zoneTheme.bg}dd` }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div 
               className="avatar shadow-xl ring-2 ring-white/10" 
               style={{ 
                 background: user?.imageUrl ? `url(${user.imageUrl}) center/cover` : `linear-gradient(135deg, ${zoneTheme.color}, var(--accent-2))`,
                 overflow: 'hidden'
               }}
             >
               {!user?.imageUrl && userName[0]}
             </div>
             <div>
               <h1 className="font-display text-sm font-black tracking-tight">{userName}</h1>
               <div className="flex items-center gap-2 mt-0.5">
                 <div className="status-dot live" style={{ background: zoneTheme.color }} />
                 <span style={{ fontSize: '0.6rem', color: zoneTheme.color, fontWeight: 800, letterSpacing: '0.05em' }}>{zoneTheme.label.toUpperCase()}</span>
               </div>
             </div>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col items-end mr-2">
               <div className="flex items-center gap-1.5 text-[0.6rem] font-bold opacity-40"><CloudSun size={10}/> 72°F</div>
               <div className="text-[0.55rem] font-black tracking-widest text-accent uppercase">Arena Clear</div>
            </div>
            <button className="icon-btn bg-white/5" onClick={() => setIsVoiceOpen(true)}><Mic size={18}/></button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-5 pb-32">
        
        {/* 🏆 LIVE MATCH FEED (STADIUM ATMOSPHERE) */}
        {activeTab === 'map' && (
          <div className={`card-hero mb-6 transition-all duration-700 overflow-hidden ${isCelebration ? 'scale-[1.02] shadow-[0_0_50px_rgba(245,158,11,0.3)] border-warning' : 'border-white/5'}`} 
               style={{ background: isCelebration ? 'linear-gradient(135deg, #78350f 0%, #451a03 100%)' : 'rgba(255,255,255,0.03)' }}>
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isCelebration ? 'bg-warning animate-bounce' : 'bg-white/5'}`}>
                    <Trophy size={18} className={isCelebration ? 'text-black' : 'text-accent'} />
                  </div>
                  <div>
                    <div className="text-[0.6rem] font-black opacity-50 uppercase tracking-widest">{isCelebration ? 'GOAL CELEBRATION' : 'LIVE MATCH STATUS'}</div>
                    <div className="text-sm font-black">{isCelebration ? 'TEAM HOME SCORED!!!' : 'HOME 124/2 • AWAY 0/0'}</div>
                  </div>
               </div>
               <div className="text-right">
                  <div className="text-[0.6rem] font-bold opacity-40">OVERS</div>
                  <div className="text-lg font-black tabular-nums">15.2</div>
               </div>
            </div>
            {isCelebration && (
              <div className="mt-4 p-2 bg-warning/20 border border-warning/30 rounded-xl text-center">
                 <span className="text-[0.65rem] font-black text-warning animate-pulse">ATMOSPHERE SURGE DETECTED • SYNCING CROWD LIGHTS</span>
              </div>
            )}
          </div>
        )}

        {(activeTab === 'map' || activeTab === 'explore') && (
          <div className="relative mb-6 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity" size={16}/>
            <input 
              placeholder="Search sections, food, or gates..."
              className="pl-11 pr-4 py-4 bg-white/5 border-white/5 rounded-2xl text-sm font-medium w-full focus:bg-white/10 focus:border-accent/30 transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => activeTab !== 'explore' && setActiveTab('explore')}
            />
          </div>
        )}

        {activeTab === 'map' && (
          <div className="animate-fade-in stagger">
            <div className="flex justify-between items-end mb-4">
               <div>
                 <h2 className="font-display font-black text-xl">Spatial Sync</h2>
                 <p className="text-[0.65rem] font-bold text-secondary uppercase tracking-widest mt-1">Live Engine v3.2</p>
               </div>
               <button onClick={() => setIsAROpen(true)} className="btn btn-secondary px-4 py-2 text-[0.65rem] rounded-full shadow-lg">
                 <Camera size={14} className="mr-1"/> AR VIEW
               </button>
            </div>
            
            <div className="card p-2 bg-black/40 rounded-[32px] border-white/5 shadow-2xl mb-6">
              <Stadium3DView 
                zones={stadiumState.zones} 
                onZoneSelect={setSelectedZone} 
                onNavigate={setDestination} 
                friends={myGroup?.members || []} 
                userLocation={{ lat: userLat, lng: userLng, name: userName }}
              />
            </div>

            {destination && (
              <div className="card-hero mb-6 animate-slide-up border-accent/20" style={{ background: 'rgba(99,102,241,0.08)' }}>
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="nav-icon-pulse" style={{ background: zoneTheme.color }}><NavigationIcon size={20}/></div>
                      <div>
                        <div className="stat-label">AI Routed</div>
                        <div className="text-lg font-black">{destination.name}</div>
                      </div>
                    </div>
                    <button onClick={() => setDestination(null)} className="icon-btn hover:text-danger"><LogOut size={16}/></button>
                 </div>
                 <div className="divider my-4"/>
                 <div className="stat-row-2">
                    <div className="flex items-center gap-2"><Clock size={14} style={{ color: zoneTheme.color }}/><span className="text-xs font-black">~{Math.ceil(Math.random() * 4 + 2)}m arrival</span></div>
                    <div className="flex justify-end"><div className="badge badge-success animate-pulse">Optimal Path</div></div>
                 </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4 mb-8">
               {[
                 { i: Utensils, l: 'Dining', t: 'explore', f: () => setActiveFilter('FOOD') },
                 { i: MessageSquare, l: 'Squad', t: 'group' },
                 { i: TicketIcon, l: 'Seat', f: handleScanTicket },
                 { i: Heart, l: 'Safety', t: 'safety' }
               ].map((act, idx) => (
                 <button key={idx} className="flex flex-col items-center gap-2" onClick={() => { act.f && act.f(); setActiveTab(act.t as any); }}>
                   <div className="icon-btn w-14 h-14 bg-white/5 rounded-2xl hover:bg-white/10 transition-all hover:scale-110 active:scale-95 border border-white/5">
                     <act.i size={20} style={{ color: zoneTheme.color }}/>
                   </div>
                   <span className="text-[0.6rem] font-black opacity-50 uppercase tracking-tighter">{act.l}</span>
                 </button>
               ))}
            </div>

            {myTicket && (
              <div className="ticket-card animate-slide-up stagger">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <div className="stat-label text-white/50">MATCH DAY ADMISSION</div>
                    <div className="text-2xl font-black text-white">{myTicket.section} <span className="opacity-30 text-lg">/</span> {myTicket.seat}</div>
                  </div>
                  <ShieldCheck size={32} className="text-success/80 drop-shadow-lg"/>
                </div>
                <div className="stat-row-2">
                   <div className="badge border-white/20 bg-white/10 text-white font-black">{myTicket.gate}</div>
                   <div className="flex justify-end"><button className="text-[0.65rem] font-black text-accent underline decoration-2 underline-offset-4" onClick={() => { const z = stadiumState.zones.find(z => z.id === myTicket.zoneId); if(z) setDestination(z); }}>DIRECT ROUTE</button></div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'explore' && (
          <div className="animate-fade-in stagger">
            <h2 className="font-display font-black text-xl mb-4">Facility Explorer</h2>
            <div className="tab-pills mb-6 no-scrollbar overflow-x-auto">
               {[
                 { id: 'ALL', l: 'All', i: Home },
                 { id: 'FOOD', l: 'Food', i: Utensils },
                 { id: 'MERCH', l: 'Shop', i: ShoppingBag },
                 { id: 'RESTROOM', l: 'Rest', i: MapPin },
                 { id: 'SEATING', l: 'Zones', i: Users }
               ].map(f => (
                 <button key={f.id} className={`tab-pill ${activeFilter === f.id ? 'active' : ''}`} onClick={() => setActiveFilter(f.id as any)}>
                   <f.i size={12}/> {f.l}
                 </button>
               ))}
            </div>

            <div className="space-y-3">
              {filteredZones.map(zone => {
                const wait = Math.ceil(zone.current_people / zone.service_rate);
                const density = zone.current_people / zone.capacity;
                return (
                  <div key={zone.id} className="insight-row group cursor-pointer border border-white/5 bg-white/2 hover:bg-white/5" onClick={() => { setDestination(zone); setActiveTab('map'); }}>
                    <div className="insight-icon" style={{ background: density > 0.8 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', color: density > 0.8 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {zone.type === 'FOOD' ? <Utensils size={18}/> : zone.type === 'MERCH' ? <ShoppingBag size={18}/> : <MapPin size={18}/>}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <div className="font-black text-sm tracking-tight">{zone.name}</div>
                        {zone.type !== 'SEATING' && <div className="text-[0.65rem] font-black" style={{ color: wait > 10 ? 'var(--warning)' : 'var(--success)' }}>{wait}m WAIT</div>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="progress-track flex-1 h-1.5"><div className="progress-fill" style={{ width: `${Math.min(100, density * 100)}%`, background: density > 0.8 ? 'var(--danger)' : zoneTheme.color }}/></div>
                        <span className="text-[0.55rem] font-black opacity-40 uppercase">{Math.round(density * 100)}% CAP</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-30 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'group' && (
          <div className="animate-fade-in flex flex-col h-full">
            <h2 className="font-display font-black text-xl mb-4">Squad Command</h2>
            {!myGroup ? (
              <div className="card text-center py-12 bg-white/5 border-white/5 rounded-[40px] shadow-2xl relative overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.1),transparent)]" />
                 <div className="nav-icon-pulse mx-auto mb-6 w-16 h-16"><Users size={32}/></div>
                 <h3 className="text-lg font-black mb-2">Sync with Friends</h3>
                 <p className="text-xs text-secondary mb-8 px-8 leading-relaxed">Real-time GPS tracking, spatial proximity alerts, and private squad messaging channel.</p>
                 <div className="px-8 space-y-4">
                   <button className="btn btn-primary w-full py-4 text-sm shadow-xl" onClick={handleCreateGroup}>GENERATE SQUAD LINK</button>
                   <div className="divider">OR</div>
                   <input placeholder="6-DIGIT CODE" className="bg-black/40 border-white/10 p-4 rounded-2xl text-center font-display text-xl tracking-[0.5em] w-full focus:border-accent transition-all" onChange={(e) => setGroupCode(e.target.value.toUpperCase())} />
                   <button className="btn btn-secondary w-full py-4" onClick={() => handleJoinGroup(groupCode)}>JOIN SQUAD</button>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 h-full">
                 <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {myGroup.members.map(m => (
                      <div key={m.userId} className="flex flex-col items-center gap-2 shrink-0">
                         <div className="avatar ring-2 ring-accent/20 ring-offset-2 ring-offset-primary shadow-xl" style={{ width: 52, height: 52, background: `hsl(${Math.random() * 360}, 60%, 50%)` }}>{m.name[0]}</div>
                         <span className="text-[0.55rem] font-black opacity-60">{m.userId === userId ? 'Commander' : m.name.split('-')[0]}</span>
                      </div>
                    ))}
                    <button className="avatar border-2 border-dashed border-white/10 bg-white/2 text-white/30 shrink-0 hover:bg-white/5 transition-all" style={{ width: 52, height: 52 }} onClick={() => navigator.clipboard.writeText(groupCode)}>+</button>
                 </div>

                 <div className="card flex-1 flex flex-col p-0 overflow-hidden bg-black/40 border-white/5 shadow-2xl rounded-3xl">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                      <div className="flex items-center gap-2"><MessageSquare size={14} className="text-accent"/><span className="text-[0.6rem] font-black tracking-widest opacity-60 uppercase">Secure Channel</span></div>
                      <div className="badge badge-success text-[0.5rem] tracking-normal px-3">Encrypted</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.userId === userId ? 'items-end' : 'items-start'}`}>
                          <span className="text-[0.55rem] font-black opacity-30 uppercase mb-1.5 px-1">{msg.name}</span>
                          <div className={`p-4 rounded-2xl text-[0.82rem] font-medium max-w-[85%] leading-relaxed shadow-lg ${msg.userId === userId ? 'bg-accent text-white rounded-tr-none' : 'bg-white/10 rounded-tl-none'}`}>{msg.text}</div>
                        </div>
                      ))}
                      <div ref={chatEndRef}/>
                    </div>
                    <div className="p-4 bg-white/5 border-t border-white/5 flex gap-3">
                       <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} placeholder="Send transmission..." className="bg-black/40 border-none rounded-2xl px-5 text-xs font-bold flex-1" />
                       <button onClick={sendMessage} className="icon-btn shrink-0 w-12 h-12 shadow-xl" style={{ background: 'var(--accent)', color: '#000', borderRadius: 16 }}><Send size={18}/></button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="animate-fade-in stagger">
             <h2 className="font-display font-black text-xl mb-4">Safety & Services</h2>
             <div className="card-danger mb-6 p-7 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10"><Shield size={120} /></div>
                <div className="flex items-center gap-3 text-danger mb-5">
                  <Shield size={28} className="animate-pulse shadow-danger/20"/>
                  <h3 className="font-black text-lg">Emergency Protocols</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   <button className="btn btn-primary bg-danger text-white border-none py-5 text-xs shadow-xl active:scale-95" onClick={() => window.alert("Emergency services alerted. Stay at your location.")}>🆘 REQUEST MEDICAL AID</button>
                   <button className="btn btn-secondary border-danger/30 text-danger py-5 text-xs">📢 REPORT SECURITY ISSUE</button>
                </div>
             </div>
             <div className="space-y-4">
                <div className="stat-label font-black tracking-widest px-1">ASSISTANCE POINTS</div>
                {stadiumState.zones.filter(z => z.id === 'med1' || z.id === 'g1' || z.id === 'g3').map(z => (
                  <div key={z.id} className="insight-row group bg-white/3 border-white/5" onClick={() => { setDestination(z); setActiveTab('map'); }}>
                    <div className="insight-icon shadow-lg" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--info)' }}>{z.id === 'med1' ? <Heart size={18}/> : <Shield size={18}/>}</div>
                    <div className="flex-1">
                      <div className="font-black text-sm tracking-tight">{z.name}</div>
                      <div className="text-[0.6rem] font-bold text-secondary uppercase mt-1">Staffed 24/7 • Response ~2m</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 opacity-40 group-hover:opacity-100 transition-all"><Navigation size={14}/></div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fade-in stagger">
             <h2 className="font-display font-black text-xl mb-4">Neural Insights</h2>
             <div className="stat-row-2 mb-6">
                <div className="card-hero p-6"><div className="metric-label opacity-40">System Efficiency</div><div className="text-4xl font-black text-accent tabular-nums">98.2</div></div>
                <div className="card-hero p-6"><div className="metric-label opacity-40">Time Optimization</div><div className="text-4xl font-black text-success tabular-nums">22m</div></div>
             </div>
             <div className="card bg-white/5 border-white/5 p-7 mb-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-accent/5 blur-3xl" />
                <div className="flex items-center gap-3 mb-6 text-accent"><Zap size={20}/><span className="text-[0.7rem] font-black tracking-[0.2em]">PREDICTIVE FLOW ANALYSIS</span></div>
                <div className="space-y-4">
                   {aiInsights.map((ins, i) => (
                     <div key={i} className="p-5 rounded-2xl bg-black/60 border border-white/5 hover:border-accent/40 transition-all cursor-pointer group shadow-xl" onClick={() => { setDestination(ins.target); setActiveTab('map'); }}>
                       <div className="flex justify-between mb-2"><span className="text-[0.65rem] font-black text-accent tracking-[0.2em]">{ins.title}</span><ins.icon size={14} className="text-accent group-hover:scale-125 transition-transform" /></div>
                       <p className="text-[0.8rem] font-medium leading-relaxed opacity-80">{ins.message}</p>
                     </div>
                   ))}
                </div>
             </div>
             <div className="card p-6 bg-glass border-white/5">
                <div className="stat-label mb-3">Live Arena Atmosphere</div>
                <div className="flex items-end gap-1 h-12">
                   {Array.from({length: 20}).map((_, i) => (
                     <div key={i} className="flex-1 bg-accent/40 rounded-t-sm animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }} />
                   ))}
                </div>
             </div>
          </div>
        )}

      </main>

      {/* 🔮 PERSISTENT GLASS NAVIGATION */}
      {!isAROpen && (
        <nav className="bottom-nav glass-panel shadow-[0_-20px_60px_rgba(0,0,0,0.5)] p-5 gap-2" style={{ borderTop: `1px solid ${zoneTheme.color}22`, background: 'rgba(2,6,23,0.9)' }}>
          <TabButton id="map" icon={Home} label="Arena" />
          <TabButton id="explore" icon={Search} label="Explore" />
          <TabButton id="group" icon={Users} label="Squad" />
          <TabButton id="analytics" icon={BarChart3} label="Insights" />
        </nav>
      )}

      {/* AR & Modals */}
      {isAROpen && <ARView onClose={() => setIsAROpen(false)} destination={destination} />}
      {isVoiceOpen && (
        <VoiceAssistant 
          isOpen={isVoiceOpen} 
          onClose={() => setIsVoiceOpen(false)} 
          onCommand={(cmd) => { 
            const lower = cmd.toLowerCase();
            if (lower.includes('gate') || lower.includes('exit')) { const exit = stadiumState.zones.find(z => z.type === 'GATE' || z.type === 'EXIT'); if(exit) setDestination(exit); }
            if (lower.includes('food')) { const food = stadiumState.zones.find(z => z.type === 'FOOD'); if(food) setDestination(food); }
            setIsVoiceOpen(false);
          }} 
        />
      )}
    </div>
  );
}
