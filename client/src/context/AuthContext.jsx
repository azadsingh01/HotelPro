import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, TOKEN_STORAGE_KEY } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    function handleExpiredSession() {
      clearSession();
    }

    window.addEventListener('hotelpro:session-expired', handleExpiredSession);
    return () => window.removeEventListener('hotelpro:session-expired', handleExpiredSession);
  }, [clearSession]);

  useEffect(() => {
    let isMounted = true;
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!savedToken) {
      setLoading(false);
      return () => { isMounted = false; };
    }

    api.get('/auth/profile')
      .then(({ data }) => {
        if (isMounted && localStorage.getItem(TOKEN_STORAGE_KEY) === savedToken) {
          setToken(savedToken);
          setUser(data.user);
        }
      })
      .catch(() => {
        if (isMounted && localStorage.getItem(TOKEN_STORAGE_KEY) === savedToken) clearSession();
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [clearSession]);

  const saveSession = useCallback((data) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return saveSession(data);
  }, [saveSession]);

  const register = useCallback(async (formValues) => {
    const { data } = await api.post('/auth/register', formValues);
    return saveSession(data);
  }, [saveSession]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    login,
    register,
    logout: clearSession,
  }), [user, token, loading, login, register, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
