import React, { useState, useEffect, useContext, useMemo } from 'react';
import AuthContext from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import Skeleton from '../components/Skeleton';
import useGet from '../hooks/useGet';
import { api } from '../api';
import './scanEvents.css';
const ScanEventDetails = React.lazy(() => import('../components/ScanEventDetails'));

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString();
}

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(',')];
  for (const r of rows) {
    const vals = keys.map(k => {
      const v = r[k] == null ? '' : String(r[k]).replace(/"/g, '""');
      return `"${v}"`;
    });
    lines.push(vals.join(','));
  }
  return lines.join('\n');
}

export default function ScanEvents() {
  const { user } = useContext(AuthContext);
  const notify = useContext(NotificationContext);

  // filters
  const [q, setQ] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [resultLabel, setResultLabel] = useState('');
  const [minRisk, setMinRisk] = useState('');
  const [maxRisk, setMaxRisk] = useState('');
  const [minConfidence, setMinConfidence] = useState('');
  const [maxConfidence, setMaxConfidence] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  // paging and sorting
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  // data
  const { data: universitiesData } = useGet('/api/universities');
  const universities = (universitiesData && universitiesData.universities) || [];

  const [documentTypes, setDocumentTypes] = useState([]);

  // useGet for scan events, but will call refetch manually
  const { data: scanPage, loading, error, refetch } = useGet('/api/scan-events', { immediate: false, params: { page, pageSize } });

  useEffect(() => {
    // if user is UNIVERSITY_ADMIN, preselect their university
    if (user && user.role === 'UNIVERSITY_ADMIN' && user.universityId) {
      setUniversityId(user.universityId);
    }
  }, [user]);

  // fetch document types when university changes
  useEffect(() => {
    let canceled = false;
    async function load() {
      if (!universityId) {
        setDocumentTypes([]);
        setDocumentTypeId('');
        return;
      }
      try {
        const data = await api.get(`/api/universities/${universityId}/document-types`);
        if (!canceled) setDocumentTypes(data.documentTypes || []);
      } catch (err) {
        console.error('Failed to load document types', err);
        setDocumentTypes([]);
      }
    }
    load();
    return () => { canceled = true; };
  }, [universityId]);

  // build params memo
  const params = useMemo(() => {
    const p = { q: q || undefined, universityId: universityId || undefined, documentTypeId: documentTypeId || undefined, resultLabel: resultLabel || undefined, minRiskScore: minRisk || undefined, maxRiskScore: maxRisk || undefined, minConfidence: minConfidence || undefined, maxConfidence: maxConfidence || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, country: country || undefined, city: city || undefined, page, pageSize, sortBy, sortDir };
    return p;
  }, [q, universityId, documentTypeId, resultLabel, minRisk, maxRisk, minConfidence, maxConfidence, dateFrom, dateTo, country, city, page, pageSize, sortBy, sortDir]);

  // fetch data when params change
  useEffect(() => {
    refetch({ params }).catch(() => {});
  }, [refetch, JSON.stringify(params)]);

  const items = (scanPage && scanPage.items) || [];
  const total = (scanPage && scanPage.total) || 0;

  function changeSort(column) {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  }

  async function exportCsv() {
    // fetch all matching (use large pageSize) or fetch current page only — request asks current filtered results, we'll fetch all up to 5000
    const fetchParams = { ...params, page: 1, pageSize: 5000 };
    try {
      const res = await api.get('/api/scan-events', { params: fetchParams });
      const rows = (res.items || []).map(r => ({
        createdAt: r.createdAt,
        universityId: r.universityId,
        documentTypeId: r.documentTypeId,
        resultLabel: r.resultLabel,
        riskScore: r.riskScore,
        confidence: r.confidence,
        studentId: r.ocrFields && r.ocrFields.studentId,
        name: r.ocrFields && r.ocrFields.name,
        reasons: (r.reasons || []).join(';')
      }));
      const csv = toCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scan-events-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify && notify.error('Failed to export CSV: ' + (err.message || err));
    }
  }

  const [detailId, setDetailId] = useState(null);
  // details will be handled by the side-drawer component

  return (
    <div className="scan-events-page">
      <h2>Scan Events</h2>

      <div className="controls">
        <div className="left-controls">
          <input placeholder="Search docHash, studentId, name..." value={q} onChange={e => setQ(e.target.value)} />

          {user && user.role === 'SUPER_ADMIN' && (
            <select value={universityId} onChange={e => setUniversityId(e.target.value)}>
              <option value="">All Universities</option>
              {universities.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          )}

          <select value={documentTypeId} onChange={e => setDocumentTypeId(e.target.value)}>
            <option value="">All Document Types</option>
            {documentTypes.map(d => <option key={d._id} value={d._id}>{d.name} {d.version}</option>)}
          </select>

          <select value={resultLabel} onChange={e => setResultLabel(e.target.value)}>
            <option value="">All Labels</option>
            <option value="AUTHENTIC">AUTHENTIC</option>
            <option value="SUSPICIOUS">SUSPICIOUS</option>
            <option value="FORGED">FORGED</option>
          </select>

          <button className="btn" onClick={() => { setPage(1); refetch({ params }); }}>Apply</button>
          <button className="btn outline" onClick={() => { setQ(''); setUniversityId(''); setDocumentTypeId(''); setResultLabel(''); setMinRisk(''); setMaxRisk(''); setMinConfidence(''); setMaxConfidence(''); setDateFrom(''); setDateTo(''); setCountry(''); setCity(''); setPage(1); }}>Reset</button>
        </div>

        <div className="right-controls">
          <button className="btn" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="filters-extended">
        <label>Risk Score range
          <input type="number" placeholder="min" value={minRisk} onChange={e => setMinRisk(e.target.value)} />
          <input type="number" placeholder="max" value={maxRisk} onChange={e => setMaxRisk(e.target.value)} />
        </label>
        <label>Confidence range
          <input type="number" step="0.01" placeholder="min" value={minConfidence} onChange={e => setMinConfidence(e.target.value)} />
          <input type="number" step="0.01" placeholder="max" value={maxConfidence} onChange={e => setMaxConfidence(e.target.value)} />
        </label>
        <label>Date from
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </label>
        <label>Date to
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </label>
        <label>Country
          <input value={country} onChange={e => setCountry(e.target.value)} />
        </label>
        <label>City
          <input value={city} onChange={e => setCity(e.target.value)} />
        </label>
      </div>

      <div className="table-wrap">
        <table className="events-table">
          <thead>
            <tr>
              <th onClick={() => changeSort('createdAt')}>Time {sortBy === 'createdAt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
              <th>University</th>
              <th>Doc Type</th>
              <th>Label</th>
              <th onClick={() => changeSort('riskScore')}>Risk {sortBy === 'riskScore' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
              <th onClick={() => changeSort('confidence')}>Confidence {sortBy === 'confidence' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
              <th>Student ID</th>
              <th>Reasons</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8"><Skeleton rows={4} cols={8} /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="8">No results</td></tr>
            ) : items.map(r => (
              <tr key={r._id} onClick={() => setDetailId(r._id)} className="clickable">
                <td>{formatDate(r.createdAt)}</td>
                <td>{r.universityId}</td>
                <td>{r.documentTypeId}</td>
                <td>{r.resultLabel}</td>
                <td>{r.riskScore}</td>
                <td>{r.confidence}</td>
                <td>{r.ocrFields && r.ocrFields.studentId}</td>
                <td>{r.reasons && r.reasons.join(', ')}</td>
              </tr>
            ))}
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

      {detailId && (
        <React.Suspense fallback={<div /> }>
          <ScanEventDetails scanEventId={detailId} onClose={() => setDetailId(null)} onCaseCreated={(c) => { /* optionally refresh list */ }} />
        </React.Suspense>
      )}
    </div>
  );
}
