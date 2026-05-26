import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { Card, Skeleton, EmptyState } from '../components/UI';
import { getLevel, getNextLevel, ACHIEVEMENT_DEFS } from '../lib/helpers';

export default function Achievements() {
  const { activeChild, showToast } = useApp();
  const [earned, setEarned] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChild) return;
    (async () => {
      setLoading(true);
      const [{ data: a }, { data: s }] = await Promise.all([
        supabase.from('achievements').select('*').eq('child_id', activeChild.id).order('earned_at', { ascending: false }),
        supabase.from('practice_sessions').select('*').eq('child_id', activeChild.id).eq('completed', true),
      ]);
      setEarned(a || []); setSessions(s || []);
      // Auto-check
      try {
        const stats = {
          sessionsCount: (s || []).length,
          streak: activeChild.streak || 0,
          bestAccuracy: Math.max(0, ...((s || []).map((x) => Number(x.accuracy || 0)))),
          totalQuestions: (s || []).reduce((acc, x) => acc + (x.total_marks || 0), 0),
          rank: 99,
          rankImprovement: 0,
          topSubjectRank: 99,
        };
        const haveBadges = new Set((a || []).map((x) => x.badge));
        let totalNewXp = 0;
        for (const def of ACHIEVEMENT_DEFS) {
          if (!haveBadges.has(def.badge) && def.check(stats)) {
            await supabase.from('achievements').insert({ child_id: activeChild.id, badge: def.badge, badge_description: def.description, xp_awarded: def.xp });
            totalNewXp += def.xp;
            showToast(`🏆 Unlocked: ${def.badge}`, 'success');
          }
        }
        if (totalNewXp > 0) {
          await supabase.from('children').update({ xp: (activeChild.xp || 0) + totalNewXp }).eq('id', activeChild.id);
          const { data: refreshed } = await supabase.from('achievements').select('*').eq('child_id', activeChild.id).order('earned_at', { ascending: false });
          setEarned(refreshed || []);
        }
      } catch {}
      setLoading(false);
    })();
  }, [activeChild, showToast]);

  if (!activeChild) return <Card>Add a child first.</Card>;
  if (loading) return <Skeleton height={400} />;

  const xp = activeChild.xp || 0;
  const level = getLevel(xp);
  const next = getNextLevel(xp);
  const progress = next ? Math.round(((xp - level.minXp) / (next.minXp - level.minXp)) * 100) : 100;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>🎖️ Achievements</h1>
      <Card style={{ marginBottom: 14, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 14, color: '#64748B' }}>Current level</div>
            <div className="gradient-text" style={{ fontSize: 36, fontWeight: 800 }}>{level.name}</div>
            <div style={{ color: '#475569' }}>{xp} XP {next && `• ${next.minXp - xp} XP to ${next.name}`}</div>
          </div>
          <div style={{ minWidth: 200, flex: 1 }}>
            <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </Card>
      <h3>Badges</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {ACHIEVEMENT_DEFS.map((def) => {
          const got = earned.find((e) => e.badge === def.badge);
          return (
            <Card key={def.badge} style={{ opacity: got ? 1 : 0.5, textAlign: 'center' }}>
              <div style={{ fontSize: 48 }}>{got ? '🏆' : '🔒'}</div>
              <h4 style={{ margin: '8px 0 4px' }}>{def.badge}</h4>
              <div style={{ fontSize: 13, color: '#64748B' }}>{def.description}</div>
              <div className="badge badge-amber" style={{ marginTop: 8 }}>+{def.xp} XP</div>
              {got && <div style={{ fontSize: 11, color: '#10B981', marginTop: 6 }}>✓ Earned</div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
