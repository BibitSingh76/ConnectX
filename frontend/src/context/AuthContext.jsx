import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { loginUser, registerUser, getMe } from '../services/apiService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('connectx_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const storedToken = localStorage.getItem('connectx_token');
      if (storedToken) {
        try {
          const res = await getMe(storedToken);
          if (isMounted) {
            setUser(res.user);
            setToken(storedToken);
          }
        } catch (err) {
          console.warn('[AuthContext] Stored token verification failed:', err.message);
          localStorage.removeItem('connectx_token');
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await loginUser({ email, password });
    localStorage.setItem('connectx_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await registerUser({ name, email, password });
    localStorage.setItem('connectx_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('connectx_token');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }),
    [user, token, loading, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
