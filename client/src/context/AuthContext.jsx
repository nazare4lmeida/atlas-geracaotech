import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { isAtendente, isTeacherOrAdmin } from '../utils/roles';

const AuthContext = createContext();

// Sessão guardada no navegador. O token é validado pelo servidor a cada carregamento (/auth/me).
function readStoredUser() {
  try {
    const stored = localStorage.getItem('atlas-user');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('atlas-token');
    } catch (error) {
      return null;
    }
  });
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(Boolean(token));

  const persistSession = (nextToken, nextUser) => {
    try {
      localStorage.setItem('atlas-token', nextToken);
      localStorage.setItem('atlas-user', JSON.stringify(nextUser));
    } catch (error) {
      // Sem armazenamento (navegação privada): a sessão vale só nesta aba.
    }
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearSession = () => {
    try {
      localStorage.removeItem('atlas-token');
      localStorage.removeItem('atlas-user');
    } catch (error) {
      // ignora
    }
    setToken(null);
    setUser(null);
  };

  // identifier: CPF (com ou sem máscara) ou e-mail da gestão.
  const login = async ({ identifier, password }) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    persistSession(data.token, data.user);
    return data;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
    persistSession(data.token, data.user);
    return data;
  };

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      try {
        localStorage.setItem('atlas-user', JSON.stringify(data.user));
      } catch (error) {
        // ignora
      }
      setUser(data.user);
    } catch (error) {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [token]);

  const logout = () => {
    clearSession();
  };

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const role = user?.role || 'student';

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      role,
      isAdmin: role === 'admin',
      isTeacher: isTeacherOrAdmin(role),
      isAtendente: isAtendente(role),
      hasRole: (...roles) => roles.includes(role),
      isAuthenticated: Boolean(token && user),
      mustChangePassword: Boolean(user?.mustChangePassword),
      login,
      changePassword,
      logout,
      refreshProfile
    }),
    [token, user, loading, role, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
