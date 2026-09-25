import React, { createContext, useContext, useState } from 'react';
import { UserRole, UserProfile } from '../types';
import { apiUrl } from '../config/api';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  token: string | null;
  login: (emailOrRole: string, password?: string) => Promise<boolean>;
  loginWithCredentials: (email: string, password: string) => Promise<boolean>;
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
  const [user, setUser] = useState<UserProfile | null>(null);

  const logout = () => {
    setRole('VISITOR');
    setToken(null);
    setUser(null);
    localStorage.removeItem('archive_user_role');
    localStorage.removeItem('archive_jwt_token');
  };

  const loginWithCredentials = async (email: string, password: string): Promise<boolean> => {
    try {
      const resp = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (!resp.ok) {
        logout();
        return false;
      }

      const data = await resp.json();
      const jwt = data.access_token;
      const userRole = (data.role as UserRole) || 'VISITOR';

      setToken(jwt);
      setRole(userRole);
      localStorage.setItem('archive_jwt_token', jwt);
      localStorage.setItem('archive_user_role', userRole);

      // Fetch user profile from /auth/me
      try {
        const meResp = await fetch(apiUrl('/auth/me'), {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
        if (meResp.ok) {
          const profile = await meResp.json();
          setUser(profile);
        } else {
          setUser({
            id: 1,
            email: email.trim(),
            full_name: data.user_name || 'Archival Officer',
            role: {
              id: 1,
              name: userRole,
              description: 'Authenticated Staff Member'
            },
            is_active: true
          });
        }
      } catch {
        setUser({
          id: 1,
          email: email.trim(),
          full_name: data.user_name || 'Archival Officer',
          role: {
            id: 1,
            name: userRole,
            description: 'Authenticated Staff Member'
          },
          is_active: true
        });
      }

      return true;
    } catch (err) {
      console.warn('[Auth] Server login failed:', err);
      logout();
      return false;
    }
  };

  const login = async (emailOrRole: string, password?: string): Promise<boolean> => {
    if (!password) {
      if (emailOrRole === 'VISITOR') {
        logout();
        return true;
      }
      return false;
    }
    return loginWithCredentials(emailOrRole, password);
  };

  // Validate existing stored session token on mount
  React.useEffect(() => {
    const storedToken = localStorage.getItem('archive_jwt_token');
    if (!storedToken) {
      if (role !== 'VISITOR') {
        logout();
      }
      return;
    }

    fetch(apiUrl('/auth/me'), {
      headers: { 'Authorization': `Bearer ${storedToken}` }
    })
      .then(async (res) => {
        if (res.ok) {
          const profile = await res.json();
          setUser(profile);
          const validatedRole = (profile.role?.name as UserRole) || 'VISITOR';
          setRole(validatedRole);
          localStorage.setItem('archive_user_role', validatedRole);
        } else {
          // Token expired or invalid
          logout();
        }
      })
      .catch(() => {
        // Network or server error - keep token for offline or retry
      });
  }, []);

  const isStaff = role === 'SUPER_ADMIN' || role === 'ARCHIVIST' || role === 'REVIEWER';

  return (
    <AuthContext.Provider value={{ user, role, token, login, loginWithCredentials, logout, isStaff }}>
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
