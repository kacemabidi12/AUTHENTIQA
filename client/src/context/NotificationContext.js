import React, { createContext, useState, useCallback } from 'react';
import './toast.css';

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((type, message, ttl = 5000) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, type, message }]);
    if (ttl > 0) setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ttl);
  }, []);

  const success = useCallback((msg, ttl) => push('success', msg, ttl), [push]);
  const error = useCallback((msg, ttl) => push('error', msg, ttl), [push]);
  const info = useCallback((msg, ttl) => push('info', msg, ttl), [push]);

  const remove = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);

  return (
    <NotificationContext.Provider value={{ success, error, info, remove }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`} onClick={() => remove(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
