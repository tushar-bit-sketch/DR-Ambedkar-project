import React, { createContext, useContext, useState } from 'react';
import { UserRole, UserProfile } from '../types';
import { apiUrl } from '../config/api';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  token: string | null;
  login: (role: UserRole) => void;
  logout: () => void;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('archive_user_role') as UserRole) || 'VISITOR';
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('archive_jwt_token') || null;
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    if (role === 'VISITOR') return null;
    return {
      id: 1,
      email: role === 'SUPER_ADMIN' ? 'admin@ambedkar-archive.gov.in' : 'archivist@ambedkar-archive.gov.in',
      full_name: role === 'SUPER_ADMIN' ? 'Dr. B.R. National Archive Administrator' : 'Senior Institutional Archivist',
      role: {
        id: role === 'SUPER_ADMIN' ? 1 : 2,
        name: role,
        description: 'Institutional Access Privileges'
      },
      is_active: true
    };
  });

  const ROLE_CREDENTIALS: Record<UserRole, { email: string; password: string; name: string } | null> = {
    SUPER_ADMIN: {
      email: 'admin@ambedkar-archive.gov.in',
      password: 'AmbedkarArchive2026!',
      name: 'National Archive Administrator'
    },
    ARCHIVIST: {
      email: 'archivist@ambedkar-archive.gov.in',
      password: 'Archivist2026!',
      name: 'Senior Institutional Archivist'
    },
    REVIEWER: {
      email: 'reviewer@ambedkar-archive.gov.in',
      password: 'Reviewer2026!',
      name: 'Curatorial Reviewer'
    },
    RESEARCHER: {
      email: 'researcher@ambedkar-archive.gov.in',
      password: 'Researcher2026!',
      name: 'Archival Research Scholar'
    },
    VISITOR: null
  };

  const login = async (newRole: UserRole) => {
    const creds = ROLE_CREDENTIALS[newRole];
    if (!creds || newRole === 'VISITOR') {
      logout();
      return;
    }

    try {
      const resp = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: creds.email, password: creds.password })
      });

      if (resp.ok) {
        const data = await resp.json();
        const jwt = data.access_token;
        setToken(jwt);
        setRole(newRole);
        localStorage.setItem('archive_jwt_token', jwt);
        localStorage.setItem('archive_user_role', newRole);

        setUser({
          id: newRole === 'SUPER_ADMIN' ? 1 : 2,
          email: creds.email,
          full_name: creds.name,
          role: {
            id: newRole === 'SUPER_ADMIN' ? 1 : 2,
            name: newRole,
            description: 'Institutional Access Privileges'
          },
          is_active: true
        });
      } else {
        // Enforce strict security: No synthetic fallback tokens in production
        console.warn(`[Auth] Backend authentication rejected for role: ${newRole}. Access denied.`);
        logout();
        throw new Error('Authentication rejected by institutional server.');
      }
    } catch (err) {
      console.warn(`[Auth] Server authentication failed for ${newRole}:`, err);
      logout();
    }
  };

  // Attempt real login verification on mount if logged in as staff
  React.useEffect(() => {
    if (role !== 'VISITOR' && !token?.startsWith('ey')) {
      login(role).catch(() => {});
    }
  }, []);


  const logout = () => {
    setRole('VISITOR');
    setToken(null);
    setUser(null);
    localStorage.removeItem('archive_user_role');
    localStorage.removeItem('archive_jwt_token');
  };

  const isStaff = role === 'SUPER_ADMIN' || role === 'ARCHIVIST' || role === 'REVIEWER';

  return (
    <AuthContext.Provider value={{ user, role, token, login, logout, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
