import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { ToastProvider } from './components/Toast';
import { Onboarding } from './pages/Onboarding';
import { Home } from './pages/Home';
import { Add } from './pages/Add';
import { History } from './pages/History';
import { Weight } from './pages/Weight';
import { Settings } from './pages/Settings';
import { getSettings } from './db/database';
import './index.css';

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const settings = await getSettings();
      setNeedsOnboarding(!settings.onboardingComplete);
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setNeedsOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
  };

  if (loading) {
    return (
      <div className="page" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div className="loading-container">
          <div className="spinner" />
          <span className="loading-text">PointsTracker lädt...</span>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<Add />} />
        <Route path="/history" element={<History />} />
        <Route path="/weight" element={<Weight />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Navigation />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}
