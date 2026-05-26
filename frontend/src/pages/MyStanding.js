import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { Card, Skeleton, EmptyState } from '../components/UI';
import { claudeAPI } from '../lib/claudeAPI';
import { getPercentileBand, getRankMessage, getWeekStart } from '../lib/helpers';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function MyStanding() {
  const { activeChild, showToast } = useApp();
  const [peers, setPeers] = useState([]);
  const [rankHistory, setRankHistory] = useState([]);
  const [weakConcepts, setWeakConcepts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChild) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data: p }, { data: rh }, { data: wc }, { data: ses }] = await Promise.all([
          supabase.from('peer_benchmark_pool').select('*').eq('school_name', activeChild.school_name).eq('class', activeChild.class).eq('section', activeChild.section),
          supabase.from('rank_history').select('*').eq('child_id', activeChild.id).order('week_start', { ascending: true }),
          supabase.from('weak_concepts').select('*').eq('child_id', activeChild.id).eq('resolved', false),
          supabase.from('practice_sessions').select('*').eq('child_id', activeChild.id).eq('completed', true),
        ]);
        setPeers(p || []); setRankHistory(rh || []); setWeakConcepts(wc || []); setSessions(ses || []);
        // snapshot this week's rank
        const weekStart = getWeekStart();
        const sortedP = [...(p || [])].sort((a,b) => b.overall_accuracy - a.overall_accuracy);
        const myIdx = sortedP.findIndex((x) => x.child_id === activeChild.id);
        if (myIdx >= 0 && (p || []).length > 0) {
          const myRank = myIdx + 1;
          const total = sortedP.length;
          const pct = Math.round(((total - myRank + 1) / total) * 100);
          const existing = (rh || []).find((r) => r.week_start === weekStart);
          if (!existing) {
            const prev = (rh || []).slice(-1)[0];
            const rankChange = prev ? prev.rank - myRank : 0;
            await supabase.from('rank_history').insert({
              child_id: activeChild.id,
              week_start: weekStart,
              rank: myRank,
              total_students: total,
              percentile: pct,
              accuracy_that_week: sortedP[myIdx].overall_accuracy,
              rank_change: rankChange,
            });
          }
        }
      } catch (e) { showToast(e.message, 'error'); }
      finally { setLoading(false); }
    })();
  }, [activeChild, showToast]);

  if (!activeChild) return <Card>Add a child first.</Card>;
  if (loading) return <Skeleton height={400} />;

  const sorted = [...peers].sort((a,b) => b.overall_accuracy - a.overall_accuracy);
  const myIdx = sorted.findIndex((p) => p.child_id === activeChild.id);
  const myPeer = sorted[myIdx];
  const myRank = myIdx + 1;
  const total = sorted.length;
  const pct = total > 0 ? Math.round(((total - myRank + 1) / total) * 100) : 0;
  const classAvg = total > 0 ? sorted.reduce((a,p) => a + Number(p.overall_accuracy||0), 0) / total : 0;
  const topScore = total > 0 ? sorted[0].overall_accuracy : 0;
  const band = getPercentileBand(pct);

  // radar data
  const myAcc = Number(myPeer?.overall_accuracy || 0);
  const radarData = [
    { metric: 'Accuracy', you: myAcc, classAvg: classAvg, top: topScore },
    { metric: 'Speed', you: 70 + Math.random()*20, classAvg: 60, top: 90 },
    { metric: 'Consistency', you: Math.min(100, (activeChild.streak || 0) * 5), classAvg: 40, top: 80 },
    { metric: 'Weak coverage', you: Math.max(0, 100 - weakConcepts.length * 10), classAvg: 50, top: 85 },
    { metric: 'Frequency', you: Math.min(100, sessions.length * 10), classAvg: 55, top: 88 },
  ];

  // subject gap
  const subjScores = myPeer?.subject_scores || {};
  const subjectGap = Object.keys(subjScores).map((s) => {
    const others = peers.filter((p) => p.child_id !== activeChild.id).map((p) => p.subject_scores?.[s] || 0);
    const avg = others.length ? others.reduce((a,b) => a + b, 0) / others.length : 0;
    const my = subjScores[s];
    return { subject: s, mine: my, classAvg: Math.round(avg), gap: my - Math.round(avg), status: my - avg > 5 ? 'Strong' : my - avg < -5 ? 'Weak' : 'On track' };
  });

  const refreshAI = async () => {
    setAiLoading(true);
    try {
      const subjects = subjectGap.map((s) => ({ subject: s.subject, myScore: s.mine, classAvg: s.classAvg, topScore: Math.max(...peers.map((p) => p.subject_scores?.[s.subject] || 0)) }));
      const r = await claudeAPI.peerAnalysis({
        studentName: activeChild.name,
        class: activeChild.class,
        school: activeChild.school_name,
        rank: myRank,
        totalStudents: total,
        percentile: pct,
        accuracy: myAcc,
        classAvg: Number(classAvg.toFixed(1)),
        topScore: Number(topScore),
        subjects,
        practice: {
          questionsPerDay: Math.round(sessions.length / 7),
          streak: activeChild.streak || 0,
          weakConcepts: weakConcepts.map((w) => w.concept).slice(0,5),
          strongConcepts: [],
        },
      });
      setAiFeedback(r);
      showToast('AI feedback updated', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setAiLoading(false); }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>📊 My standing</h1>
      <Card style={{ marginBottom: 14, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="badge badge-indigo" style={{ marginBottom: 8 }}>{band.label}</div>
            <div style={{ fontSize: 44, fontWeight: 800 }}>#{myRank || '—'} <span style={{ fontSize: 18, color: '#64748B' }}>of {total}</span></div>
            <div style={{ color: '#475569' }}>{pct}th percentile in your class section</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: '#64748B' }}>Your accuracy</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#10B981' }}>{myAcc.toFixed(1)}%</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>vs class {classAvg.toFixed(1)}% • top {Number(topScore).toFixed(1)}%</div>
          </div>
        </div>
        <div style={{ marginTop: 12, padding: 10, background: '#EEF2FF', borderRadius: 8, fontSize: 14 }}>{getRankMessage(pct)}</div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>Strengths & gaps</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="metric" fontSize={11} />
              <PolarRadiusAxis fontSize={10} domain={[0, 100]} />
              <Radar name="You" dataKey="you" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.4} />
              <Radar name="Class avg" dataKey="classAvg" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.2} />
              <Radar name="Top" dataKey="top" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 style={{ marginTop: 0 }}>Subject gap analysis</h3>
          {subjectGap.length === 0 ? <EmptyState icon="📖" title="Take a session" description="We need subject data to compare." /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead><tr style={{ textAlign: 'left', color: '#64748B', fontSize: 12 }}><th>Subject</th><th>You</th><th>Class</th><th>Gap</th><th>Status</th></tr></thead>
              <tbody>
                {subjectGap.map((s) => (
                  <tr key={s.subject} style={{ borderTop: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 0' }}>{s.subject}</td>
                    <td>{s.mine}%</td>
                    <td>{s.classAvg}%</td>
                    <td style={{ color: s.gap >= 0 ? '#10B981' : '#EF4444' }}>{s.gap >= 0 ? '+' : ''}{s.gap}</td>
                    <td><span className={`badge ${s.status === 'Strong' ? 'badge-green' : s.status === 'Weak' ? 'badge-red' : 'badge-indigo'}`}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>✨ AI improvement coach</h3>
          <button className="btn-primary" onClick={refreshAI} disabled={aiLoading}>{aiLoading ? 'Thinking…' : (aiFeedback ? 'Refresh feedback' : 'Get AI feedback')}</button>
        </div>
        {aiFeedback ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ padding: 14, background: '#EEF2FF', borderRadius: 10, marginBottom: 12 }}>
              <b>Summary:</b> {aiFeedback.rankSummary}
            </div>
            <p style={{ fontSize: 14 }}>{aiFeedback.overallFeedback}</p>
            <div style={{ marginTop: 8, padding: 12, background: '#FEF3C7', borderRadius: 10 }}>
              <b>🔥 Top priority:</b> {aiFeedback.topPriorityAction}
            </div>
            <div style={{ marginTop: 8, padding: 12, background: '#ECFDF5', borderRadius: 10 }}>
              <b>📊 Study habit:</b> {aiFeedback.studyHabitInsights}
            </div>
            <div style={{ marginTop: 8, padding: 12, background: '#DBEAFE', borderRadius: 10 }}>
              <b>🎯 This week:</b> {aiFeedback.weeklyChallenge}
            </div>
            <div style={{ marginTop: 14 }}>
              <b>Subject-by-subject:</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {(aiFeedback.subjectFeedback || []).map((s, i) => (
                  <div key={i} style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b>{s.subject}</b><span className="badge badge-gray">{s.status}</span>
                    </div>
                    <p style={{ margin: '6px 0', fontSize: 14 }}>{s.feedback}</p>
                    {s.actionItems?.length > 0 && <ul style={{ margin: '6px 0', paddingLeft: 18, fontSize: 13 }}>{s.actionItems.map((a, j) => <li key={j}>{a}</li>)}</ul>}
                    <div style={{ fontSize: 12, color: '#64748B' }}><b>Rank impact:</b> {s.rankImpact}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 14, padding: 12, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: 'white', borderRadius: 12, fontWeight: 600 }}>🌟 {aiFeedback.motivationalMessage}</div>
            {aiFeedback.projectedRank && (
              <div style={{ marginTop: 10, padding: 12, background: '#F1F5F9', borderRadius: 10, fontSize: 13 }}>
                <b>Projected rank:</b> Current pace #{aiFeedback.projectedRank.currentPace} → with focus plan #{aiFeedback.projectedRank.withFocusPlan} ({aiFeedback.projectedRank.improvement >= 0 ? '+' : ''}{aiFeedback.projectedRank.improvement} ranks).
              </div>
            )}
          </div>
        ) : <p style={{ color: '#64748B' }}>Click 'Get AI feedback' for a personalised coaching plan.</p>}
      </Card>

      <Card style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Rank trajectory</h3>
        {rankHistory.length === 0 ? <EmptyState icon="📈" title="No history yet" description="Your rank will be tracked weekly." /> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={rankHistory.map((r) => ({ name: r.week_start, rank: r.rank }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
              <YAxis reversed fontSize={11} stroke="#94A3B8" />
              <Tooltip />
              <Line type="monotone" dataKey="rank" stroke="#4F46E5" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
