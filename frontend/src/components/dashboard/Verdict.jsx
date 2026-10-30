import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

// DeepSeek's verdict on incident n, read out of the report's Markdown. The prompt
// (analyze.SYSTEM_PROMPT) asks for a "### Incident n" part per incident that opens
// with its cause, then weighs the other causes in bullets that start in bold.
// The report is free text, so this is a best effort: what is not found is left out,
// and the full report is one click away.
function verdict(report, n) {
  const part = report.split(/^### /m).find((p) => new RegExp(`^Incident ${n}\\b`).test(p));
  if (!part) return null;
  const body = part.split(/^## /m)[0]; // the last incident runs into "## 4. Resolution"
  const plain = (text) => text.replace(/\*\*|`/g, '').trim();

  // The first paragraph after the heading, without its "Cause:" label, first sentence only.
  const first = plain(body.slice(body.indexOf('\n')).trim().split(/\n\s*\n/)[0])
    .replace(/^(root )?cause[^:]*:\s*/i, '');
  const sentence = first.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? first;

  // Bullets like "- **CPU — ruled out:** ..." or "- **Memory:** not supported as primary cause."
  const ruledOut = [];
  for (const [, lead, rest] of body.matchAll(/^\s*[-*]\s+\*\*(.+?)\*\*(.*)$/gm)) {
    const text = lead + rest;
    if (/ruled out|not supported|does not support|no evidence/i.test(text)
        && !/not (conclusively )?ruled out|supported as the primary/i.test(text)) {
      ruledOut.push(lead.split(/\s[—–-]\s|:/)[0].trim());
    }
  }
  return { cause: sentence.charAt(0).toUpperCase() + sentence.slice(1), ruledOut };
}

export default function Verdict({ inc }) {
  const { data, analysis, runAnalysis, reports } = useApp();
  // While DeepSeek writes, read the report as it streams in; otherwise the saved one.
  const run = analysis?.session === data.name ? analysis : null;
  const report = (run?.running ? run.report : reports[data.name]) ?? '';
  const found = verdict(report, Number(inc.id.slice(4))); // "INC-2" -> 2

  return (
    <section className="card verdict">
      <div className="verdict-head">
        <h3>Root cause, by DeepSeek</h3>
        <button className="btn btn-xs" onClick={runAnalysis} disabled={analysis?.running}>
          <Sparkles size={13} /> {run?.running ? 'Writing…' : found ? 'Run again' : 'Run analysis'}
        </button>
      </div>
      {found?.cause ? (
        <p className="verdict-cause">{found.cause}</p>
      ) : (
        <p className="muted">
          {run?.running ? 'DeepSeek is reading the evidence…' : `No verdict on ${inc.id} yet. Run the analysis (1-2 minutes).`}
        </p>
      )}
      {found?.ruledOut.length > 0 && (
        <p className="small mt-sm"><span className="muted">Ruled out:</span> {found.ruledOut.join(', ')}</p>
      )}
      <p className="small mt-sm"><Link className="link" to="/rca">Open the full report</Link></p>
    </section>
  );
}
