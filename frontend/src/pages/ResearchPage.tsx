import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Bot, Send, Sparkles, BookOpen, ExternalLink, 
  AlertTriangle, ShieldCheck, FileText, Calendar, 
  MessageSquare, Plus, Trash2, ChevronRight, Layers,
  Database, Cpu, Info, CheckCircle2, AlertCircle, ShieldAlert,
  Mic, MicOff, Globe, Upload
} from 'lucide-react';
import { apiService } from '../services/api';
import { 
  ResearchAskResponse, CitationCard, 
  ResearchConversationSummary, ResearchMessageItem
} from '../types';

export const ResearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'hybrid' | 'keyword' | 'semantic'>('hybrid');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Phase 6 Multilingual & Voice Query state
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const [isRecording, setIsRecording] = useState(false);
  const [audioQueryLoading, setAudioQueryLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceFileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Conversation thread & messages
  const [conversations, setConversations] = useState<ResearchConversationSummary[]>([]);
  const [messages, setMessages] = useState<ResearchMessageItem[]>([]);
  const [activeCitations, setActiveCitations] = useState<CitationCard[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<CitationCard | null>(null);
  const [lastDiagnostics, setLastDiagnostics] = useState<Record<string, any> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Handle URL query parameter
  useEffect(() => {
    const urlQuery = searchParams.get('query');
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
      handleAsk(urlQuery);
    }
  }, [searchParams]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      const convList = await apiService.listResearchConversations();
      setConversations(convList);
    } catch (e) {
      console.warn('Could not load conversations:', e);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setActiveCitations([]);
    setSelectedCitation(null);
    setLastDiagnostics(null);
    setErrorMessage(null);
    setQuery('');
  };

  const selectConversation = async (convId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const detail = await apiService.getResearchConversation(convId);
      setCurrentConversationId(detail.conversation_id);
      setMessages(detail.messages);
      
      // Load citations from last assistant message
      const assistantMsgs = detail.messages.filter(m => m.role === 'assistant' && m.citations && m.citations.length > 0);
      if (assistantMsgs.length > 0) {
        const lastMsg = assistantMsgs[assistantMsgs.length - 1];
        setActiveCitations(lastMsg.citations || []);
        if (lastMsg.citations && lastMsg.citations.length > 0) {
          setSelectedCitation(lastMsg.citations[0]);
        }
      } else {
        setActiveCitations([]);
        setSelectedCitation(null);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to load conversation history');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiService.deleteResearchConversation(convId);
      setConversations(prev => prev.filter(c => c.conversation_id !== convId));
      if (currentConversationId === convId) {
        startNewConversation();
      }
    } catch (e: any) {
      console.error('Failed to delete conversation:', e);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice_query.webm', { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        setAudioQueryLoading(true);
        setErrorMessage(null);
        try {
          const res = await apiService.sendVoiceQuery(audioFile, targetLanguage);
          if (res.query) {
            setQuery(res.query);
            handleAsk(res.query);
          }
        } catch (err: any) {
          setErrorMessage(err.message || 'Voice transcription failed');
        } finally {
          setAudioQueryLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setErrorMessage('Microphone access was denied or is not supported in this browser environment. You can upload an audio file instead.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioQueryLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiService.sendVoiceQuery(file, targetLanguage);
      if (res.query) {
        setQuery(res.query);
        handleAsk(res.query);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Voice query transcription failed');
    } finally {
      setAudioQueryLoading(false);
    }
  };

  const handleAsk = async (questionText: string) => {
    const cleanQ = questionText.trim();
    if (!cleanQ || loading) return;

    setLoading(true);
    setErrorMessage(null);

    // Optimistically add user message
    const tempUserMsg: ResearchMessageItem = {
      id: Date.now(),
      role: 'user',
      content: cleanQ,
      status: 'SUCCESS',
      grounded: true,
      evidence_count: 0,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res: ResearchAskResponse = await apiService.askResearchAssistant({
        query: cleanQ,
        conversation_id: currentConversationId || undefined,
        mode,
        target_language: targetLanguage
      });

      setCurrentConversationId(res.conversation_id);
      setLastDiagnostics(res.diagnostics);
      setActiveCitations(res.citations);
      if (res.citations.length > 0) {
        setSelectedCitation(res.citations[0]);
      }

      const assistantMsg: ResearchMessageItem = {
        id: res.message_id || Date.now() + 1,
        role: 'assistant',
        content: res.answer,
        status: res.status,
        grounded: res.grounded,
        evidence_count: res.citations.length,
        citations: res.citations,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Refresh conversations list
      loadConversations();
    } catch (e: any) {
      setErrorMessage(e.message || 'An error occurred during archival retrieval');
      const errAssistantMsg: ResearchMessageItem = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${e.message || 'Could not complete archival research synthesis.'}`,
        status: 'ERROR',
        grounded: false,
        evidence_count: 0,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errAssistantMsg]);
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(query);
  };

  // Helper to render text with clickable [n] citations
  const renderGroundedText = (text: string, citations?: CitationCard[]) => {
    if (!text) return null;
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const sourceIndex = parseInt(match[1], 10);
        const matchedCard = (citations || activeCitations).find(c => c.source_index === sourceIndex);
        return (
          <button
            key={index}
            onClick={() => matchedCard && setSelectedCitation(matchedCard)}
            title={matchedCard ? `${matchedCard.document_title || 'Document'} (Page ${matchedCard.page_number || 'N/A'})` : `Source ${sourceIndex}`}
            className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-xs font-mono font-bold bg-[#1B2A4A] text-heritage-300 hover:bg-heritage-600 hover:text-white rounded border border-heritage-400/40 transition shadow-sm align-baseline cursor-pointer"
          >
            [{sourceIndex}]
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const sampleQuestions = [
    "What was Dr. Ambedkar's warning regarding social democracy in his November 25, 1949 address?",
    "Why did Dr. Ambedkar call Article 32 the very soul of the Constitution?",
    "What is the analysis of currency depreciation in The Problem of the Rupee?",
    "What declarations on human dignity were made during the Mahad Satyagraha?"
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      {/* Header Banner */}
      <header className="bg-[#1B2A4A] text-white py-6 px-4 sm:px-6 lg:px-8 border-b-2 border-heritage-500 shadow-md flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/10 border border-heritage-400/30 text-heritage-300 text-xs font-mono tracking-wide">
              <Bot className="w-3.5 h-3.5 text-heritage-400" />
              <span>PHASE 5 SOURCE-GROUNDED RAG</span>
              <span className="text-white/40">•</span>
              <span className="text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> CLOSED-WORLD REASONING
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Dr. B. R. Ambedkar AI Research Assistant
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-light max-w-2xl">
              Grounded strictly in verified archival manuscripts, Constituent Assembly proceedings, and primary source records.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-[#102038] p-1 rounded-lg border border-slate-700 text-xs">
            <span className="text-slate-400 px-2 font-mono">Retrieval:</span>
            {(['hybrid', 'keyword', 'semantic'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 rounded font-medium capitalize transition ${
                  mode === m
                    ? 'bg-heritage-500 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Inquiry Threads & History (3 cols) */}
        <aside className="lg:col-span-3 bg-white rounded-xl border border-stone-200 shadow-sm p-4 space-y-4 flex flex-col h-[750px]">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h2 className="font-serif font-bold text-slate-900 text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#1B2A4A]" />
              Inquiry Threads
            </h2>
            <button
              onClick={startNewConversation}
              className="p-1.5 text-xs bg-stone-100 hover:bg-stone-200 text-slate-700 font-semibold rounded-md transition flex items-center gap-1"
              title="New Research Inquiry"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-light">
                No past inquiry threads.<br />Ask a question to begin.
              </div>
            ) : (
              conversations.map(c => {
                const isSelected = currentConversationId === c.conversation_id;
                return (
                  <div
                    key={c.conversation_id}
                    onClick={() => selectConversation(c.conversation_id)}
                    className={`group p-2.5 rounded-lg border text-left cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                        : 'bg-stone-50 hover:bg-stone-100 text-slate-800 border-stone-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-medium truncate">
                        {c.title}
                      </p>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {c.message_count} messages
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(c.conversation_id, e)}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 transition ${
                        isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-stone-200 text-slate-500'
                      }`}
                      title="Delete thread"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Grounding Protocol Notice */}
          <div className="pt-3 border-t border-stone-100 text-[11px] text-slate-500 space-y-1 bg-stone-50 p-2.5 rounded-lg">
            <div className="font-semibold text-slate-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Zero Hallucination Guarantee
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              If an archival passage cannot be verified in repository records, the assistant explicitly states insufficient evidence.
            </p>
          </div>
        </aside>

        {/* CENTER COLUMN: Interactive RAG Synthesis Chat (6 cols) */}
        <main className="lg:col-span-6 bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col h-[750px] overflow-hidden">
          
          {/* Thread Header */}
          <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700 font-mono">
                {currentConversationId ? `Session: ${currentConversationId.slice(0, 16)}...` : 'New Archival Inquiry'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 uppercase">
              Mode: {mode}
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-heritage-50 text-heritage-600 mx-auto flex items-center justify-center border border-heritage-200">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-slate-800 text-base">
                    Explore Primary Historical Writings
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Ask a scholarly question. The assistant searches archival records, builds evidence context, and cites verbatim passages with full provenance.
                  </p>
                </div>

                {/* Sample Prompt Chips */}
                <div className="pt-2 flex flex-col gap-2 max-w-md mx-auto text-left">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Suggested Research Questions:
                  </span>
                  {sampleQuestions.map((sq, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(sq);
                        handleAsk(sq);
                      }}
                      className="p-2.5 rounded-lg border border-stone-200 hover:border-heritage-400 bg-stone-50 hover:bg-heritage-50/50 text-slate-800 text-xs text-left transition flex items-start justify-between group"
                    >
                      <span className="leading-snug">{sq}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-heritage-600 mt-0.5 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] font-mono text-slate-400 mb-1 px-1">
                      {isUser ? 'SCHOLAR INQUIRY' : 'ARCHIVAL ASSISTANT'}
                    </div>

                    <div
                      className={`max-w-[92%] rounded-2xl p-4 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#1B2A4A] text-white rounded-br-none shadow-sm'
                          : 'bg-stone-50 text-slate-900 border border-stone-200 rounded-bl-none shadow-sm space-y-3'
                      }`}
                    >
                      {/* Assistant status badge */}
                      {!isUser && (
                        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-stone-200/60 text-xs">
                          {msg.status === 'SUCCESS' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              VERIFIED CITATIONS ({msg.evidence_count})
                            </span>
                          )}
                          {(msg.status === 'NO_EVIDENCE' || msg.status === 'INSUFFICIENT_EVIDENCE') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold">
                              <AlertCircle className="w-3 h-3 text-amber-700" />
                              INSUFFICIENT ARCHIVAL EVIDENCE
                            </span>
                          )}
                          {msg.status === 'LLM_UNAVAILABLE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-900 text-[11px] font-bold">
                              <AlertTriangle className="w-3 h-3 text-rose-700" />
                              LLM SERVICE UNAVAILABLE
                            </span>
                          )}
                          {msg.status === 'CITATION_VALIDATION_FAILED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-100 text-orange-900 text-[11px] font-bold">
                              <ShieldAlert className="w-3 h-3 text-orange-700" />
                              UNCONFIRMED CITATION DETECTED
                            </span>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="whitespace-pre-wrap font-serif">
                        {isUser ? msg.content : renderGroundedText(msg.content, msg.citations)}
                      </div>

                      {/* Citations Preview Strip for Assistant */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div className="pt-2 border-t border-stone-200 text-xs space-y-1">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                            Retrieved Sources:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((cit) => (
                              <button
                                key={cit.source_index}
                                onClick={() => setSelectedCitation(cit)}
                                className={`px-2 py-1 rounded text-xs border font-mono transition flex items-center gap-1 ${
                                  selectedCitation?.source_index === cit.source_index
                                    ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                                    : 'bg-white hover:bg-stone-100 text-slate-700 border-stone-300'
                                }`}
                              >
                                <span>[{cit.source_index}]</span>
                                <span className="truncate max-w-[150px] font-sans">
                                  {cit.document_title || cit.archive_id}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {loading && (
              <div className="flex items-center gap-3 p-4 bg-stone-50 border border-stone-200 rounded-xl text-slate-600 text-xs animate-pulse">
                <div className="w-4 h-4 rounded-full border-2 border-[#1B2A4A] border-t-transparent animate-spin" />
                <span>Searching archival vectors, packing evidence context & synthesizing grounded answer...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Question Input Form with Multilingual & Voice Features */}
          <div className="p-3 bg-stone-50 border-t border-stone-200 space-y-2">
            {errorMessage && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Language & Voice Query Toolbar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Globe className="w-3.5 h-3.5 text-heritage-600" />
                  Answer Language:
                </span>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="bg-white border border-stone-300 rounded px-2 py-0.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-heritage-500"
                >
                  <option value="English">English</option>
                  <option value="Hindi">हिन्दी (Hindi)</option>
                  <option value="Marathi">मराठी (Marathi)</option>
                  <option value="Tamil">தமிழ் (Tamil)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={voiceFileInputRef}
                  onChange={handleVoiceFileUpload}
                  accept="audio/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => voiceFileInputRef.current?.click()}
                  disabled={loading || audioQueryLoading}
                  className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded text-slate-700 flex items-center gap-1 text-[11px] transition"
                  title="Upload voice recording file"
                >
                  <Upload className="w-3 h-3 text-slate-500" />
                  <span>Upload Audio</span>
                </button>

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading || audioQueryLoading}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-white hover:bg-stone-100 border border-stone-300 text-slate-700'
                  }`}
                  title={isRecording ? 'Click to stop recording' : 'Voice Query using microphone'}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-heritage-600" />}
                  <span>{isRecording ? 'Stop Recording' : 'Voice Query'}</span>
                </button>
              </div>
            </div>

            {audioQueryLoading && (
              <div className="p-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded flex items-center gap-2 animate-pulse">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <span>Transcribing speech and running security validation...</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question grounded in archival records..."
                disabled={loading || audioQueryLoading}
                className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-stone-300 focus:border-heritage-500 focus:ring-1 focus:ring-heritage-500 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none transition shadow-inner"
              />
              <button
                type="submit"
                disabled={loading || !query.trim() || audioQueryLoading}
                className="px-4 py-2.5 bg-[#1B2A4A] hover:bg-[#102038] disabled:opacity-50 text-white font-bold rounded-lg transition flex items-center gap-1.5 text-xs shadow flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-heritage-300" />
                <span>Ask</span>
              </button>
            </form>
          </div>
        </main>

        {/* RIGHT COLUMN: Evidence & Provenance Inspector (3 cols) */}
        <aside className="lg:col-span-3 bg-white rounded-xl border border-stone-200 shadow-sm p-4 space-y-4 flex flex-col h-[750px] overflow-y-auto">
          <div className="pb-3 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-serif font-bold text-slate-900 text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1B2A4A]" />
              Evidence Inspector
            </h2>
            {selectedCitation && (
              <span className="px-2 py-0.5 rounded bg-heritage-100 text-heritage-800 font-mono text-[10px] font-bold">
                Source [{selectedCitation.source_index}]
              </span>
            )}
          </div>

          {selectedCitation ? (
            <div className="space-y-4 text-xs">
              {/* Document Header */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Primary Archival Source
                </span>
                <h3 className="font-serif font-bold text-slate-900 text-sm leading-snug">
                  {selectedCitation.document_title || 'Untitled Archival Record'}
                </h3>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 bg-stone-100 text-slate-700 rounded font-mono text-[10px]">
                    {selectedCitation.archive_id}
                  </span>
                  {selectedCitation.page_number && (
                    <span className="px-2 py-0.5 bg-stone-100 text-slate-700 rounded text-[10px]">
                      Page {selectedCitation.page_number}
                    </span>
                  )}
                  {selectedCitation.year && (
                    <span className="px-2 py-0.5 bg-stone-100 text-slate-700 rounded text-[10px]">
                      Year {selectedCitation.year}
                    </span>
                  )}
                </div>
              </div>

              {/* Archival Layer Status */}
              <div className="p-2.5 rounded-lg border bg-stone-50 border-stone-200 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Transcription Layer
                </span>
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  {selectedCitation.is_verified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>{selectedCitation.transcription_layer || 'ARCHIVAL TEXT'}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {selectedCitation.is_verified 
                    ? 'Curator-approved textual transcription.'
                    : 'Machine OCR transcription. Human review pending.'}
                </p>
              </div>

              {/* Provenance Chain */}
              {selectedCitation.provenance_chain && (
                <div className="p-2.5 rounded-lg border bg-stone-50 border-stone-200 space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Provenance Chain
                  </span>
                  <p className="font-mono text-[10px] text-slate-700 bg-white p-2 rounded border border-stone-200 break-all leading-tight">
                    {selectedCitation.provenance_chain.chain_description}
                  </p>
                </div>
              )}

              {/* Verbatim Excerpt */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Verbatim Passage Excerpt
                </span>
                <div className="p-3 bg-heritage-50/40 border border-heritage-200/60 rounded-lg text-slate-800 italic font-serif leading-relaxed text-xs">
                  "{selectedCitation.snippet}"
                </div>
              </div>

              {/* Action: Open Document */}
              {selectedCitation.document_id && (
                <Link
                  to={`/documents/${selectedCitation.document_id}`}
                  className="w-full py-2 px-3 bg-[#1B2A4A] hover:bg-[#102038] text-white rounded-lg transition font-medium flex items-center justify-center gap-1.5 text-xs shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Archival Master</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Info className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">
                Select any in-text citation <span className="font-mono font-bold">[n]</span> to inspect its document provenance.
              </p>
            </div>
          )}

          {/* Diagnostics Section */}
          {lastDiagnostics && (
            <div className="mt-auto pt-3 border-t border-stone-200 text-[10px] font-mono text-slate-500 space-y-1">
              <span className="font-semibold text-slate-600 uppercase flex items-center gap-1">
                <Cpu className="w-3 h-3" /> RAG Diagnostics:
              </span>
              <div className="bg-stone-50 p-2 rounded border border-stone-200 space-y-0.5 text-[10px]">
                <div>Backend: {lastDiagnostics.vector_backend || 'SQLite Dev'}</div>
                <div>LLM: {lastDiagnostics.llm_provider || 'Local Provider'}</div>
                <div>Status: {lastDiagnostics.validation_status || 'OK'}</div>
              </div>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
};
