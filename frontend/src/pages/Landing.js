import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #EEF2FF 0%, #F8FAFC 40%)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 6%', position: 'sticky', top: 0, background: 'rgba(248,250,252,0.85)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <div className="gradient-text" style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Poppins' }}>🎓 Prepora.ai</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="btn-ghost" style={{ textDecoration: 'none' }}>Sign in</Link>
          <Link to="/signup" className="btn-primary" style={{ textDecoration: 'none' }} data-testid="landing-signup">Get started</Link>
        </div>
      </header>

      <section style={{ padding: '60px 6% 70px', textAlign: 'center', maxWidth: 980, margin: '0 auto' }}>
        <div className="badge badge-indigo" style={{ fontSize: 12, marginBottom: 14 }}>For Indian school parents • CBSE • ICSE • JEE • NEET</div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', lineHeight: 1.1, margin: 0 }}>
          <span className="gradient-text">Scan. Learn.</span><br />
          Practice. Improve.
        </h1>
        <p style={{ fontSize: 18, color: '#475569', maxWidth: 640, margin: '20px auto 30px' }}>
          Upload any chapter, textbook page, or notes — and Prepora.ai instantly generates
          AI-powered practice papers, tracks your child's standing among classmates, and
          builds a personalised improvement plan.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/signup" className="btn-primary" style={{ textDecoration: 'none', fontSize: 16, padding: '14px 26px' }}>Start free →</Link>
          <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none', fontSize: 16, padding: '14px 26px' }}>Sign in</Link>
        </div>
      </section>

      <section style={{ padding: '40px 6%', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 30, marginBottom: 32 }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            { i: '📄', t: 'Upload', d: 'Scan or paste any textbook page, worksheet, or PDF.' },
            { i: '🧠', t: 'AI analyses', d: 'We extract chapter, topics, and difficulty.' },
            { i: '✍️', t: 'Practice', d: 'Generate MCQs, fill-blanks, mock tests — instantly.' },
            { i: '📊', t: 'Improve', d: 'See class rank, weak areas, and AI coaching.' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>{s.i}</div>
              <h3 style={{ margin: '10px 0 6px', fontSize: 18 }}>{i + 1}. {s.t}</h3>
              <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '60px 6%', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 30, marginBottom: 32 }}>Everything your child needs to top the class</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {[
            { i: '📚', t: 'AI Question Generation', d: '7 question types: MCQ, Fill blanks, Match, T/F, Short, Long, Flashcards.' },
            { i: '🏆', t: 'Class Leaderboard', d: 'Anonymous, real-time class rankings keep motivation high.' },
            { i: '📈', t: 'Personalised Reports', d: 'Weekly trends, weak topic radar, subject-wise analytics.' },
            { i: '✨', t: 'Smart Revision Notes', d: 'Auto-generated key points and flashcards from your material.' },
            { i: '🎯', t: 'Mock Tests + Coaching', d: 'AI coach gives action items to improve rank.' },
            { i: '🔥', t: 'Streaks + XP', d: 'Earn badges, climb levels, build daily study habits.' },
          ].map((f) => (
            <div key={f.t} className="card">
              <div style={{ fontSize: 28 }}>{f.i}</div>
              <h3 style={{ fontSize: 17, margin: '10px 0 6px' }}>{f.t}</h3>
              <p style={{ color: '#64748B', margin: 0, fontSize: 14 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '60px 6% 80px' }}>
        <div className="gradient-bg" style={{ maxWidth: 980, margin: '0 auto', padding: '50px 36px', borderRadius: 24, color: 'white', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, margin: 0 }}>Ready to give your child the edge?</h2>
          <p style={{ opacity: 0.9, fontSize: 18, margin: '12px 0 22px' }}>Free to start. No credit card required.</p>
          <Link to="/signup" style={{ background: 'white', color: '#4F46E5', padding: '14px 28px', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 16, display: 'inline-block' }}>Create your account</Link>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', borderTop: '1px solid #E2E8F0', background: 'white' }}>
        Prepora.ai — Scan. Learn. Practice. Improve.
      </footer>
    </div>
  );
}
