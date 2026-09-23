/**
 * Kiosk API Client for Phase 9 Kiosk Hardware, Deployment, and Security.
 * Manages device registration, telemetry heartbeats, configuration, maintenance,
 * and security status audits.
 */

export interface KioskDeviceItem {
  id: number;
  device_uuid: string;
  device_name: string;
  institution: string;
  location: string;
  kiosk_type: string;
  status: 'ONLINE' | 'STALE' | 'OFFLINE' | 'MAINTENANCE' | 'DISABLED' | 'ERROR';
  maintenance_mode: boolean;
  enabled: boolean;
  software_version?: string;
  configuration_version?: number;
  registered_at?: string;
  last_seen_at?: string;
}

export interface KioskSummary {
  total: number;
  online: number;
  stale: number;
  offline: number;
  maintenance: number;
  disabled: number;
  error: number;
}

export interface KioskListResponse {
  summary: KioskSummary;
  kiosks: KioskDeviceItem[];
}

export interface KioskRegisterPayload {
  device_name: string;
  institution?: string;
  location?: string;
  kiosk_type?: string;
  hardware_fingerprint?: string;
}

export interface KioskRegisterResponse {
  id: number;
  device_uuid: string;
  device_name: string;
  institution: string;
  location: string;
  kiosk_type: string;
  status: string;
  raw_device_key: string;
  registered_at: string;
  notice: string;
}

export interface KioskDetailResponse extends KioskDeviceItem {
  capabilities: Record<string, any>;
  configuration: {
    idle_timeout_seconds: number;
    warning_timeout_seconds: number;
    home_route: string;
    default_language: string;
    maintenance_message: string;
  };
  recent_heartbeats: Array<{
    timestamp: string;
    status: string;
    cpu_percent?: number;
    ram_percent?: number;
    disk_percent?: number;
    app_health: string;
    db_health: string;
  }>;
}

export interface KioskConfigUpdatePayload {
  idle_timeout_seconds?: number;
  warning_timeout_seconds?: number;
  home_route?: string;
  default_language?: string;
  available_languages?: string[];
  accessibility_high_contrast?: boolean;
  accessibility_font_scale?: string;
  maintenance_message?: string;
}

export interface SecurityStatusResponse {
  timestamp: string;
  authentication: {
    algorithm: string;
    access_token_expire_minutes: number;
    secret_key_status: string;
  };
  cors: {
    status: string;
    allowed_origins_count: number;
  };
  security_headers: {
    status: string;
    csp_enabled: boolean;
    x_frame_options: string;
    x_content_type_options: string;
  };
  rate_limiting: {
    status: string;
  };
  tls: {
    status: string;
    message: string;
  };
  storage_vault: {
    status: string;
    read_only_masters_enforced: boolean;
  };
  database: {
    status: string;
  };
  kiosk_infrastructure: {
    device_authentication_enforced: boolean;
    device_token_separation: boolean;
  };
}

export interface HardwareCapabilityReport {
  timestamp: string;
  system: {
    platform: string;
    os: string;
    processor: string;
    cpu_cores: number;
    ram_gb: number;
  };
  hardware: {
    display: string;
    touchscreen: string;
    keyboard: string;
    mouse: string;
    speaker: string;
    microphone: string;
    camera: string;
    printer_nfc_qr: string;
  };
  infrastructure: {
    docker: string;
    docker_compose: string;
    postgresql_service: string;
    sqlite_fallback: string;
    nginx_caddy: string;
    tls: string;
  };
  runtime_status: string;
}

const API_BASE = '/api/v1';

const getHeaders = (tokenOverride?: string): Record<string, string> => {
  const token = tokenOverride || localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

export const kioskApi = {
  // Admin Kiosk Fleet
  listKiosks: async (): Promise<KioskListResponse> => {
    const res = await fetch(`${API_BASE}/admin/kiosks`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getKioskDetail: async (kioskId: number): Promise<KioskDetailResponse> => {
    const res = await fetch(`${API_BASE}/admin/kiosks/${kioskId}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  registerKiosk: async (payload: KioskRegisterPayload): Promise<KioskRegisterResponse> => {
    const res = await fetch(`${API_BASE}/admin/kiosks/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  updateKioskConfig: async (kioskId: number, config: KioskConfigUpdatePayload): Promise<any> => {
    const res = await fetch(`${API_BASE}/admin/kiosks/${kioskId}/config`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(config),
    });
    return handleResponse(res);
  },

  rotateKioskKey: async (kioskId: number): Promise<{ status: string; raw_device_key: string; notice: string }> => {
    const res = await fetch(`${API_BASE}/admin/kiosks/${kioskId}/rotate-key`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  toggleMaintenance: async (kioskId: number, enabled: boolean, reason?: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/admin/kiosks/${kioskId}/maintenance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ enabled, reason }),
    });
    return handleResponse(res);
  },

  disableKiosk: async (kioskId: number): Promise<any> => {
    const res = await fetch(`${API_BASE}/admin/kiosks/${kioskId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Security Posture Audit
  getSecurityStatus: async (): Promise<SecurityStatusResponse> => {
    const res = await fetch(`${API_BASE}/admin/kiosks/security/status`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Hardware & Capability Audit
  getHardwareReport: async (): Promise<HardwareCapabilityReport> => {
    const res = await fetch(`${API_BASE}/kiosk/status`);
    return handleResponse(res);
  },

  // Dependencies Health
  getHealthDependencies: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/health/dependencies`);
    return handleResponse(res);
  },

  // Direct Terminal API (using device API key)
  sendHeartbeat: async (deviceKey: string, telemetry: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/kiosk/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kiosk-Device-Key': deviceKey,
      },
      body: JSON.stringify(telemetry),
    });
    return handleResponse(res);
  },

  getDeviceConfig: async (deviceKey: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/kiosk/config`, {
      headers: {
        'X-Kiosk-Device-Key': deviceKey,
      },
    });
    return handleResponse(res);
  },
};
