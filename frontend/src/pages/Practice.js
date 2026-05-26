import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { Card, EmptyState, Skeleton } from '../components/UI';
import { calculateXP, todayISO, getLevel } from '../lib/helpers';

const MODES = [
  { id: 'quick', label: 'Quick Practice', desc: '10 random questions', icon: '⚡' },
  { id: 'chapter', label: 'Chapter Practice', desc: 'All questions in order', icon: '📖' },
  { id: 'mock', label: 'Mock Test', desc: 'Timed exam mode', icon: '⏱️' },
  { id: 'revision', label: 'AI Revision', desc: 'Weak concepts only', icon: '🔄' },
  { id: 'challenge', label: 'Challenge', desc: 'Beat the class average', icon: '🔥' },
];

export default function Practice() {
  const { sessionId: bankId } = useParams();
  const { activeChild, showToast } = useApp();
  const navigate = useNavigate();
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(bankId || '');
  const [mode, setMode] = useState('quick');
  const [session, setSession] = useState(null);
  const [bank, setBank] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!activeChild) return;
    (async () => {
      const { data } = await supabase.from('question_banks').select('*').eq('child_id', activeChild.id).order('created_at', { ascending: false });
      setBanks(data || []);
      setLoading(false);
      if (bankId && data?.length) setSelectedBankId(bankId);
    })();
  }, [activeChild, bankId]);

  const start = async () => {
    const b = banks.find((x) => x.id === selectedBankId);
    if (!b) { showToast('Pick a question bank', 'error'); return; }
    setBank(b);
    let qs = (b.questions?.questions || []);
    if (mode === 'quick') qs = [...qs].sort(() => Math.random() - 0.5).slice(0, Math.min(10, qs.length));
    if (mode === 'revision') {
      // filter by weak concepts
      const { data: weak } = await supabase.from('weak_concepts').select('concept').eq('child_id', activeChild.id).eq('resolved', false);
      const weakSet = new Set((weak || []).map((w) => w.concept));
      qs = qs.filter((q) => weakSet.has(q.concept));
      if (qs.length === 0) qs = (b.questions?.questions || []).slice(0, 5);
    }
    setQuestions(qs);
    setIdx(0); setAnswers({}); setFeedback(null);
    if (mode === 'mock') setTimeLeft(qs.length * 90); // 90s/question
    const { data: s } = await supabase.from('practice_sessions').insert({
      child_id: activeChild.id,
      question_bank_id: b.id,
      mode,
      start_time: new Date().toISOString(),
      total_marks: qs.reduce((a, q) => a + (q.marks || 1), 0),
      answers: {},
      score: 0,
      accuracy: 0,
      completed: false,
    }).select().single();
    setSession(s);
  };

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { finish(); return; }
    const t = setTimeout(() => setTimeLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [timeLeft]);

  const current = questions[idx];

  const checkAnswer = (q, ans) => {
    if (!q || ans == null || ans === '') return false;
    if (q.type === 'MCQ') return String(ans).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
    if (q.type === 'True/False') return String(ans).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
    if (q.type === 'Fill Blanks') return String(ans).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
    if (q.type === 'Match Following') {
      try {
        const correct = q.pairs || [];
        const userMap = ans; // {leftIdx: rightLetter}
        let allRight = true;
        correct.forEach((p, i) => {
          const userR = userMap[i];
          if (userR !== String.fromCharCode(65 + i)) allRight = false;
        });
        return allRight;
      } catch { return false; }
    }
    return null; // subjective
  };

  const submitAnswer = (val) => {
    const q = current;
    const isCorrect = checkAnswer(q, val);
    setAnswers((a) => ({ ...a, [q.id]: { value: val, correct: isCorrect } }));
    if (mode !== 'mock' && ['MCQ','True/False','Fill Blanks','Match Following'].includes(q.type)) {
      setFeedback({ correct: isCorrect, explanation: q.explanation, answer: q.answer });
    } else {
      next();
    }
  };

  const next = () => {
    setFeedback(null);
    if (idx + 1 < questions.length) setIdx(idx + 1);
    else finish();
  };

  const finish = async () => {
    if (finishing || !session) return;
    setFinishing(true);
    try {
      const objectiveScore = questions.reduce((acc, q) => {
        const a = answers[q.id];
        if (a && a.correct === true) return acc + (q.marks || 1);
        return acc;
      }, 0);
      const totalMarks = questions.reduce((a, q) => a + (q.marks || 1), 0);
      const accuracy = totalMarks > 0 ? (objectiveScore / totalMarks) * 100 : 0;
      const correctCount = questions.filter((q) => answers[q.id]?.correct === true).length;
      const xpEarned = calculateXP(correctCount, questions.length, mode === 'mock');

      // subject scores
      const subjectScores = {};
      const subj = bank?.subject || 'General';
      subjectScores[subj] = Math.round(accuracy);

      await supabase.from('practice_sessions').update({
        end_time: new Date().toISOString(),
        duration_seconds: timeLeft != null ? questions.length * 90 - timeLeft : null,
        answers,
        score: objectiveScore,
        total_marks: totalMarks,
        accuracy: Number(accuracy.toFixed(2)),
        xp_earned: xpEarned,
        subject_scores: subjectScores,
        completed: true,
      }).eq('id', session.id);

      // update child XP, level, streak
      const newXp = (activeChild.xp || 0) + xpEarned;
      const newLevel = getLevel(newXp).name;
      const last = activeChild.last_active_date;
      const today = todayISO();
      let newStreak = activeChild.streak || 0;
      if (last !== today) {
        const yest = new Date(); yest.setDate(yest.getDate() - 1);
        const yISO = yest.toISOString().slice(0,10);
        newStreak = last === yISO ? (newStreak + 1) : 1;
      }
      await supabase.from('children').update({ xp: newXp, level: newLevel, streak: newStreak, last_active_date: today }).eq('id', activeChild.id);

      // weak concepts
      const wrongQuestions = questions.filter((q) => answers[q.id] && answers[q.id].correct === false);
      for (const q of wrongQuestions) {
        if (!q.concept) continue;
        const { data: existing } = await supabase.from('weak_concepts').select('*').eq('child_id', activeChild.id).eq('concept', q.concept).maybeSingle();
        if (existing) {
          await supabase.from('weak_concepts').update({ miss_count: (existing.miss_count || 0) + 1, last_missed: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('weak_concepts').insert({ child_id: activeChild.id, subject: bank?.subject, concept: q.concept, miss_count: 1 });
        }
      }

      // update peer pool
      const { data: peerRow } = await supabase.from('peer_benchmark_pool').select('*').eq('anonymous_id', `self_${activeChild.id}`).maybeSingle();
      if (peerRow) {
        const newTotalQ = (peerRow.total_questions || 0) + questions.length;
        const newAcc = newTotalQ > 0 ? ((Number(peerRow.overall_accuracy||0) * (peerRow.total_questions||0)) + (accuracy * questions.length)) / newTotalQ : accuracy;
        const subj2 = bank?.subject || 'General';
        const newSubjScores = { ...(peerRow.subject_scores || {}), [subj2]: Math.round(((peerRow.subject_scores?.[subj2] || 0) + accuracy) / 2) };
        await supabase.from('peer_benchmark_pool').update({
          overall_accuracy: Number(newAcc.toFixed(2)),
          total_questions: newTotalQ,
          streak: newStreak,
          xp: newXp,
          subject_scores: newSubjScores,
          last_updated: new Date().toISOString(),
        }).eq('id', peerRow.id);
      }

      navigate(`/results/${session.id}`);
    } catch (e) {
      showToast(e.message || 'Could not finish session', 'error');
    } finally { setFinishing(false); }
  };

  if (!activeChild) return <Card>Add a child first.</Card>;

  if (!session) {
    return (
      <div>
        <h1 style={{ marginTop: 0 }}>✍️ Practice</h1>
        <Card style={{ marginBottom: 12 }}>
          <label className="label">Question bank</label>
          {loading ? <Skeleton height={50} /> : banks.length === 0 ? <EmptyState icon="📚" title="No banks yet" description="Generate questions first." cta={<button className="btn-primary" onClick={() => navigate('/generate')}>Generate now</button>} /> : (
            <select className="input" value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)} data-testid="practice-bank-select">
              <option value="">Select…</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.subject || 'General'} — {b.chapter || 'Untitled'} ({b.question_count}q)</option>)}
            </select>
          )}
          <label className="label" style={{ marginTop: 14 }}>Mode</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {MODES.map((m) => (
              <button key={m.id} type="button" onClick={() => setMode(m.id)} className="card-tight" style={{ border: mode === m.id ? '2px solid #4F46E5' : '1px solid #E2E8F0', borderRadius: 12, padding: 14, background: mode === m.id ? '#EEF2FF' : 'white', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 22 }}>{m.icon}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{m.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn-primary" disabled={!selectedBankId} onClick={start} data-testid="practice-start-btn">Start practice →</button>
          </div>
        </Card>
      </div>
    );
  }

  if (!current) return <Card>No questions to show.</Card>;

  const userAns = answers[current.id]?.value;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="badge badge-indigo">Question {idx+1} / {questions.length}</span>
        {timeLeft != null && (
          <span className="badge badge-amber">⏱️ {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
        )}
      </div>
      <div className="progress-bar" style={{ marginBottom: 18 }}>
        <div className="progress-bar-fill" style={{ width: `${((idx+1)/questions.length)*100}%` }} />
      </div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="badge badge-gray">{current.type}</span>
          <span style={{ color: '#64748B', fontSize: 12 }}>{current.marks || 1} marks</span>
        </div>
        <h2 style={{ marginTop: 0, fontSize: 20, lineHeight: 1.4 }}>{current.question}</h2>
        {current.type === 'MCQ' && (
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {(current.options || []).map((o, i) => (
              <button key={i} onClick={() => !feedback && submitAnswer(o)} disabled={!!feedback} className="btn-ghost" data-testid={`mcq-opt-${i}`} style={{ textAlign: 'left', padding: '12px 14px', background: userAns === o ? (feedback ? (answers[current.id]?.correct ? '#D1FAE5' : '#FEE2E2') : '#EEF2FF') : 'white' }}>
                <b>{String.fromCharCode(65+i)}.</b> {o}
              </button>
            ))}
          </div>
        )}
        {current.type === 'True/False' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {['True','False'].map((v) => (
              <button key={v} onClick={() => !feedback && submitAnswer(v)} disabled={!!feedback} className="btn-ghost" style={{ flex: 1, padding: '18px', fontSize: 18, fontWeight: 700, background: userAns === v ? (feedback ? (answers[current.id]?.correct ? '#D1FAE5' : '#FEE2E2') : '#EEF2FF') : 'white' }}>{v}</button>
            ))}
          </div>
        )}
        {current.type === 'Fill Blanks' && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <input className="input" defaultValue={userAns || ''} disabled={!!feedback} placeholder="Type your answer…" id="fb-input" />
            <button className="btn-primary" disabled={!!feedback} onClick={() => submitAnswer(document.getElementById('fb-input').value)}>Submit</button>
          </div>
        )}
        {(current.type === 'Short Answer' || current.type === 'Long Answer') && (
          <div style={{ marginTop: 14 }}>
            <textarea className="input" rows={current.type === 'Long Answer' ? 6 : 3} defaultValue={userAns || ''} id="sa-input" placeholder="Write your answer…" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn-primary" onClick={() => submitAnswer(document.getElementById('sa-input').value)}>Save & Next</button>
            </div>
          </div>
        )}
        {current.type === 'Match Following' && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(current.pairs || []).map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                <div style={{ padding: 10, background: '#F1F5F9', borderRadius: 8 }}>{i+1}. {p.left}</div>
                <span>→</span>
                <select className="input" defaultValue="" onChange={(e) => {
                  const v = e.target.value;
                  setAnswers((a) => ({ ...a, [current.id]: { value: { ...(a[current.id]?.value || {}), [i]: v }, correct: null } }));
                }}>
                  <option value="">Pick</option>
                  {(current.pairs || []).map((p2, j) => <option key={j} value={String.fromCharCode(65+j)}>{String.fromCharCode(65+j)}. {p2.right}</option>)}
                </select>
              </div>
            ))}
            <button className="btn-primary" style={{ alignSelf: 'flex-end' }} onClick={() => submitAnswer(answers[current.id]?.value || {})}>Submit →</button>
          </div>
        )}
        {current.type === 'Flashcards' && (
          <div style={{ marginTop: 14, padding: 18, background: '#EEF2FF', borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Front:</div><div>{current.front || current.question}</div>
            <div style={{ fontWeight: 700, marginTop: 12, marginBottom: 8 }}>Back:</div><div>{current.back || current.answer}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><button className="btn-primary" onClick={() => submitAnswer('reviewed')}>Got it →</button></div>
          </div>
        )}
        {feedback && (
          <div style={{ marginTop: 14, padding: 14, background: feedback.correct ? '#D1FAE5' : '#FEE2E2', borderRadius: 12 }}>
            <div style={{ fontWeight: 700, color: feedback.correct ? '#065F46' : '#991B1B' }}>{feedback.correct ? '✅ Correct!' : '❌ Not quite.'}</div>
            <div style={{ marginTop: 4, fontSize: 14 }}><b>Answer:</b> {typeof feedback.answer === 'object' ? JSON.stringify(feedback.answer) : String(feedback.answer)}</div>
            <div style={{ marginTop: 4, fontSize: 14 }}>{feedback.explanation}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn-primary" onClick={next} data-testid="practice-next-btn">{idx + 1 < questions.length ? 'Next →' : 'Finish →'}</button>
            </div>
          </div>
        )}
      </Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <button className="btn-ghost" onClick={() => { setIdx(Math.max(0, idx-1)); setFeedback(null); }} disabled={idx === 0}>← Prev</button>
        <button className="btn-ghost" onClick={finish} disabled={finishing} data-testid="practice-finish-btn">{finishing ? 'Submitting…' : 'Finish session'}</button>
      </div>
    </div>
  );
}
