import React, { useState, useMemo, useEffect, useContext } from 'react';
import useGet from '../hooks/useGet';
import { api } from '../api';
import AuthContext from '../context/AuthContext';
import './fraudCases.css';
import { NotificationContext } from '../context/NotificationContext';
import Skeleton from '../components/Skeleton';

const STATUS_OPTIONS = ['OPEN', 'IN_REVIEW', 'CONFIRMED_FRAUD', 'FALSE_POSITIVE', 'CLOSED'];

function StatusBadge({ status }) {
  const map = {
    OPEN: 'badge open',
    IN_REVIEW: 'badge review',
    CONFIRMED_FRAUD: 'badge danger',
    FALSE_POSITIVE: 'badge ok',
    CLOSED: 'badge closed'
  };
  return <span className={map[status] || 'badge'}>{status}</span>;
}

export default function FraudCases() {
  const { user } = useContext(AuthContext);
  const notify = useContext(NotificationContext);

  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = useMemo(() => ({ status: status || undefined, assignedToUserId: assignedTo || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page, pageSize }), [status, assignedTo, dateFrom, dateTo, page, pageSize]);

  const { data, loading, error, refetch } = useGet('/api/fraud-cases', { immediate: false, params });

  useEffect(() => { refetch({ params }).catch(() => {}); }, [JSON.stringify(params)]);

  const items = (data && data.items) || [];
  const total = (data && data.total) || 0;

  // editing
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let canceled = false;
    async function load() {
      if (!editingId) { setEditing(null); return; }
      try {
        const res = await api.get(`/api/fraud-cases/${editingId}`);
        if (!canceled) setEditing(res.fraudCase || res);
      } catch (err) {
        console.error('Failed to load fraud case', err);
        notify && notify.error('Failed to load fraud case');
      }
    }
    load();
    return () => { canceled = true; };
  }, [editingId]);

  async function saveEdit() {
    if (!editingId || !editing) return;
    setSaving(true);
    try {
      const body = { status: editing.status, assignedToUserId: editing.assignedToUserId || null, notes: editing.notes || '' };
      const res = await api.patch(`/api/fraud-cases/${editingId}`, body);
      setEditing(res.fraudCase || res);
      setEditingId(null);
      // refresh list
      refetch({ params: params }).catch(() => {});
      notify && notify.success('Saved');
    } catch (err) {
      notify && notify.error('Failed to save: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(fc) {
    setEditingId(fc._id);
  }

  function renderRow(fc) {
    return (
      <tr key={fc._id}>
        <td>{new Date(fc.createdAt).toLocaleString()}</td>
        <td><StatusBadge status={fc.status} /></td>
        <td>{fc.assignedToUserId || '-'}</td>
        <td>{fc.notes ? fc.notes.substring(0, 80) : ''}</td>
        <td>{fc.scanEventId}</td>
        <td>
          {(user && (user.role === 'SUPER_ADMIN' || user.role === 'UNIVERSITY_ADMIN')) && (
            <button className="btn small" onClick={() => openEdit(fc)}>Edit</button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="fraud-cases-page">
      <h2>Fraud Cases</h2>

      <div className="filters">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <input placeholder="AssignedTo user id" value={assignedTo} onChange={e => { setAssignedTo(e.target.value); setPage(1); }} />

        <label>Date from <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} /></label>
        <label>Date to <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} /></label>

        <button className="btn" onClick={() => refetch({ params }).catch(() => {})}>Apply</button>
        <button className="btn outline" onClick={() => { setStatus(''); setAssignedTo(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Reset</button>
      </div>

      <div className="table-wrap">
        <table className="fraud-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Notes</th>
              <th>Scan Event</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
              {loading ? (
                <tr><td colSpan="6"><Skeleton rows={4} cols={6} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="6">No results</td></tr>
              ) : items.map(renderRow)}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button className="btn small" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</button>
        <span>Page {page}</span>
        <button className="btn small" disabled={page * pageSize >= total} onClick={() => setPage(p => p+1)}>Next</button>
        <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <span>Total: {total}</span>
      </div>

      {editingId && editing && (
        <div className="modal">
          <div className="modal-content">
            <button className="close" onClick={() => setEditingId(null)}>×</button>
            <h3>Edit Fraud Case</h3>
            <label>Status
              <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}>
                {STATUS_OPTIONS.map(s => <option value={s} key={s}>{s}</option>)}
              </select>
            </label>
            <label>Assign to (user id)
              <input value={editing.assignedToUserId || ''} onChange={e => setEditing({ ...editing, assignedToUserId: e.target.value })} />
            </label>
            <label>Notes
              <textarea value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
            </label>
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn outline" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
