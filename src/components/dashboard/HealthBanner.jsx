import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';

export default function HealthBanner() {
  return (
    <section className="card health-banner" aria-live="polite">
      <div className="banner-left">
        <div className="banner-icon-wrap">
          <AlertCircle size={18} />
        </div>
        <div>
          <div className="banner-title-line">
            <h2>System status: Degraded</h2>
            <span className="banner-tag">Active incident</span>
          </div>
          <p className="banner-desc">
            Elevated database latency detected during active examination. 3 incidents active (1 critical).
          </p>
          <div className="banner-meta-strip font-mono small">
            <span>Response: 1,850 ms</span>
            <span className="sep">·</span>
            <span>DB latency: 1,240 ms</span>
            <span className="sep">·</span>
            <span>Active examinees: 4,820</span>
          </div>
        </div>
      </div>

      <div className="banner-right">
        <Link className="btn primary" to="/incidents/INC-001">
          <span>Investigate INC-001</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  );
}
