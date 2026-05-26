import React from 'react';

export const Skeleton = ({ height = 20, width = '100%', style = {} }) => (
  <div className="skeleton" style={{ height, width, ...style }} />
);

export const EmptyState = ({ icon = '✨', title, description, cta }) => (
  <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 16, border: '1px dashed #E2E8F0' }}>
    <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
    <h3 style={{ margin: '6px 0 8px 0', fontSize: 18 }}>{title}</h3>
    {description && <p style={{ color: '#64748B', marginBottom: 16 }}>{description}</p>}
    {cta}
  </div>
);

export const Card = ({ children, className = '', ...rest }) => (
  <div className={`card ${className}`} {...rest}>{children}</div>
);

export const StatCard = ({ icon, label, value, sub, color = '#4F46E5' }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, color: '#0F172A' }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{sub}</div>}
  </div>
);
