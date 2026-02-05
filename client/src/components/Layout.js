import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import './layout.css';

export default function Layout({ children }) {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">AUTHENTIQA</div>
        <nav>
          <a href="/">Dashboard</a>
          <a href="/scan-events">Scan Events</a>
          <a href="/analytics">Analytics</a>
          <a href="/fraud-cases">Fraud Cases</a>
          {user && user.role === 'SUPER_ADMIN' && (
            <>
              <a href="/universities">Universities</a>
            </>
          )}
          {user && (user.role === 'SUPER_ADMIN' || user.role === 'UNIVERSITY_ADMIN') && (
            <a href="/document-types">Document Types</a>
          )}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">Welcome to AUTHENTIQA</div>
          <div className="topbar-right">
            {user && <span className="user">{user.name} ({user.role})</span>}
            <button className="btn small" onClick={logout}>Logout</button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
