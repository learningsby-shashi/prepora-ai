import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';

export default function Signup() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name } },
      });
      if (error) throw error;
      if (data.user) {
        // insert into parents table
        const { error: pErr } = await supabase.from('parents').insert({
          auth_id: data.user.id,
          name: form.name,
          email: form.email,
        });
        if (pErr && !String(pErr.message || '').includes('duplicate')) {
          // Could fail if RLS denies until session is established. Try again after a small delay.
          await new Promise((r) => setTimeout(r, 600));
          await supabase.from('parents').insert({ auth_id: data.user.id, name: form.name, email: form.email });
        }
      }
      if (data.session) {
        showToast('Welcome to Prepora.ai!', 'success');
        navigate('/onboarding');
      } else {
        setConfirmMsg(true);
      }
    } catch (err) {
      showToast(err.message || 'Signup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (confirmMsg) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="card" style={{ maxWidth: 440, textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>📧</div>
          <h2>Check your email</h2>
          <p style={{ color: '#64748B' }}>We sent a confirmation link to <b>{form.email}</b>. Click it to activate your account, then sign in.</p>
          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', marginTop: 12, display: 'inline-block' }}>Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 60%)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="gradient-text" style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Poppins' }}>Prepora.ai</div>
          <p style={{ color: '#64748B', margin: '6px 0 0' }}>Scan. Learn. Practice. Improve.</p>
        </div>
        <h2 style={{ marginBottom: 6 }}>Create your account</h2>
        <p style={{ color: '#64748B', marginBottom: 18 }}>Set up your child's smart prep partner.</p>
        <form onSubmit={submit}>
          <label className="label">Your name</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Riya Sharma" data-testid="signup-name" />
          <label className="label" style={{ marginTop: 12 }}>Email</label>
          <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@gmail.com" data-testid="signup-email" />
          <label className="label" style={{ marginTop: 12 }}>Password</label>
          <input className="input" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" data-testid="signup-password" />
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 18, justifyContent: 'center' }} disabled={loading} data-testid="signup-submit">
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#64748B' }}>
          Already have an account? <Link to="/login" style={{ color: '#4F46E5', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
