import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Bot, Send, Sparkles, BookOpen, ExternalLink, 
  AlertTriangle, ShieldCheck, FileText, Calendar, 
  MessageSquare, Plus, Trash2, ChevronRight, Layers,
  Database, Cpu, Info, CheckCircle2, AlertCircle, ShieldAlert,
  Mic, MicOff, Globe, Upload, Volume2
} from 'lucide-react';
import { apiService } from '../services/api';
import { 
  ResearchAskResponse, CitationCard, 
  ResearchConversationSummary, ResearchMessageItem
} from '../types';
import { PageMasthead } from '../components/layout/PageMasthead';

export const ResearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [query, setQuery] = useState(searchParams.get('query') || searchParams.get('q') || '');
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
    const urlQuery = searchParams.get('query') || searchParams.get('q');
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
    <div className="min-h-screen bg-newsprint-100 text-ink flex flex-col font-mono">
      {/* Standardized Research Bureau PageMasthead */}
      <PageMasthead
        eyebrow="SOURCE-GROUNDED RAG DISPATCH DESK • CLOSED-WORLD REASONING"
        headline="Dr. B. R. Ambedkar AI Research Bureau"
        subheadline="Grounded strictly in verified archival manuscripts, Constituent Assembly proceedings, and primary source records."
        accession={currentConversationId ? `SESSION: ${currentConversationId.slice(0, 16)}` : 'ACTIVE RESEARCH REGISTRY'}
        badge="ZERO HALLUCINATION PROTOCOL"
        rightSlot={
          <div className="flex items-center gap-1 bg-newsprint-200 p-1 border border-ink/40 text-xs font-mono">
            <span className="text-ink-600 px-2 font-bold uppercase text-[10px]">Retrieval:</span>
            {(['hybrid', 'keyword', 'semantic'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 uppercase font-bold text-[10px] transition ${
                  mode === m
                    ? 'bg-ink text-white shadow-letterpress-sm'
                    : 'text-ink-700 hover:text-ink hover:bg-newsprint-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        }
      />

      {/* Main 3-Column Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Inquiry Threads & History (3 cols) */}
        <aside className="lg:col-span-3 bg-[#FAF6EE] border-2 border-ink shadow-letterpress-sm p-4 space-y-4 flex flex-col min-h-[560px] h-[calc(100vh-16rem)] max-h-[850px]">
          <div className="flex items-center justify-between pb-3 border-b-2 border-ink">
            <h2 className="font-serif font-black text-ink text-xs uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-oxblood" />
              Inquiry Ledger
            </h2>
            <button
              onClick={startNewConversation}
              className="px-2 py-1 text-[10px] bg-ink hover:bg-oxblood text-white font-bold uppercase transition flex items-center gap-1 shadow-letterpress-sm border border-ink"
              title="New Research Inquiry"
            >
              <Plus className="w-3 h-3" />
              <span>[ + New ]</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-ink-500 font-editorial italic">
                No past inquiry threads.<br />Transmit a dispatch to begin.
              </div>
            ) : (
              conversations.map(c => {
                const isSelected = currentConversationId === c.conversation_id;
                return (
                  <div
                    key={c.conversation_id}
                    onClick={() => selectConversation(c.conversation_id)}
                    className={`group p-2 border text-left cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-ink text-white border-ink shadow-letterpress-sm'
                        : 'bg-white hover:bg-newsprint-200 text-ink border-ink/30'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-serif font-bold truncate">
                        {c.title}
                      </p>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-newsprint-300' : 'text-ink-600'}`}>
                        {c.message_count} dispatches
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(c.conversation_id, e)}
                      className={`p-1 opacity-0 group-hover:opacity-100 transition ${
                        isSelected ? 'hover:bg-oxblood text-white' : 'hover:bg-newsprint-300 text-ink-600'
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
          <div className="pt-3 border-t-2 border-ink text-[11px] text-ink-700 space-y-1 bg-newsprint-100 p-2.5 border border-ink/20">
            <div className="font-bold text-oxblood uppercase text-[10px] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-oxblood" />
              Zero Hallucination Protocol
            </div>
            <p className="text-[10px] font-editorial text-ink-700 leading-tight italic">
              If an archival passage cannot be verified in repository records, the assistant explicitly states insufficient evidence.
            </p>
          </div>
        </aside>

        {/* CENTER COLUMN: Interactive RAG Synthesis Chat (6 cols) */}
        <main className="lg:col-span-6 bg-[#FAF6EE] border-2 border-ink shadow-letterpress flex flex-col min-h-[560px] h-[calc(100vh-16rem)] max-h-[850px] overflow-hidden">
          
          {/* Thread Header */}
          <div className="bg-newsprint-100 px-4 py-2.5 border-b border-ink/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-800" />
              <span className="text-xs font-bold text-ink uppercase font-mono">
                {currentConversationId ? `Session: ${currentConversationId.slice(0, 16)}...` : 'Official Archival Inquiry'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-oxblood uppercase font-bold">
              Mode: {mode}
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-4">
                <div className="w-10 h-10 border-2 border-ink bg-[#FAF6EE] text-oxblood mx-auto flex items-center justify-center shadow-letterpress-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-black text-ink text-base uppercase">
                    Interrogate Primary Historical Writings
                  </h3>
                  <p className="text-xs font-editorial text-ink-700 max-w-md mx-auto leading-relaxed italic">
                    Transmit a scholarly question. The assistant retrieves primary archival folios, constructs evidence context, and cites verbatim passages with unbroken provenance.
                  </p>
                </div>

                {/* Sample Prompt Chips */}
                <div className="pt-2 flex flex-col gap-1.5 max-w-md mx-auto text-left">
                  <span className="text-[10px] font-bold text-oxblood uppercase tracking-wider font-mono">
                    Official Historical Inquiries:
                  </span>
                  {sampleQuestions.map((sq, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(sq);
                        handleAsk(sq);
                      }}
                      className="p-2 border border-ink/30 hover:border-ink bg-white hover:bg-newsprint-200 text-ink text-xs text-left transition flex items-start justify-between group shadow-sm"
                    >
                      <span className="font-editorial leading-snug">{sq}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-ink-400 group-hover:text-oxblood mt-0.5 flex-shrink-0" />
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
                    <div className="text-[9px] font-mono text-ink-500 uppercase font-bold mb-1 px-1">
                      {isUser ? '[ SCHOLAR DISPATCH ]' : '[ ARCHIVAL ASSISTANT ]'}
                    </div>

                    <div
                      className={`max-w-[94%] p-3.5 text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-newsprint-200 border-2 border-ink text-ink shadow-letterpress-sm'
                          : 'bg-white text-ink border-2 border-ink shadow-letterpress space-y-2'
                      }`}
                    >
                      {/* Assistant status badge */}
                      {!isUser && (
                        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-ink/20 text-xs font-mono">
                          {msg.status === 'SUCCESS' && (
                            <span className="stamp-oxblood text-[9px] py-0 px-1.5">
                              VERIFIED CITATIONS ({msg.evidence_count})
                            </span>
                          )}
                          {(msg.status === 'NO_EVIDENCE' || msg.status === 'INSUFFICIENT_EVIDENCE') && (
                            <span className="stamp-oxblood text-[9px] py-0 px-1.5">
                              INSUFFICIENT ARCHIVAL EVIDENCE
                            </span>
                          )}
                          {msg.status === 'LLM_UNAVAILABLE' && (
                            <span className="stamp-oxblood text-[9px] py-0 px-1.5">
                              LLM SERVICE UNAVAILABLE
                            </span>
                          )}
                          {msg.status === 'RESEARCH_BACKEND_UNAVAILABLE' && (
                            <span className="stamp-oxblood text-[9px] py-0 px-1.5">
                              RESEARCH BACKEND UNAVAILABLE
                            </span>
                          )}

                          {/* Read Aloud / Text-to-Speech Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if ('speechSynthesis' in window) {
                                window.speechSynthesis.cancel();
                                const cleanText = msg.content.replace(/\[\d+\]/g, '').replace(/\[OFFLINE DEMO SIMULATION.*?\]/g, '');
                                const utter = new SpeechSynthesisUtterance(cleanText);
                                utter.rate = 0.95;
                                window.speechSynthesis.speak(utter);
                              }
                            }}
                            className="ml-auto text-ink hover:text-oxblood px-1.5 py-0.5 border border-ink/30 bg-[#FAF6EE] transition flex items-center gap-1 text-[10px] font-mono uppercase font-bold"
                            title="Read answer aloud"
                          >
                            <Volume2 className="w-3 h-3 text-oxblood" />
                            <span>Read Aloud</span>
                          </button>
                        </div>
                      )}

                      {/* Content */}
                      <div className="whitespace-pre-wrap font-editorial text-sm leading-relaxed">
                        {isUser ? msg.content : renderGroundedText(msg.content, msg.citations)}
                      </div>

                      {/* Citations Preview Strip for Assistant */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div className="pt-2 border-t border-ink/20 text-xs space-y-1 font-mono">
                          <span className="text-[10px] text-oxblood uppercase font-bold">
                            Retrieved Primary Evidence:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((cit) => (
                              <button
                                key={cit.source_index}
                                onClick={() => setSelectedCitation(cit)}
                                className={`px-2 py-0.5 text-xs border font-mono transition flex items-center gap-1 ${
                                  selectedCitation?.source_index === cit.source_index
                                    ? 'bg-ink text-white border-ink font-bold shadow-letterpress-sm'
                                    : 'bg-[#FAF6EE] hover:bg-newsprint-300 text-ink border-ink/30'
                                }`}
                              >
                                <span>[{cit.source_index}]</span>
                                <span className="truncate max-w-[140px]">
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
              <div className="flex items-center gap-3 p-3 bg-[#FAF6EE] border-2 border-ink text-ink text-xs font-mono">
                <div className="w-3.5 h-3.5 border-2 border-ink border-t-transparent animate-spin" />
                <span>Interrogating primary vectors, retrieving folios & synthesizing response...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Question Input Form with Multilingual & Voice Features */}
          <div className="p-3 bg-newsprint-100 border-t-2 border-ink space-y-2 font-mono">
            {errorMessage && (
              <div className="p-2 bg-[#FAF6EE] border border-oxblood text-oxblood text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Language & Voice Query Toolbar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-ink-700 gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-bold text-ink text-[11px] uppercase">
                  <Globe className="w-3.5 h-3.5 text-oxblood" />
                  Language:
                </span>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="bg-white border border-ink/40 px-2 py-0.5 text-xs text-ink font-mono focus:outline-none focus:border-ink"
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
                  className="px-2 py-0.5 bg-[#FAF6EE] hover:bg-newsprint-300 border border-ink/40 text-ink flex items-center gap-1 text-[10px] uppercase font-bold transition shadow-letterpress-sm"
                  title="Upload voice recording file"
                >
                  <Upload className="w-3 h-3 text-oxblood" />
                  <span>Upload Audio</span>
                </button>

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading || audioQueryLoading}
                  className={`px-2.5 py-0.5 text-[10px] uppercase font-bold flex items-center gap-1.5 transition border ${
                    isRecording
                      ? 'bg-oxblood text-white border-oxblood animate-pulse'
                      : 'bg-[#FAF6EE] hover:bg-newsprint-300 border-ink/40 text-ink shadow-letterpress-sm'
                  }`}
                  title={isRecording ? 'Click to stop recording' : 'Voice Query using microphone'}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-oxblood" />}
                  <span>{isRecording ? 'Stop Recording' : 'Voice Query'}</span>
                </button>
              </div>
            </div>

            {audioQueryLoading && (
              <div className="p-2 bg-[#FAF6EE] border border-ink/30 text-ink text-xs flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-ink border-t-transparent animate-spin" />
                <span>Transcribing audio dispatch and validating query...</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Inquire across writings, speeches, or constitutional records..."
                disabled={loading || audioQueryLoading}
                className="flex-1 px-3 py-2 text-xs bg-white border-2 border-ink text-ink font-mono focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !query.trim() || audioQueryLoading}
                className="px-4 py-2 bg-ink hover:bg-oxblood disabled:opacity-50 text-white font-mono uppercase font-bold text-xs transition flex items-center gap-1.5 shadow-letterpress-sm border border-ink flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>[ Inquire ]</span>
              </button>
            </form>
          </div>
        </main>

        {/* RIGHT COLUMN: Evidence & Provenance Inspector (3 cols) */}
        <aside className="lg:col-span-3 bg-[#FAF6EE] border-2 border-ink shadow-letterpress-sm p-4 space-y-4 flex flex-col min-h-[560px] h-[calc(100vh-16rem)] max-h-[850px] overflow-y-auto font-mono text-xs">
          <div className="pb-3 border-b-2 border-ink flex items-center justify-between">
            <h2 className="font-serif font-black text-ink text-xs uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-oxblood" />
              Evidence Inspector
            </h2>
            {selectedCitation && (
              <span className="stamp-oxblood text-[9px] py-0 px-1">
                Source [{selectedCitation.source_index}]
              </span>
            )}
          </div>

          {selectedCitation ? (
            <div className="space-y-4">
              {/* Document Header */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-ink-500 uppercase">
                  Primary Archival Source
                </span>
                <h3 className="font-serif font-bold text-ink text-sm leading-snug">
                  {selectedCitation.document_title || 'Untitled Archival Record'}
                </h3>
                <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px]">
                  <span className="px-1.5 py-0.5 bg-newsprint-200 text-ink border border-ink/30 font-bold">
                    {selectedCitation.archive_id}
                  </span>
                  {selectedCitation.page_number && (
                    <span className="px-1.5 py-0.5 bg-newsprint-200 text-ink border border-ink/30">
                      Page {selectedCitation.page_number}
                    </span>
                  )}
                  {selectedCitation.year && (
                    <span className="px-1.5 py-0.5 bg-newsprint-200 text-ink border border-ink/30">
                      Year {selectedCitation.year}
                    </span>
                  )}
                </div>
              </div>

              {/* Archival Layer Status */}
              <div className="p-2.5 border bg-white border-ink/30 space-y-1">
                <span className="text-[10px] text-ink-500 uppercase block">
                  Transcription Layer
                </span>
                <div className="font-bold text-ink flex items-center gap-1.5 text-xs">
                  {selectedCitation.is_verified ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-oxblood" />
                  )}
                  <span>{selectedCitation.transcription_layer || 'ARCHIVAL TEXT'}</span>
                </div>
                <p className="text-[10px] text-ink-600 font-editorial italic">
                  {selectedCitation.is_verified 
                    ? 'Curator-approved textual transcription.'
                    : 'Machine OCR transcription. Human review pending.'}
                </p>
              </div>

              {/* Verbatim Excerpt */}
              <div className="space-y-1">
                <span className="text-[10px] text-oxblood font-bold uppercase">
                  Verbatim Passage Excerpt
                </span>
                <div className="p-3 bg-newsprint-50 border border-ink/30 text-ink font-editorial text-xs leading-relaxed italic">
                  "{selectedCitation.snippet}"
                </div>
              </div>

              {/* Action: Open Document */}
              {selectedCitation.document_id && (
                <Link
                  to={`/documents/${selectedCitation.document_id}`}
                  className="w-full py-2 px-3 bg-ink hover:bg-oxblood text-white transition font-mono uppercase font-bold flex items-center justify-center gap-1.5 text-xs shadow-letterpress-sm border border-ink"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>[ View Archival Slip ]</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-ink-500 space-y-2">
              <Info className="w-8 h-8 mx-auto text-ink-400" />
              <p className="text-xs font-editorial italic">
                Select any in-text citation <span className="font-mono font-bold">[n]</span> to inspect its document provenance.
              </p>
            </div>
          )}

          {/* Diagnostics Section */}
          {lastDiagnostics && (
            <div className="mt-auto pt-3 border-t-2 border-ink text-[10px] text-ink-600 space-y-1">
              <span className="font-bold text-oxblood uppercase flex items-center gap-1">
                <Cpu className="w-3 h-3" /> RAG Diagnostics:
              </span>
              <div className="bg-white p-2 border border-ink/30 space-y-0.5 text-[10px]">
                <div>Backend: {lastDiagnostics.vector_backend || 'SQLite Dev'}</div>
                <div>LLM: {lastDiagnostics.llm_provider || 'Hugging Face Inference'}</div>
                <div>Status: {lastDiagnostics.validation_status || 'OK'}</div>
              </div>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
};
