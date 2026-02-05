import React, { useState, useEffect, useContext } from 'react';
import useGet from '../hooks/useGet';
import { api } from '../api';
import './universities.css';
import { NotificationContext } from '../context/NotificationContext';
import AuthContext from '../context/AuthContext';
import Skeleton from '../components/Skeleton';

export default function Universities() {
  const { data, loading, error, refetch } = useGet('/api/universities');
  const [notif, setNotif] = useState(null);
  const items = (data && data.universities) || [];

  const notify = useContext(NotificationContext);
  const { user } = useContext(AuthContext);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', country: '', status: 'ACTIVE' });

  useEffect(() => { refetch().catch(() => {}); }, []);

  function openCreate() {
    if (!user || user.role !== 'SUPER_ADMIN') return notify && notify.error('Forbidden');
    setEditing(null);
    setForm({ name: '', country: '', status: 'ACTIVE' });
    setShowForm(true);
  }

  function openEdit(u) {
    setEditing(u);
    setForm({ name: u.name || '', country: u.country || '', status: u.status || 'ACTIVE' });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) {
        const res = await api.patch(`/api/universities/${editing._id}`, form);
        notify && notify.success('Updated');
      } else {
        const res = await api.post('/api/universities', form);
        notify && notify.success('Created');
      }
      setShowForm(false);
      refetch().catch(() => {});
    } catch (err) {
      notify && notify.error('Error: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(u) {
    const next = u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (!confirm(`Set status to ${next}?`)) return;
    try {
      await api.patch(`/api/universities/${u._id}/status`, { status: next });
      notify && notify.success('Status updated');
      refetch().catch(() => {});
    } catch (err) {
      notify && notify.error('Failed to update status: ' + (err.message || JSON.stringify(err)));
    }
  }

  return (
    <div className="universities-page">
      <h2>Universities</h2>
      <div className="actions">
        <button className="btn" onClick={openCreate} disabled={loading}>Create University</button>
      </div>

      <div className="table-wrap">
        <table className="uni-table">
          <thead>
            <tr><th>Name</th><th>Country</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="5"><Skeleton rows={6} cols={5} /></td></tr> : items.length === 0 ? <tr><td colSpan="5">No universities</td></tr> : items.map(u => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.country}</td>
                <td>{u.status}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn small" onClick={() => openEdit(u)} disabled={!(user && user.role === 'SUPER_ADMIN')}>Edit</button>
                  <button className="btn small outline" onClick={() => toggleStatus(u)} disabled={!(user && user.role === 'SUPER_ADMIN')}>{u.status === 'ACTIVE' ? 'Disable' : 'Enable'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <button className="close" onClick={() => setShowForm(false)}>×</button>
            <h3>{editing ? 'Edit' : 'Create'} University</h3>
            <label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>Country<input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></label>
            <label>Status
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </label>
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
