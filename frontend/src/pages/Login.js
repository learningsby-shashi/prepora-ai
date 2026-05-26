import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(form);
      if (error) throw error;
      showToast('Signed in successfully', 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 60%)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="gradient-text" style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Poppins' }}>Prepora.ai</div>
          <p style={{ color: '#64748B', margin: '6px 0 0' }}>Welcome back</p>
        </div>
        <form onSubmit={submit}>
          <label className="label">Email</label>
          <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@gmail.com" data-testid="login-email" />
          <label className="label" style={{ marginTop: 12 }}>Password</label>
          <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" data-testid="login-password" />
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 18, justifyContent: 'center' }} disabled={loading} data-testid="login-submit">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#64748B' }}>
          New to Prepora.ai? <Link to="/signup" style={{ color: '#4F46E5', fontWeight: 600 }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
