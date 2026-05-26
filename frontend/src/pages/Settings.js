import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { Card } from '../components/UI';
import { generateAnonymousName } from '../lib/helpers';

export default function Settings() {
  const { parent, activeChild, children: kids, refreshParent, refreshChildren, session, showToast } = useApp();
  const [pForm, setPForm] = useState({ name: '', phone: '', city: '' });
  const [cForm, setCForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (parent) setPForm({ name: parent.name || '', phone: parent.phone || '', city: parent.city || '' }); }, [parent]);
  useEffect(() => { if (activeChild) setCForm({ ...activeChild }); }, [activeChild]);

  const saveParent = async () => {
    setSaving(true);
    try {
      await supabase.from('parents').update(pForm).eq('id', parent.id);
      await refreshParent(session.user.id);
      showToast('Profile updated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const saveChild = async () => {
    setSaving(true);
    try {
      const payload = {
        name: cForm.name, class: cForm.class, board: cForm.board,
        school_name: cForm.school_name, section: cForm.section,
        subjects: cForm.subjects, exam_date: cForm.exam_date || null,
        daily_goal_minutes: cForm.daily_goal_minutes, difficulty_preference: cForm.difficulty_preference,
        peer_benchmarking_opt_in: cForm.peer_benchmarking_opt_in,
        anonymous_display_name: cForm.anonymous_display_name,
      };
      await supabase.from('children').update(payload).eq('id', cForm.id);
      // Sync peer pool opt-in status
      const optIn = cForm.peer_benchmarking_opt_in;
      if (optIn) {
        await supabase.from('peer_benchmark_pool').update({ peer_benchmarking_opt_in: true, anonymous_display_name: cForm.anonymous_display_name }).eq('anonymous_id', `self_${cForm.id}`);
      } else {
        await supabase.from('peer_benchmark_pool').update({ peer_benchmarking_opt_in: false }).eq('anonymous_id', `self_${cForm.id}`);
      }
      await refreshChildren(parent.id);
      showToast('Child profile updated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  if (!parent) return <Card>Loading…</Card>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>⚙️ Settings</h1>
      <Card style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>Parent profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <div><label className="label">Name</label><input className="input" value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input" value={parent.email} disabled /></div>
          <div><label className="label">Phone</label><input className="input" value={pForm.phone || ''} onChange={(e) => setPForm({ ...pForm, phone: e.target.value })} /></div>
          <div><label className="label">City</label><input className="input" value={pForm.city || ''} onChange={(e) => setPForm({ ...pForm, city: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}><button className="btn-primary" onClick={saveParent} disabled={saving}>Save</button></div>
      </Card>

      {activeChild && (
        <Card style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0 }}>Child profile — {activeChild.name}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div><label className="label">Name</label><input className="input" value={cForm.name || ''} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} /></div>
            <div><label className="label">Class</label><input className="input" value={cForm.class || ''} onChange={(e) => setCForm({ ...cForm, class: e.target.value })} /></div>
            <div><label className="label">Board</label><input className="input" value={cForm.board || ''} onChange={(e) => setCForm({ ...cForm, board: e.target.value })} /></div>
            <div><label className="label">School</label><input className="input" value={cForm.school_name || ''} onChange={(e) => setCForm({ ...cForm, school_name: e.target.value })} /></div>
            <div><label className="label">Section</label><input className="input" value={cForm.section || ''} onChange={(e) => setCForm({ ...cForm, section: e.target.value })} /></div>
            <div><label className="label">Exam date</label><input type="date" className="input" value={(cForm.exam_date || '').slice(0,10)} onChange={(e) => setCForm({ ...cForm, exam_date: e.target.value })} /></div>
            <div><label className="label">Daily goal (min)</label><input type="number" className="input" value={cForm.daily_goal_minutes || 30} onChange={(e) => setCForm({ ...cForm, daily_goal_minutes: parseInt(e.target.value)||30 })} /></div>
            <div><label className="label">Difficulty</label><select className="input" value={cForm.difficulty_preference || 'Adaptive'} onChange={(e) => setCForm({ ...cForm, difficulty_preference: e.target.value })}><option>Easy</option><option>Medium</option><option>Hard</option><option>Adaptive</option></select></div>
            <div><label className="label">Anonymous display name</label><div style={{ display: 'flex', gap: 6 }}><input className="input" value={cForm.anonymous_display_name || ''} onChange={(e) => setCForm({ ...cForm, anonymous_display_name: e.target.value })} /><button className="btn-ghost" onClick={() => setCForm({ ...cForm, anonymous_display_name: generateAnonymousName() })}>🎲</button></div></div>
            <div>
              <label className="label">Peer benchmarking</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, paddingTop: 8 }}>
                <input type="checkbox" checked={!!cForm.peer_benchmarking_opt_in} onChange={(e) => setCForm({ ...cForm, peer_benchmarking_opt_in: e.target.checked })} />
                Show me on the leaderboard
              </label>
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}><button className="btn-primary" onClick={saveChild} disabled={saving}>Save child</button></div>
        </Card>
      )}
      <Card>
        <h3 style={{ marginTop: 0 }}>Children ({kids.length})</h3>
        {kids.map((c) => (
          <div key={c.id} style={{ padding: 10, borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
            <div><b>{c.name}</b> — {c.class} • {c.board}</div>
            <div className="badge badge-indigo">{c.xp} XP</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
