/**
 * Demo Mode & System Status API Client.
 * Interfaces with /api/v1/demo and /api/v1/system/status endpoints.
 * Zero-Demo mode: strictly queries live backend and throws honest errors when unreachable.
 */

export interface DemoStageOverview {
  step: number;
  stage_id: string;
  title: string;
  subtitle: string;
  capability_status: 'OPERATIONAL' | 'OPERATIONAL (FALLBACK)' | 'DEGRADED' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
  summary: string;
}

export interface DemoStageDetail {
  step: number;
  stage_id: string;
  title: string;
  problem: string;
  solution: string;
  status: string;
  talking_points: string[];
  sample_records?: Array<{
    archive_id: string;
    title: string;
    document_type: string;
    year: number;
    checksum: string;
    verification_status: string;
  }>;
  suggested_queries?: Array<{
    query: string;
    description: string;
  }>;
  active_job?: {
    job_id: number;
    document_title: string;
    status: string;
    total_pages: number;
  };
  sample_questions?: Array<{
    question: string;
    grounded: boolean;
    expected_source: string;
  }>;
  featured_entities?: Array<{
    name: string;
    type: string;
    id: number;
  }>;
  sample_milestones?: Array<{
    title: string;
    year: number;
    date_str: string;
  }>;
  assets?: Array<{
    archive_id: string;
    title: string;
    media_type: string;
  }>;
}

export interface DemoControlState {
  active_stage_step: number;
  total_stages: number;
  demo_session_active: boolean;
  presentation_mode: string;
}

export interface SubsystemStatus {
  name: string;
  status: 'OPERATIONAL' | 'OPERATIONAL (FALLBACK)' | 'DEGRADED' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
  provider: string;
  version: string;
  details: string;
}

export interface SystemStatusResponse {
  timestamp: string;
  application: string;
  phase: string;
  environment: string;
  overall_status: string;
  subsystems: Record<string, SubsystemStatus>;
}

import { API_BASE_URL, apiUrl } from '../config/api';

const API_BASE = API_BASE_URL || '/api/v1';

const getHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('archive_jwt_token') || localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const demoApi = {
  getStages: async (): Promise<DemoStageOverview[]> => {
    const res = await fetch(`${API_BASE}/demo/stages`);
    if (!res.ok) {
      throw new Error(`Demonstration stages service unavailable (HTTP ${res.status})`);
    }
    return await res.json();
  },

  getStageDetail: async (stageId: string): Promise<DemoStageDetail> => {
    const res = await fetch(`${API_BASE}/demo/stage/${encodeURIComponent(stageId)}`);
    if (!res.ok) {
      throw new Error(`Stage detail for '${stageId}' unavailable (HTTP ${res.status})`);
    }
    return await res.json();
  },

  getControlState: async (): Promise<DemoControlState> => {
    const res = await fetch(`${API_BASE}/demo/control`, { headers: getHeaders() });
    if (!res.ok) {
      throw new Error(`Demo control state unavailable (HTTP ${res.status})`);
    }
    return await res.json();
  },

  stepControl: async (direction: 'next' | 'prev' | 'reset'): Promise<DemoControlState> => {
    const res = await fetch(`${API_BASE}/demo/control/step`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      throw new Error(`Step control failed (HTTP ${res.status})`);
    }
    return await res.json();
  },

  resetControl: async (): Promise<DemoControlState> => {
    const res = await fetch(`${API_BASE}/demo/control/reset`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Reset control failed (HTTP ${res.status})`);
    }
    return await res.json();
  },

  getSystemStatus: async (): Promise<SystemStatusResponse> => {
    const res = await fetch(`${API_BASE}/system/status`);
    if (!res.ok) {
      throw new Error(`Subsystem status telemetry unavailable (HTTP ${res.status})`);
    }
    return await res.json();
  },
};
