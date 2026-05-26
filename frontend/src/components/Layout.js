import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

const Icon = ({ d }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  home: <Icon d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  upload: <Icon d="M12 15V3m0 0l-4 4m4-4l4 4M5 17a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2" />,
  bank: <Icon d="M3 7l9-4 9 4M3 11h18M5 11v8h14v-8M9 15h6" />,
  practice: <Icon d="M12 20l9-9-3-3-9 9v3zM15 5l3 3" />,
  leader: <Icon d="M6 21V8m12 13V4m-6 17v-6M2 21h20" />,
  standing: <Icon d="M9 11l3 3 8-8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />,
  reports: <Icon d="M3 3v18h18M7 16l4-4 4 2 6-7" />,
  notes: <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm0 0v6h6M8 13h6M8 17h4" />,
  achievements: <Icon d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0V4zM4 4h3v3a3 3 0 0 1-3-3zM17 4h3a3 3 0 0 1-3 3V4z" />,
  settings: <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />,
  logout: <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  user: <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
};

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: icons.home },
  { to: '/upload', label: 'Upload', icon: icons.upload },
  { to: '/question-bank', label: 'Question Bank', icon: icons.bank },
  { to: '/practice', label: 'Practice', icon: icons.practice },
  { to: '/leaderboard', label: 'Leaderboard', icon: icons.leader },
  { to: '/my-standing', label: 'My Standing', icon: icons.standing },
  { to: '/reports', label: 'Reports', icon: icons.reports },
  { to: '/notes', label: 'Notes', icon: icons.notes },
  { to: '/achievements', label: 'Achievements', icon: icons.achievements },
  { to: '/settings', label: 'Settings', icon: icons.settings },
];

const MOBILE_NAV = [
  { to: '/dashboard', label: 'Home', icon: icons.home },
  { to: '/practice', label: 'Practice', icon: icons.practice },
  { to: '/leaderboard', label: 'Ranks', icon: icons.leader },
  { to: '/reports', label: 'Reports', icon: icons.reports },
  { to: '/settings', label: 'Profile', icon: icons.user },
];

export const Layout = ({ children }) => {
  const { signOut, activeChild, children: kids, setActiveChildId } = useApp();
  const navigate = useNavigate();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
          Prepora
        </div>
        {kids && kids.length > 1 && (
          <select className="input" style={{ marginBottom: 16, fontSize: 13 }} value={activeChild?.id || ''} onChange={(e) => setActiveChildId(e.target.value)}>
            {kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        )}
        {activeChild && (
          <div className="card-tight" style={{ background: '#EEF2FF', borderRadius: 10, marginBottom: 16, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>ACTIVE CHILD</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{activeChild.name}</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{activeChild.class} • {activeChild.board}</div>
          </div>
        )}
        <nav>
          {NAV_ITEMS.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} data-testid={`nav-${it.label.toLowerCase().replace(/\s/g,'-')}`}>
              {it.icon} {it.label}
            </NavLink>
          ))}
        </nav>
        <button className="nav-link" style={{ width: '100%', marginTop: 24, background: 'transparent', border: 'none', color: '#EF4444' }} onClick={async () => { await signOut(); navigate('/login'); }} data-testid="sign-out-btn">
          {icons.logout} Sign Out
        </button>
      </aside>
      <main className="main-content fade-in">{children}</main>
      <nav className="bottom-nav">
        {MOBILE_NAV.map((it) => (
          <NavLink key={it.to} to={it.to} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            {it.icon}<span>{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
