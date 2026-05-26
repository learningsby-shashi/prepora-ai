import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export const ProtectedRoute = ({ children, requireOnboarding = true }) => {
  const { session, loading, children: kids, parent } = useApp();
  if (loading) return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 200 }} /></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (requireOnboarding && parent && (!kids || kids.length === 0)) return <Navigate to="/onboarding" replace />;
  return children;
};
