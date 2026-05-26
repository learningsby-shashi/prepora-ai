import React from 'react';

/**
 * Catches React render errors anywhere in the tree so the user sees a
 * friendly recovery card instead of a blank white screen.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
    this.setState({ info });
  }

  reset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  goHome = () => {
    this.setState({ hasError: false, error: null, info: null });
    if (typeof window !== 'undefined') window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const isDev = process.env.NODE_ENV !== 'production';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(135deg,#EEF2FF 0%,#F8FAFC 60%)' }}>
        <div style={{ maxWidth: 480, background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 28, boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
          <div style={{ fontSize: 48, textAlign: 'center' }}>⚠️</div>
          <h2 style={{ marginTop: 4, marginBottom: 6, textAlign: 'center' }}>Something went wrong</h2>
          <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 18 }}>
            We hit an unexpected error. You can retry, or head back to the home page.
          </p>
          {isDev && this.state.error && (
            <details style={{ marginBottom: 14, fontSize: 12, background: '#F1F5F9', padding: 10, borderRadius: 8, color: '#475569', maxHeight: 160, overflow: 'auto' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Technical details (dev only)</summary>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{String(this.state.error?.message || this.state.error)}</pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={this.reset} className="btn-secondary">Try again</button>
            <button onClick={this.goHome} className="btn-primary">Back to home</button>
          </div>
        </div>
      </div>
    );
  }
}
