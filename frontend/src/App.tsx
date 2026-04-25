import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import AttendeeApp from './pages/AttendeeApp.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import './App.css';
import type { Zone, Alert } from './types';

const SOCKET_URL = 'http://localhost:3001';
export const socket: Socket = io(SOCKET_URL, { autoConnect: true });

function AuthLanding() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  return (
    <div className="role-selection auth-landing">
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
      </div>
      
      <div className="auth-card animate-slide-up" style={{ opacity: visible ? 1 : 0, textAlign: 'center', zIndex: 10 }}>
        <div className="logo-container" style={{ marginBottom: '2rem' }}>
          <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.6))' }}>🏟️</span>
        </div>
        
        <h1 className="font-display text-gradient-accent" style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          CrowdFlow AI
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', maxWidth: '320px', marginInline: 'auto' }}>
          The next generation of stadium intelligence. Secure access to real-time spatial analytics and navigation.
        </p>

        <SignInButton mode="modal">
          <button className="premium-btn">
            Get Started
            <span style={{ marginLeft: '10px' }}>→</span>
          </button>
        </SignInButton>

        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Secure Enterprise Auth</span>
        </div>
      </div>
    </div>
  );
}

function RoleSelection() {
  const [visible, setVisible] = useState(false);
  const { user } = useUser();

  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  return (
    <div className="role-selection">
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div style={{ position: 'fixed', top: '2.5rem', right: '2.5rem', zIndex: 100 }}>
        <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-12 h-12 border-2 border-indigo-500/30 shadow-xl' } }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        <div className={`text-center animate-slide-up`} style={{ opacity: visible ? 1 : 0 }}>
          <div className="logo-container" style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.8))' }}>🏟️</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '1rem' }}>
            <div className="live-indicator">
              <div className="live-dot" />
              <span className="live-text">OPERATIONAL_NODE_V3</span>
            </div>
          </div>

          <h1 className="font-display text-gradient-accent" style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.05em', marginBottom: '1rem' }}>
            ACCESS<br/>PORTAL
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', opacity: 0.6, fontWeight: 500 }}>
            Welcome back, <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{user?.firstName || 'Operator'}</span>. Select your interface.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="stagger">
          <Link to="/attendee" className={`role-card premium-role-card animate-slide-up delay-1`} style={{ opacity: visible ? 1 : 0 }}>
            <div className="role-card-glow" style={{ background: 'var(--accent)' }} />
            <div className="role-card-icon-wrapper">
              <span style={{ fontSize: '1.5rem' }}>📱</span>
            </div>
            <div className="role-card-body">
              <div className="role-card-title">Attendee App</div>
              <div className="role-card-desc">AR Navigation · Squad Sync · Live Map</div>
            </div>
            <div className="role-card-arrow-v2">
              <div className="arrow-line" />
              <div className="arrow-head" />
            </div>
          </Link>

          <Link to="/admin" className={`role-card premium-role-card animate-slide-up delay-2`} style={{ opacity: visible ? 1 : 0 }}>
            <div className="role-card-glow" style={{ background: 'var(--accent-3)' }} />
            <div className="role-card-icon-wrapper">
              <span style={{ fontSize: '1.5rem' }}>🛡️</span>
            </div>
            <div className="role-card-body">
              <div className="role-card-title">Command Center</div>
              <div className="role-card-desc">Tactical Overlays · Crowd Density · Alerts</div>
            </div>
            <div className="role-card-arrow-v2">
              <div className="arrow-line" />
              <div className="arrow-head" />
            </div>
          </Link>
        </div>

        <div className="text-center opacity-30 mt-4">
           <span className="text-[0.6rem] font-black tracking-[0.3em] uppercase">Encrypted_Session_Active</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [stadiumState, setStadiumState] = useState<{ zones: Zone[], alerts: Alert[] }>({ zones: [], alerts: [] });
  const [connected, setConnected] = useState(false);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('stadium-update', (data) => setStadiumState(data));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('stadium-update');
    };
  }, []);

  if (!isLoaded) return null;

  return (
    <Router>
      <SignedOut>
        <AuthLanding />
      </SignedOut>
      <SignedIn>
        {!connected && (
          <div className="conn-banner">⚡ Connecting to CrowdFlow Engine...</div>
        )}
        <Routes>
          <Route path="/"         element={<RoleSelection />} />
          <Route path="/attendee" element={<AttendeeApp stadiumState={stadiumState} />} />
          <Route path="/admin"    element={<AdminDashboard stadiumState={stadiumState} />} />
        </Routes>
      </SignedIn>
    </Router>
  );
}

export default App;
