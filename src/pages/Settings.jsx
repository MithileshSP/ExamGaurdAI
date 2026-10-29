import { useState } from 'react';
import PageHeader from '../components/layout/PageHeader.jsx';

export default function Settings() {
  const [t, setT] = useState({
    'CPU utilization threshold (%)': 85,
    'Memory utilization threshold (%)': 90,
    'Database latency threshold (ms)': 500,
    'Error rate SLA threshold (%)': 2,
  });

  return (
    <>
      <PageHeader
        title="Settings"
        description="Diagnostic thresholds. Changes apply to this session."
      />

      <section className="card form-card">
        <h3>Diagnostic alert thresholds</h3>
        <p className="muted small mb-md">
          ExamGuard AI triggers incident correlation when telemetry sustains values above these thresholds.
        </p>

        <div className="threshold-grid">
          {Object.entries(t).map(([k, v]) => (
            <label key={k} className="threshold-field">
              <span className="field-title">{k}</span>
              <input
                type="number"
                value={v}
                onChange={(e) => setT({ ...t, [k]: Number(e.target.value) })}
                className="input-number"
              />
            </label>
          ))}
        </div>

        <div className="settings-note mt-lg">
          <span className="muted small">
            Data mode: Synthetic demo session. Telemetry matches the 10:10 UTC database degradation scenario.
          </span>
        </div>
      </section>
    </>
  );
}
