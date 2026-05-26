import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { claudeAPI } from '../lib/claudeAPI';
import { Card, EmptyState, Skeleton } from '../components/UI';

const Q_TYPES = ['MCQ','Fill Blanks','True/False','Short Answer','Match Following','Long Answer','Flashcards'];
const DIFFICULTIES = ['Easy','Medium','Hard','Mixed','Exam Mode'];
const COUNTS = [5, 10, 15, 20, 25];

export default function Generate() {
  const { activeChild, showToast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const presetMaterialId = params.get('materialId');

  const [materials, setMaterials] = useState([]);
  const [materialId, setMaterialId] = useState(presetMaterialId || '');
  const [count, setCount] = useState(10);
  const [types, setTypes] = useState(['MCQ']);
  const [difficulty, setDifficulty] = useState('Medium');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [savedBankId, setSavedBankId] = useState(null);

  useEffect(() => {
    if (!activeChild) return;
    (async () => {
      const { data } = await supabase.from('uploaded_materials').select('*').eq('child_id', activeChild.id).order('created_at', { ascending: false });
      setMaterials(data || []);
    })();
  }, [activeChild]);

  const toggleType = (t) => setTypes((arr) => arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]);

  const generate = async () => {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) { showToast('Select a material', 'error'); return; }
    if (types.length === 0) { showToast('Pick at least one question type', 'error'); return; }
    setLoading(true); setResult(null); setSavedBankId(null);
    try {
      const payload = {
        content: mat.raw_content || '',
        subject: mat.subject,
        class: mat.class || activeChild.class,
        chapter: mat.chapter,
        difficulty,
        count,
        types,
      };
      const r = await claudeAPI.generateQuestions(payload);
      // ensure ids on questions
      r.questions = (r.questions || []).map((q, i) => ({ ...q, id: q.id || `q_${i+1}` }));
      setResult(r);
      // save question bank automatically
      const { data: bank } = await supabase.from('question_banks').insert({
        child_id: activeChild.id,
        material_id: mat.id,
        subject: r.subject || mat.subject,
        class: r.class || mat.class,
        chapter: r.chapter || mat.chapter,
        difficulty: r.difficulty || difficulty,
        total_marks: r.totalMarks || (r.questions || []).reduce((a,q) => a + (q.marks || 1), 0),
        question_count: (r.questions || []).length,
        questions: r,
      }).select().single();
      setSavedBankId(bank?.id);
      showToast(`${(r.questions||[]).length} questions generated`, 'success');
    } catch (e) { showToast(e.message || 'Generation failed', 'error'); }
    finally { setLoading(false); }
  };

  if (!activeChild) return <Card>Add a child first.</Card>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>✍️ Generate questions</h1>
      <p style={{ color: '#64748B' }}>Pick a material, configure types and difficulty, and let AI build your test.</p>

      <Card>
        <label className="label">Source material</label>
        {materials.length === 0 ? <EmptyState icon="📄" title="No materials yet" description="Upload a chapter first." cta={<Link to="/upload" className="btn-primary" style={{textDecoration:'none'}}>Upload material</Link>} /> : (
          <select className="input" value={materialId} onChange={(e) => setMaterialId(e.target.value)} data-testid="gen-material-select">
            <option value="">Select…</option>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.subject || 'General'} — {m.chapter || 'Untitled'}</option>)}
          </select>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
          <div>
            <label className="label">Question count</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {COUNTS.map((c) => (
                <button key={c} className="btn-ghost" type="button" onClick={() => setCount(c)} style={{ background: count === c ? '#EEF2FF' : 'white', borderColor: count === c ? '#4F46E5' : '#E2E8F0', color: count === c ? '#4F46E5' : '#0F172A', fontWeight: 700 }}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <label className="label" style={{ marginTop: 14 }}>Question types</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Q_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => toggleType(t)} style={{ padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: types.includes(t) ? '#4F46E5' : '#F1F5F9', color: types.includes(t) ? 'white' : '#475569' }}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn-primary" disabled={loading || !materialId} onClick={generate} data-testid="gen-create-btn">{loading ? '🪄 Generating…' : '✨ Generate questions'}</button>
        </div>
      </Card>

      {loading && <Card style={{ marginTop: 16 }}><Skeleton height={180} /></Card>}

      {result && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ margin: 0 }}>{result.title || `${result.subject} — ${result.chapter}`}</h2>
              <div style={{ color: '#64748B', fontSize: 13 }}>{result.questions?.length} questions • {result.totalMarks || '—'} marks • {result.difficulty}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setShowAnswers((v) => !v)}>{showAnswers ? 'Hide' : 'Show'} answers</button>
              <button className="btn-ghost" onClick={() => window.print()}>🖨️ Print</button>
              {savedBankId && <button className="btn-primary" onClick={() => navigate(`/practice/${savedBankId}`)} data-testid="gen-practice-btn">✍️ Practice now</button>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            {(result.questions || []).map((q, i) => (
              <div key={q.id} style={{ padding: 14, border: '1px solid #E2E8F0', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700 }}>Q{i+1}. <span className="badge badge-indigo" style={{ marginLeft: 6 }}>{q.type}</span></span>
                  <span style={{ color: '#64748B', fontSize: 12 }}>{q.marks || 1}m • {q.bloomLevel || '—'}</span>
                </div>
                <div style={{ marginBottom: 8 }}>{q.question}</div>
                {q.options && (
                  <ul style={{ margin: 0, paddingLeft: 20 }}>{q.options.map((o, j) => <li key={j} style={{ marginBottom: 4 }}>{o}</li>)}</ul>
                )}
                {q.pairs && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>{q.pairs.map((p, j) => <div key={j}>{j+1}. {p.left}</div>)}</div>
                    <div>{q.pairs.map((p, j) => <div key={j}>{String.fromCharCode(65+j)}. {p.right}</div>)}</div>
                  </div>
                )}
                {showAnswers && (
                  <div style={{ marginTop: 10, padding: 10, background: '#ECFDF5', borderRadius: 8, fontSize: 13 }}>
                    <b>Answer:</b> {typeof q.answer === 'object' ? JSON.stringify(q.answer) : String(q.answer)}<br />
                    <b>Explanation:</b> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
