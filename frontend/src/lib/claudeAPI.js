import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const claudeAPI = {
  analyzeContent: async (text, childContext = null) => {
    const { data } = await axios.post(`${API}/claude/analyze-content`, { text, childContext });
    return data;
  },
  extractFile: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await axios.post(`${API}/extract-file`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
    return data;
  },
  generateQuestions: async (payload) => {
    const { data } = await axios.post(`${API}/claude/generate-questions`, payload, { timeout: 120000 });
    return data;
  },
  evaluateSubjective: async (payload) => {
    const { data } = await axios.post(`${API}/claude/evaluate-subjective`, payload);
    return data;
  },
  generateNotes: async (payload) => {
    const { data } = await axios.post(`${API}/claude/generate-notes`, payload, { timeout: 90000 });
    return data;
  },
  peerAnalysis: async (payload) => {
    const { data } = await axios.post(`${API}/claude/peer-analysis`, payload, { timeout: 90000 });
    return data;
  },
};
