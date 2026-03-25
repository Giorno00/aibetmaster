import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { TrendingUp, Globe } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(t.loginError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ka' : 'en');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="absolute top-6 right-6">
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium text-slate-300"
        >
          <Globe className="w-4 h-4" />
          {language === 'en' ? 'ქართული' : 'English'}
        </button>
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-50">
          {t.loginTitle}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          {t.loginSubtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-800">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-slate-950 bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t.signingIn : t.loginButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
