import React, { useMemo } from 'react';
import useGet from '../hooks/useGet';
import { api } from '../api';
import './overview.css';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, CartesianGrid
} from 'recharts';

function KpiCard({ title, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

export default function Overview() {
  // overview
  const { data: overview, loading: loadingOverview } = useGet('/api/analytics/overview');

  // timeseries last 30 days daily
  const today = new Date();
  const prior = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  const { data: timeseries, loading: loadingTimeseries } = useGet('/api/analytics/timeseries', { params: { dateFrom: prior.toISOString().slice(0,10), dateTo: today.toISOString().slice(0,10), granularity: 'day' } });

  // recent scan events
  const { data: scanPage, loading: loadingScans } = useGet('/api/scan-events', { params: { page: 1, pageSize: 20, sortBy: 'createdAt', sortDir: 'desc' } });

  const lineData = useMemo(() => {
    if (!timeseries) return [];
    return timeseries.map(d => ({ date: d.date.slice(0,10), authentic: d.authentic, suspicious: d.suspicious, forged: d.forged }));
  }, [timeseries]);

  const reasonsData = useMemo(() => {
    if (!overview || !overview.topReasons) return [];
    return overview.topReasons.map(r => ({ reason: r.reason, count: r.count }));
  }, [overview]);

  const recent = (scanPage && scanPage.items) || [];

  return (
    <div className="overview-page">
      <h2>Overview</h2>

      <div className="kpi-row">
        <KpiCard title="Total Scans" value={loadingOverview ? '...' : (overview ? overview.totalScans : 0)} />
        <KpiCard title="Fraud Rate" value={loadingOverview ? '...' : (overview ? ( (overview.fraudRateEstimate*100).toFixed(2) + '%' ) : '0%')} />
        <KpiCard title="Suspicious Rate" value={loadingOverview ? '...' : (overview ? ((overview.suspiciousRate*100).toFixed(2) + '%') : '0%')} />
        <KpiCard title="Avg Risk Score" value={loadingOverview ? '...' : (overview ? Number(overview.avgRiskScore).toFixed(1) : '0')} />
        <KpiCard title="Avg Confidence" value={loadingOverview ? '...' : (overview ? Number(overview.avgConfidence).toFixed(2) : '0.00')} />
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>Scans by label (last 30 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="authentic" stroke="#10b981" />
              <Line type="monotone" dataKey="suspicious" stroke="#f59e0b" />
              <Line type="monotone" dataKey="forged" stroke="#ef4444" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Top Reasons</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={reasonsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="reason" type="category" width={160} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="recent-card">
        <h3>Recent Scan Events</h3>
        <div className="table-wrap">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>University</th>
                <th>Doc Type</th>
                <th>Label</th>
                <th>Risk</th>
                <th>Confidence</th>
                <th>Student ID</th>
                <th>Reasons</th>
              </tr>
            </thead>
            <tbody>
              {loadingScans ? (
                <tr><td colSpan="8">Loading...</td></tr>
              ) : recent.length === 0 ? (
                <tr><td colSpan="8">No events</td></tr>
              ) : (
                recent.map(r => (
                  <tr key={r._id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.universityId}</td>
                    <td>{r.documentTypeId}</td>
                    <td>{r.resultLabel}</td>
                    <td>{r.riskScore}</td>
                    <td>{r.confidence}</td>
                    <td>{r.ocrFields && r.ocrFields.studentId}</td>
                    <td>{r.reasons && r.reasons.join(', ')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
