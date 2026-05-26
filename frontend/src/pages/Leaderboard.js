import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { Card, EmptyState, Skeleton } from '../components/UI';
import { getPercentileBand } from '../lib/helpers';

const TABS = ['Class','Subject','School','Race'];

export default function Leaderboard() {
  const { activeChild, showToast } = useApp();
  const [tab, setTab] = useState('Class');
  const [peers, setPeers] = useState([]);
  const [schoolPeers, setSchoolPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('Mathematics');

  const load = async () => {
    if (!activeChild) return;
    setLoading(true);
    try {
      const { data: classData } = await supabase.from('peer_benchmark_pool').select('*').eq('school_name', activeChild.school_name).eq('class', activeChild.class).eq('section', activeChild.section);
      const { data: schoolData } = await supabase.from('peer_benchmark_pool').select('*').eq('school_name', activeChild.school_name).eq('class', activeChild.class);
      setPeers(classData || []);
      setSchoolPeers(schoolData || []);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeChild]);

  useEffect(() => {
    if (!activeChild) return;
    const ch = supabase.channel(`leaderboard-${activeChild.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peer_benchmark_pool', filter: `school_name=eq.${activeChild.school_name}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [activeChild]);

  if (!activeChild) return <Card>Add a child first.</Card>;

  const sortedClass = [...peers].sort((a,b) => b.overall_accuracy - a.overall_accuracy);
  const myIdx = sortedClass.findIndex((p) => p.child_id === activeChild.id);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>🏆 Leaderboard</h1>
      <p style={{ color: '#64748B' }}>Anonymous rankings from your section. Names are hidden — only you can see yours.</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t} className="btn-ghost" onClick={() => setTab(t)} style={{ background: tab === t ? '#4F46E5' : 'white', color: tab === t ? 'white' : '#0F172A', borderColor: tab === t ? '#4F46E5' : '#E2E8F0', fontWeight: 600 }} data-testid={`lb-tab-${t.toLowerCase()}`}>{t}</button>
        ))}
      </div>

      {loading ? <Skeleton height={300} /> : tab === 'Class' ? (
        <Card>
          {sortedClass.length === 0 ? <EmptyState icon="📊" title="No peers yet" description="Once classmates join, you'll see the leaderboard here." /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sortedClass.map((p, i) => {
                const isMe = p.child_id === activeChild.id;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                return (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 90px 60px', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: isMe ? '#EEF2FF' : 'white', border: isMe ? '1.5px solid #4F46E5' : '1px solid #F1F5F9' }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{medal || `#${i+1}`}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{isMe ? `👤 You (${activeChild.name})` : p.anonymous_display_name}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>{p.total_questions} questions • {p.streak}d streak</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#10B981' }}>{Number(p.overall_accuracy).toFixed(1)}%</div>
                    <div style={{ fontSize: 13 }}><span className="badge badge-amber">{p.xp} XP</span></div>
                    <div></div>
                  </div>
                );
              })}
            </div>
          )}
          {myIdx > 0 && (
            <div style={{ position: 'sticky', bottom: 0, marginTop: 12, padding: 12, background: '#4F46E5', color: 'white', borderRadius: 10 }}>
              <b>Your rank: #{myIdx+1}</b> of {sortedClass.length} • {Number(sortedClass[myIdx].overall_accuracy).toFixed(1)}% accuracy
            </div>
          )}
        </Card>
      ) : tab === 'Subject' ? (
        <Card>
          <label className="label">Subject</label>
          <select className="input" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} style={{ maxWidth: 280 }}>
            {['Mathematics','Science','English','Hindi','Social Studies','Physics','Chemistry','Biology'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
            {[...peers].sort((a,b) => (b.subject_scores?.[subjectFilter] || 0) - (a.subject_scores?.[subjectFilter] || 0)).map((p, i) => {
              const isMe = p.child_id === activeChild.id;
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: isMe ? '#EEF2FF' : 'white' }}>
                  <div style={{ fontWeight: 800 }}>#{i+1}</div>
                  <div style={{ fontWeight: 700 }}>{isMe ? '👤 You' : p.anonymous_display_name}</div>
                  <div style={{ fontWeight: 700, color: '#10B981' }}>{p.subject_scores?.[subjectFilter] || 0}%</div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : tab === 'School' ? (
        <Card>
          {(() => {
            const sorted = [...schoolPeers].sort((a,b) => b.overall_accuracy - a.overall_accuracy);
            const me = sorted.findIndex((p) => p.child_id === activeChild.id);
            const pct = me >= 0 ? Math.round(((sorted.length - me) / sorted.length) * 100) : 0;
            const band = getPercentileBand(pct);
            return (
              <>
                <div style={{ padding: 18, borderRadius: 14, background: `${band.color}15`, marginBottom: 16, border: `1.5px solid ${band.color}` }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: band.color }}>{band.label}</div>
                  <div style={{ color: '#475569', marginTop: 4 }}>Top {100-pct}% of {sorted.length} students in your school-class.</div>
                </div>
                {sorted.slice(0, 50).map((p, i) => (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px', gap: 12, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: p.child_id === activeChild.id ? '#EEF2FF' : 'white' }}>
                    <div style={{ fontWeight: 700 }}>#{i+1}</div>
                    <div>{p.child_id === activeChild.id ? '👤 You' : p.anonymous_display_name}</div>
                    <div style={{ color: '#10B981', fontWeight: 700 }}>{Number(p.overall_accuracy).toFixed(1)}%</div>
                  </div>
                ))}
              </>
            );
          })()}
        </Card>
      ) : (
        <Card>
          <h3 style={{ marginTop: 0 }}>🏁 Progress race</h3>
          <p style={{ color: '#64748B', fontSize: 14 }}>Milestones: 100 • 500 • 1000 • 5000 questions</p>
          {[100, 500, 1000, 5000].map((m) => (
            <div key={m} style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{m} questions</div>
              <div style={{ position: 'relative', height: 30, background: '#F1F5F9', borderRadius: 999, overflow: 'visible' }}>
                {sortedClass.map((p) => {
                  const left = Math.min(100, (p.total_questions / m) * 100);
                  const isMe = p.child_id === activeChild.id;
                  return <div key={p.id} style={{ position: 'absolute', left: `${left}%`, top: 4, width: 22, height: 22, borderRadius: 999, background: isMe ? '#4F46E5' : '#94A3B8', border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontWeight: 700 }} title={isMe ? 'You' : p.anonymous_display_name}>{isMe ? 'Y' : ''}</div>;
                })}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
