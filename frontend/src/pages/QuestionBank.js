import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { Card, EmptyState, Skeleton } from '../components/UI';
import { formatDate } from '../lib/helpers';

export default function QuestionBank() {
  const navigate = useNavigate();
  const { activeChild, showToast } = useApp();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ subject: '', difficulty: '' });

  const load = async () => {
    if (!activeChild) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('question_banks').select('*').eq('child_id', activeChild.id).order('created_at', { ascending: false });
      setBanks(data || []);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeChild]);

  const del = async (id) => {
    if (!window.confirm('Delete this question bank?')) return;
    await supabase.from('question_banks').delete().eq('id', id);
    showToast('Deleted', 'success');
    load();
  };

  const subjects = [...new Set(banks.map((b) => b.subject).filter(Boolean))];
  const filtered = banks.filter((b) => (!filter.subject || b.subject === filter.subject) && (!filter.difficulty || b.difficulty === filter.difficulty));

  if (!activeChild) return <Card>Add a child first.</Card>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0 }}>📚 Question Bank</h1>
        <Link to="/generate" className="btn-primary" style={{ textDecoration: 'none' }} data-testid="qb-create-btn">+ Generate new</Link>
      </div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="label">Subject</label>
            <select className="input" value={filter.subject} onChange={(e) => setFilter({ ...filter, subject: e.target.value })}>
              <option value="">All</option>
              {subjects.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="label">Difficulty</label>
            <select className="input" value={filter.difficulty} onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}>
              <option value="">All</option>
              <option>Easy</option><option>Medium</option><option>Hard</option><option>Mixed</option><option>Exam Mode</option>
            </select>
          </div>
        </div>
      </Card>
      {loading ? <Skeleton height={120} /> : filtered.length === 0 ? <EmptyState icon="📚" title="No question banks" description="Generate one from an uploaded material." cta={<Link to="/generate" className="btn-primary" style={{textDecoration:'none'}}>Generate questions</Link>} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map((b) => (
            <Card key={b.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="badge badge-indigo">{b.subject || 'General'}</span>
                <span style={{ fontSize: 12, color: '#64748B' }}>{formatDate(b.created_at)}</span>
              </div>
              <h3 style={{ fontSize: 17, margin: '10px 0 6px' }}>{b.chapter || 'Untitled chapter'}</h3>
              <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#64748B', marginBottom: 12 }}>
                <span>{b.question_count} questions</span>
                <span>•</span>
                <span>{b.difficulty}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/practice/${b.id}`)} data-testid={`qb-practice-${b.id}`}>✍️ Practice</button>
                <button className="btn-ghost" onClick={() => del(b.id)} title="Delete">🗑️</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
