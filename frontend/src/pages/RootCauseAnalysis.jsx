import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Download, ShieldCheck, Sparkles } from 'lucide-react';
import { marked } from 'marked';
import PageHeader from '../components/layout/PageHeader.jsx';
import { SeverityBadge } from '../components/common/Badge.jsx';
import { useApp } from '../context/AppContext.jsx';

// The report quotes Apache log lines, which attackers choose (bots pick the URLs they
// request). So raw HTML in it is shown as text, and only web links stay clickable.
marked.use({
  renderer: { html: ({ text }) => text.replaceAll('<', '&lt;') },
  walkTokens: (t) => { if (t.type === 'link' && !/^(https?:|mailto:|#)/i.test(t.href)) t.href = '#'; },
});

export default function RootCauseAnalysis() {
  const { data, sessions, analysis, runAnalysis, reports } = useApp();
  const answer = sessions.find((s) => s.name === data.name)?.answer;
  // The run for this session, if there is one: streaming now, failed, or just finished.
  const run = analysis?.session === data.name ? analysis : null;
  const writing = run?.running && run.report === '';
  const report = run?.running ? run.report : reports[data.name];
  const thinkingBox = useRef(null);

  // Keep the newest reasoning in sight while it streams in.
  useEffect(() => {
    if (thinkingBox.current) thinkingBox.current.scrollTop = thinkingBox.current.scrollHeight;
  }, [run?.thinking]);

  return (
    <>
      <PageHeader
        title="Root cause analysis"
        description="DeepSeek reads the evidence pack for the whole session and writes the incident report."
        actions={
          <>
            <button className="btn" onClick={() => window.print()}>
              <Download size={15} /> Export PDF
            </button>
            <button className="btn primary" onClick={runAnalysis} disabled={analysis?.running}>
              <Sparkles size={15} /> {analysis?.running ? 'Analyzing…' : 'Run analysis'}
            </button>
          </>
        }
      />

      <div className="incident-chips">
        {data.incidents.map((inc) => (
          <Link key={inc.id} to={`/incidents/${inc.id}`} className="incident-chip">
            <SeverityBadge level={inc.severity} />
            <span className="num">{inc.id}, {inc.start}–{inc.end}</span>
          </Link>
        ))}
        {data.incidents.length === 0 && <span className="muted">No incidents in this session.</span>}
      </div>

      {run?.error && (
        <p className="notice notice-alarm">The analysis stopped: {run.error}. The last saved report is shown.</p>
      )}

      {run && run.thinking && (
        <details className="reasoning" open={writing}>
          <summary>
            {writing && <span className="live-dot" />}
            {writing ? 'DeepSeek is reasoning' : 'How DeepSeek reasoned'}
            <span className="muted"> {run.thinking.split(/\s+/).length} words</span>
          </summary>
          <div className="reasoning-text" ref={thinkingBox}>{run.thinking}</div>
        </details>
      )}
      {run?.running && !run.thinking && <p className="notice"><span className="live-dot" /> Sending the evidence pack to DeepSeek…</p>}

      {report && (
        <article className={`panel report markdown ${run?.running ? 'is-streaming' : ''}`}
                 dangerouslySetInnerHTML={{ __html: marked.parse(report) }} />
      )}

      <details className="panel answer-key">
        <summary>Answer key (DeepSeek never sees this)</summary>
        <p className="num">{answer}</p>
      </details>

      <p className="guardrail">
        <ShieldCheck size={16} /> ExamGuard suggests steps based on the evidence. It does not change any infrastructure itself.
      </p>
    </>
  );
}
