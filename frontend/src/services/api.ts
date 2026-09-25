import { 
  DocumentItem, Collection, TimelineEvent, MediaItem, 
  ResearchResponse, AdminMetrics, AuditLog, UserProfile,
  IntegrityResult, BatchImportReport, DocumentVersion,
  OCRJob, OCRPage, OCRBlock, OCRTextVersion, OCRReview,
  SearchResponse, SearchIndexStatus, SearchIndexJob,
  SearchEvaluationReport, SearchMode, SearchResultItem,
  ResearchAskRequest, ResearchAskResponse, ResearchConversationSummary,
  ResearchConversationDetail, ResearchMessageItem, CitationCard,
  TranslationItem, TranslationSideBySide, AudioDerivativeItem,
  SupportedLanguageItem, MultilingualDiagnostics,
  GraphEntityItem, GraphRelationshipItem, GraphNeighborsData,
  GraphStatsData, GraphStatusData, EntityMergeItem, ProvenanceChainData,
  AdminUserItem
} from '../types';
import { API_BASE_URL, apiUrl, isBackendConfigured } from '../config/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('archive_jwt_token') || localStorage.getItem('token');
  if (token && token.startsWith('ey')) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

export interface ApiErrorInfo {
  code: string;
  message: string;
  subsystem: string;
  retryable: boolean;
  httpStatus?: number;
}

export class ApiError extends Error {
  code: string;
  subsystem: string;
  retryable: boolean;
  httpStatus?: number;

  constructor(info: ApiErrorInfo) {
    super(info.message);
    this.name = 'ApiError';
    this.code = info.code;
    this.subsystem = info.subsystem;
    this.retryable = info.retryable;
    this.httpStatus = info.httpStatus;
  }
}

/**
 * Standardized API request runner with structured errors and timeout safeguards.
 * Zero-Demo mode: strictly throws ApiError when backend is unreachable or returns an error.
 */
export async function apiRequest<T>(
  endpointOrUrl: string,
  options?: RequestInit,
  subsystem = 'general'
): Promise<T> {
  const url = endpointOrUrl.startsWith('http') || endpointOrUrl.startsWith('/')
    ? (endpointOrUrl.startsWith('http') ? endpointOrUrl : apiUrl(endpointOrUrl))
    : apiUrl(`/${endpointOrUrl}`);

  if (!isBackendConfigured() && !endpointOrUrl.startsWith('http')) {
    throw new ApiError({
      code: 'BACKEND_NOT_CONFIGURED',
      message: 'Archival backend API is not configured for this deployment environment (VITE_API_URL missing).',
      subsystem,
      retryable: false
    });
  }

  try {
    const authHeaders = getAuthHeaders();
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options?.headers || {})
      },
      signal: options?.signal || AbortSignal.timeout(12000)
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const detail = errBody.detail || errBody.message || `HTTP ${res.status}: ${res.statusText}`;
      throw new ApiError({
        code: `HTTP_${res.status}`,
        message: typeof detail === 'string' ? detail : JSON.stringify(detail),
        subsystem,
        retryable: res.status >= 500 || res.status === 429,
        httpStatus: res.status
      });
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError({
      code: err.name === 'TimeoutError' ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
      message: err.message || 'Network request failed or connection refused.',
      subsystem,
      retryable: true
    });
  }
}

export const apiService = {
  async getDocuments(params?: {
    q?: string;
    collection_id?: number;
    document_type?: string;
    year?: number;
    verification_status?: string;
    page?: number;
    page_size?: number;
    limit?: number;
  }): Promise<{ total: number; items: DocumentItem[]; is_demo_data: boolean; disclaimer?: string }> {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.collection_id) query.append('collection_id', params.collection_id.toString());
    if (params?.document_type) query.append('document_type', params.document_type);
    if (params?.year) query.append('year', params.year.toString());
    if (params?.verification_status) query.append('verification_status', params.verification_status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.page_size) query.append('page_size', params.page_size.toString());
    else if (params?.limit) query.append('page_size', params.limit.toString());

    return apiRequest<{ total: number; items: DocumentItem[]; is_demo_data: boolean; disclaimer?: string }>(
      `/documents?${query.toString()}`,
      undefined,
      'catalog'
    );
  },

  async getDocumentById(idOrSlug: string | number): Promise<DocumentItem> {
    return apiRequest<DocumentItem>(
      `/documents/${encodeURIComponent(String(idOrSlug))}`,
      undefined,
      'catalog'
    );
  },

  async createDocument(formData: FormData): Promise<DocumentItem> {
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        ...authHeaders
      },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create document.' }));
      throw new Error(err.detail || 'Failed to create document');
    }
    return await res.json();
  },

  async uploadVersion(documentId: number, formData: FormData): Promise<DocumentVersion> {
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}/versions`, {
      method: 'POST',
      headers: {
        ...authHeaders
      },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload version.' }));
      throw new Error(err.detail || 'Failed to upload version');
    }
    return await res.json();
  },

  async verifyDocumentIntegrity(documentId: number): Promise<IntegrityResult> {
    return apiRequest<IntegrityResult>(
      `/documents/${documentId}/verify-integrity`,
      { method: 'POST' },
      'catalog'
    );
  },

  async updateVerificationStatus(
    documentId: number, 
    verification_status: string, 
    notes?: string
  ): Promise<DocumentItem> {
    return apiRequest<DocumentItem>(
      `/documents/${documentId}/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ verification_status, notes })
      },
      'catalog'
    );
  },

  async softDeleteDocument(documentId: number, reason?: string): Promise<{ success: boolean; message: string; is_deleted: boolean }> {
    return apiRequest<{ success: boolean; message: string; is_deleted: boolean }>(
      `/documents/${documentId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`,
      { method: 'DELETE' },
      'catalog'
    );
  },

  async restoreDocument(documentId: number): Promise<DocumentItem> {
    return apiRequest<DocumentItem>(
      `/documents/${documentId}/restore`,
      { method: 'POST' },
      'catalog'
    );
  },

  async searchArchive(params: {
    q: string;
    document_type?: string;
    collection_id?: number;
    year_from?: number;
    year_to?: number;
    language?: string;
    verification_status?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ total: number; items: DocumentItem[]; page: number; page_size: number }> {
    const query = new URLSearchParams();
    query.append('q', params.q);
    if (params.document_type) query.append('document_type', params.document_type);
    if (params.collection_id) query.append('collection_id', params.collection_id.toString());
    if (params.year_from) query.append('year_from', params.year_from.toString());
    if (params.year_to) query.append('year_to', params.year_to.toString());
    if (params.language) query.append('language', params.language);
    if (params.verification_status) query.append('verification_status', params.verification_status);
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());

    return apiRequest<{ total: number; items: DocumentItem[]; page: number; page_size: number }>(
      `/search?${query.toString()}`,
      undefined,
      'search'
    );
  },

  async importBatchJson(documents: any[]): Promise<BatchImportReport> {
    return apiRequest<BatchImportReport>(
      '/import/json',
      {
        method: 'POST',
        body: JSON.stringify({ documents })
      },
      'import'
    );
  },

  async importBatchCsv(formData: FormData): Promise<BatchImportReport> {
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/import/csv`, {
      method: 'POST',
      headers: {
        ...authHeaders
      },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'CSV import failed.' }));
      throw new Error(err.detail || 'CSV import failed');
    }
    return await res.json();
  },

  async getCollections(): Promise<Collection[]> {
    return apiRequest<Collection[]>('/collections', undefined, 'catalog');
  },

  async createCollection(data: {
    title: string;
    slug: string;
    description: string;
    period?: string;
    curator_notes?: string;
    cover_image?: string;
  }): Promise<Collection> {
    return apiRequest<Collection>(
      '/collections',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      'catalog'
    );
  },

  async updateCollection(id: number, data: Partial<Collection>): Promise<Collection> {
    return apiRequest<Collection>(
      `/collections/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      },
      'catalog'
    );
  },

  async deleteCollection(id: number): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(
      `/collections/${id}`,
      { method: 'DELETE' },
      'catalog'
    );
  },

  getFileStreamUrl(filename: string): string {
    return `${API_BASE_URL}/files/stream/${encodeURIComponent(filename)}`;
  },

  getFileDownloadUrl(filename: string): string {
    return `${API_BASE_URL}/files/download/${encodeURIComponent(filename)}`;
  },

  async getTimelineEvents(params?: { entity_id?: number }): Promise<TimelineEvent[]> {
    const query = params?.entity_id ? `?entity_id=${params.entity_id}` : '';
    return apiRequest<TimelineEvent[]>(`/timeline${query}`, undefined, 'timeline');
  },

  async getMediaItems(type?: 'AUDIO' | 'VIDEO' | 'PHOTOGRAPH'): Promise<MediaItem[]> {
    const url = type ? `/media?media_type=${type}` : `/media`;
    return apiRequest<MediaItem[]>(url, undefined, 'media');
  },

  async queryResearchAssistant(queryText: string): Promise<ResearchResponse> {
    return apiRequest<ResearchResponse>(
      '/research/query',
      {
        method: 'POST',
        body: JSON.stringify({ query: queryText })
      },
      'research'
    );
  },

  async askResearchAssistant(request: ResearchAskRequest): Promise<ResearchAskResponse> {
    if (!isBackendConfigured()) {
      return {
        conversation_id: request.conversation_id || `conv_${Date.now()}`,
        message_id: Date.now(),
        answer: "The Archival Research Assistant backend is not configured for this deployment environment (VITE_API_URL is missing or unverified). Under the archive's Zero-Hallucination policy, automated speculative answers are strictly prohibited without live primary source verification.",
        status: 'BACKEND_NOT_CONFIGURED',
        grounded: false,
        citations: [],
        retrieved_evidence: [],
        diagnostics: {
          retrieval_mode: 'backend_not_configured_refusal',
          evidence_count: 0,
          latency_ms: 0,
          provider: 'Institutional Knowledge Base (UNCONFIGURED)'
        }
      };
    }

    try {
      return await apiRequest<ResearchAskResponse>('/research/ask', {
        method: 'POST',
        body: JSON.stringify(request)
      }, 'research');
    } catch (err: any) {
      console.warn('[Research API] Backend request failed:', err);
      return {
        conversation_id: request.conversation_id || `conv_${Date.now()}`,
        message_id: Date.now(),
        answer: `The Archival Research Assistant backend service is currently unreachable (${err.message || 'Connection error'}). Real-time source-grounded RAG requires an active HTTPS FastAPI service connected to the repository vector store and primary documents. Under our radical curatorial honesty policy, the system will not fabricate answers or speculate without verified archival records.`,
        status: 'RESEARCH_BACKEND_UNAVAILABLE',
        grounded: false,
        citations: [],
        retrieved_evidence: [],
        diagnostics: {
          retrieval_mode: 'backend_unavailable_refusal',
          evidence_count: 0,
          latency_ms: 0,
          provider: 'FastAPI Archival Backend (UNAVAILABLE)',
          error: err.message
        }
      };
    }
  },

  async listResearchConversations(): Promise<ResearchConversationSummary[]> {
    return apiRequest<ResearchConversationSummary[]>('/research/conversations', undefined, 'research');
  },

  async getResearchConversation(conversationId: string): Promise<ResearchConversationDetail> {
    return apiRequest<ResearchConversationDetail>(`/research/conversations/${encodeURIComponent(conversationId)}`, undefined, 'research');
  },

  async deleteResearchConversation(conversationId: string): Promise<void> {
    await apiRequest(`/research/conversations/${encodeURIComponent(conversationId)}`, { method: 'DELETE' }, 'research');
  },

  async getAdminMetrics(): Promise<AdminMetrics> {
    return apiRequest<AdminMetrics>('/admin/statistics', undefined, 'admin');
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return apiRequest<AuditLog[]>('/admin/audit-logs', undefined, 'admin');
  },

  async getAdminUsers(): Promise<AdminUserItem[]> {
    return apiRequest<AdminUserItem[]>('/admin/users', undefined, 'admin');
  },

  async createAdminUser(data: { email: string; full_name: string; password: string; role_name: string }): Promise<AdminUserItem> {
    return apiRequest<AdminUserItem>(
      '/admin/users',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      'admin'
    );
  },

  async updateAdminUserStatus(userId: number, isActive: boolean): Promise<AdminUserItem> {
    return apiRequest<AdminUserItem>(
      `/admin/users/${userId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive })
      },
      'admin'
    );
  },

  async updateAdminUserRole(userId: number, roleName: string): Promise<AdminUserItem> {
    return apiRequest<AdminUserItem>(
      `/admin/users/${userId}/role`,
      {
        method: 'PUT',
        body: JSON.stringify({ role_name: roleName })
      },
      'admin'
    );
  },

  async checkHealth(): Promise<{ status: string; phase: string; database: string }> {
    return apiRequest('/health', undefined, 'system');
  },

  async getSystemStatus(): Promise<{
    timestamp: string;
    application: string;
    phase: string;
    environment: string;
    overall_status: string;
    counts?: {
      documents: number;
      collections: number;
      media: number;
      timeline: number;
      entities: number;
      relations: number;
      ocr_jobs: number;
      kiosks: number;
    };
    subsystems?: Record<string, {
      name: string;
      status: string;
      provider: string;
      version: string;
      details: string;
    }>;
  }> {
    return apiRequest('/status', undefined, 'system');
  },

  // --- PHASE 3 OCR DIGITIZATION METHODS ---
  async getOCRJobs(params?: { status?: string; skip?: number; limit?: number }): Promise<OCRJob[]> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') q.append('status', params.status);
    if (params?.skip) q.append('skip', params.skip.toString());
    if (params?.limit) q.append('limit', params.limit.toString());
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest<OCRJob[]>(`/ocr/jobs${qs}`, undefined, 'ocr');
  },

  async getOCRJob(id: number): Promise<OCRJob> {
    return apiRequest<OCRJob>(`/ocr/jobs/${id}`, undefined, 'ocr');
  },

  async createOCRJob(data: {
    document_id: number;
    engine?: string;
    language?: string;
    preprocessing_config?: Record<string, any>;
  }): Promise<OCRJob> {
    return apiRequest<OCRJob>(
      '/ocr/jobs',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      'ocr'
    );
  },

  async retryOCRJob(id: number): Promise<OCRJob> {
    return apiRequest<OCRJob>(
      `/ocr/jobs/${id}/retry`,
      { method: 'POST' },
      'ocr'
    );
  },

  async getOCRJobPages(jobId: number): Promise<OCRPage[]> {
    return apiRequest<OCRPage[]>(`/ocr/jobs/${jobId}/pages`, undefined, 'ocr');
  },

  async getOCRPage(pageId: number): Promise<OCRPage> {
    return apiRequest<OCRPage>(`/ocr/pages/${pageId}`, undefined, 'ocr');
  },

  async correctOCRPage(pageId: number, data: { text: string; change_summary?: string }): Promise<OCRPage> {
    return apiRequest<OCRPage>(
      `/ocr/pages/${pageId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data)
      },
      'ocr'
    );
  },

  async approveOCRPage(pageId: number, data?: { notes?: string }): Promise<OCRPage> {
    return apiRequest<OCRPage>(
      `/ocr/pages/${pageId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify(data || {})
      },
      'ocr'
    );
  },

  async rejectOCRPage(pageId: number, data?: { notes?: string }): Promise<OCRPage> {
    return apiRequest<OCRPage>(
      `/ocr/pages/${pageId}/reject`,
      {
        method: 'POST',
        body: JSON.stringify(data || {})
      },
      'ocr'
    );
  },

  async rerunOCRPage(pageId: number, data?: { engine?: string; language?: string; preprocessing_config?: Record<string, any> }): Promise<OCRPage> {
    return apiRequest<OCRPage>(
      `/ocr/pages/${pageId}/rerun`,
      {
        method: 'POST',
        body: JSON.stringify(data || {})
      },
      'ocr'
    );
  },

  getOCRPageDerivativeUrl(pageId: number): string {
    return `${API_BASE_URL}/ocr/pages/${pageId}/derivative`;
  },

  getOCRPageOriginalImageUrl(pageId: number): string {
    return `${API_BASE_URL}/ocr/pages/${pageId}/original-image`;
  },

  // ---------------------------------------------------------
  // Phase 4: Intelligent Semantic + Hybrid Search API Methods
  // ---------------------------------------------------------

  async searchUniversal(params: {
    q?: string;
    mode?: SearchMode;
    document_type?: string;
    collection_id?: number;
    language?: string;
    year?: number;
    year_from?: number;
    year_to?: number;
    source_name?: string;
    access_level?: string;
    page?: number;
    page_size?: number;
  }): Promise<SearchResponse> {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.mode) query.append('mode', params.mode);
    if (params.document_type) query.append('document_type', params.document_type);
    if (params.collection_id) query.append('collection_id', params.collection_id.toString());
    if (params.language) query.append('language', params.language);
    if (params.year) query.append('year', params.year.toString());
    if (params.year_from) query.append('year_from', params.year_from.toString());
    if (params.year_to) query.append('year_to', params.year_to.toString());
    if (params.source_name) query.append('source_name', params.source_name);
    if (params.access_level) query.append('access_level', params.access_level);
    if (params.page) query.append('page', params.page.toString());
    if (params.page_size) query.append('page_size', params.page_size.toString());

    return apiRequest<SearchResponse>(`/search?${query.toString()}`, undefined, 'search');
  },

  async getSearchIndexStatus(): Promise<SearchIndexStatus> {
    return apiRequest<SearchIndexStatus>('/search/index/status', undefined, 'search');
  },

  async indexDocument(documentId: number): Promise<SearchIndexJob> {
    return apiRequest<SearchIndexJob>(
      `/search/index/document/${documentId}`,
      { method: 'POST' },
      'search'
    );
  },

  async reindexDocument(documentId: number): Promise<SearchIndexJob> {
    return apiRequest<SearchIndexJob>(
      `/search/index/reindex-document/${documentId}`,
      { method: 'POST' },
      'search'
    );
  },

  async rebuildSearchIndex(): Promise<{ status: string; total_documents: number; completed_documents: number; failed_documents: number }> {
    return apiRequest<{ status: string; total_documents: number; completed_documents: number; failed_documents: number }>(
      '/search/index/rebuild',
      { method: 'POST' },
      'search'
    );
  },

  async getSearchEvaluation(): Promise<SearchEvaluationReport> {
    return apiRequest<SearchEvaluationReport>('/search/evaluation', undefined, 'search');
  },

  // Phase 6: Translations
  async listTranslations(params?: { document_id?: number; language?: string; status?: string }): Promise<TranslationItem[]> {
    const query = new URLSearchParams();
    if (params?.document_id) query.append('document_id', params.document_id.toString());
    if (params?.language) query.append('language', params.language);
    if (params?.status) query.append('status', params.status);
    return apiRequest<TranslationItem[]>(`/translations?${query.toString()}`, undefined, 'translation');
  },

  async getDocumentTranslations(documentId: number): Promise<TranslationItem[]> {
    return apiRequest<TranslationItem[]>(`/translations/document/${documentId}`, undefined, 'translation');
  },

  async getTranslation(translationId: number): Promise<TranslationItem> {
    return apiRequest<TranslationItem>(`/translations/${translationId}`, undefined, 'translation');
  },

  async getTranslationSideBySide(translationId: number): Promise<TranslationSideBySide> {
    return apiRequest<TranslationSideBySide>(`/translations/${translationId}/side-by-side`, undefined, 'translation');
  },

  async generateTranslation(payload: {
    document_id: number;
    target_language: string;
    page_id?: number;
    provider?: string;
  }): Promise<TranslationItem> {
    return apiRequest<TranslationItem>(
      '/translations/generate',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      'translation'
    );
  },

  async reviewTranslation(
    translationId: number,
    payload: { action: string; edited_text?: string; reviewer_notes?: string }
  ): Promise<TranslationItem> {
    return apiRequest<TranslationItem>(
      `/translations/${translationId}/review`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      'translation'
    );
  },

  // Phase 6: Audio Narration & Voice
  async synthesizeAudio(payload: {
    document_id: number;
    translation_id?: number;
    page_id?: number;
    language?: string;
    voice?: string;
    provider?: string;
  }): Promise<AudioDerivativeItem> {
    return apiRequest<AudioDerivativeItem>(
      '/audio/synthesize',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      'audio'
    );
  },

  async getDocumentAudios(documentId: number): Promise<AudioDerivativeItem[]> {
    return apiRequest<AudioDerivativeItem[]>(`/audio/document/${documentId}`, undefined, 'audio');
  },

  async getAudioMetadata(audioId: string): Promise<AudioDerivativeItem> {
    return apiRequest<AudioDerivativeItem>(`/audio/${audioId}`, undefined, 'audio');
  },

  async deleteAudio(audioId: string): Promise<void> {
    await apiRequest(`/audio/${audioId}`, { method: 'DELETE' }, 'audio');
  },

  async sendVoiceQuery(file: File, language?: string): Promise<{ query: string; detected_language: string; provider: string; validation_passed: boolean }> {
    const formData = new FormData();
    formData.append('file', file);
    const query = language ? `?language=${encodeURIComponent(language)}` : '';
    const res = await fetch(`${API_BASE_URL}/audio/voice-query${query}`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Voice query transcription failed' }));
      throw new Error(err.detail || 'Voice query transcription failed');
    }
    return await res.json();
  },

  // Phase 6: Languages & Diagnostics
  async getSupportedLanguages(): Promise<SupportedLanguageItem[]> {
    return apiRequest<SupportedLanguageItem[]>('/languages/supported', undefined, 'languages');
  },

  async getMultilingualDiagnostics(): Promise<MultilingualDiagnostics> {
    return apiRequest<MultilingualDiagnostics>('/languages/diagnostics', undefined, 'languages');
  },

  // ---------------------------------------------------------------------------
  // Phase 7: Knowledge Graph, Intelligent Timeline & Entity Relationships
  // ---------------------------------------------------------------------------

  async getGraphStatus(): Promise<GraphStatusData> {
    return apiRequest<GraphStatusData>('/graph/status', undefined, 'graph');
  },

  async getGraphStats(): Promise<GraphStatsData> {
    return apiRequest<GraphStatsData>('/graph/stats', undefined, 'graph');
  },

  async searchEntities(params?: { q?: string; entity_type?: string; status?: string; limit?: number; offset?: number }): Promise<GraphEntityItem[]> {
    const qParams = new URLSearchParams();
    if (params?.q) qParams.append('q', params.q);
    if (params?.entity_type) qParams.append('entity_type', params.entity_type);
    if (params?.status) qParams.append('status', params.status);
    if (params?.limit) qParams.append('limit', params.limit.toString());
    if (params?.offset) qParams.append('offset', params.offset.toString());

    return apiRequest<GraphEntityItem[]>(`/entities?${qParams.toString()}`, undefined, 'graph');
  },

  async getEntity(entityId: number): Promise<GraphEntityItem> {
    return apiRequest<GraphEntityItem>(`/entities/${entityId}`, undefined, 'graph');
  },

  async createEntity(data: Partial<GraphEntityItem>): Promise<GraphEntityItem> {
    return apiRequest<GraphEntityItem>(
      '/entities',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      'graph'
    );
  },

  async updateEntity(entityId: number, data: Partial<GraphEntityItem>): Promise<GraphEntityItem> {
    return apiRequest<GraphEntityItem>(
      `/entities/${entityId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data)
      },
      'graph'
    );
  },

  async getEntityRelationships(entityId: number, direction: 'IN' | 'OUT' | 'BOTH' = 'BOTH'): Promise<GraphRelationshipItem[]> {
    return apiRequest<GraphRelationshipItem[]>(`/entities/${entityId}/relationships?direction=${direction}`, undefined, 'graph');
  },

  async getEntityTimeline(entityId: number): Promise<TimelineEvent[]> {
    return apiRequest<TimelineEvent[]>(`/entities/${entityId}/timeline`, undefined, 'graph');
  },

  async getGraphNeighbors(entityId: number, depth: number = 1, limit: number = 50): Promise<GraphNeighborsData> {
    return apiRequest<GraphNeighborsData>(`/graph/neighbors/${entityId}?depth=${depth}&limit=${limit}`, undefined, 'graph');
  },

  async getEntityNeighbors(entityId: number, depth: number = 1, limit: number = 50): Promise<GraphNeighborsData> {
    return this.getGraphNeighbors(entityId, depth, limit);
  },

  async getGraphPath(sourceId: number, targetId: number, maxDepth: number = 3): Promise<{ source_id: number; target_id: number; path: GraphEntityItem[]; path_length: number }> {
    return apiRequest<{ source_id: number; target_id: number; path: GraphEntityItem[]; path_length: number }>(
      `/graph/path?source_id=${sourceId}&target_id=${targetId}&max_depth=${maxDepth}`,
      undefined,
      'graph'
    );
  },

  async searchGraph(q: string, limit: number = 25): Promise<{ query: string; matched_entities: GraphEntityItem[]; sample_relationships: GraphRelationshipItem[] }> {
    return apiRequest<{ query: string; matched_entities: GraphEntityItem[]; sample_relationships: GraphRelationshipItem[] }>(
      `/graph/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      undefined,
      'graph'
    );
  },

  async listRelationships(params?: { status?: string; relationship_type?: string; limit?: number; offset?: number }): Promise<GraphRelationshipItem[]> {
    const qParams = new URLSearchParams();
    if (params?.status) qParams.append('status', params.status);
    if (params?.relationship_type) qParams.append('relationship_type', params.relationship_type);
    if (params?.limit) qParams.append('limit', params.limit.toString());
    if (params?.offset) qParams.append('offset', params.offset.toString());

    return apiRequest<GraphRelationshipItem[]>(`/graph/relationships?${qParams.toString()}`, undefined, 'graph');
  },

  async createRelationship(data: Partial<GraphRelationshipItem>): Promise<GraphRelationshipItem> {
    return apiRequest<GraphRelationshipItem>(
      '/graph/relationships',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      'graph'
    );
  },

  async approveRelationship(relId: number): Promise<GraphRelationshipItem> {
    return apiRequest<GraphRelationshipItem>(
      `/graph/relationships/${relId}/approve`,
      { method: 'POST' },
      'graph'
    );
  },

  async rejectRelationship(relId: number): Promise<GraphRelationshipItem> {
    return apiRequest<GraphRelationshipItem>(
      `/graph/relationships/${relId}/reject`,
      { method: 'POST' },
      'graph'
    );
  },

  async deleteRelationship(relId: number): Promise<void> {
    await apiRequest(`/graph/relationships/${relId}`, { method: 'DELETE' }, 'graph');
  },

  async triggerGraphExtraction(documentId: number, extractorType: 'deterministic' | 'rule_based' | 'llm' = 'deterministic'): Promise<{ document_id: number; extractor_type: string; entities_extracted: number; relationships_extracted: number; status: string }> {
    return apiRequest<{ document_id: number; extractor_type: string; entities_extracted: number; relationships_extracted: number; status: string }>(
      '/graph/extract',
      {
        method: 'POST',
        body: JSON.stringify({ document_id: documentId, extractor_type: extractorType })
      },
      'graph'
    );
  },

  async listDuplicateCandidates(): Promise<any[]> {
    return apiRequest<any[]>('/entities/duplicates/candidates', undefined, 'graph');
  },

  async proposeEntityMerge(primaryId: number, duplicateId: number, reason: string): Promise<EntityMergeItem> {
    return apiRequest<EntityMergeItem>(
      '/entities/merges',
      {
        method: 'POST',
        body: JSON.stringify({ primary_entity_id: primaryId, merged_entity_id: duplicateId, merge_reason: reason })
      },
      'graph'
    );
  },

  async reviewEntityMerge(mergeId: number, action: 'APPROVE' | 'REJECT'): Promise<EntityMergeItem> {
    return apiRequest<EntityMergeItem>(
      `/entities/merges/${mergeId}/review`,
      {
        method: 'POST',
        body: JSON.stringify({ action })
      },
      'graph'
    );
  },

  async createTimelineEvent(data: { title: string; description: string; date_str: string; category?: string; location?: string; document_id?: number }): Promise<TimelineEvent> {
    return apiRequest<TimelineEvent>(
      '/timeline',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      'timeline'
    );
  },

  async generateTimelineCandidates(documentId: number): Promise<TimelineEvent[]> {
    return apiRequest<TimelineEvent[]>(
      '/timeline/candidates',
      {
        method: 'POST',
        body: JSON.stringify({ document_id: documentId })
      },
      'timeline'
    );
  },

  async approveTimelineEvent(eventId: number): Promise<TimelineEvent> {
    return apiRequest<TimelineEvent>(
      `/timeline/${eventId}/approve`,
      { method: 'POST' },
      'timeline'
    );
  },

  async rejectTimelineEvent(eventId: number): Promise<TimelineEvent> {
    return apiRequest<TimelineEvent>(
      `/timeline/${eventId}/reject`,
      { method: 'POST' },
      'timeline'
    );
  },

  async getRelationshipProvenance(relId: number): Promise<ProvenanceChainData> {
    return apiRequest<ProvenanceChainData>(`/provenance/relationship/${relId}`, undefined, 'graph');
  },

  async unifiedSearch(q: string, limit: number = 10): Promise<{ query: string; documents: any[]; entities: GraphEntityItem[]; timeline_events: any[]; total_documents: number; total_entities: number; total_timeline_events: number }> {
    return apiRequest<{ query: string; documents: any[]; entities: GraphEntityItem[]; timeline_events: any[]; total_documents: number; total_entities: number; total_timeline_events: number }>(
      `/search/unified?q=${encodeURIComponent(q)}&limit=${limit}`,
      undefined,
      'search'
    );
  }
};

export const archiveApi = apiService;
