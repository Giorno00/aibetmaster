import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Ticket, TrendingUp, Calendar, AlertCircle, Globe } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenAI, Type } from '@google/genai';
import TicketBuilder from '../components/TicketBuilder';

const ai = new GoogleGenAI({ apiKey: "AIzaSyDMmAGLDbcW9mgTu_UnTmZSqQwkKJA0www" });

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'predictions' | 'builder'>('predictions');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPredictions();
  }, [user, navigate]);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      // Get predictions from the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const q = query(
        collection(db, 'predictions'),
        where('createdAt', '>=', yesterday),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      const preds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (preds.length === 0) {
        // Generate new predictions if none exist
        await generateDailyPredictions();
      } else {
        setPredictions(preds);
      }
    } catch (error) {
      console.error("Error fetching predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyPredictions = async () => {
    setGenerating(true);
    try {
      const prompt = `Generate 5 realistic sports betting predictions for upcoming matches (football, basketball, tennis) happening in the next 1 to 7 days.
      Do not guarantee wins. Provide realistic odds (decimal format, e.g., 1.85) and probabilities (0-100).
      IMPORTANT: You MUST provide 'sport', 'match', and 'prediction' in BOTH English ('en') and Georgian ('ka') languages.
      Return ONLY a JSON array of objects with these exact keys:
      - id (string, unique random)
      - sport (object with "en" and "ka" strings)
      - match (object with "en" and "ka" strings)
      - prediction (object with "en" and "ka" strings)
      - probability (number, 0-100)
      - odds (number, decimal)
      - date (string, ISO format date for the match)`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                sport: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ka: { type: Type.STRING } } },
                match: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ka: { type: Type.STRING } } },
                prediction: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ka: { type: Type.STRING } } },
                probability: { type: Type.NUMBER },
                odds: { type: Type.NUMBER },
                date: { type: Type.STRING }
              },
              required: ["id", "sport", "match", "prediction", "probability", "odds", "date"]
            }
          }
        }
      });

      const generatedPreds = JSON.parse(response.text || "[]");
      
      // Save to Firestore
      const savedPreds = [];
      for (const p of generatedPreds) {
        const newPredRef = doc(collection(db, 'predictions'));
        const predPayload = {
          ...p,
          id: newPredRef.id,
          createdAt: serverTimestamp()
        };
        await setDoc(newPredRef, predPayload);
        savedPreds.push({ ...predPayload, createdAt: new Date() });
      }
      
      setPredictions(savedPreds);
    } catch (error) {
      console.error("Error generating predictions:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ka' : 'en');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
            <span className="text-xl font-bold tracking-tight">{t.appName}</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('predictions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'predictions' 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">{t.dailyPicks}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('builder')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'builder' 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Ticket className="w-5 h-5" />
            <span className="font-medium">{t.ticketBuilder}</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={toggleLanguage}
            className="w-full flex items-center gap-3 px-4 py-2 mb-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">{language === 'en' ? 'ქართული' : 'English'}</span>
          </button>
          <div className="flex items-center gap-3 mb-4 px-2">
            <img 
              src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.email}`} 
              alt="User" 
              className="w-10 h-10 rounded-full bg-slate-800"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">{t.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {activeTab === 'predictions' ? (
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">{t.dailyPicks}</h1>
                <p className="text-slate-400">{t.dailyPicksDesc}</p>
              </div>
              <button 
                onClick={generateDailyPredictions}
                disabled={generating}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {generating ? t.analyzing : t.refreshPicks}
              </button>
            </div>

            {loading || generating ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 animate-pulse">
                    <div className="h-4 bg-slate-800 rounded w-1/3 mb-4"></div>
                    <div className="h-6 bg-slate-800 rounded w-3/4 mb-6"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {Object.entries(
                  predictions.reduce((acc, pred) => {
                    const sportName = pred.sport ? (typeof pred.sport === 'string' ? pred.sport : pred.sport[language]) : 'Other';
                    if (!acc[sportName]) acc[sportName] = [];
                    acc[sportName].push(pred);
                    return acc;
                  }, {} as Record<string, any[]>)
                ).map(([sport, preds]) => (
                  <div key={sport} className="mb-8">
                    <h2 className="text-xl font-bold mb-4 text-emerald-400 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      {sport}
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {preds.map((pred) => {
                        const matchName = typeof pred.match === 'string' ? pred.match : pred.match?.[language] || '';
                        const predictionText = typeof pred.prediction === 'string' ? pred.prediction : pred.prediction?.[language] || '';
                        
                        return (
                          <div key={pred.id} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                              <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-medium text-slate-300">
                                {sport}
                              </span>
                              <div className="flex items-center gap-1 text-slate-400 text-xs">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(pred.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            <h3 className="text-lg font-bold mb-4 leading-tight">{matchName}</h3>
                            
                            <div className="mt-auto space-y-4">
                              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                                <p className="text-xs text-slate-500 mb-1">{t.prediction}</p>
                                <p className="font-medium text-emerald-400">{predictionText}</p>
                              </div>
                              
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <p className="text-xs text-slate-500 mb-1">{t.probability}</p>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${pred.probability > 70 ? 'bg-emerald-500' : pred.probability > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${pred.probability}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm font-bold">{pred.probability}%</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">{t.odds}</p>
                                  <p className="text-sm font-bold">{pred.odds.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-8 p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-start gap-3 text-slate-400 text-sm">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <p>
                {t.disclaimer}
              </p>
            </div>
          </div>
        ) : (
          <TicketBuilder />
        )}
      </main>
    </div>
  );
}
