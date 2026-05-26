import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { Card, StatCard, EmptyState, Skeleton } from '../components/UI';
import { getLevel, getRankMessage, daysBetween, todayISO } from '../lib/helpers';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function Dashboard() {
  const { activeChild, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [weakConcepts, setWeakConcepts] = useState([]);
  const [peers, setPeers] = useState([]);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    if (!activeChild) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data: s }, { data: w }, { data: p }] = await Promise.all([
          supabase.from('practice_sessions').select('*').eq('child_id', activeChild.id).order('created_at', { ascending: false }).limit(60),
          supabase.from('weak_concepts').select('*').eq('child_id', activeChild.id).eq('resolved', false).order('miss_count', { ascending: false }).limit(5),
          supabase.from('peer_benchmark_pool').select('*').eq('school_name', activeChild.school_name).eq('class', activeChild.class).eq('section', activeChild.section),
        ]);
        setSessions(s || []);
        setWeakConcepts(w || []);
        setPeers(p || []);
        const sorted = [...(p || [])].sort((a,b) => b.overall_accuracy - a.overall_accuracy);
        const my = sorted.findIndex((x) => x.child_id === activeChild.id);
        if (my !== -1) setMyRank({ rank: my + 1, total: sorted.length });
      } catch (e) { showToast(e.message, 'error'); }
      finally { setLoading(false); }
    })();
  }, [activeChild, showToast]);

  if (!activeChild) return <EmptyState icon="👶" title="No child selected" description="Add a child to get started." cta={<Link to="/onboarding" className="btn-primary" style={{textDecoration:'none'}}>Add child</Link>} />;

  const completed = sessions.filter((s) => s.completed);
  const totalQuestions = completed.reduce((a, s) => a + (s.total_marks || 0), 0);
  const avgAccuracy = completed.length > 0 ? (completed.reduce((a, s) => a + Number(s.accuracy || 0), 0) / completed.length).toFixed(1) : '0';
  const examDays = activeChild.exam_date ? Math.max(0, daysBetween(todayISO(), activeChild.exam_date)) : null;
  const level = getLevel(activeChild.xp || 0);

  // Weekly trend
  const weekly = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i * 7);
    const wk = `W${8-i}`;
    const week = completed.filter((s) => {
      const diff = (now - new Date(s.created_at)) / (1000*60*60*24);
      return diff <= (i+1)*7 && diff > i*7;
    });
    weekly.push({ name: wk, accuracy: week.length ? Math.round(week.reduce((a,s) => a + Number(s.accuracy||0),0)/week.length) : 0 });
  }

  // Subject accuracy
  const subjectMap = {};
  completed.forEach((s) => {
    const ss = s.subject_scores || {};
    Object.entries(ss).forEach(([k,v]) => {
      if (!subjectMap[k]) subjectMap[k] = { sum: 0, n: 0 };
      subjectMap[k].sum += Number(v); subjectMap[k].n += 1;
    });
  });
  const subjectChart = Object.entries(subjectMap).map(([k,v]) => ({ name: k, accuracy: Math.round(v.sum/v.n) }));

  const classAvg = peers.length ? (peers.reduce((a,p) => a + Number(p.overall_accuracy||0),0)/peers.length).toFixed(1) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Welcome back 👋</h1>
          <p style={{ color: '#64748B', margin: '4px 0 0' }}>{activeChild.name}’s progress dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/upload" className="btn-primary" style={{ textDecoration: 'none' }} data-testid="dash-upload-btn">📄 Upload</Link>
          <Link to="/question-bank" className="btn-secondary" style={{ textDecoration: 'none' }} data-testid="dash-practice-btn">✍️ Practice</Link>
          <Link to="/leaderboard" className="btn-ghost" style={{ textDecoration: 'none' }}>🏆 Leaderboard</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon="📝" label="Questions practiced" value={totalQuestions} sub={`${completed.length} sessions`} color="#4F46E5" />
        <StatCard icon="🎯" label="Accuracy" value={`${avgAccuracy}%`} sub={`Class avg ${classAvg}%`} color="#10B981" />
        <StatCard icon="🔥" label="Streak" value={`${activeChild.streak || 0} days`} sub="Keep it up!" color="#F59E0B" />
        {examDays !== null && <StatCard icon="📅" label="Exam in" value={`${examDays}d`} sub={activeChild.exam_date} color="#EF4444" />}
        <StatCard icon="🏅" label="Class Rank" value={myRank ? `#${myRank.rank}` : '—'} sub={myRank ? `of ${myRank.total}` : 'Take a test'} color="#7C3AED" />
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Level: {level.name}</h3>
          <span className="badge badge-amber">{activeChild.xp || 0} XP</span>
        </div>
        <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${Math.min(100, ((activeChild.xp || 0) % 1000) / 10)}%` }} /></div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>{getRankMessage(myRank ? 100 - (myRank.rank / myRank.total) * 100 : 50)}</div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 18 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>Weekly accuracy</h3>
          {loading ? <Skeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h3 style={{ marginTop: 0 }}>Subject performance</h3>
          {loading ? <Skeleton height={220} /> : subjectChart.length === 0 ? <EmptyState icon="📊" title="No data yet" description="Complete a session to see subject breakdown." /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#10B981" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>🎯 Weak topics to focus</h3>
          {weakConcepts.length === 0 ? <EmptyState icon="🎉" title="No weak topics yet" description="Take a few practice sessions to discover gaps." /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {weakConcepts.map((w) => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#FEF3C7', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{w.concept}</div>
                    <div style={{ fontSize: 12, color: '#92400E' }}>{w.subject} • missed {w.miss_count}x</div>
                  </div>
                  <Link to="/practice" className="badge badge-amber" style={{ textDecoration: 'none' }}>Review →</Link>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 style={{ marginTop: 0 }}>👥 Peer comparison</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Your accuracy</div>
              <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${avgAccuracy}%` }} /></div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{avgAccuracy}%</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Class average</div>
              <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${classAvg}%`, background: '#10B981' }} /></div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{classAvg}%</div>
            </div>
            <Link to="/my-standing" className="btn-secondary" style={{ textDecoration: 'none', textAlign: 'center', marginTop: 8 }}>View detailed standing →</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
