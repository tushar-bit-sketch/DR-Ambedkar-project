/**
 * Canonical Frontend API Configuration & URL Builder Module.
 * Single source of truth for all API, file, media, and streaming URLs.
 * 
 * Rules:
 * 1. Never construct localhost/127.0.0.1 URLs inside React components.
 * 2. In production HTTPS, refuse to issue unencrypted http:// requests that trigger mixed-content errors.
 * 3. Support environment-driven configuration via VITE_API_URL and VITE_DEMO_MODE.
 */

// Detect runtime environment
const isBrowser = typeof window !== 'undefined';
const isHttps = isBrowser && window.location.protocol === 'https:';
const envApiUrl = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '') : '';
const isDev = import.meta.env.DEV;

// Explicit demo mode toggle (must be explicitly 'true' to activate demo/offline simulation)
export const isDemoMode = (): boolean => {
  return import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.VITE_DEMO_MODE === true;
};

/**
 * Resolves the canonical API base URL.
 * Priority:
 * 1. VITE_API_URL if provided (e.g. 'https://api.ambedkararchive.org/api/v1' or '/api/v1')
 * 2. In local development (DEV): 'http://127.0.0.1:8000/api/v1'
 * 3. In production: If HTTPS and no VITE_API_URL, default to same-origin reverse-proxy '/api/v1'
 */
export const getApiBaseUrl = (): string => {
  if (envApiUrl) {
    // Prevent insecure HTTP URL on HTTPS production
    if (isHttps && envApiUrl.startsWith('http://127.0.0.1') || (isHttps && envApiUrl.startsWith('http://localhost'))) {
      console.warn('[API Config] Insecure localhost API URL rejected in HTTPS production:', envApiUrl);
      return '';
    }
    return envApiUrl;
  }

  if (isDev) {
    return 'http://127.0.0.1:8000/api/v1';
  }

  // In production with reverse proxy / same-origin API
  return '/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Checks whether a valid backend API endpoint is configured and safe to call.
 */
export const isBackendConfigured = (): boolean => {
  if (!API_BASE_URL) return false;
  // If in browser on HTTPS and API_BASE_URL is unencrypted http, unsafe to call
  if (isHttps && API_BASE_URL.startsWith('http://')) {
    return false;
  }
  return true;
};

/**
 * Builds a standardized API endpoint URL.
 * @param path - Sub-path (e.g. '/documents', '/research/ask')
 */
export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  if (!base) return cleanPath;
  return `${base}${cleanPath}`;
};

/**
 * Builds an archival file streaming URL.
 * @param identifier - File ID (number) or filename/accession string
 */
export const fileStreamUrl = (identifier: string | number): string => {
  const base = getApiBaseUrl();
  const encoded = encodeURIComponent(String(identifier));
  return base ? `${base}/files/stream/${encoded}` : `/api/v1/files/stream/${encoded}`;
};

/**
 * Builds an archival file download URL.
 * @param identifier - File ID (number) or filename/accession string
 */
export const fileDownloadUrl = (identifier: string | number): string => {
  const base = getApiBaseUrl();
  const encoded = encodeURIComponent(String(identifier));
  return base ? `${base}/files/download/${encoded}` : `/api/v1/files/download/${encoded}`;
};

/**
 * Builds an audio derivative streaming URL.
 * @param audioId - Audio derivative ID
 */
export const audioStreamUrl = (audioId: number | string): string => {
  const base = getApiBaseUrl();
  return base ? `${base}/audio/${audioId}/stream` : `/api/v1/audio/${audioId}/stream`;
};

/**
 * Builds an audio-visual media streaming URL.
 * @param mediaId - Media record ID
 */
export const mediaStreamUrl = (mediaId: number | string): string => {
  const base = getApiBaseUrl();
  return base ? `${base}/media/${mediaId}/stream` : `/api/v1/media/${mediaId}/stream`;
};

/**
 * Builds a derivative asset URL (e.g. OCR images, thumbnails).
 * @param relativePath - Relative path from storage root
 */
export const derivativeUrl = (relativePath: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return base ? `${base}/files/stream/${encodeURIComponent(cleanPath)}` : `/api/v1/files/stream/${encodeURIComponent(cleanPath)}`;
};
