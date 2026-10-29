import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, ShieldCheck, Database, Server, Zap, Users } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader.jsx';
import HypothesisCard from '../components/incidents/HypothesisCard.jsx';
import { SeverityBadge, StatusBadge, Chip } from '../components/common/Badge.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { incidents } from '../data/mockIncidents.js';

const linkLabel = {
  observed: 'Observed telemetry anomaly',
  suspected: 'Suspected causal link',
  confirmed: 'Confirmed dependency link',
};

const causalChain = [
  {
    step: '1. Root Anomaly',
    title: 'Database Query Latency',
    status: 'observed',
    detail: 'Latency spiked from 95ms baseline to 1,240ms at 10:10 UTC.',
    icon: Database,
  },
  {
    step: '2. Application Tier',
    title: 'Worker Thread Queuing',
    status: 'suspected',
    detail: 'Worker threads queued waiting for slow database socket responses; E3 errors logged.',
    icon: Server,
  },
  {
    step: '3. API Gateway',
    title: 'Submission API 504 Timeouts',
    status: 'observed',
    detail: 'HTTP 504 errors increased from 0.6% baseline to 8.4%.',
    icon: Zap,
  },
  {
    step: '4. Student Impact',
    title: 'Student Submission Spinners',
    status: 'observed',
    detail: 'Students reported submissions spinning and freezing in examination halls.',
    icon: Users,
  },
];

export default function RootCauseAnalysis() {
  const { id = 'INC-001' } = useParams();
  const inc = incidents.find((i) => i.id === id) || incidents[0];
  const [activeStep, setActiveStep] = useState(causalChain[0]);

  if (!inc) return <EmptyState title="Incident not found" />;

  return (
    <>
      <PageHeader
        title="Root cause analysis"
        description={`${inc.id} · ${inc.title}`}
        actions={
          <Link className="btn" to={`/logs?incident=${inc.id}`}>
            View related logs
          </Link>
        }
      />

      {/* Primary Diagnosis Lead Card */}
      <section className="card lead-card">
        <div className="row gap wrap">
          <SeverityBadge level={inc.severity} />
          <StatusBadge status={inc.status} />
          <span className="muted small font-mono">
            {inc.service} · started {inc.started} UTC
          </span>
          <span className="confidence-pill">
            Confidence: <strong>{inc.confidence}</strong>
          </span>
        </div>

        <h2 className="mt">
          {inc.hypothesisState}: {inc.hypothesis}
        </h2>
        <p className="lead-summary">{inc.summary}</p>
      </section>

      {/* Visual Causal Flow Sequence */}
      <section className="card causal-sequence-card">
        <div className="section-head-sm">
          <h3>Visual symptom connection chain</h3>
          <span className="muted small">Click any step to inspect the symptom detail</span>
        </div>

        <div className="causal-steps-row">
          {causalChain.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = activeStep.title === item.title;
            return (
              <div key={item.step} className="causal-step-unit">
                <button
                  type="button"
                  className={`causal-box ${item.status} ${isSelected ? 'active-step' : ''}`}
                  onClick={() => setActiveStep(item)}
                >
                  <div className="step-tag-row">
                    <span className="step-tag">{item.step}</span>
                    <span className={`step-type-pill pill-${item.status}`}>{item.status}</span>
                  </div>
                  <div className="step-title-row">
                    <Icon size={15} className="step-icon" />
                    <strong>{item.title}</strong>
                  </div>
                </button>

                {idx < causalChain.length - 1 && (
                  <div className="step-arrow" aria-hidden="true">
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Step Explanation */}
        <div className="step-detail-box">
          <div className="step-detail-header">
            <span className="detail-step-name">Selected: {activeStep.title}</span>
            <span className="detail-status-note muted small">
              Classification: {linkLabel[activeStep.status] || activeStep.status}
            </span>
          </div>
          <p className="detail-text">{activeStep.detail}</p>
        </div>
      </section>

      {/* Main Grid: Ranked Hypotheses & Recommended Steps */}
      <div className="grid-main mt-lg">
        <div className="stack">
          <h2>Ranked hypotheses</h2>
          {inc.hypotheses && inc.hypotheses.length ? (
            inc.hypotheses.map((h) => <HypothesisCard key={h.name} h={h} open={h.rank === 1} />)
          ) : (
            <div className="card">
              <EmptyState
                title="Not evaluated"
                hint="The diagnostic engine has not ranked causes for this incident yet."
              />
            </div>
          )}
        </div>

        <div className="stack">
          <h2>Recommended next steps</h2>
          <div className="card flush">
            {inc.actions && inc.actions.length ? (
              inc.actions.map((a, i) => (
                <div key={a.text} className="action-row">
                  <span className="rank-badge">{i + 1}</span>
                  <div className="grow">
                    <strong>{a.text}</strong>
                    <div className="muted small">{a.purpose}</div>
                  </div>
                  <Chip tone={a.priority === 'High' ? 'bad' : 'warn'}>{a.priority}</Chip>
                </div>
              ))
            ) : (
              <EmptyState title="No actions recommended" />
            )}
          </div>

          <div className="guardrail-note">
            <ShieldCheck size={18} className="guardrail-icon" />
            <p className="muted small">
              ExamGuard AI suggests investigation steps based on telemetry patterns. It does not modify infrastructure automatically.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
