import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../contexts/AppContext';
import { claudeAPI } from '../lib/claudeAPI';
import { Card } from '../components/UI';

export default function Upload() {
  const navigate = useNavigate();
  const { activeChild, showToast } = useApp();
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [step, setStep] = useState(1);

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    // Naive client-side text extraction for text-like files
    if (f.type.startsWith('text/') || f.name.endsWith('.txt') || f.name.endsWith('.md')) {
      const t = await f.text();
      setExtractedText(t);
      setText(t);
    } else {
      // For PDFs/images we'd typically OCR. MVP: prompt user to paste text below.
      setExtractedText('');
      showToast('For PDFs/images, paste the visible text below for analysis (MVP).', 'info');
    }
  };

  const onDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; handleFile(f); };

  const analyze = async () => {
    const content = text || extractedText;
    if (!content || content.trim().length < 30) { showToast('Paste at least 30 characters of content first', 'error'); return; }
    setLoading(true);
    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;
      if (file) {
        const path = `${activeChild.id}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from('prepora-uploads').upload(path, file);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('prepora-uploads').getPublicUrl(path);
          fileUrl = urlData?.publicUrl || null;
          setUploadedUrl(fileUrl);
          fileName = file.name; fileType = file.type;
        }
      }
      const aiResult = await claudeAPI.analyzeContent(content, {
        class: activeChild.class, board: activeChild.board, subjects: activeChild.subjects,
      });
      setAnalysis({ ...aiResult, _fileUrl: fileUrl, _fileName: fileName, _fileType: fileType, _content: content });
      setStep(2);
      showToast('AI analysis complete', 'success');
    } catch (e) { showToast(e.message || 'Analysis failed', 'error'); }
    finally { setLoading(false); }
  };

  const save = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('uploaded_materials').insert({
        child_id: activeChild.id,
        subject: analysis.subject,
        class: analysis.class || activeChild.class,
        chapter: analysis.chapter,
        raw_content: analysis._content,
        detected_topics: analysis.topics || [],
        bloom_level: analysis.bloomLevel,
        difficulty: analysis.difficulty,
        file_url: analysis._fileUrl,
        file_name: analysis._fileName,
        file_type: analysis._fileType,
        ai_analysis: analysis,
      }).select().single();
      if (error) throw error;
      showToast('Saved! Generating questions next.', 'success');
      navigate(`/generate?materialId=${data.id}`);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  if (!activeChild) return <Card>Add a child first.</Card>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>📄 Upload material</h1>
      <p style={{ color: '#64748B' }}>Drag a chapter PDF, image, or paste any text. We'll analyze it instantly.</p>
      {step === 1 && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div onDrop={onDrop} onDragOver={(e) => e.preventDefault()} style={{ border: '2px dashed #C7D2FE', borderRadius: 14, padding: 30, textAlign: 'center', background: '#EEF2FF55' }}>
              <div style={{ fontSize: 36 }}>📁</div>
              <p style={{ margin: '8px 0', fontWeight: 600 }}>Drop a file here, or</p>
              <label className="btn-primary" style={{ cursor: 'pointer' }}>
                Choose file
                <input type="file" accept="image/*,application/pdf,text/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} data-testid="upload-file-input" />
              </label>
              {file && <p style={{ marginTop: 12, color: '#475569' }}>✅ {file.name} ({(file.size/1024).toFixed(0)} KB)</p>}
            </div>
          </Card>
          <Card>
            <h3 style={{ marginTop: 0 }}>Or paste the content directly</h3>
            <textarea className="input" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste any chapter content or notes here…" data-testid="upload-textarea" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn-primary" disabled={loading} onClick={analyze} data-testid="upload-analyze-btn">{loading ? 'Analyzing…' : '✨ Analyze with AI'}</button>
            </div>
          </Card>
        </>
      )}
      {step === 2 && analysis && (
        <Card>
          <h2 style={{ marginTop: 0 }}>✨ AI analysis</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div><div style={{ fontSize: 12, color: '#64748B' }}>Subject</div><input className="input" value={analysis.subject || ''} onChange={(e) => setAnalysis({ ...analysis, subject: e.target.value })} /></div>
            <div><div style={{ fontSize: 12, color: '#64748B' }}>Class</div><input className="input" value={analysis.class || ''} onChange={(e) => setAnalysis({ ...analysis, class: e.target.value })} /></div>
            <div><div style={{ fontSize: 12, color: '#64748B' }}>Chapter</div><input className="input" value={analysis.chapter || ''} onChange={(e) => setAnalysis({ ...analysis, chapter: e.target.value })} /></div>
            <div><div style={{ fontSize: 12, color: '#64748B' }}>Difficulty</div><input className="input" value={analysis.difficulty || ''} onChange={(e) => setAnalysis({ ...analysis, difficulty: e.target.value })} /></div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Topics</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(analysis.topics || []).map((t) => <span key={t} className="badge badge-indigo">{t}</span>)}
            </div>
          </div>
          <div style={{ marginTop: 14, padding: 12, background: '#F1F5F9', borderRadius: 10, fontSize: 14, color: '#334155' }}>
            <b>Summary:</b> {analysis.contentSummary || '—'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-ghost" onClick={() => { setStep(1); setAnalysis(null); }}>← Re-analyze</button>
            <button className="btn-primary" disabled={loading} onClick={save} data-testid="upload-save-btn">{loading ? 'Saving…' : 'Save & Generate Questions →'}</button>
          </div>
        </Card>
      )}
    </div>
  );
}
