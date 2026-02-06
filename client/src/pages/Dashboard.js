import React, { useEffect, useState } from 'react';
import './dashboard.css';

export default function Dashboard() {
  const [ping, setPing] = useState(null);

  useEffect(() => {
    const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
    fetch(`${API_BASE}/api/ping`)
      .then(async r => {
        const text = await r.text();
        try { return JSON.parse(text); } catch (e) { return text; }
      })
      .then(setPing)
      .catch(() => setPing({ ok: false }));
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome to the AUTHENTIQA dashboard.</p>
      <h3>Server health</h3>
      <pre>{JSON.stringify(ping, null, 2)}</pre>
    </div>
  );
}
