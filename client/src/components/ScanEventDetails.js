import React, { useEffect, useState, useContext } from 'react';
import { api } from '../api';
import './scanEventDetails.css';
import { NotificationContext } from '../context/NotificationContext';
import Skeleton from './Skeleton';

export default function ScanEventDetails({ scanEventId, onClose, onCaseCreated }) {
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let canceled = false;
    async function load() {
      if (!scanEventId) return;
      setLoading(true);
      try {
        const res = await api.get(`/api/scan-events/${scanEventId}`);
        if (!canceled) setEvent(res.scanEvent || res);
      } catch (err) {
        console.error('Failed to load scan event', err);
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    load();
    return () => { canceled = true; };
  }, [scanEventId]);

  const notify = useContext(NotificationContext);

  async function createFraudCase() {
    if (!scanEventId) return;
    setCreating(true);
    try {
      const res = await api.post('/api/fraud-cases', { scanEventId });
      if (res && res.fraudCase) {
        if (onCaseCreated) onCaseCreated(res.fraudCase);
        notify && notify.success('Fraud Case created');
      } else {
        notify && notify.info('Created (no response body)');
      }
    } catch (err) {
      notify && notify.error('Failed to create fraud case: ' + (err.message || JSON.stringify(err)));
    } finally {
      setCreating(false);
    }
  }

  if (!scanEventId) return null;

  return (
    <div className="sed-drawer">
      <div className="sed-content">
        <button className="sed-close" onClick={onClose}>×</button>
  {loading ? <Skeleton rows={6} cols={2} /> : event ? (
          <div className="sed-body">
            <h3>Scan Event</h3>
            <div className="row">
              <div><strong>University</strong><div>{event.universityName || event.universityId}</div></div>
              <div><strong>Document Type</strong><div>{event.documentTypeName || event.documentTypeId}</div></div>
              <div><strong>Label</strong><div>{event.resultLabel}</div></div>
              <div><strong>Confidence</strong><div>{event.confidence}</div></div>
              <div><strong>Risk Score</strong><div>{event.riskScore}</div></div>
            </div>

            <div className="section">
              <h4>Reasons</h4>
              {event.reasons && event.reasons.length ? (
                <ul>
                  {event.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              ) : <div>None</div>}
            </div>

            <div className="section">
              <h4>OCR Fields</h4>
              {event.ocrFields ? (
                <div className="ocr-grid">
                  {Object.entries(event.ocrFields).map(([k, v]) => (
                    <div className="ocr-row" key={k}><div className="ocr-key">{k}</div><div className="ocr-val">{String(v)}</div></div>
                  ))}
                </div>
              ) : <div>No OCR data</div>}
            </div>

            <div className="section">
              <h4>Geo</h4>
              <div>Country: {event.geoCountry}</div>
              <div>City: {event.geoCity}</div>
              <div>Device Language: {event.deviceLanguage}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={createFraudCase} disabled={creating}>{creating ? 'Creating…' : 'Create Fraud Case'}</button>
            </div>

          </div>
        ) : <div>No event</div>}
      </div>
    </div>
  );
}
