import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { TrendingUp, ShieldCheck, Zap, ArrowRight, Globe } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ka' : 'en');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-emerald-500" />
          <span className="text-2xl font-bold tracking-tight">{t.appName}</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium text-slate-300"
          >
            <Globe className="w-4 h-4" />
            {language === 'en' ? 'ქართული' : 'English'}
          </button>
          <button 
            onClick={handleGetStarted}
            className="px-6 py-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors font-medium"
          >
            {user ? t.dashboard : t.signIn}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 font-medium text-sm mb-8 border border-emerald-500/20">
            <Zap className="w-4 h-4" />
            <span>{t.poweredBy}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            {t.heroTitle1} <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
              {t.heroTitle2}
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            {t.heroSubtitle}
          </p>
          <button 
            onClick={handleGetStarted}
            className="px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-lg transition-all flex items-center gap-2 mx-auto"
          >
            {t.getStarted}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-32 text-left">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">{t.feat1Title}</h3>
            <p className="text-slate-400 leading-relaxed">{t.feat1Desc}</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">{t.feat2Title}</h3>
            <p className="text-slate-400 leading-relaxed">{t.feat2Desc}</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">{t.feat3Title}</h3>
            <p className="text-slate-400 leading-relaxed">{t.feat3Desc}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
