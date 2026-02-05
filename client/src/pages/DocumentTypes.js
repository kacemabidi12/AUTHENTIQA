import React, { useState, useEffect, useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import AuthContext from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import useGet from '../hooks/useGet';
import { api } from '../api';
import './documentTypes.css';

export default function DocumentTypes() {
  const { data: unData } = useGet('/api/universities');
  const universities = (unData && unData.universities) || [];

  const [selectedUni, setSelectedUni] = useState('');
  const [docTypes, setDocTypes] = useState([]);
  const [loadingDocTypes, setLoadingDocTypes] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', version: '', status: 'ACTIVE' });
  const [saving, setSaving] = useState(false);

  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && user.role === 'UNIVERSITY_ADMIN' && user.universityId) {
      setSelectedUni(user.universityId);
      return;
    }
    if (universities.length === 1) {
      setSelectedUni(universities[0]._id);
    }
  }, [universities, user]);

  const notify = useContext(NotificationContext);

  useEffect(() => {
    let canceled = false;
    async function load() {
      if (!selectedUni) { setDocTypes([]); return; }
      setLoadingDocTypes(true);
      try {
        const res = await api.get(`/api/universities/${selectedUni}/document-types`);
        if (!canceled) setDocTypes(res.documentTypes || []);
      } catch (err) {
        console.error(err);
        setDocTypes([]);
      } finally {
        if (!canceled) setLoadingDocTypes(false);
      }
    }
    load();
    return () => { canceled = true; };
  }, [selectedUni]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', version: '', status: 'ACTIVE' });
    setShowForm(true);
  }

  function openEdit(d) {
    setEditing(d);
    setForm({ name: d.name, version: d.version, status: d.status || 'ACTIVE' });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    try {
    if (!selectedUni) return notify && notify.error('Select a university');
      if (editing) {
        const res = await api.patch(`/api/document-types/${editing._id}`, form);
        notify && notify.success('Updated');
      } else {
        const res = await api.post(`/api/universities/${selectedUni}/document-types`, form);
          notify && notify.success('Created');
      }
      setShowForm(false);
      // reload
      const res = await api.get(`/api/universities/${selectedUni}/document-types`);
      setDocTypes(res.documentTypes || []);
    } catch (err) {
      notify && notify.error('Failed: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(d) {
    const next = d.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (!confirm(`Set status to ${next}?`)) return;
    try {
      await api.patch(`/api/document-types/${d._id}/status`, { status: next });
      notify && notify.success('Status updated');
      const res = await api.get(`/api/universities/${selectedUni}/document-types`);
      setDocTypes(res.documentTypes || []);
    } catch (err) {
      notify && notify.error('Failed: ' + (err.message || JSON.stringify(err)));
    }
  }

  return (
    <div className="document-types-page">
      <h2>Document Types</h2>
      <div className="controls">
        {!(user && user.role === 'UNIVERSITY_ADMIN') && (
          <select value={selectedUni} onChange={e => setSelectedUni(e.target.value)}>
            <option value="">Select University</option>
            {universities.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        )}
        <button className="btn" onClick={openCreate} disabled={user && user.role === 'ANALYST'}>Create Document Type</button>
      </div>

      <div className="table-wrap">
        <table className="doc-table">
          <thead>
            <tr><th>Name</th><th>Version</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loadingDocTypes ? <tr><td colSpan="4"><Skeleton rows={4} cols={4} /></td></tr> : docTypes.length === 0 ? <tr><td colSpan="4">No document types</td></tr> : docTypes.map(d => (
              <tr key={d._id}>
                <td>{d.name}</td>
                <td>{d.version}</td>
                <td>{d.status}</td>
                <td>
                  <button className="btn small" onClick={() => openEdit(d)} disabled={user && user.role === 'ANALYST'}>Edit</button>
                  <button className="btn small outline" onClick={() => toggleStatus(d)} disabled={user && user.role === 'ANALYST'}>{d.status === 'ACTIVE' ? 'Disable' : 'Enable'}</button>
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
            <h3>{editing ? 'Edit' : 'Create'} Document Type</h3>
            <label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>Version<input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} /></label>
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
