import {
  MediaAsset,
  MediaDiagnostics,
  MediaProvenance,
  MediaTranscript,
  MediaCaption,
  MediaCollection,
  TranscriptSearchResult
} from '../types/media';

const API_BASE = '/api/v1/media';

const getHeaders = (isJson = true): Record<string, string> => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const error: any = new Error(errorData.detail || 'API request failed');
    error.response = { data: errorData, status: res.status };
    throw error;
  }
  return res.json();
};

export const mediaApi = {
  getDiagnostics: async (): Promise<MediaDiagnostics> => {
    const res = await fetch(`${API_BASE}/diagnostics`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getMediaList: async (params?: {
    media_type?: string;
    collection_id?: number;
    access_level?: string;
    verification_status?: string;
    limit?: number;
    offset?: number;
  }): Promise<MediaAsset[]> => {
    const searchParams = new URLSearchParams();
    if (params?.media_type) searchParams.append('media_type', params.media_type);
    if (params?.collection_id) searchParams.append('collection_id', params.collection_id.toString());
    if (params?.access_level) searchParams.append('access_level', params.access_level);
    if (params?.verification_status) searchParams.append('verification_status', params.verification_status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const url = searchParams.toString() ? `${API_BASE}?${searchParams.toString()}` : API_BASE;
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },

  getMediaAsset: async (id: number): Promise<MediaAsset> => {
    const res = await fetch(`${API_BASE}/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  updateMediaAsset: async (id: number, data: Partial<MediaAsset>): Promise<MediaAsset> => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  uploadMediaMaster: async (formData: FormData): Promise<MediaAsset> => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: getHeaders(false), // let browser set boundary
      body: formData,
    });
    return handleResponse(res);
  },

  getStreamUrl: (id: number, versionId?: number): string => {
    return versionId ? `${API_BASE}/${id}/stream?version_id=${versionId}` : `${API_BASE}/${id}/stream`;
  },

  getDownloadUrl: (id: number): string => {
    return `${API_BASE}/${id}/download`;
  },

  getThumbnailUrl: (id: number): string => {
    return `${API_BASE}/${id}/thumbnail`;
  },

  getPosterUrl: (id: number): string => {
    return `${API_BASE}/${id}/poster`;
  },

  getWaveform: async (id: number): Promise<number[]> => {
    const res = await fetch(`${API_BASE}/${id}/waveform`);
    return handleResponse(res);
  },

  getTranscripts: async (id: number): Promise<MediaTranscript[]> => {
    const res = await fetch(`${API_BASE}/${id}/transcripts`, { headers: getHeaders() });
    return handleResponse(res);
  },

  createTranscript: async (id: number, data: any): Promise<MediaTranscript> => {
    const res = await fetch(`${API_BASE}/${id}/transcripts`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  reviewTranscript: async (
    id: number,
    transcriptId: number,
    data: { action: string; segments?: any[]; reviewer_notes?: string }
  ): Promise<MediaTranscript> => {
    const res = await fetch(`${API_BASE}/${id}/transcripts/${transcriptId}/review`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getCaptions: async (id: number): Promise<MediaCaption[]> => {
    const res = await fetch(`${API_BASE}/${id}/captions`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getProvenance: async (id: number): Promise<MediaProvenance> => {
    const res = await fetch(`${API_BASE}/${id}/provenance`, { headers: getHeaders() });
    return handleResponse(res);
  },

  searchMedia: async (q: string, mediaType?: string): Promise<MediaAsset[]> => {
    const searchParams = new URLSearchParams({ q });
    if (mediaType) searchParams.append('media_type', mediaType);
    const res = await fetch(`${API_BASE}/search?${searchParams.toString()}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  searchTranscripts: async (q: string): Promise<TranscriptSearchResult[]> => {
    const searchParams = new URLSearchParams({ q });
    const res = await fetch(`${API_BASE}/transcript-search?${searchParams.toString()}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getCollections: async (): Promise<MediaCollection[]> => {
    const res = await fetch(`${API_BASE}/collections`);
    return handleResponse(res);
  },

  createCollection: async (data: { name: string; description?: string; access_level?: string; source?: string }): Promise<MediaCollection> => {
    const res = await fetch(`${API_BASE}/collections`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getKioskFeed: async (mediaType?: string): Promise<MediaAsset[]> => {
    const searchParams = new URLSearchParams();
    if (mediaType) searchParams.append('media_type', mediaType);
    const url = searchParams.toString() ? `${API_BASE}/kiosk/feed?${searchParams.toString()}` : `${API_BASE}/kiosk/feed`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  runIntegrityCheck: async (id: number): Promise<any> => {
    const res = await fetch(`${API_BASE}/${id}/integrity-check`, {
      method: 'POST',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  runBulkIntegrityAudit: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/integrity/audit`, {
      method: 'POST',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },
};
