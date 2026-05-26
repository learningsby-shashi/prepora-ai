import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { Card, Skeleton } from '../components/UI';
import { claudeAPI } from '../lib/claudeAPI';
import { getRankMessage } from '../lib/helpers';

export default function Results() {
  const { sessionId } = useParams();
  const { activeChild, showToast } = useApp();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [bank, setBank] = useState(null);
  const [peers, setPeers] = useState([]);
  const [evalMap, setEvalMap] = useState({});
  const [evalLoading, setEvalLoading] = useState({});

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('practice_sessions').select('*').eq('id', sessionId).maybeSingle();
      setSession(s);
      if (s?.question_bank_id) {
        const { data: b } = await supabase.from('question_banks').select('*').eq('id', s.question_bank_id).maybeSingle();
        setBank(b);
      }
      if (activeChild) {
        const { data: p } = await supabase.from('peer_benchmark_pool').select('*').eq('school_name', activeChild.school_name).eq('class', activeChild.class).eq('section', activeChild.section);
        setPeers(p || []);
      }
    })();
  }, [sessionId, activeChild]);

  if (!session) return <Skeleton height={200} />;
  const questions = bank?.questions?.questions || [];
  const answers = session.answers || {};
  const accuracy = Number(session.accuracy || 0);
  const classAvg = peers.length ? peers.reduce((a,p) => a + Number(p.overall_accuracy||0),0)/peers.length : 0;
  const topScore = peers.length ? Math.max(...peers.map((p) => Number(p.overall_accuracy||0))) : 100;
  const myPeer = peers.find((p) => p.child_id === activeChild?.id);
  const sorted = [...peers].sort((a,b) => b.overall_accuracy - a.overall_accuracy);
  const myRank = sorted.findIndex((p) => p.child_id === activeChild?.id) + 1;
  const percentile = sorted.length > 0 ? Math.round(((sorted.length - myRank + 1) / sorted.length) * 100) : 0;

  const evaluateSubjective = async (q) => {
    const ua = answers[q.id]?.value;
    if (!ua) return;
    setEvalLoading((m) => ({ ...m, [q.id]: true }));
    try {
      const r = await claudeAPI.evaluateSubjective({
        question: q.question,
        modelAnswer: q.answer || '',
        keywords: q.keywords || [],
        studentAnswer: String(ua),
        marks: q.marks || 5,
      });
      setEvalMap((m) => ({ ...m, [q.id]: r }));
    } catch (e) { showToast(e.message, 'error'); }
    finally { setEvalLoading((m) => ({ ...m, [q.id]: false })); }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>🎉 Session results</h1>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, textAlign: 'center' }}>
          <div><div style={{ fontSize: 13, color: '#64748B' }}>Score</div><div style={{ fontSize: 32, fontWeight: 800, color: '#4F46E5' }}>{session.score}/{session.total_marks}</div></div>
          <div><div style={{ fontSize: 13, color: '#64748B' }}>Accuracy</div><div style={{ fontSize: 32, fontWeight: 800, color: '#10B981' }}>{accuracy.toFixed(1)}%</div></div>
          <div><div style={{ fontSize: 13, color: '#64748B' }}>XP earned</div><div style={{ fontSize: 32, fontWeight: 800, color: '#F59E0B' }}>+{session.xp_earned}</div></div>
          <div><div style={{ fontSize: 13, color: '#64748B' }}>Time</div><div style={{ fontSize: 32, fontWeight: 800 }}>{session.duration_seconds ? `${Math.floor(session.duration_seconds/60)}m` : '—'}</div></div>
        </div>
        <div style={{ marginTop: 16, padding: 12, background: '#EEF2FF', borderRadius: 10, fontSize: 14 }}>{getRankMessage(percentile)}</div>
      </Card>

      {peers.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0 }}>How you compare</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Your accuracy</span><b>{accuracy.toFixed(1)}%</b></div>
              <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${accuracy}%` }} /></div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Class average</span><b>{classAvg.toFixed(1)}%</b></div>
              <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${classAvg}%`, background: '#10B981' }} /></div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Top in class</span><b>{topScore.toFixed(1)}%</b></div>
              <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${topScore}%`, background: '#F59E0B' }} /></div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h3 style={{ marginTop: 0 }}>Question-by-question</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.map((q, i) => {
            const a = answers[q.id];
            const isObj = ['MCQ','True/False','Fill Blanks','Match Following'].includes(q.type);
            return (
              <div key={q.id} style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b>Q{i+1}. {q.question}</b>
                  {isObj && (a?.correct ? <span className="badge badge-green">Correct</span> : <span className="badge badge-red">Wrong</span>)}
                </div>
                {a?.value != null && (
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    <b>Your answer:</b> {typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value)}
                  </div>
                )}
                {isObj && (
                  <div style={{ marginTop: 4, fontSize: 13, color: '#475569' }}>
                    <b>Correct:</b> {typeof q.answer === 'object' ? JSON.stringify(q.answer) : String(q.answer)} — {q.explanation}
                  </div>
                )}
                {!isObj && a?.value && (
                  <div style={{ marginTop: 8 }}>
                    {!evalMap[q.id] ? (
                      <button className="btn-secondary" onClick={() => evaluateSubjective(q)} disabled={evalLoading[q.id]}>{evalLoading[q.id] ? 'Evaluating…' : '✨ AI evaluate my answer'}</button>
                    ) : (
                      <div style={{ background: '#F1F5F9', padding: 10, borderRadius: 8, fontSize: 13 }}>
                        <div><b>Marks awarded:</b> {evalMap[q.id].marksAwarded}/{evalMap[q.id].totalMarks} ({evalMap[q.id].percentage}%)</div>
                        <div style={{ marginTop: 4 }}><b>Feedback:</b> {evalMap[q.id].feedback}</div>
                        {evalMap[q.id].correctPoints?.length > 0 && <div style={{ marginTop: 4 }}><b>What you got right:</b> {evalMap[q.id].correctPoints.join(', ')}</div>}
                        {evalMap[q.id].improvements?.length > 0 && <div style={{ marginTop: 4 }}><b>Improvements:</b> {evalMap[q.id].improvements.join(', ')}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn-ghost" onClick={() => navigate('/dashboard')}>← Back to dashboard</button>
          <button className="btn-primary" onClick={() => navigate(`/practice/${bank?.id || ''}`)}>🔄 Retry weak questions</button>
        </div>
      </Card>
    </div>
  );
}
