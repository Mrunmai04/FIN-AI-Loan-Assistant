import React, { useState, useEffect, useRef } from 'react';
import { 
  AppStage, AppState, INITIAL_STATE, ChatMessage, LoanOffer, KYCData, Language 
} from './types';
import { 
  calculateEligibility, generateOffers, validatePAN, validateAadhaar, validateMobile 
} from './utils/banking';
import { getTranslation } from './utils/translations';
import { mockBackendAPI } from './utils/mockBackend';
import { GeminiLive } from './components/GeminiLive';
import { SanctionLetter } from './components/SanctionLetter';
import { 
  Send, Bot, User, Mic, ShieldCheck, Lock, Upload, CheckCircle, AlertTriangle, FileText, Globe, RefreshCw, Calculator
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.API_KEY || '';

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [showSanctionLetter, setShowSanctionLetter] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const aiClient = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (GEMINI_API_KEY) {
      aiClient.current = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
    // Initial Start
    const lang = state.language;
    addBotMessage(getTranslation(lang, 'welcome'), [getTranslation(lang, 'buttons.yes')]);
  }, []); // Run once on mount

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const t = (key: string, params?: Record<string, string | number>) => getTranslation(state.language, key, params);

  const addBotMessage = (text: string, options?: string[], type: ChatMessage['type'] = 'text') => {
    setIsTyping(true);
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: Date.now().toString(),
          role: 'assistant',
          content: text,
          type,
          options
        }]
      }));
      setIsTyping(false);
    }, 800);
  };

  const addUserMessage = (text: string) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, {
        id: Date.now().toString(),
        role: 'user',
        content: text
      }]
    }));
    processUserInput(text);
  };

  const handleRestart = () => {
    setState(INITIAL_STATE);
    const lang = 'en'; // Reset to default or keep current? Let's keep current in real app, but prompt implies full clear
    // Re-trigger welcome for the NEW state
    setTimeout(() => {
      addBotMessage(getTranslation(lang, 'welcome'), [getTranslation(lang, 'buttons.yes')]);
    }, 100);
  };

  const toggleLanguage = () => {
    const newLang = state.language === 'en' ? 'hi' : 'en';
    setState(prev => ({ ...prev, language: newLang }));
    // Announce language change
    addBotMessage(newLang === 'en' ? "Language changed to English." : "भाषा हिंदी में बदल दी गई है।");
  };

  // --- Core Conversation Logic ---

  const processUserInput = async (input: string) => {
    const lowerInput = input.toLowerCase();

    // 0. Greeting / Consent
    if (state.stage === AppStage.GREETING) {
      setState(prev => ({ ...prev, stage: AppStage.NAME_COLLECTION }));
      addBotMessage(t('nameRequest'));
      return;
    }

    // 1. Name Collection
    if (state.stage === AppStage.NAME_COLLECTION) {
      if (input.length < 3) {
        addBotMessage("Please enter a valid full name.");
        return;
      }
      setState(prev => ({ ...prev, userName: input, stage: AppStage.LOAN_TYPE_SELECTION }));
      addBotMessage(t('loanTypeRequest', { name: input }), 
        [t('buttons.personal'), t('buttons.home'), t('buttons.business'), t('buttons.education')]);
      return;
    }

    // 2. Loan Type Selection
    if (state.stage === AppStage.LOAN_TYPE_SELECTION) {
      // Map translated inputs back to standard keys if needed, or just use input string
      const loanType = input; 
      setState(prev => ({ ...prev, loanType, stage: AppStage.FINANCIAL_COLLECTION }));
      addBotMessage(t('incomeRequest'));
      return;
    }

    // 3. Financials
    if (state.stage === AppStage.FINANCIAL_COLLECTION) {
      const num = parseInt(input.replace(/[^0-9]/g, ''));
      
      if (!state.financials.monthlyIncome) {
        if (isNaN(num) || num < 5000) {
           addBotMessage(t('invalidIncome'));
           return;
        }
        setState(prev => ({ ...prev, financials: { ...prev.financials, monthlyIncome: num } }));
        addBotMessage(t('emiRequest'));
      } else {
        const emi = isNaN(num) ? 0 : num;
        const updatedFinancials = { ...state.financials, existingEmi: emi };
        
        // Transition to Credit Score Collection instead of immediate offers
        setState(prev => ({ 
          ...prev, 
          financials: updatedFinancials, 
          stage: AppStage.CREDIT_SCORE_COLLECTION 
        }));

        addBotMessage(t('creditScoreRequest'), [
          t('creditScore.excellent'), 
          t('creditScore.good'), 
          t('creditScore.fair'), 
          t('creditScore.poor'), 
          t('creditScore.unknown')
        ]);
      }
      return;
    }

    // 3.5 Credit Score Collection (New Stage)
    if (state.stage === AppStage.CREDIT_SCORE_COLLECTION) {
      const creditCategory = input;
      const isPoor = creditCategory.toLowerCase().includes('poor') || creditCategory.includes('<650');
      
      const score = calculateEligibility(state.financials, creditCategory);
      const offers = generateOffers(state.financials, state.loanType, score, creditCategory);

      setState(prev => ({ 
        ...prev,
        creditScoreCategory: creditCategory,
        eligibilityScore: score,
        offers,
        stage: offers.length > 0 ? AppStage.OFFER_GENERATION : AppStage.REJECTED 
      }));

      // If poor credit, add advisory message before offers
      if (isPoor) {
        addBotMessage(t('creditScoreAdvisory'));
      }

      if (offers.length > 0) {
        // Slight delay if we showed advisory message
        setTimeout(() => {
          addBotMessage(t('offersGenerated', { income: state.financials.monthlyIncome, score }), undefined, 'card');
        }, isPoor ? 1000 : 0);
      } else {
         addBotMessage(t('rejection'), [t('buttons.restart')]);
      }
      return;
    }

    // 4. Offer Selection (handled by click mostly)
    if (state.stage === AppStage.OFFER_GENERATION) {
       addBotMessage(t('selectOffer'));
       return;
    }

    // 5. KYC Start (Mobile)
    if (state.stage === AppStage.KYC_START) {
       if (!validateMobile(input)) {
         addBotMessage(t('invalidMobile'));
         return;
       }
       setState(prev => ({ ...prev, mobile: input, stage: AppStage.KYC_UPLOAD }));
       addBotMessage(t('kycStart'), [], 'upload');
       return;
    }

    // 6. Locked State
    if (state.stage === AppStage.LOCKED) {
       return; // No response
    }

    // Fallback AI Chit-chat
    if (state.stage !== AppStage.KYC_UPLOAD && state.stage !== AppStage.SANCTION_GENERATION) {
       try {
         if (aiClient.current) {
           const response = await aiClient.current.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: `System: You are a bank assistant named FinAI. User context: ${state.stage}. User said: "${input}". Reply helpfully in ${state.language === 'en' ? 'English' : 'Hindi'}. Keep it short.`,
           });
           addBotMessage(response.text || "I can help you with your loan application.");
         }
       } catch (e) {
         addBotMessage("I am here to assist you with your loan.");
       }
    }
  };

  const handleOfferSelect = (offer: LoanOffer) => {
    setState(prev => ({ 
      ...prev, 
      selectedOffer: offer,
      stage: AppStage.KYC_START 
    }));
    addBotMessage(t('mobileRequest'));
  };

  const handleKYCSubmit = async (data: KYCData) => {
    // Call Mock Backend
    const result = await mockBackendAPI.verifyKYC(data);

    if (result.success) {
      await mockBackendAPI.sendOTP(state.mobile);
      setState(prev => ({ ...prev, kyc: data, stage: AppStage.OTP_VERIFICATION }));
      addBotMessage(t('kycSuccess'), [], 'kyc-success');
    } else {
      // Hard Stop Logic
      const newAttempts = state.kycAttempts + 1;
      if (newAttempts >= 3) {
        setState(prev => ({ ...prev, kycAttempts: newAttempts, stage: AppStage.LOCKED }));
        addBotMessage(t('locked'), [t('buttons.restart')], 'error');
      } else {
        setState(prev => ({ ...prev, kycAttempts: newAttempts }));
        addBotMessage(`${t('kycFail')} Reason: ${result.message}. Attempts remaining: ${3 - newAttempts}. Please check your details and try again.`, [], 'upload');
      }
    }
  };

  const handleOTPVerify = async (otp: string) => {
    const isValid = await mockBackendAPI.verifyOTP(otp);
    if (isValid) {
      setState(prev => ({ ...prev, otpVerified: true, stage: AppStage.SANCTION_GENERATION }));
      addBotMessage(t('otpSuccess'), [], 'sanction');
      setTimeout(() => setShowSanctionLetter(true), 2000);
    } else {
      addBotMessage(t('otpFail'));
    }
  };

  // --- Render Helpers ---

  const renderMessageContent = (msg: ChatMessage) => {
    switch (msg.type) {
      case 'card':
        return (
          <div className="flex flex-col gap-3 w-full mt-2">
            {state.offers.map((offer) => (
              <div key={offer.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => handleOfferSelect(offer)}>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-800">{offer.type}</h4>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-semibold">
                    {offer.interestRate}% ROI
                  </span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <div>Amt: <span className="font-semibold text-slate-900">₹{(offer.amount/100000).toFixed(1)}L</span></div>
                  <div>EMI: <span className="font-semibold text-slate-900">₹{offer.emi.toLocaleString()}</span></div>
                  <div>Tenure: <span className="font-semibold text-slate-900">{offer.tenureMonths}m</span></div>
                </div>
                <button className="mt-3 w-full bg-slate-100 text-slate-700 py-2 rounded-md text-sm font-medium group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  Select This Offer
                </button>
              </div>
            ))}
          </div>
        );
      case 'upload':
        return <KYCForm onSubmit={handleKYCSubmit} language={state.language} />;
      case 'kyc-success':
        return (
           <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-3 text-green-800 mt-2">
             <CheckCircle className="shrink-0" size={20} />
             <div>
               <p className="font-semibold text-sm">Verification Complete</p>
               <p className="text-xs">Documents encrypted & verified via Secure Gateway.</p>
             </div>
           </div>
        );
      case 'error':
        return (
           <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3 text-red-800 mt-2">
             <AlertTriangle className="shrink-0" size={20} />
             <div>
               <p className="font-semibold text-sm">Security Alert</p>
               <p className="text-xs">{msg.content}</p>
             </div>
           </div>
        );
      case 'sanction':
        return (
          <div className="mt-2">
            <button 
              onClick={() => setShowSanctionLetter(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105"
            >
              <FileText size={18} /> View Sanction Letter
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row max-w-7xl mx-auto shadow-2xl overflow-hidden md:rounded-xl my-0 md:my-8 border border-slate-200 font-inter">
      
      {/* Sidebar */}
      <div className="bg-slate-900 text-slate-300 w-full md:w-80 p-6 flex flex-col justify-between shrink-0 relative overflow-hidden">
        {/* Abstract Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8 text-white">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">F</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FinAI Bank</h1>
              <p className="text-xs text-blue-400">Next-Gen Lending</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 backdrop-blur-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Application Status</h3>
              <div className="flex items-center gap-2 text-white">
                <div className={`w-2.5 h-2.5 rounded-full ${state.stage === AppStage.SANCTION_GENERATION ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : state.stage === AppStage.LOCKED ? 'bg-red-500' : 'bg-yellow-500'}`} />
                <span className="text-sm font-medium">{state.stage.replace(/_/g, ' ')}</span>
              </div>
            </div>

            {state.eligibilityScore > 0 && (
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 backdrop-blur-sm animate-fade-in">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                  <Calculator size={14} />
                  <h3 className="text-xs font-semibold uppercase tracking-wider">Eligibility Score</h3>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">{state.eligibilityScore}</span>
                  <span className="text-sm text-slate-400 mb-1">/ 900</span>
                </div>
                {state.creditScoreCategory && (
                   <div className="mt-1 text-xs text-blue-400 font-medium">
                     Credit Rating: {state.creditScoreCategory}
                   </div>
                )}
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      state.eligibilityScore > 750 ? 'bg-green-500' : 
                      state.eligibilityScore > 650 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} 
                    style={{ width: `${(state.eligibilityScore / 900) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {state.selectedOffer && (
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 animate-fade-in backdrop-blur-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Selected Offer</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-700 pb-2">
                    <span>Amount</span>
                    <span className="text-white font-mono">₹{state.selectedOffer.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700 pb-2">
                    <span>EMI</span>
                    <span className="text-white font-mono">₹{state.selectedOffer.emi.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tenure</span>
                    <span className="text-white">{state.selectedOffer.tenureMonths} Months</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 relative z-10">
          <div className="flex items-center gap-2 text-xs text-green-400 mb-2">
             <ShieldCheck size={14} /> <span>Banking-grade Encryption</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            FinAI follows RBI guidelines for digital lending. All data is processed securely.
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        
        {/* Header */}
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-slate-800">Loan Assistant</h2>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wide">Live</span>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={toggleLanguage}
               className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
               title="Switch Language"
             >
               <Globe size={20} />
             </button>
             {state.stage === AppStage.REJECTED || state.stage === AppStage.LOCKED ? (
                <button 
                  onClick={handleRestart} 
                  className="flex items-center gap-2 text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-md hover:bg-slate-50 text-sm font-medium transition-colors"
                >
                  <RefreshCw size={16} /> Restart
                </button>
             ) : (
                <button 
                  onClick={() => setIsLiveOpen(true)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-slate-800 shadow-md transition-all"
                >
                  <Mic size={16} /> Voice Agent
                </button>
             )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 scroll-smooth relative">
          {state.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[90%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'user' ? 'bg-slate-200' : 'bg-blue-600 text-white'
                }`}>
                  {msg.role === 'user' ? <User size={16} className="text-slate-600" /> : <Bot size={16} />}
                </div>
                
                <div className="flex flex-col gap-1 w-full">
                  {msg.content && (
                     <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                      }`}>
                        {msg.content.split('\n').map((line, i) => (
                          <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                        ))}
                     </div>
                  )}

                  {renderMessageContent(msg)}

                  {msg.options && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.options.map(opt => (
                        <button 
                          key={opt}
                          onClick={() => opt === t('buttons.restart') ? handleRestart() : addUserMessage(opt)}
                          className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-full text-sm hover:bg-blue-50 hover:shadow-sm transition-all"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex justify-start">
               <div className="flex gap-3">
                 <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white shadow-sm">
                   <Bot size={16} />
                 </div>
                 <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center h-10">
                   <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                   <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                   <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                 </div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100 relative z-20">
           {state.stage === AppStage.LOCKED ? (
             <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center font-medium border border-red-200 flex items-center justify-center gap-2">
               <Lock size={18} /> Session Locked. Please Restart.
             </div>
           ) : state.stage === AppStage.OTP_VERIFICATION ? (
             <div className="flex gap-2 max-w-sm mx-auto">
               <input 
                 type="text" 
                 placeholder="Enter OTP (1234)" 
                 className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-[0.5em] text-center font-mono text-lg"
                 maxLength={4}
                 onChange={(e) => {
                   const val = e.target.value;
                   if (val.length === 4) handleOTPVerify(val);
                 }}
                 autoFocus
               />
             </div>
           ) : (
             <form 
              onSubmit={(e) => { e.preventDefault(); if(inputText.trim()) { addUserMessage(inputText); setInputText(''); } }}
              className="flex gap-2"
            >
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={state.stage === AppStage.KYC_UPLOAD ? "Please complete the form above..." : "Type your message..."}
                disabled={state.stage === AppStage.KYC_UPLOAD || state.stage === AppStage.SANCTION_GENERATION}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100 transition-all placeholder:text-slate-400"
              />
              <button 
                type="submit" 
                disabled={!inputText.trim() || state.stage === AppStage.KYC_UPLOAD || state.stage === AppStage.SANCTION_GENERATION}
                className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                <Send size={20} />
              </button>
            </form>
           )}
        </div>
      </div>

      {/* Modals */}
      <GeminiLive isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} apiKey={GEMINI_API_KEY} />
      
      {showSanctionLetter && (
        <SanctionLetter state={state} onClose={() => setShowSanctionLetter(false)} />
      )}
    </div>
  );
}

// Sub-Component for KYC Form
const KYCForm = ({ onSubmit, language }: { onSubmit: (data: KYCData) => void, language: string }) => {
  const [pan, setPan] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'verifying' | 'done'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePAN(pan) || !validateAadhaar(aadhaar) || !file) {
      alert("Invalid Input. Ensure PAN is correct (e.g., ABCDE1234F) and Aadhaar is 12 digits.");
      return;
    }

    setStatus('uploading');
    
    // Simulate Secure Process
    setTimeout(() => {
      setStatus('verifying');
      setTimeout(() => {
        setStatus('done');
        onSubmit({
          pan,
          aadhaar,
          verified: true, // Verification outcome handled by parent via Mock API logic
          documentUploaded: true
        });
      }, 1500);
    }, 1500);
  };

  if (status !== 'idle') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 mt-2 flex flex-col items-center justify-center gap-4 py-12">
        {status === 'done' ? (
           <CheckCircle className="text-green-500 animate-bounce" size={48} />
        ) : (
           <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        )}
        <p className="text-slate-600 font-medium animate-pulse">
          {status === 'uploading' ? 'Encrypting & Uploading Documents...' : 
           status === 'verifying' ? 'Verifying with Government Database...' : 
           'Processing Complete'}
        </p>
        <div className="flex gap-2 text-xs text-slate-400">
           <Lock size={12} /> 256-bit SSL Secure
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 mt-2 shadow-sm w-full max-w-sm">
      <div className="flex items-center gap-2 mb-4 text-slate-800 border-b border-slate-100 pb-3">
        <ShieldCheck className="text-green-600" size={20} />
        <div>
          <h4 className="font-semibold text-sm">Secure KYC Gateway</h4>
          <p className="text-[10px] text-slate-500">Official Government Verification</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">PAN Number</label>
          <input 
            type="text" 
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
            maxLength={10}
            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono tracking-wide"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">Aadhaar Number</label>
          <input 
            type="text" 
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value.replace(/\D/g,''))}
            placeholder="XXXX XXXX XXXX"
            maxLength={12}
            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-wide"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 block">ID Proof (PDF/JPG)</label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors relative group">
            <input 
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            {file ? (
              <div className="flex flex-col items-center gap-1 text-blue-600">
                <FileText size={24} />
                <span className="text-xs font-medium truncate max-w-[150px]">{file.name}</span>
                <span className="text-[10px] text-slate-400">Ready to upload</span>
              </div>
            ) : (
              <>
                <div className="bg-slate-100 p-3 rounded-full mb-2 group-hover:bg-slate-200 transition-colors">
                   <Upload size={20} className="text-slate-600" />
                </div>
                <span className="text-xs font-medium text-slate-600">Click to Upload Document</span>
                <span className="text-[10px] text-slate-400 mt-1">Supports PDF, JPG (Max 5MB)</span>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-blue-50 p-2 rounded text-[10px] text-blue-700 flex gap-2 items-start">
           <Lock size={12} className="shrink-0 mt-0.5" />
           Your documents are encrypted and only used for identity verification. They are not shared with third parties.
        </div>

        <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg">
          <ShieldCheck size={16} /> Submit & Verify Securely
        </button>
      </form>
    </div>
  );
};