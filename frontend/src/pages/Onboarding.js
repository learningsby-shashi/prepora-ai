import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { generateAnonymousName } from '../lib/helpers';

const CLASSES = ['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12','JEE','NEET','UPSC','CAT'];
const BOARDS = ['CBSE','ICSE','State Board','IB','IGCSE'];
const SUBJECTS = ['Mathematics','Science','Physics','Chemistry','Biology','English','Hindi','Social Studies','History','Geography','Civics','Economics','Computer Science','General Studies'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { session, parent, refreshParent, refreshChildren, showToast, children: existing } = useApp();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [parentForm, setParentForm] = useState({ phone: '', city: '' });
  const [child, setChild] = useState({
    name: '', class: 'Class 8', board: 'CBSE', school_name: '', section: 'A', subjects: ['Mathematics','Science','English'], exam_date: '',
    peer_benchmarking_opt_in: true,
  });
  const [prefs, setPrefs] = useState({ daily_goal_minutes: 30, difficulty_preference: 'Adaptive' });
  const [createdChildId, setCreatedChildId] = useState(null);

  // Run-once: if user already onboarded (has children), send to dashboard
  useEffect(() => {
    if (existing && existing.length > 0) {
      navigate('/dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Make sure parents row exists even if signup race-condition skipped it
  useEffect(() => {
    (async () => {
      if (session?.user && !parent) {
        await supabase.from('parents').upsert({ auth_id: session.user.id, name: session.user.user_metadata?.name || session.user.email.split('@')[0], email: session.user.email }, { onConflict: 'auth_id' });
        await refreshParent(session.user.id);
      }
    })();
  }, [session, parent, refreshParent]);

  const toggleSubject = (s) => setChild((c) => ({ ...c, subjects: c.subjects.includes(s) ? c.subjects.filter((x) => x !== s) : [...c.subjects, s] }));

  const saveParent = async () => {
    setSaving(true);
    try {
      await supabase.from('parents').update(parentForm).eq('auth_id', session.user.id);
      await refreshParent(session.user.id);
      setStep(2);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const seedMockPeers = async (childId, schoolName, klass, section, board) => {
    // Idempotency: check if mock peers for this child already exist
    const { data: existingMocks } = await supabase
      .from('peer_benchmark_pool')
      .select('id')
      .like('anonymous_id', `mock_${childId.slice(0,8)}_%`)
      .limit(1);
    if (existingMocks && existingMocks.length > 0) {
      return; // already seeded
    }
    const mocks = [];
    for (let i = 0; i < 15; i++) {
      mocks.push({
        child_id: childId,
        school_name: schoolName,
        class: klass,
        section: section,
        board: board,
        anonymous_id: `mock_${childId.slice(0,8)}_${i}_${Date.now()}`,
        anonymous_display_name: generateAnonymousName(),
        overall_accuracy: parseFloat((50 + Math.random() * 45).toFixed(2)),
        total_questions: Math.floor(20 + Math.random() * 480),
        streak: Math.floor(Math.random() * 25),
        xp: Math.floor(100 + Math.random() * 4500),
        subject_scores: { Mathematics: Math.round(50+Math.random()*45), Science: Math.round(50+Math.random()*45), English: Math.round(50+Math.random()*45) },
        peer_benchmarking_opt_in: true,
      });
    }
    await supabase.from('peer_benchmark_pool').insert(mocks);
  };

  const saveChild = async () => {
    if (!parent) { showToast('Parent record missing, retry in a moment', 'error'); return; }
    setSaving(true);
    try {
      const anon = generateAnonymousName();
      const payload = { ...child, parent_id: parent.id, anonymous_display_name: anon, exam_date: child.exam_date || null };
      const { data, error } = await supabase.from('children').insert(payload).select().single();
      if (error) throw error;
      setCreatedChildId(data.id);
      // Insert own peer pool entry
      if (child.peer_benchmarking_opt_in) {
        await supabase.from('peer_benchmark_pool').insert({
          child_id: data.id,
          school_name: child.school_name,
          class: child.class,
          section: child.section,
          board: child.board,
          anonymous_id: `self_${data.id}`,
          anonymous_display_name: anon,
          overall_accuracy: 0,
          total_questions: 0,
          streak: 0,
          xp: 0,
          subject_scores: {},
          peer_benchmarking_opt_in: true,
        });
        await seedMockPeers(data.id, child.school_name, child.class, child.section, child.board);
      }
      await refreshChildren(parent.id);
      setStep(3);
    } catch (e) { showToast(e.message || 'Failed to add child', 'error'); }
    finally { setSaving(false); }
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      if (createdChildId) {
        await supabase.from('children').update(prefs).eq('id', createdChildId);
      }
      await refreshChildren(parent.id);
      showToast('Onboarding complete!', 'success');
      navigate('/dashboard');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '30px 20px', background: 'linear-gradient(135deg,#EEF2FF 0%, #F8FAFC 50%)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="gradient-text" style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Poppins', textAlign: 'center', marginBottom: 8 }}>🎓 Prepora.ai</div>
        <div style={{ textAlign: 'center', color: '#64748B', marginBottom: 24 }}>Let's set up your child's profile</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          {[1,2,3].map((s) => (
            <div key={s} style={{ flex: 1, height: 6, borderRadius: 999, background: step >= s ? '#4F46E5' : '#E2E8F0' }} />
          ))}
        </div>
        <div className="card">
          {step === 1 && (
            <>
              <h2 style={{ marginTop: 0 }}>Step 1 — About you</h2>
              <label className="label">Phone (optional)</label>
              <input className="input" value={parentForm.phone} onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })} placeholder="+91 9876543210" />
              <label className="label" style={{ marginTop: 12 }}>City</label>
              <input className="input" value={parentForm.city} onChange={(e) => setParentForm({ ...parentForm, city: e.target.value })} placeholder="Mumbai" />
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={saveParent} disabled={saving} data-testid="onboarding-step1-next">{saving ? 'Saving…' : 'Continue →'}</button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 style={{ marginTop: 0 }}>Step 2 — Add your child</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label">Child's name</label>
                  <input className="input" value={child.name} required onChange={(e) => setChild({ ...child, name: e.target.value })} placeholder="Aarav" data-testid="child-name" />
                </div>
                <div>
                  <label className="label">Class</label>
                  <select className="input" value={child.class} onChange={(e) => setChild({ ...child, class: e.target.value })} data-testid="child-class">
                    {CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Board</label>
                  <select className="input" value={child.board} onChange={(e) => setChild({ ...child, board: e.target.value })}>
                    {BOARDS.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Section</label>
                  <input className="input" value={child.section} onChange={(e) => setChild({ ...child, section: e.target.value })} placeholder="A" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">School name</label>
                  <input className="input" value={child.school_name} onChange={(e) => setChild({ ...child, school_name: e.target.value })} placeholder="Delhi Public School" data-testid="school-name" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Subjects</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SUBJECTS.map((s) => (
                      <button type="button" key={s} onClick={() => toggleSubject(s)} className={child.subjects.includes(s) ? 'badge-indigo' : 'badge-gray'} style={{ padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: child.subjects.includes(s) ? '#4F46E5' : '#F1F5F9', color: child.subjects.includes(s) ? 'white' : '#475569' }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Exam date (optional)</label>
                  <input className="input" type="date" value={child.exam_date} onChange={(e) => setChild({ ...child, exam_date: e.target.value })} />
                </div>
                <div>
                  <label className="label" style={{ marginBottom: 10 }}>Peer benchmarking</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <input type="checkbox" checked={child.peer_benchmarking_opt_in} onChange={(e) => setChild({ ...child, peer_benchmarking_opt_in: e.target.checked })} />
                    Compare with classmates (anonymous)
                  </label>
                </div>
              </div>
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary" disabled={saving || !child.name || !child.school_name} onClick={saveChild} data-testid="onboarding-step2-next">{saving ? 'Saving…' : 'Continue →'}</button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h2 style={{ marginTop: 0 }}>Step 3 — Preferences</h2>
              <label className="label">Daily practice goal</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[15,30,45,60].map((m) => (
                  <button key={m} type="button" onClick={() => setPrefs({ ...prefs, daily_goal_minutes: m })} className="btn-ghost" style={{ background: prefs.daily_goal_minutes === m ? '#EEF2FF' : 'white', borderColor: prefs.daily_goal_minutes === m ? '#4F46E5' : '#E2E8F0', color: prefs.daily_goal_minutes === m ? '#4F46E5' : '#0F172A', fontWeight: 700 }}>{m} min</button>
                ))}
              </div>
              <label className="label" style={{ marginTop: 16 }}>Difficulty preference</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Easy','Medium','Hard','Adaptive'].map((d) => (
                  <button key={d} type="button" onClick={() => setPrefs({ ...prefs, difficulty_preference: d })} className="btn-ghost" style={{ background: prefs.difficulty_preference === d ? '#EEF2FF' : 'white', borderColor: prefs.difficulty_preference === d ? '#4F46E5' : '#E2E8F0', color: prefs.difficulty_preference === d ? '#4F46E5' : '#0F172A', fontWeight: 700 }}>{d}</button>
                ))}
              </div>
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" disabled={saving} onClick={savePrefs} data-testid="onboarding-finish">{saving ? 'Saving…' : 'Finish → Go to Dashboard'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
