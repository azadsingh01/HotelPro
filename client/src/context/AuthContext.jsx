import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, TOKEN_STORAGE_KEY } from '../api/client.js';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = 'hotelpro-user';

function readSavedUser() {
  if (!localStorage.getItem(TOKEN_STORAGE_KEY)) return null;
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) ?? 'null');
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSavedUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
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
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
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
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return saveSession(data);
  }, [saveSession]);

  const adminLogin = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/admin-login', { email, password });
    return saveSession(data);
  }, [saveSession]);

  const register = useCallback(async (formValues) => {
    const { data } = await api.post('/auth/signup', formValues);
    return data.user;
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    login,
    adminLogin,
    register,
    logout: clearSession,
  }), [user, token, loading, login, adminLogin, register, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
