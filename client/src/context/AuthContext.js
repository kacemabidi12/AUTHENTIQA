import React, { createContext, useState, useEffect } from 'react';
import { setLogoutHandler } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem('auth_token', token); else localStorage.removeItem('auth_token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('auth_user', JSON.stringify(user)); else localStorage.removeItem('auth_user');
  }, [user]);

  // register logout handler with api helper so 401 responses cause logout
  // register logout hook so api can trigger it on 401
  useEffect(() => {
    // set a small handler that clears auth and navigates to /login
    setLogoutHandler(() => {
      setToken(null);
      setUser(null);
      try { window.location.href = '/login'; } catch (e) { /* ignore */ }
    });
    return () => setLogoutHandler(null);
  }, []);

  const login = ({ token: t, user: u }) => {
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
