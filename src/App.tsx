import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  
  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500">{t.analyzing}</div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
};

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </Router>
    </LanguageProvider>
  );
}
