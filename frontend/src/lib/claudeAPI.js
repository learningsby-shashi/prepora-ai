import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Lazy import to avoid circular deps with AppContext
let _showToast = null;
export const registerToast = (fn) => { _showToast = fn; };

const client = axios.create({
  baseURL: API,
  timeout: 120000,
});

client.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const msg = err?.response?.data?.detail || err?.message || 'Network error';
    if (_showToast) {
      try { _showToast(`AI request failed: ${String(msg).slice(0, 160)}`, 'error'); } catch {}
    }
    return Promise.reject(err);
  }
);

export const claudeAPI = {
  analyzeContent: async (text, childContext = null) => {
    const { data } = await client.post('/claude/analyze-content', { text, childContext });
    return data;
  },
  extractFile: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await client.post('/extract-file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },
  generateQuestions: async (payload) => {
    const { data } = await client.post('/claude/generate-questions', payload);
    return data;
  },
  evaluateSubjective: async (payload) => {
    const { data } = await client.post('/claude/evaluate-subjective', payload);
    return data;
  },
  generateNotes: async (payload) => {
    const { data } = await client.post('/claude/generate-notes', payload);
    return data;
  },
  peerAnalysis: async (payload) => {
    const { data } = await client.post('/claude/peer-analysis', payload);
    return data;
  },
  health: async () => {
    const { data } = await client.get('/health', { timeout: 8000 });
    return data;
  },
};
