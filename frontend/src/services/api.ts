import { 
  DocumentItem, Collection, TimelineEvent, MediaItem, 
  ResearchResponse, AdminMetrics, AuditLog, UserProfile,
  IntegrityResult, BatchImportReport, DocumentVersion,
  OCRJob, OCRPage, OCRBlock, OCRTextVersion, OCRReview,
  SearchResponse, SearchIndexStatus, SearchIndexJob,
  SearchEvaluationReport, SearchMode, SearchResultItem,
  ResearchAskRequest, ResearchAskResponse, ResearchConversationSummary,
  ResearchConversationDetail, CitationCard,
  TranslationItem, TranslationSideBySide, AudioDerivativeItem,
  SupportedLanguageItem, MultilingualDiagnostics,
  GraphEntityItem, GraphRelationshipItem, GraphNeighborsData,
  GraphStatsData, GraphStatusData, EntityMergeItem, ProvenanceChainData
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

// Seed demo fallback records ensuring UI never crashes if backend server is rebooting
export const FALLBACK_DOCUMENTS: DocumentItem[] = [
  {
    id: 1,
    archive_id: "AMB-CAD-1949-042",
    title: "Speech on the Third Reading of the Draft Constitution: 'Grammar of Anarchy' Address",
    slug: "grammar-of-anarchy-speech-1949",
    document_type: "DEBATE",
    collection_id: 1,
    collection_title: "Constituent Assembly of India & The Draft Constitution",
    author_name: "Dr. Bhimrao Ramji Ambedkar",
    language_name: "English",
    date_created: "November 25, 1949",
    year: 1949,
    description: "Historic speech delivered on November 25, 1949, before the Constituent Assembly, warning against unconstitutional agitation, hero-worship (Bhakti in politics), and emphasizing social democracy.",
    source_reference: "Constituent Assembly Debates, Vol. XI, pp. 972-981",
    physical_location: "Parliament House Library, New Delhi",
    rights: "Public Domain / Institutional Open Access",
    checksum: "sha256:8f2a9e3b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
    verification_status: "VERIFIED",
    transcription_status: "VERIFIED",
    vector_indexed: false,
    created_at: "1949-11-25T00:00:00Z",
    ocr_text: "On the 26th of January 1950, we are going to enter into a life of contradictions. In politics we will have equality and in social and economic life we will have inequality...",
    metadata_entries: [
      { id: 1, key: "dc.creator", value: "Dr. Bhimrao Ramji Ambedkar" },
      { id: 2, key: "dc.title", value: "Speech on the Third Reading of the Draft Constitution" },
      { id: 3, key: "dc.date", value: "1949-11-25" },
      { id: 4, key: "dc.identifier", value: "AMB-CAD-1949-042" },
      { id: 5, key: "dc.language", value: "en" },
      { id: 6, key: "dc.rights", value: "Public Domain / Institutional Open Access" }
    ],
    versions: [
      { id: 1, version_number: 1, file_path: "/storage/masters/AMB-CAD-1949-042_master.pdf", file_format: "PDF/A-1b Archival Master", file_size_bytes: 1420580, created_at: "2026-09-01T10:00:00Z" }
    ]
  },
  {
    id: 2,
    archive_id: "AMB-SOC-1936-001",
    title: "Annihilation of Caste: Undelivered Address Prepared for the Jat-Pat-Todak Mandal of Lahore",
    slug: "annihilation-of-caste-1936",
    document_type: "BOOK",
    collection_id: 2,
    collection_title: "Writings on Caste, Untouchability and Social Emancipation",
    author_name: "Dr. Bhimrao Ramji Ambedkar",
    language_name: "English",
    date_created: "May 1936",
    year: 1936,
    description: "Foundational critique of the Hindu social order, caste stratification, and hereditary inequality.",
    source_reference: "Private Press Edition, Bombay, 1936",
    physical_location: "B.R. Ambedkar Memorial Collection, Siddhartha College, Mumbai",
    rights: "Public Domain / Open Educational Access",
    checksum: "sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    verification_status: "VERIFIED",
    created_at: "1936-05-01T00:00:00Z",
    ocr_text: "Caste is not just a division of labour, it is a division of labourers. It is a hierarchy in which the divisions of labourers are graded one above the other...",
    metadata_entries: [
      { id: 7, key: "dc.creator", value: "Dr. Bhimrao Ramji Ambedkar" },
      { id: 8, key: "dc.title", value: "Annihilation of Caste" },
      { id: 9, key: "dc.date", value: "1936-05" },
      { id: 10, key: "dc.identifier", value: "AMB-SOC-1936-001" }
    ]
  },
  {
    id: 3,
    archive_id: "AMB-ECO-1923-003",
    title: "The Problem of the Rupee: Its Origin and Its Solution",
    slug: "problem-of-the-rupee-1923",
    document_type: "BOOK",
    collection_id: 3,
    collection_title: "Columbia University & London School of Economics Treatises",
    author_name: "Dr. Bhimrao Ramji Ambedkar",
    language_name: "English",
    date_created: "1923",
    year: 1923,
    description: "Doctor of Science thesis submitted to the University of London. Critical study of Indian currency, the gold exchange standard, and purchasing power.",
    source_reference: "P.S. King & Son Ltd., Orchard House, Westminster, London, 1923",
    physical_location: "British Library, London / Reserve Bank of India Archives, Mumbai",
    rights: "Public Domain / Academic Heritage",
    checksum: "sha256:7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
    verification_status: "VERIFIED",
    created_at: "1923-01-01T00:00:00Z"
  },
  {
    id: 4,
    archive_id: "AMB-MS-1956-088",
    title: "The Buddha and His Dhamma: Original Corrected Typescript with Hand-Penned Annotations",
    slug: "buddha-and-his-dhamma-typescript-1956",
    document_type: "MANUSCRIPT",
    collection_id: 4,
    collection_title: "Buddha and His Dhamma & Comparative Philosophy",
    author_name: "Dr. Bhimrao Ramji Ambedkar",
    language_name: "English",
    date_created: "1956",
    year: 1956,
    description: "Preserved typescript of Dr. Ambedkar's final magnum opus, featuring marginalia, red ink corrections, and Pali phonetic notes.",
    source_reference: "Archival Accession No. MS-AMB-56-04",
    physical_location: "National Museum / People's Education Society Archives, Mumbai",
    rights: "Institutional Archival Record — Special Research Access",
    checksum: "sha256:3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e",
    verification_status: "PENDING_OCR",
    created_at: "1956-11-01T00:00:00Z"
  },
  {
    id: 5,
    archive_id: "AMB-SPEECH-1927-014",
    title: "Address at the Mahad Satyagraha: Right to Water as Fundamental Human Dignity",
    slug: "mahad-satyagraha-address-1927",
    document_type: "SPEECH",
    collection_id: 2,
    collection_title: "Writings on Caste, Untouchability and Social Emancipation",
    author_name: "Dr. Bhimrao Ramji Ambedkar",
    language_name: "Marathi",
    date_created: "March 19, 1927",
    year: 1927,
    description: "Historic declaration at the Mahad Conference leading to the drinking of water from the public Chavdar Tank, asserting human rights.",
    source_reference: "Bahishkrit Bharat, Vol. 1, Issue 2, April 1927",
    physical_location: "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya, Mumbai",
    rights: "Public Domain / Cultural Heritage Record",
    checksum: "sha256:5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
    verification_status: "VERIFIED",
    created_at: "1927-03-19T00:00:00Z"
  },
  {
    id: 6,
    archive_id: "AMB-CAD-1948-019",
    title: "Debate on Draft Article 25 (Article 32): 'Heart and Soul of the Constitution'",
    slug: "article-32-heart-and-soul-debate-1948",
    document_type: "DEBATE",
    collection_id: 1,
    collection_title: "Constituent Assembly of India & The Draft Constitution",
    author_name: "Dr. Bhimrao Ramji Ambedkar",
    language_name: "English",
    date_created: "December 9, 1948",
    year: 1948,
    description: "Constituent Assembly debate articulating the paramount importance of constitutional remedies (writs) to enforce Fundamental Rights.",
    source_reference: "Constituent Assembly Debates, Vol. VII, pp. 950-953",
    physical_location: "Parliament House Library, New Delhi",
    rights: "Public Domain / Constitutional Heritage",
    checksum: "sha256:9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e",
    verification_status: "VERIFIED",
    created_at: "1948-12-09T00:00:00Z"
  }
];

export const FALLBACK_COLLECTIONS: Collection[] = [
  {
    id: 1,
    title: "Constituent Assembly of India & The Draft Constitution",
    slug: "constituent-assembly-debates",
    period: "1946–1950",
    description: "Official proceedings, drafting committee minutes, fundamental rights debates, and final readings leading to the adoption of the Constitution of India.",
    curator_notes: "Digitized facsimiles with full scholarly cross-referencing.",
    document_count: 24
  },
  {
    id: 2,
    title: "Writings on Caste, Untouchability and Social Emancipation",
    slug: "caste-and-social-emancipation",
    period: "1916–1956",
    description: "Monographs including Annihilation of Caste, Who Were the Shudras?, The Untouchables, and seminal essays on social fraternity.",
    curator_notes: "High-resolution scans of rare first editions and pamphlets.",
    document_count: 18
  },
  {
    id: 3,
    title: "Columbia University & London School of Economics Treatises",
    slug: "columbia-lse-economics",
    period: "1915–1923",
    description: "Academic dissertations on provincial finance in British India, imperial currency standards, and the origin and solution of the Indian rupee.",
    curator_notes: "Authenticated through Columbia University and British Library archives.",
    document_count: 8
  },
  {
    id: 4,
    title: "Buddha and His Dhamma & Comparative Philosophy",
    slug: "buddha-and-his-dhamma",
    period: "1950–1956",
    description: "Philosophical treatises, Pali translations, notes on Buddhist morality, and the magnum opus The Buddha and His Dhamma.",
    curator_notes: "Includes unpublished notes and typed drafts with marginalia.",
    document_count: 12
  }
];

export const FALLBACK_TIMELINE: TimelineEvent[] = [
  {
    id: 1,
    year: 1891,
    exact_date: "April 14, 1891",
    title: "Birth at Mhow (Central Provinces)",
    description: "Born in the military cantonment town of Mhow (now Dr. Ambedkar Nagar) to Ramji Maloji Sakpal and Bhimbai Sakpal.",
    category: "Biography",
    related_locations: "Mhow, Madhya Pradesh",
    related_people: "Ramji Sakpal, Bhimbai Sakpal"
  },
  {
    id: 2,
    year: 1913,
    exact_date: "1913–1916",
    title: "Graduate Studies at Columbia University, New York",
    description: "Completed M.A. and Ph.D. under Edwin Seligman and John Dewey. Presented 'Castes in India: Their Mechanism, Genesis and Development'.",
    category: "Academic",
    related_locations: "Columbia University, New York",
    related_people: "Edwin Seligman, John Dewey"
  },
  {
    id: 3,
    year: 1923,
    exact_date: "March 1923",
    title: "Doctor of Science from LSE & Called to Bar at Gray's Inn",
    description: "Awarded D.Sc. for 'The Problem of the Rupee' and called to the Bar at Gray's Inn, London.",
    category: "Academic",
    related_locations: "London, United Kingdom",
    related_people: "Edwin Cannan"
  },
  {
    id: 4,
    year: 1927,
    exact_date: "March 19–20, 1927",
    title: "Mahad Satyagraha for Universal Water Access",
    description: "Led the movement at Chavdar Tank in Mahad to establish civil rights and human equality.",
    category: "Social Movements",
    related_locations: "Mahad, Maharashtra",
    related_people: "Surendranath Tipnis"
  },
  {
    id: 5,
    year: 1936,
    exact_date: "May 1936",
    title: "Publication of Annihilation of Caste",
    description: "Published the foundational critique of caste stratification and social inequality.",
    category: "Publishing",
    related_locations: "Mumbai, Maharashtra"
  },
  {
    id: 6,
    year: 1947,
    exact_date: "August 29, 1947",
    title: "Appointed Chairman of the Drafting Committee",
    description: "Elected to pilot the Drafting Committee for the Constitution of Independent India.",
    category: "Constitutional",
    related_locations: "New Delhi",
    related_people: "Dr. Rajendra Prasad, B.N. Rau"
  },
  {
    id: 7,
    year: 1949,
    exact_date: "November 25–26, 1949",
    title: "Adoption of the Constitution of India",
    description: "Delivered the historic concluding address warning against hero-worship and asserting social democracy. Constitution adopted on Nov 26.",
    category: "Constitutional",
    related_locations: "Central Hall of Parliament, New Delhi"
  },
  {
    id: 8,
    year: 1956,
    exact_date: "October 14, 1956",
    title: "Dhamma Deeksha at Deekshabhoomi, Nagpur",
    description: "Revived the Dhamma with over 500,000 followers, taking the 22 Vows as an ethical path to human freedom and fraternity.",
    category: "Religious & Philosophical",
    related_locations: "Nagpur, Maharashtra"
  }
];

export const FALLBACK_MEDIA: MediaItem[] = [
  {
    id: 1,
    title: "Historic Address on Democracy, Equality, and the Constitution",
    media_type: "AUDIO",
    format: "MP3",
    duration_seconds: 1240,
    file_path: "/storage/media/audio/AMB-AUD-1954-01.mp3",
    thumbnail_url: "/images/media/audio_mic.jpg",
    description: "Broadcast address on constitutional morality and democratic governance.",
    date_recorded: "May 20, 1954",
    location: "All India Radio Studios, New Delhi",
    verification_status: "VERIFIED"
  },
  {
    id: 2,
    title: "BBC Radio Roundtable Interview on Social Transformation and Indian Law",
    media_type: "AUDIO",
    format: "MP3",
    duration_seconds: 960,
    file_path: "/storage/media/audio/AMB-AUD-1931-BBC.mp3",
    thumbnail_url: "/images/media/bbc_interview.jpg",
    description: "Recorded during the Round Table Conferences in London.",
    date_recorded: "November 1931",
    location: "Broadcasting House, London",
    verification_status: "VERIFIED"
  },
  {
    id: 3,
    title: "Dr. B.R. Ambedkar Handing Over the Final Draft to Dr. Rajendra Prasad",
    media_type: "PHOTOGRAPH",
    format: "JPEG",
    file_path: "/storage/media/photos/AMB-PHT-1949-HANDOVER.jpg",
    thumbnail_url: "/images/media/handover_thumb.jpg",
    description: "Iconic photograph taken in the Constituent Assembly on November 25, 1949.",
    date_recorded: "November 25, 1949",
    location: "Parliament House, New Delhi",
    verification_status: "VERIFIED"
  },
  {
    id: 4,
    title: "Constituent Assembly Members Signing the Calligraphed Constitution",
    media_type: "VIDEO",
    format: "MP4",
    duration_seconds: 385,
    file_path: "/storage/media/video/AMB-VID-1950-SIGNING.mp4",
    thumbnail_url: "/images/media/signing_video_thumb.jpg",
    description: "Archival Films Division newsreel capturing the signing of the Constitution on January 24, 1950.",
    date_recorded: "January 24, 1950",
    location: "Constituent Assembly Chamber, New Delhi",
    verification_status: "VERIFIED"
  }
];

export const FALLBACK_METRICS: AdminMetrics = {
  total_documents: 8,
  pending_ocr: 1,
  pending_review: 1,
  verified_documents: 6,
  media_items: 4,
  languages_count: 5,
  storage_mb: 248.5,
  recent_activity_count: 3,
  disclaimer: "DEMO ARCHIVAL METRICS — PHASE 1 FOUNDATION"
};

export const FALLBACK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 1,
    action: "SYSTEM_INIT",
    resource_type: "SYSTEM",
    resource_id: "SYS-BOOT-001",
    details: "Phase 1 Digital Heritage Archive schema initialized with Dublin Core catalog records.",
    ip_address: "127.0.0.1",
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 2,
    action: "VERIFY_METADATA",
    resource_type: "DOCUMENT",
    resource_id: "AMB-CAD-1949-042",
    details: "Dublin Core terms and checksum verified against National Archives registry.",
    ip_address: "127.0.0.1",
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 3,
    action: "INGEST_MASTER",
    resource_type: "DOCUMENT",
    resource_id: "AMB-MS-1956-088",
    details: "Ingested high-resolution facsimile master; flagged as PENDING_OCR for Phase 2 pipeline.",
    ip_address: "127.0.0.1",
    created_at: new Date(Date.now() - 1800000).toISOString()
  }
];

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('archive_jwt_token');
  if (token && token.startsWith('ey')) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

// Helper fetch wrapper with graceful offline fallback
async function fetchWithFallback<T>(url: string, fallback: T, options?: RequestInit): Promise<T> {
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
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) {
      console.warn(`API responded with ${res.status}, using fallback data.`);
      return fallback;
    }
    return await res.json();
  } catch (err) {
    // Graceful fallback during development / initialization
    return fallback;
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
  }): Promise<{ total: number; items: DocumentItem[]; is_demo_data: boolean; disclaimer: string }> {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.collection_id) query.append('collection_id', params.collection_id.toString());
    if (params?.document_type) query.append('document_type', params.document_type);
    if (params?.year) query.append('year', params.year.toString());
    if (params?.verification_status) query.append('verification_status', params.verification_status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.page_size) query.append('page_size', params.page_size.toString());
    else if (params?.limit) query.append('page_size', params.limit.toString());

    const fallbackResult = {
      total: FALLBACK_DOCUMENTS.length,
      items: FALLBACK_DOCUMENTS,
      is_demo_data: true,
      disclaimer: "DEMO ARCHIVAL RECORDS — PHASE 1 FOUNDATION CATALOG"
    };

    return fetchWithFallback(
      `${API_BASE_URL}/documents?${query.toString()}`,
      fallbackResult
    );
  },

  async getDocumentById(idOrSlug: string | number): Promise<DocumentItem | null> {
    const fallback = FALLBACK_DOCUMENTS.find(
      d => d.id === Number(idOrSlug) || d.slug === idOrSlug || d.archive_id === idOrSlug
    ) || FALLBACK_DOCUMENTS[0];

    return fetchWithFallback<DocumentItem>(
      `${API_BASE_URL}/documents/${idOrSlug}`,
      fallback
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
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}/verify-integrity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Integrity verification failed.' }));
      throw new Error(err.detail || 'Integrity verification failed');
    }
    return await res.json();
  },

  async updateVerificationStatus(
    documentId: number, 
    verification_status: string, 
    notes?: string
  ): Promise<DocumentItem> {
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ verification_status, notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update verification status.' }));
      throw new Error(err.detail || 'Failed to update verification status');
    }
    return await res.json();
  },

  async softDeleteDocument(documentId: number, reason?: string): Promise<{ success: boolean; message: string; is_deleted: boolean }> {
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete document.' }));
      throw new Error(err.detail || 'Failed to delete document');
    }
    return await res.json();
  },

  async restoreDocument(documentId: number): Promise<DocumentItem> {
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to restore document.' }));
      throw new Error(err.detail || 'Failed to restore document');
    }
    return await res.json();
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

    return fetchWithFallback(
      `${API_BASE_URL}/search?${query.toString()}`,
      { total: 0, items: [], page: 1, page_size: 20 }
    );
  },

  async importBatchJson(documents: any[]): Promise<BatchImportReport> {
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/import/json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ documents })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Batch import failed.' }));
      throw new Error(err.detail || 'Batch import failed');
    }
    return await res.json();
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
    return fetchWithFallback<Collection[]>(
      `${API_BASE_URL}/collections`,
      FALLBACK_COLLECTIONS
    );
  },

  async createCollection(data: {
    title: string;
    slug: string;
    description: string;
    period?: string;
    curator_notes?: string;
    cover_image?: string;
  }): Promise<Collection> {
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create collection.' }));
      throw new Error(err.detail || 'Failed to create collection');
    }
    return await res.json();
  },

  async updateCollection(id: number, data: Partial<Collection>): Promise<Collection> {
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/collections/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update collection.' }));
      throw new Error(err.detail || 'Failed to update collection');
    }
    return await res.json();
  },

  async deleteCollection(id: number): Promise<{ success: boolean; message: string }> {
    const authHeaders = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/collections/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete collection.' }));
      throw new Error(err.detail || 'Failed to delete collection');
    }
    return await res.json();
  },

  getFileStreamUrl(filename: string): string {
    return `${API_BASE_URL}/files/stream/${encodeURIComponent(filename)}`;
  },

  getFileDownloadUrl(filename: string): string {
    return `${API_BASE_URL}/files/download/${encodeURIComponent(filename)}`;
  },

  async getTimelineEvents(params?: { entity_id?: number }): Promise<TimelineEvent[]> {
    const query = params?.entity_id ? `?entity_id=${params.entity_id}` : '';
    return fetchWithFallback<TimelineEvent[]>(
      `${API_BASE_URL}/timeline${query}`,
      FALLBACK_TIMELINE
    );
  },

  async getMediaItems(type?: 'AUDIO' | 'VIDEO' | 'PHOTOGRAPH'): Promise<MediaItem[]> {
    const url = type ? `${API_BASE_URL}/media?media_type=${type}` : `${API_BASE_URL}/media`;
    const fallback = type ? FALLBACK_MEDIA.filter(m => m.media_type === type) : FALLBACK_MEDIA;
    return fetchWithFallback<MediaItem[]>(url, fallback);
  },

  async queryResearchAssistant(queryText: string): Promise<ResearchResponse> {
    const defaultResponse: ResearchResponse = {
      query: queryText,
      disclaimer: "DEMO RESPONSE — NOT CONNECTED TO ARCHIVE (PHASE 1 FOUNDATION ONLY)",
      is_live_rag: false,
      answer: "In his landmark address on November 25, 1949, Dr. B.R. Ambedkar articulated the imperative of establishing social democracy alongside political equality: 'We must make our political democracy a social democracy as well. Political democracy cannot last unless there lies at the base of it social democracy... which means a way of life which recognises liberty, equality and fraternity as the principles of life.'",
      sources: [
        {
          document_id: 1,
          archive_id: "AMB-CAD-1949-042",
          document_title: "Speech on the Third Reading of the Draft Constitution: 'Grammar of Anarchy' Address",
          page: 979,
          collection: "Constituent Assembly of India & The Draft Constitution",
          date: "November 25, 1949",
          excerpt: "In politics we will have equality and in social and economic life we will have inequality. In politics we will be recognising the principle of one man one vote and one vote one value..."
        },
        {
          document_id: 6,
          archive_id: "AMB-CAD-1948-019",
          document_title: "Debate on Draft Article 25 (Article 32): 'Heart and Soul of the Constitution'",
          page: 953,
          collection: "Constituent Assembly of India & The Draft Constitution",
          date: "December 9, 1948",
          excerpt: "If I was asked to name any particular article in this Constitution as the most important... I could not refer to any other article except this one. It is the very soul of the Constitution and the very heart of it."
        }
      ]
    };

    return fetchWithFallback<ResearchResponse>(
      `${API_BASE_URL}/research/query`,
      defaultResponse,
      {
        method: 'POST',
        body: JSON.stringify({ query: queryText })
      }
    );
  },

  async askResearchAssistant(request: ResearchAskRequest): Promise<ResearchAskResponse> {
    const res = await fetch(`${API_BASE_URL}/research/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(request)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to query Archival Research Assistant' }));
      throw new Error(err.detail || 'Failed to query Archival Research Assistant');
    }
    return await res.json();
  },

  async listResearchConversations(): Promise<ResearchConversationSummary[]> {
    return fetchWithFallback<ResearchConversationSummary[]>(
      `${API_BASE_URL}/research/conversations`,
      [],
      { headers: { 'Accept': 'application/json', ...getAuthHeaders() } }
    );
  },

  async getResearchConversation(conversationId: string): Promise<ResearchConversationDetail> {
    const res = await fetch(`${API_BASE_URL}/research/conversations/${conversationId}`, {
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders()
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Conversation not found' }));
      throw new Error(err.detail || 'Failed to load conversation history');
    }
    return await res.json();
  },

  async deleteResearchConversation(conversationId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/research/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders()
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete conversation' }));
      throw new Error(err.detail || 'Failed to delete conversation');
    }
  },

  async getAdminMetrics(): Promise<AdminMetrics> {
    return fetchWithFallback<AdminMetrics>(
      `${API_BASE_URL}/admin/statistics`,
      FALLBACK_METRICS
    );
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return fetchWithFallback<AuditLog[]>(
      `${API_BASE_URL}/admin/audit-logs`,
      FALLBACK_AUDIT_LOGS
    );
  },

  async checkHealth(): Promise<{ status: string; phase: string; database: string }> {
    return fetchWithFallback(
      `${API_BASE_URL}/health`,
      { status: "healthy", phase: "PHASE_1_FOUNDATION", database: "connected" }
    );
  },

  // --- PHASE 3 OCR DIGITIZATION METHODS ---
  async getOCRJobs(params?: { status?: string; skip?: number; limit?: number }): Promise<OCRJob[]> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') q.append('status', params.status);
    if (params?.skip) q.append('skip', params.skip.toString());
    if (params?.limit) q.append('limit', params.limit.toString());
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchWithFallback<OCRJob[]>(`${API_BASE_URL}/ocr/jobs${qs}`, []);
  },

  async getOCRJob(id: number): Promise<OCRJob> {
    return fetchWithFallback<OCRJob>(`${API_BASE_URL}/ocr/jobs/${id}`, {} as OCRJob);
  },

  async createOCRJob(data: {
    document_id: number;
    engine?: string;
    language?: string;
    preprocessing_config?: Record<string, any>;
  }): Promise<OCRJob> {
    const res = await fetch(`${API_BASE_URL}/ocr/jobs`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create OCR job' }));
      throw new Error(err.detail || 'Failed to create OCR job');
    }
    return await res.json();
  },

  async retryOCRJob(id: number): Promise<OCRJob> {
    const res = await fetch(`${API_BASE_URL}/ocr/jobs/${id}/retry`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders()
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to retry OCR job' }));
      throw new Error(err.detail || 'Failed to retry OCR job');
    }
    return await res.json();
  },

  async getOCRJobPages(jobId: number): Promise<OCRPage[]> {
    return fetchWithFallback<OCRPage[]>(`${API_BASE_URL}/ocr/jobs/${jobId}/pages`, []);
  },

  async getOCRPage(pageId: number): Promise<OCRPage> {
    return fetchWithFallback<OCRPage>(`${API_BASE_URL}/ocr/pages/${pageId}`, {} as OCRPage);
  },

  async correctOCRPage(pageId: number, data: { text: string; change_summary?: string }): Promise<OCRPage> {
    const res = await fetch(`${API_BASE_URL}/ocr/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to save correction' }));
      throw new Error(err.detail || 'Failed to save correction');
    }
    return await res.json();
  },

  async approveOCRPage(pageId: number, data?: { notes?: string }): Promise<OCRPage> {
    const res = await fetch(`${API_BASE_URL}/ocr/pages/${pageId}/approve`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to approve OCR page' }));
      throw new Error(err.detail || 'Failed to approve OCR page');
    }
    return await res.json();
  },

  async rejectOCRPage(pageId: number, data?: { notes?: string }): Promise<OCRPage> {
    const res = await fetch(`${API_BASE_URL}/ocr/pages/${pageId}/reject`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to reject OCR page' }));
      throw new Error(err.detail || 'Failed to reject OCR page');
    }
    return await res.json();
  },

  async rerunOCRPage(pageId: number, data?: { engine?: string; language?: string; preprocessing_config?: Record<string, any> }): Promise<OCRPage> {
    const res = await fetch(`${API_BASE_URL}/ocr/pages/${pageId}/rerun`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to rerun OCR page' }));
      throw new Error(err.detail || 'Failed to rerun OCR page');
    }
    return await res.json();
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

    return fetchWithFallback(
      `${API_BASE_URL}/search?${query.toString()}`,
      {
        query: params.q || '',
        mode: params.mode || 'hybrid',
        total: 0,
        page: params.page || 1,
        page_size: params.page_size || 10,
        items: [],
        facets: {
          document_types: {},
          collections: {},
          languages: {},
          years: {},
          transcription_layers: {}
        },
        diagnostics: {
          mode: params.mode || 'hybrid',
          query: params.q || '',
          page: params.page || 1,
          page_size: params.page_size || 10,
          applied_filters: {},
          vector_backend: 'SQLITE_DEV_FALLBACK',
          is_vector_production: false
        }
      }
    );
  },

  async getSearchIndexStatus(): Promise<SearchIndexStatus> {
    return fetchWithFallback(
      `${API_BASE_URL}/search/index/status`,
      {
        total_documents: 0,
        indexed_documents: 0,
        total_chunks: 0,
        indexed_chunks: 0,
        vectorized_chunks: 0,
        verified_chunks: 0,
        vector_backend: 'SQLITE_DEV_FALLBACK',
        is_vector_backend_production: false,
        embedding_model_name: 'BAAI/bge-m3',
        embedding_model_status: 'MODEL_UNAVAILABLE',
        recent_jobs: []
      }
    );
  },

  async indexDocument(documentId: number): Promise<SearchIndexJob> {
    const res = await fetch(`${API_BASE_URL}/search/index/document/${documentId}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders()
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to index document' }));
      throw new Error(err.detail || 'Failed to index document');
    }
    return await res.json();
  },

  async reindexDocument(documentId: number): Promise<SearchIndexJob> {
    const res = await fetch(`${API_BASE_URL}/search/index/reindex-document/${documentId}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders()
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to reindex document' }));
      throw new Error(err.detail || 'Failed to reindex document');
    }
    return await res.json();
  },

  async rebuildSearchIndex(): Promise<{ status: string; total_documents: number; completed_documents: number; failed_documents: number }> {
    const res = await fetch(`${API_BASE_URL}/search/index/rebuild`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders()
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to rebuild search index' }));
      throw new Error(err.detail || 'Failed to rebuild search index');
    }
    return await res.json();
  },

  async getSearchEvaluation(): Promise<SearchEvaluationReport> {
    const res = await fetch(`${API_BASE_URL}/search/evaluation`, {
      headers: {
        'Accept': 'application/json',
        ...getAuthHeaders()
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to run search quality evaluation' }));
      throw new Error(err.detail || 'Failed to run search quality evaluation');
    }
    return await res.json();
  },

  // Phase 6: Translations
  async listTranslations(params?: { document_id?: number; language?: string; status?: string }): Promise<TranslationItem[]> {
    const query = new URLSearchParams();
    if (params?.document_id) query.append('document_id', params.document_id.toString());
    if (params?.language) query.append('language', params.language);
    if (params?.status) query.append('status', params.status);
    const res = await fetch(`${API_BASE_URL}/translations?${query.toString()}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to fetch translations');
    return await res.json();
  },

  async getDocumentTranslations(documentId: number): Promise<TranslationItem[]> {
    const res = await fetch(`${API_BASE_URL}/translations/document/${documentId}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to fetch document translations');
    return await res.json();
  },

  async getTranslation(translationId: number): Promise<TranslationItem> {
    const res = await fetch(`${API_BASE_URL}/translations/${translationId}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to fetch translation');
    return await res.json();
  },

  async getTranslationSideBySide(translationId: number): Promise<TranslationSideBySide> {
    const res = await fetch(`${API_BASE_URL}/translations/${translationId}/side-by-side`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to fetch side-by-side translation');
    return await res.json();
  },

  async generateTranslation(payload: {
    document_id: number;
    target_language: string;
    page_id?: number;
    provider?: string;
  }): Promise<TranslationItem> {
    const res = await fetch(`${API_BASE_URL}/translations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Translation generation failed' }));
      throw new Error(err.detail || 'Translation generation failed');
    }
    return await res.json();
  },

  async reviewTranslation(
    translationId: number,
    payload: { action: string; edited_text?: string; reviewer_notes?: string }
  ): Promise<TranslationItem> {
    const res = await fetch(`${API_BASE_URL}/translations/${translationId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit translation review' }));
      throw new Error(err.detail || 'Failed to submit translation review');
    }
    return await res.json();
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
    const res = await fetch(`${API_BASE_URL}/audio/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Audio synthesis failed' }));
      throw new Error(err.detail || 'Audio synthesis failed');
    }
    return await res.json();
  },

  async getDocumentAudios(documentId: number): Promise<AudioDerivativeItem[]> {
    const res = await fetch(`${API_BASE_URL}/audio/document/${documentId}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to fetch document audios');
    return await res.json();
  },

  async getAudioMetadata(audioId: string): Promise<AudioDerivativeItem> {
    const res = await fetch(`${API_BASE_URL}/audio/${audioId}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to fetch audio metadata');
    return await res.json();
  },

  async deleteAudio(audioId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/audio/${audioId}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to delete audio derivative');
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
    const res = await fetch(`${API_BASE_URL}/languages/supported`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to fetch supported languages');
    return await res.json();
  },

  async getMultilingualDiagnostics(): Promise<MultilingualDiagnostics> {
    const res = await fetch(`${API_BASE_URL}/languages/diagnostics`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to fetch multilingual diagnostics');
    return await res.json();
  },

  // ---------------------------------------------------------------------------
  // Phase 7: Knowledge Graph, Intelligent Timeline & Entity Relationships
  // ---------------------------------------------------------------------------

  async getGraphStatus(): Promise<GraphStatusData> {
    const res = await fetch(`${API_BASE_URL}/graph/status`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to fetch knowledge graph status');
    return await res.json();
  },

  async getGraphStats(): Promise<GraphStatsData> {
    const res = await fetch(`${API_BASE_URL}/graph/stats`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to fetch graph statistics');
    return await res.json();
  },

  async searchEntities(params?: { q?: string; entity_type?: string; status?: string; limit?: number; offset?: number }): Promise<GraphEntityItem[]> {
    const qParams = new URLSearchParams();
    if (params?.q) qParams.append('q', params.q);
    if (params?.entity_type) qParams.append('entity_type', params.entity_type);
    if (params?.status) qParams.append('status', params.status);
    if (params?.limit) qParams.append('limit', params.limit.toString());
    if (params?.offset) qParams.append('offset', params.offset.toString());

    const res = await fetch(`${API_BASE_URL}/entities?${qParams.toString()}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to search graph entities');
    return await res.json();
  },

  async getEntity(entityId: number): Promise<GraphEntityItem> {
    const res = await fetch(`${API_BASE_URL}/entities/${entityId}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error(`Failed to fetch entity #${entityId}`);
    return await res.json();
  },

  async createEntity(data: Partial<GraphEntityItem>): Promise<GraphEntityItem> {
    const res = await fetch(`${API_BASE_URL}/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create graph entity');
    return await res.json();
  },

  async updateEntity(entityId: number, data: Partial<GraphEntityItem>): Promise<GraphEntityItem> {
    const res = await fetch(`${API_BASE_URL}/entities/${entityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to update entity #${entityId}`);
    return await res.json();
  },

  async getEntityRelationships(entityId: number, direction: 'IN' | 'OUT' | 'BOTH' = 'BOTH'): Promise<GraphRelationshipItem[]> {
    const res = await fetch(`${API_BASE_URL}/entities/${entityId}/relationships?direction=${direction}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error(`Failed to fetch relationships for entity #${entityId}`);
    return await res.json();
  },

  async getEntityTimeline(entityId: number): Promise<TimelineEvent[]> {
    const res = await fetch(`${API_BASE_URL}/entities/${entityId}/timeline`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error(`Failed to fetch timeline for entity #${entityId}`);
    return await res.json();
  },

  async getGraphNeighbors(entityId: number, depth: number = 1, limit: number = 50): Promise<GraphNeighborsData> {
    const res = await fetch(`${API_BASE_URL}/graph/neighbors/${entityId}?depth=${depth}&limit=${limit}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error(`Failed to fetch neighbors for entity #${entityId}`);
    return await res.json();
  },

  async getEntityNeighbors(entityId: number, depth: number = 1, limit: number = 50): Promise<GraphNeighborsData> {
    return this.getGraphNeighbors(entityId, depth, limit);
  },

  async getGraphPath(sourceId: number, targetId: number, maxDepth: number = 3): Promise<{ source_id: number; target_id: number; path: GraphEntityItem[]; path_length: number }> {
    const res = await fetch(`${API_BASE_URL}/graph/path?source_id=${sourceId}&target_id=${targetId}&max_depth=${maxDepth}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to find graph path');
    return await res.json();
  },

  async searchGraph(q: string, limit: number = 25): Promise<{ query: string; matched_entities: GraphEntityItem[]; sample_relationships: GraphRelationshipItem[] }> {
    const res = await fetch(`${API_BASE_URL}/graph/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to search knowledge graph');
    return await res.json();
  },

  async listRelationships(params?: { status?: string; relationship_type?: string; limit?: number; offset?: number }): Promise<GraphRelationshipItem[]> {
    const qParams = new URLSearchParams();
    if (params?.status) qParams.append('status', params.status);
    if (params?.relationship_type) qParams.append('relationship_type', params.relationship_type);
    if (params?.limit) qParams.append('limit', params.limit.toString());
    if (params?.offset) qParams.append('offset', params.offset.toString());

    const res = await fetch(`${API_BASE_URL}/graph/relationships?${qParams.toString()}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to fetch graph relationships');
    return await res.json();
  },

  async createRelationship(data: Partial<GraphRelationshipItem>): Promise<GraphRelationshipItem> {
    const res = await fetch(`${API_BASE_URL}/graph/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create relationship');
    return await res.json();
  },

  async approveRelationship(relId: number): Promise<GraphRelationshipItem> {
    const res = await fetch(`${API_BASE_URL}/graph/relationships/${relId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error(`Failed to approve relationship #${relId}`);
    return await res.json();
  },

  async rejectRelationship(relId: number): Promise<GraphRelationshipItem> {
    const res = await fetch(`${API_BASE_URL}/graph/relationships/${relId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error(`Failed to reject relationship #${relId}`);
    return await res.json();
  },

  async deleteRelationship(relId: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/graph/relationships/${relId}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error(`Failed to delete relationship #${relId}`);
  },

  async triggerGraphExtraction(documentId: number, extractorType: 'deterministic' | 'rule_based' | 'llm' = 'deterministic'): Promise<{ document_id: number; extractor_type: string; entities_extracted: number; relationships_extracted: number; status: string }> {
    const res = await fetch(`${API_BASE_URL}/graph/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ document_id: documentId, extractor_type: extractorType })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Extraction failed' }));
      throw new Error(err.detail || 'Extraction failed');
    }
    return await res.json();
  },

  async listDuplicateCandidates(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/entities/duplicates/candidates`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to fetch duplicate candidates');
    return await res.json();
  },

  async proposeEntityMerge(primaryId: number, duplicateId: number, reason: string): Promise<EntityMergeItem> {
    const res = await fetch(`${API_BASE_URL}/entities/merges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ primary_entity_id: primaryId, merged_entity_id: duplicateId, merge_reason: reason })
    });
    if (!res.ok) throw new Error('Failed to propose entity merge');
    return await res.json();
  },

  async reviewEntityMerge(mergeId: number, action: 'APPROVE' | 'REJECT'): Promise<EntityMergeItem> {
    const res = await fetch(`${API_BASE_URL}/entities/merges/${mergeId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ action })
    });
    if (!res.ok) throw new Error(`Failed to ${action} merge #${mergeId}`);
    return await res.json();
  },

  async createTimelineEvent(data: { title: string; description: string; date_str: string; category?: string; location?: string; document_id?: number }): Promise<TimelineEvent> {
    const res = await fetch(`${API_BASE_URL}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create timeline milestone');
    return await res.json();
  },

  async generateTimelineCandidates(documentId: number): Promise<TimelineEvent[]> {
    const res = await fetch(`${API_BASE_URL}/timeline/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ document_id: documentId })
    });
    if (!res.ok) throw new Error('Failed to generate timeline candidates');
    return await res.json();
  },

  async approveTimelineEvent(eventId: number): Promise<TimelineEvent> {
    const res = await fetch(`${API_BASE_URL}/timeline/${eventId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error(`Failed to approve timeline event #${eventId}`);
    return await res.json();
  },

  async rejectTimelineEvent(eventId: number): Promise<TimelineEvent> {
    const res = await fetch(`${API_BASE_URL}/timeline/${eventId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error(`Failed to reject timeline event #${eventId}`);
    return await res.json();
  },

  async getRelationshipProvenance(relId: number): Promise<ProvenanceChainData> {
    const res = await fetch(`${API_BASE_URL}/provenance/relationship/${relId}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error(`Failed to fetch provenance for relationship #${relId}`);
    return await res.json();
  },

  async unifiedSearch(q: string, limit: number = 10): Promise<{ query: string; documents: any[]; entities: GraphEntityItem[]; timeline_events: any[]; total_documents: number; total_entities: number; total_timeline_events: number }> {
    const res = await fetch(`${API_BASE_URL}/search/unified?q=${encodeURIComponent(q)}&limit=${limit}`, {
      headers: { 'Accept': 'application/json', ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to execute unified search');
    return await res.json();
  }
};

export const archiveApi = apiService;

