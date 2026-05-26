import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [parent, setParent] = useState(null);
  const [children_, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const refreshParent = useCallback(async (authId) => {
    if (!authId) return null;
    const { data } = await supabase.from('parents').select('*').eq('auth_id', authId).maybeSingle();
    setParent(data);
    return data;
  }, []);

  const refreshChildren = useCallback(async (parentId) => {
    if (!parentId) return [];
    const { data } = await supabase.from('children').select('*').eq('parent_id', parentId).order('created_at', { ascending: true });
    setChildren(data || []);
    if (data && data.length > 0 && !activeChildId) setActiveChildId(data[0].id);
    return data || [];
  }, [activeChildId]);

  const ensureParentExists = useCallback(async (user) => {
    // Upsert parent row using the now-active session so RLS passes
    const meta = user.user_metadata || {};
    const name = meta.name || meta.full_name || (user.email || '').split('@')[0];
    try {
      await supabase.from('parents').upsert(
        { auth_id: user.id, name, email: user.email },
        { onConflict: 'auth_id', ignoreDuplicates: false }
      );
    } catch (e) {
      // ignore — parent may already exist
    }
  }, []);

  const refreshAll = useCallback(async (currentSession) => {
    if (!currentSession?.user) {
      setParent(null); setChildren([]); setActiveChildId(null);
      return;
    }
    // Ensure parent row exists with session active (RLS safe)
    await ensureParentExists(currentSession.user);
    let p = await refreshParent(currentSession.user.id);
    // Retry once if RLS race condition
    if (!p) {
      await new Promise((r) => setTimeout(r, 500));
      await ensureParentExists(currentSession.user);
      p = await refreshParent(currentSession.user.id);
    }
    if (p) await refreshChildren(p.id);
  }, [refreshParent, refreshChildren, ensureParentExists]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      await refreshAll(s);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      await refreshAll(s);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeChild = children_.find((c) => c.id === activeChildId) || children_[0] || null;

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null); setParent(null); setChildren([]); setActiveChildId(null);
  };

  return (
    <AppContext.Provider value={{
      session, parent, children: children_, activeChild, activeChildId, setActiveChildId,
      loading, showToast, signOut, refreshParent, refreshChildren, refreshAll,
    }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </AppContext.Provider>
  );
};
