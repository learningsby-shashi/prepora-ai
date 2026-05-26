import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { Card, EmptyState, Skeleton } from '../components/UI';
import { claudeAPI } from '../lib/claudeAPI';

export default function Notes() {
  const { activeChild, showToast } = useApp();
  const [notes, setNotes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedMat, setSelectedMat] = useState('');
  const [flipped, setFlipped] = useState({});
  const [activeNote, setActiveNote] = useState(null);

  const load = async () => {
    if (!activeChild) return;
    setLoading(true);
    const [{ data: n }, { data: m }] = await Promise.all([
      supabase.from('revision_notes').select('*').eq('child_id', activeChild.id).order('created_at', { ascending: false }),
      supabase.from('uploaded_materials').select('*').eq('child_id', activeChild.id).order('created_at', { ascending: false }),
    ]);
    setNotes(n || []); setMaterials(m || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeChild]);

  const generate = async () => {
    const mat = materials.find((m) => m.id === selectedMat);
    if (!mat) { showToast('Pick a material', 'error'); return; }
    setGenerating(true);
    try {
      const r = await claudeAPI.generateNotes({ content: mat.raw_content, subject: mat.subject, chapter: mat.chapter });
      const { data } = await supabase.from('revision_notes').insert({
        child_id: activeChild.id,
        subject: mat.subject,
        chapter: mat.chapter,
        content: JSON.stringify({ summary: r.summary, keyPoints: r.keyPoints || [], importantTerms: r.importantTerms || [] }),
        flashcards: r.flashcards || [],
      }).select().single();
      showToast('Notes generated', 'success');
      setSelectedMat('');
      load();
      setActiveNote(data);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setGenerating(false); }
  };

  const toggleBookmark = async (n) => {
    const { data } = await supabase.from('revision_notes').update({ bookmarked: !n.bookmarked }).eq('id', n.id).select().single();
    setNotes((arr) => arr.map((x) => x.id === data.id ? data : x));
    if (activeNote?.id === data.id) setActiveNote(data);
  };

  const filtered = notes.filter((n) => {
    const q = search.toLowerCase();
    return !q || (n.subject || '').toLowerCase().includes(q) || (n.chapter || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q);
  });

  if (!activeChild) return <Card>Add a child first.</Card>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>📝 Revision notes</h1>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="label">Generate from material</label>
            <select className="input" value={selectedMat} onChange={(e) => setSelectedMat(e.target.value)} data-testid="notes-mat-select">
              <option value="">Select…</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.subject} — {m.chapter}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={generate} disabled={generating || !selectedMat}>{generating ? 'Generating…' : '✨ Generate'}</button>
        </div>
      </Card>
      <Card style={{ marginBottom: 14 }}>
        <input className="input" placeholder="Search notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>
      {loading ? <Skeleton height={200} /> : filtered.length === 0 ? <EmptyState icon="📝" title="No notes" description="Generate notes from any uploaded material." /> : (
        <div style={{ display: 'grid', gridTemplateColumns: activeNote ? '300px 1fr' : '1fr', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'calc(100vh - 230px)', overflowY: 'auto' }}>
            {filtered.map((n) => (
              <div key={n.id} role="button" tabIndex={0} onClick={() => { setActiveNote(n); setFlipped({}); }} className="card-tight" style={{ border: activeNote?.id === n.id ? '2px solid #4F46E5' : '1px solid #E2E8F0', borderRadius: 12, padding: 12, background: 'white', textAlign: 'left', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="badge badge-indigo">{n.subject}</span>
                  <span onClick={(e) => { e.stopPropagation(); toggleBookmark(n); }} role="button" style={{ cursor: 'pointer', fontSize: 18 }}>{n.bookmarked ? '⭐' : '☆'}</span>
                </div>
                <div style={{ fontWeight: 700, marginTop: 6 }}>{n.chapter || 'Untitled'}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{(n.flashcards || []).length} flashcards</div>
              </div>
            ))}
          </div>
          {activeNote && (() => {
            let parsed = {}; try { parsed = JSON.parse(activeNote.content || '{}'); } catch {}
            return (
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h2 style={{ margin: 0 }}>{activeNote.chapter}</h2>
                    <div style={{ color: '#64748B' }}>{activeNote.subject}</div>
                  </div>
                  <button className="btn-ghost" onClick={() => toggleBookmark(activeNote)}>{activeNote.bookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button>
                </div>
                {parsed.summary && (
                  <div style={{ marginTop: 12, padding: 12, background: '#EEF2FF', borderRadius: 10 }}><b>Summary:</b> {parsed.summary}</div>
                )}
                {parsed.keyPoints?.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <h3>Key points</h3>
                    <ul>{parsed.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </div>
                )}
                {parsed.importantTerms?.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <h3>Key terms</h3>
                    {parsed.importantTerms.map((t, i) => (
                      <div key={i} style={{ padding: 10, background: '#F1F5F9', borderRadius: 8, marginBottom: 6 }}><b>{t.term}:</b> {t.definition}</div>
                    ))}
                  </div>
                )}
                {activeNote.flashcards?.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <h3>Flashcards (click to flip)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                      {activeNote.flashcards.map((c, i) => (
                        <div key={i} className={`flip-card ${flipped[i] ? 'flipped' : ''}`} onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}>
                          <div className="flip-card-inner">
                            <div className="flip-card-front"><div>{c.front}</div></div>
                            <div className="flip-card-back"><div>{c.back}</div></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
}
