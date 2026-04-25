import React, { useState, useEffect } from 'react';
import type { Zone, Alert, AnalyticsSnapshot } from '../types.ts';
import Stadium3DView from '../components/Stadium3DView.tsx';
import { 
  Users, AlertTriangle, Activity, Settings, ArrowLeft, 
  BarChart3, Zap, Shield, TrendingUp, Radio, Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';

export default function AdminDashboard({ stadiumState }: { stadiumState: { zones: Zone[], alerts: Alert[] } }) {
  const [activeView, setActiveView] = useState<'live' | 'analytics'>('live');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSnapshot[]>([]);
  const [selectedVendorZone, setSelectedVendorZone] = useState<string>('');
  const [newServiceRate, setNewServiceRate] = useState<number>(10);
  const [isBusy, setIsBusy] = useState(false);
  const [tick, setTick] = useState(0);

  // Live clock tick for real-time feel
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (activeView === 'analytics') fetchAnalytics();
  }, [activeView]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/analytics');
      const data = await res.json();
      setAnalyticsData(data.history || []);
    } catch (e) { console.error(e); }
  };

  const apiPost = async (url: string, body: object) => {
    setIsBusy(true);
    try {
      await fetch(`http://localhost:3001${url}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) { console.error(e); }
    setTimeout(() => setIsBusy(false), 800);
  };

  const totalPeople   = stadiumState.zones.reduce((s, z) => s + z.current_people, 0);
  const totalCapacity = stadiumState.zones.reduce((s, z) => s + z.capacity, 0);
  const overallDensity = totalCapacity > 0 ? totalPeople / totalCapacity : 0;
  const criticalAlerts = stadiumState.alerts.filter(a => a.type === 'CRITICAL' || a.type === 'ANOMALY');
  const foodAndRestrooms = stadiumState.zones.filter(z => ['FOOD','RESTROOM','MERCH'].includes(z.type));

  const densityColor = overallDensity > 0.8 ? 'var(--danger)' : overallDensity > 0.5 ? 'var(--warning)' : 'var(--success)';
  const densityLabel = overallDensity > 0.8 ? 'CONGESTED' : overallDensity > 0.5 ? 'MODERATE' : 'OPTIMAL';

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '0' }}>
      
      {/* Top Header */}
      <header className="glass-header" style={{ padding: '0 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '70px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link to="/" className="icon-btn" style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h1 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0 }}>
                  <span className="text-gradient-accent">CrowdFlow</span> Command
                </h1>
                <div className="live-badge"><div className="dot" />Live</div>
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                {timeStr} · ENGINE v2.4 · 26 SECTORS ONLINE
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {criticalAlerts.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.3rem 0.8rem', borderRadius: 999, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Bell size={13} color="var(--danger)" />
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--danger)', letterSpacing: '0.08em' }}>
                  {criticalAlerts.length} ALERT{criticalAlerts.length > 1 ? 'S' : ''}
                </span>
              </div>
            )}
            <div className="tab-pills">
              <button className={`tab-pill ${activeView === 'live' ? 'active' : ''}`} onClick={() => setActiveView('live')}>
                <Radio size={13} /> Live Monitor
              </button>
              <button className={`tab-pill ${activeView === 'analytics' ? 'active' : ''}`} onClick={() => setActiveView('analytics')}>
                <BarChart3 size={13} /> Analytics
              </button>
            </div>
            <div style={{ marginLeft: '0.5rem' }}>
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      <div style={{ padding: '1.5rem 2rem' }}>
        {activeView === 'live' ? (
          <div className="animate-fade-in">

            {/* KPI Row */}
            <div className="stat-row-4 stagger mb-6" style={{ marginBottom: '1.5rem' }}>
              {[
                { label: 'Live Attendance', value: totalPeople.toLocaleString(), icon: Users, color: 'var(--accent)', glow: 'rgba(99,102,241,0.15)', delta: '+12%', up: true },
                { label: 'Arena Capacity', value: `${(overallDensity * 100).toFixed(1)}%`, icon: Activity, color: densityColor, glow: `${densityColor}22`, tag: densityLabel },
                { label: 'Active Alerts', value: stadiumState.alerts.length, icon: AlertTriangle, color: stadiumState.alerts.length > 0 ? 'var(--danger)' : 'var(--success)', glow: stadiumState.alerts.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)' },
                { label: 'System Health', value: '99.9%', icon: Shield, color: 'var(--success)', glow: 'rgba(16,185,129,0.12)', delta: 'All systems go', up: true },
              ].map((kpi, i) => (
                <div key={i} className="card animate-slide-up" style={{ background: kpi.glow, borderColor: `${kpi.color}30`, padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div className="metric-label">{kpi.label}</div>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <kpi.icon size={16} color={kpi.color} />
                    </div>
                  </div>
                  <div className="metric-value" style={{ color: kpi.color }}>{kpi.value}</div>
                  {kpi.delta && (
                    <div className={`metric-delta ${kpi.up ? 'up' : 'down'}`} style={{ marginTop: '0.4rem' }}>
                      {kpi.up ? '↑' : '↓'} {kpi.delta}
                    </div>
                  )}
                  {kpi.tag && (
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: kpi.color, letterSpacing: '0.1em', marginTop: '0.4rem' }}>
                      {kpi.tag}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Anomaly Banner */}
            {criticalAlerts.length > 0 && (
              <div className="alert-strip danger animate-slide-down mb-6" style={{ marginBottom: '1.5rem', borderRadius: 16 }}>
                <Zap size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--danger)', letterSpacing: '0.1em', marginBottom: 4 }}>
                    HEURISTIC ANOMALY DETECTED
                  </div>
                  {criticalAlerts.slice(0, 2).map(a => (
                    <p key={a.id} style={{ fontSize: '0.85rem', fontWeight: 600 }}>{a.message}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Main Grid */}
            <div className="command-grid">
              {/* Left — Stadium Map */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card card-accent-top" style={{ padding: '1.75rem', minHeight: 580 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 4 }}>🏟️ Zonal Intelligence Map</h3>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Real-time spatial crowd analytics · 26 sectors</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div className="live-badge"><div className="dot" />Synced</div>
                      <div className="badge badge-accent">AI Enhanced</div>
                    </div>
                  </div>
                  <Stadium3DView zones={stadiumState.zones} onZoneSelect={() => {}} />
                </div>

                {/* Zone density list */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Zone Density Overview
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {stadiumState.zones.filter(z => z.type === 'SEATING').slice(0, 4).map(zone => {
                      const d = zone.current_people / zone.capacity;
                      const c = d > 0.85 ? 'var(--danger)' : d > 0.5 ? 'var(--warning)' : 'var(--success)';
                      return (
                        <div key={zone.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, width: 110, flexShrink: 0, color: 'var(--text-secondary)' }}>{zone.name}</span>
                          <div className="progress-track" style={{ flex: 1, height: 6 }}>
                            <div className="progress-fill" style={{ width: `${Math.min(100, d * 100)}%`, background: c }} />
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: c, width: 36, textAlign: 'right' }}>{Math.round(d * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Tactical Controls */}
                <div className="card" style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.15)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Settings size={16} color="var(--accent)" />
                    </div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>Tactical Controls</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <div className="metric-label" style={{ marginBottom: 6 }}>Sector</div>
                      <select
                        value={selectedVendorZone}
                        onChange={e => setSelectedVendorZone(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-light)', borderRadius: 12, color: 'white', fontSize: '0.82rem' }}
                      >
                        <option value="">Select facility...</option>
                        {foodAndRestrooms.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div className="metric-label">Service Rate</div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--accent)', fontFamily: 'monospace' }}>{newServiceRate}/min</span>
                      </div>
                      <input type="range" min={1} max={50} value={newServiceRate} onChange={e => setNewServiceRate(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                    <button
                      className="btn btn-primary w-full"
                      onClick={() => apiPost('/update-queue', { zoneId: selectedVendorZone, service_rate: newServiceRate })}
                      disabled={!selectedVendorZone || isBusy}
                      style={{ opacity: isBusy ? 0.7 : 1, marginTop: 4 }}
                    >
                      {isBusy ? '⚡ Deploying...' : 'Deploy Constraint'}
                    </button>
                  </div>
                </div>

                {/* Emergency Protocols */}
                <div className="card-danger">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                    <Shield size={16} color="var(--danger)" />
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--danger)' }}>Override Protocols</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'EVACUATE', type: 'EVACUATE', bg: 'rgba(239,68,68,0.1)', c: 'var(--danger)', border: 'rgba(239,68,68,0.3)' },
                      { label: 'CELEBRATE', type: 'CELEBRATE', bg: 'rgba(245,158,11,0.1)', c: 'var(--warning)', border: 'rgba(245,158,11,0.3)' },
                      { label: 'LOCKDOWN', type: 'LOCKDOWN', bg: 'rgba(239,68,68,0.1)', c: 'var(--danger)', border: 'rgba(239,68,68,0.3)' },
                      { label: 'ALL CLEAR', type: 'ALL_CLEAR', bg: 'rgba(16,185,129,0.1)', c: 'var(--success)', border: 'rgba(16,185,129,0.3)' },
                    ].map(({ label, type, bg, c, border }) => (
                      <button
                        key={type}
                        onClick={() => apiPost('/trigger-event', { eventType: type })}
                        style={{ padding: '0.6rem', borderRadius: 10, background: bg, color: c, border: `1px solid ${border}`, fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.06em', cursor: 'pointer' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Incident Feed */}
                <div className="card" style={{ flex: 1, minHeight: 280, padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>Incident Feed</h3>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {stadiumState.alerts.length} active
                    </span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {stadiumState.alerts.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.2 }}>
                        <Activity size={32} style={{ margin: '0 auto 0.5rem' }} />
                        <p style={{ fontSize: '0.75rem' }}>All systems nominal</p>
                      </div>
                    ) : (
                      stadiumState.alerts.map(a => {
                        const isCrit = a.type === 'CRITICAL' || a.type === 'ANOMALY';
                        return (
                          <div key={a.id} style={{ padding: '0.65rem 0.85rem', borderRadius: 10, background: isCrit ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', borderLeft: `3px solid ${isCrit ? 'var(--danger)' : 'var(--warning)'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: '0.55rem', fontWeight: 900, color: isCrit ? 'var(--danger)' : 'var(--warning)', letterSpacing: '0.1em' }}>{a.type}</span>
                              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>{a.message}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Analytics View */
          <div className="animate-fade-in">
            <div className="stat-row-4 stagger" style={{ marginBottom: '1.5rem' }}>
              {[
                { l: 'Peak Time', v: '21:15', c: 'var(--accent)' },
                { l: 'Throughput', v: '840/min', c: 'var(--text-primary)' },
                { l: 'Flow Risk', v: 'LOW', c: 'var(--success)' },
                { l: 'AI Score', v: '98.4', c: 'var(--accent)' },
              ].map((s, i) => (
                <div key={i} className="card animate-slide-up">
                  <div className="metric-label">{s.l}</div>
                  <div className="metric-value" style={{ color: s.c, fontSize: '1.8rem' }}>{s.v}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>Population Density Timeline</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>Aggregated cross-sector trends over event duration</p>
                </div>
                <div className="badge badge-accent">Last 2 Hours</div>
              </div>
              <div style={{ height: 320, display: 'flex', alignItems: 'flex-end', gap: 5, position: 'relative' }}>
                {/* Grid lines */}
                {[25, 50, 75, 100].map(pct => (
                  <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: `${pct}%`, borderTop: '1px solid rgba(255,255,255,0.04)', zIndex: 0 }} />
                ))}
                {(analyticsData.length > 0 ? analyticsData : Array.from({ length: 60 }, (_, i) => ({ count: Math.sin(i / 8) * 8 + 12, timestamp: 0, zoneId: '' }))).slice(-60).map((d, i) => (
                  <div
                    key={i}
                    className="chart-bar animate-slide-up"
                    style={{ flex: 1, height: `${Math.max(4, (d.count / 25) * 100)}%`, animationDelay: `${i * 0.008}s`, zIndex: 1 }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
                <span>T-120 MIN</span><span>T-90 MIN</span><span>PEAK</span><span>T-30 MIN</span><span>NOW</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
