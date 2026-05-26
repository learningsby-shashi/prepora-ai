import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerToast } from './lib/claudeAPI';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Generate from './pages/Generate';
import QuestionBank from './pages/QuestionBank';
import Practice from './pages/Practice';
import Results from './pages/Results';
import Leaderboard from './pages/Leaderboard';
import MyStanding from './pages/MyStanding';
import Reports from './pages/Reports';
import Notes from './pages/Notes';
import Achievements from './pages/Achievements';
import Settings from './pages/Settings';

function LandingOrRedirect() {
  const { session, loading, showToast } = useApp();
  // Register the toast handler with the axios interceptor
  React.useEffect(() => { registerToast(showToast); }, [showToast]);
  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <BrowserRouter>
          <AppProvider>
          <Routes>
            <Route path="/" element={<LandingOrRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<ProtectedRoute requireOnboarding={false}><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><Layout><Upload /></Layout></ProtectedRoute>} />
            <Route path="/generate" element={<ProtectedRoute><Layout><Generate /></Layout></ProtectedRoute>} />
            <Route path="/question-bank" element={<ProtectedRoute><Layout><QuestionBank /></Layout></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute><Layout><Practice /></Layout></ProtectedRoute>} />
            <Route path="/practice/:sessionId" element={<ProtectedRoute><Layout><Practice /></Layout></ProtectedRoute>} />
            <Route path="/results/:sessionId" element={<ProtectedRoute><Layout><Results /></Layout></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Layout><Leaderboard /></Layout></ProtectedRoute>} />
            <Route path="/my-standing" element={<ProtectedRoute><Layout><MyStanding /></Layout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
            <Route path="/notes" element={<ProtectedRoute><Layout><Notes /></Layout></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><Layout><Achievements /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
    </div>
  );
}

export default App;
