import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleGenAI, Type } from '@google/genai';
import { Ticket, Zap, AlertCircle, CheckCircle2, History } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function TicketBuilder() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [budget, setBudget] = useState<string>('10');
  const [target, setTarget] = useState<string>('50');
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [days, setDays] = useState<number>(1);
  const [generating, setGenerating] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const currency = language === 'ka' ? '₾' : '$';

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const q = query(
        collection(db, 'tickets'),
        where('userId', '==', user!.uid)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to avoid requiring a composite index
      docs.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
      setHistory(docs);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const generateTicket = async () => {
    if (!budget || !target || isNaN(Number(budget)) || isNaN(Number(target))) return;
    
    setGenerating(true);
    setCurrentTicket(null);
    
    try {
      const requiredOdds = Number(target) / Number(budget);
      
      const prompt = `You are an expert sports betting AI. A user wants to build an accumulator (parlay) ticket.
      Budget: ${currency}${budget}
      Target Return: ${currency}${target}
      Required Total Odds: ~${requiredOdds.toFixed(2)}
      Risk Preference: ${risk}
      Timeframe: Matches happening in the next ${days} days.
      
      Generate a realistic betting ticket with 2 to 5 selections (matches) across popular sports (football, basketball, tennis) happening within the next ${days} days.
      The combined odds of the selections should roughly equal the Required Total Odds.
      If risk is 'low', use safer bets (lower odds per match, maybe more matches).
      If risk is 'high', use riskier bets (higher odds per match, fewer matches).
      
      IMPORTANT: You MUST provide 'sport', 'match', and 'prediction' in BOTH English ('en') and Georgian ('ka') languages.
      
      Return ONLY a JSON object with these exact keys:
      - totalOdds (number)
      - estimatedReturn (number)
      - selections (array of objects, each with: "sport" (object with "en" and "ka"), "match" (object with "en" and "ka"), "prediction" (object with "en" and "ka"), "odds" (number), "probability" (number 0-100))`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              totalOdds: { type: Type.NUMBER },
              estimatedReturn: { type: Type.NUMBER },
              selections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sport: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ka: { type: Type.STRING } } },
                    match: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ka: { type: Type.STRING } } },
                    prediction: { type: Type.OBJECT, properties: { en: { type: Type.STRING }, ka: { type: Type.STRING } } },
                    odds: { type: Type.NUMBER },
                    probability: { type: Type.NUMBER }
                  },
                  required: ["sport", "match", "prediction", "odds", "probability"]
                }
              }
            },
            required: ["totalOdds", "estimatedReturn", "selections"]
          }
        }
      });

      const ticketData = JSON.parse(response.text || "{}");
      
      // Save to Firestore
      const newTicketRef = doc(collection(db, 'tickets'));
      const ticketPayload = {
        id: newTicketRef.id,
        userId: user!.uid,
        budget: Number(budget),
        targetProfit: Number(target),
        riskLevel: risk,
        totalOdds: ticketData.totalOdds,
        estimatedReturn: ticketData.estimatedReturn,
        selections: ticketData.selections,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      
      await setDoc(newTicketRef, ticketPayload);
      
      const newTicket = { ...ticketPayload, createdAt: new Date() };
      setCurrentTicket(newTicket);
      setHistory([newTicket, ...history]);
      
    } catch (error) {
      console.error("Error generating ticket:", error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t.ticketBuilder}</h1>
        <p className="text-slate-400">{t.ticketBuilderDesc}</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Builder Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">{t.budget} ({currency})</label>
                <input 
                  type="number" 
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. 10"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">{t.targetReturn} ({currency})</label>
                <input 
                  type="number" 
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. 150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">{t.timeframe}</label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(d => (
                    <option key={d} value={d}>{t[`day${d}` as keyof typeof t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">{t.riskLevel}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRisk(r)}
                      className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors border ${
                        risk === r 
                          ? r === 'low' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                            : r === 'medium' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                            : 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {t[r]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={generateTicket}
                  disabled={generating || !budget || !target}
                  className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <span className="animate-pulse">{t.analyzingData}</span>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      {t.generateTicket}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Result & History */}
        <div className="lg:col-span-7 space-y-8">
          {currentTicket && (
            <div className="bg-slate-900 rounded-2xl border border-emerald-500/30 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="bg-emerald-500/10 p-6 border-b border-emerald-500/20 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    {t.aiRecommended}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">{t.basedOnRisk.replace('{risk}', t[currentTicket.riskLevel])}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">{t.totalOdds}</p>
                  <p className="text-2xl font-bold">{currentTicket.totalOdds.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {Object.entries(
                  currentTicket.selections.reduce((acc: any, sel: any) => {
                    const sportName = sel.sport ? (typeof sel.sport === 'string' ? sel.sport : sel.sport[language]) : 'Other';
                    if (!acc[sportName]) acc[sportName] = [];
                    acc[sportName].push(sel);
                    return acc;
                  }, {} as Record<string, any[]>)
                ).map(([sport, sels]: [string, any]) => (
                  <div key={sport}>
                    <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      {sport}
                    </h4>
                    <div className="space-y-3">
                      {sels.map((sel: any, idx: number) => {
                        const matchName = typeof sel.match === 'string' ? sel.match : sel.match?.[language] || '';
                        const predictionText = typeof sel.prediction === 'string' ? sel.prediction : sel.prediction?.[language] || '';
                        return (
                          <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                            <div>
                              <p className="font-medium mb-1">{matchName}</p>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-emerald-400">{predictionText}</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400">{sel.probability}% {t.winProb}</span>
                              </div>
                            </div>
                            <div className="text-right font-mono font-bold">
                              {sel.odds.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-slate-950 p-6 border-t border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-400">{t.stake}</p>
                  <p className="text-lg font-medium">{currentTicket.budget}{currency}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">{t.estReturn}</p>
                  <p className="text-2xl font-bold text-emerald-400">{currentTicket.estimatedReturn.toFixed(2)}{currency}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-400" />
              {t.recentTickets}
            </h3>
            
            {loadingHistory ? (
              <p className="text-slate-500">{t.loadingHistory}</p>
            ) : history.length === 0 ? (
              <p className="text-slate-500">{t.noTickets}</p>
            ) : (
              <div className="space-y-4">
                {history.slice(0, 5).map((ticket) => (
                  <div key={ticket.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                          ticket.riskLevel === 'low' ? 'bg-emerald-500/20 text-emerald-400' :
                          ticket.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {t[ticket.riskLevel as keyof typeof t]} {t.risk}
                        </span>
                        <span className="text-xs text-slate-500">
                          {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : t.justNow}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{ticket.selections?.length || 0} {t.selections}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">{ticket.budget}{currency} → <span className="text-emerald-400 font-medium">{ticket.estimatedReturn?.toFixed(2)}{currency}</span></p>
                      <p className="text-xs font-mono text-slate-500">{ticket.totalOdds?.toFixed(2)} {t.odds}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
