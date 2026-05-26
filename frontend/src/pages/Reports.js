import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { Card, Skeleton } from '../components/UI';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const COLORS = ['#4F46E5','#10B981','#F59E0B','#7C3AED','#EF4444','#06B6D4','#EC4899'];

export default function Reports() {
  const { activeChild } = useApp();
  const [sessions, setSessions] = useState([]);
  const [rankHistory, setRankHistory] = useState([]);
  const [weakConcepts, setWeakConcepts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChild) return;
    (async () => {
      setLoading(true);
      const [{ data: s }, { data: r }, { data: w }] = await Promise.all([
        supabase.from('practice_sessions').select('*').eq('child_id', activeChild.id).eq('completed', true).order('created_at', { ascending: true }),
        supabase.from('rank_history').select('*').eq('child_id', activeChild.id).order('week_start', { ascending: true }),
        supabase.from('weak_concepts').select('*').eq('child_id', activeChild.id),
      ]);
      setSessions(s || []); setRankHistory(r || []); setWeakConcepts(w || []);
      setLoading(false);
    })();
  }, [activeChild]);

  if (!activeChild) return <Card>Add a child first.</Card>;
  if (loading) return <Skeleton height={400} />;

  // Weekly accuracy
  const weekly = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now); start.setDate(start.getDate() - (i+1)*7);
    const end = new Date(now); end.setDate(end.getDate() - i*7);
    const ses = sessions.filter((s) => { const d = new Date(s.created_at); return d > start && d <= end; });
    weekly.push({ week: `W${8-i}`, accuracy: ses.length ? Math.round(ses.reduce((a,s) => a + Number(s.accuracy||0),0)/ses.length) : 0 });
  }

  // Subject accuracy
  const subjMap = {};
  sessions.forEach((s) => Object.entries(s.subject_scores || {}).forEach(([k,v]) => { (subjMap[k] = subjMap[k] || []).push(Number(v)); }));
  const subjectChart = Object.entries(subjMap).map(([k, arr]) => ({ name: k, accuracy: Math.round(arr.reduce((a,b) => a+b,0)/arr.length) }));

  // Time per subject
  const timeMap = {};
  sessions.forEach((s) => {
    const subj = Object.keys(s.subject_scores || {})[0] || 'General';
    timeMap[subj] = (timeMap[subj] || 0) + (s.duration_seconds || 0);
  });
  const timeChart = Object.entries(timeMap).map(([k,v]) => ({ name: k, value: Math.round(v/60) }));

  // Heatmap
  const heatmap = [];
  for (let i = 41; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const count = sessions.filter((s) => s.created_at.startsWith(iso)).length;
    heatmap.push({ date: iso, count });
  }

  // Strong vs weak
  const strong = subjectChart.filter((s) => s.accuracy >= 70).slice(0, 5);
  const weak = subjectChart.filter((s) => s.accuracy < 60).slice(0, 5);

  const shareWA = () => {
    const text = `📊 ${activeChild.name}'s Prepora.ai progress: ${sessions.length} sessions, avg accuracy ${(sessions.reduce((a,s) => a + Number(s.accuracy||0),0)/(sessions.length||1)).toFixed(1)}% — streak ${activeChild.streak}d 🔥`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0 }}>📈 Reports</h1>
        <div className="no-print" style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => window.print()}>🖨️ Print / PDF</button>
          <button className="btn-amber" onClick={shareWA}>📲 WhatsApp share</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>Weekly accuracy trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="week" fontSize={11} stroke="#94A3B8" />
              <YAxis fontSize={11} stroke="#94A3B8" />
              <Tooltip />
              <Line type="monotone" dataKey="accuracy" stroke="#4F46E5" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 style={{ marginTop: 0 }}>Subject accuracy</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjectChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
              <YAxis fontSize={11} stroke="#94A3B8" />
              <Tooltip />
              <Bar dataKey="accuracy" fill="#10B981" radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 style={{ marginTop: 0 }}>Study consistency (last 42 days)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 4 }}>
            {heatmap.map((h, i) => (
              <div key={i} title={`${h.date}: ${h.count} sessions`} style={{ width: '100%', aspectRatio: '1', borderRadius: 4, background: h.count === 0 ? '#F1F5F9' : h.count === 1 ? '#C7D2FE' : h.count === 2 ? '#818CF8' : '#4F46E5' }} />
            ))}
          </div>
        </Card>
        <Card>
          <h3 style={{ marginTop: 0 }}>Time spent per subject (min)</h3>
          {timeChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={timeChart} dataKey="value" nameKey="name" outerRadius={80} label>
                  {timeChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: '#64748B' }}>No data yet</p>}
        </Card>
        <Card>
          <h3 style={{ marginTop: 0 }}>Rank history</h3>
          {rankHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={rankHistory.map((r) => ({ name: r.week_start, rank: r.rank }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
                <YAxis reversed fontSize={11} stroke="#94A3B8" />
                <Tooltip />
                <Line type="monotone" dataKey="rank" stroke="#F59E0B" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p style={{ color: '#64748B' }}>No history yet</p>}
        </Card>
        <Card>
          <h3 style={{ marginTop: 0 }}>Strong vs weak</h3>
          <div>
            <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700, marginBottom: 6 }}>STRONG</div>
            {strong.map((s) => (
              <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: '#ECFDF5', borderRadius: 6, marginBottom: 4 }}><span>{s.name}</span><b>{s.accuracy}%</b></div>
            ))}
            <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 700, marginTop: 14, marginBottom: 6 }}>WEAK</div>
            {weak.map((s) => (
              <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: '#FEF2F2', borderRadius: 6, marginBottom: 4 }}><span>{s.name}</span><b>{s.accuracy}%</b></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
