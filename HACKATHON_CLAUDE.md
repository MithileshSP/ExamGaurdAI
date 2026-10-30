# CLAUDE.md for a 4-hour hackathon

Copy this file to `CLAUDE.md` in an empty repo before the clock starts.
The problem statement (PS) arrives at 0:00, and the whole build has 4 hours.
Claude is the user's pair programmer. The user must be able to explain every
line to the judges.

These rules override the global oh-my-claudecode rules for this repo:
delegation, model routing, separate reviewer passes and the AA task board.

## Rules

1. Write all code yourself in the main session. Never hand code-writing to
   subagents or background agents. Why: code written out of sight reaches
   the user unexplained, and they are the one who has to defend it.
2. Work in steps. A step is one runnable file or one change. After each
   step, run it, show the key output, and explain it in at most 5 bullets:
   what it does, why, and how it connects to the previous step. Then go on to
   the next step in the same phase without asking.
3. Standard library first (Python 3.14). Allowed packages: `fastapi`,
   `uvicorn`, plus anything the PS forces. Never use Streamlit, Gradio,
   LangChain, an ORM, or a frontend build step (npm, React, Vite). Why: the
   user ruled out Streamlit, and every package is one more thing to install,
   debug and explain.
4. Ask questions once. At the end of Understand, send one AskUserQuestion
   with up to 4 questions, recommended option first. After that, pick
   sensible defaults and state each choice in one line. Why: every round
   trip costs minutes.
5. Nothing is done until you have run it and shown the output.
6. Keep the API key in `.env` (mode 600, listed in `.gitignore`). Never
   print it or write it into code.
7. `git init` at 0:00 and commit at every phase gate with a one-line
   message. Why: a known-good point to roll back to at 3:45.
8. Deliverables are local files. Never publish Artifacts.

## Clock

Run `date` at 0:00 and write the start time into `PROBLEM.md`. At every
gate, run `date` again and say in one line how far ahead of or behind the
table you are.

| Time | Phase | Done when |
|---|---|---|
| 0:00–0:15 | Understand | `PROBLEM.md` holds the PS word for word plus a checklist of every required output; the data is downloaded and profiled; the pipeline is proposed in at most 10 lines; the user has answered the one question batch |
| 0:15–0:45 | Data | `data/` holds clean CSVs, and a printed table shows the planted signals are in them |
| 0:45–2:00 | Core | `python3 analyze.py` runs end to end, writes `report.md`, and the report names the planted ground truth |
| 2:00–3:00 | UI | `uvicorn app:app` serves the page with the chart and the report |
| 3:00–3:30 | Harden | the UI falls back to the cached `report.md`; `README.md` has run steps and the Defend section; one full dry run of the demo |
| 3:30–4:00 | Freeze | no new features; rehearse the demo |

If Core is not working end to end by 2:15, drop the UI and demo the CLI and
`report.md` instead. Never skip Harden.

## Opening move, when the PS arrives

1. Transcribe the PS (often a photo) into `PROBLEM.md`, word for word.
2. Under it, list every required output and every named data field as a
   checklist.
3. Download the data into its own folder under `data/`. Profile it: size,
   time span, columns or levels, top message types, and what is real versus
   what has to be synthesised. Write the findings under the PS.
4. Propose the pipeline below, adapted to the PS.
5. Ask the one question batch: LLM, demo surface, any story choice.

## Default pipeline for data + AI problems

```
data/<source>/  ->  generate.py  ->  data/*.csv  ->  analyze.py  ->  report.md
                                                          |
                                     app.py + static/index.html (imports analyze)
```

- `generate.py` loads the real data and makes any synthetic data. It writes
  one file per data source the PS names, so the correlation step is real.
- `analyze.py` merges everything onto one timeline, detects anomalies with
  plain rules (for example 3x the median), builds a short evidence pack per
  anomaly, sends it to the LLM, and writes `report.md` with the evidence
  appended. Write it as functions plus an `if __name__ == "__main__":` block
  from the start, so `app.py` can import it.
- Code does the counting, joining and detection. The LLM only reads the
  evidence pack (at most about 2 pages) and explains it. Why: the code part
  is deterministic and checkable, and LLMs reason well over summaries but
  badly over raw tables.

## Lessons from the mock run

The mock lives in `/home/ade/Code/tcsai`. Read its `generate.py`,
`analyze.py` and `report.md` before building anything similar, and reuse
their patterns.

- Profile the full dataset, not only the sample. The GitHub sample was a
  2,000-line selection; the full Zenodo log had a second failure type.
- Every synthetic effect needs a believable cause. In the mock, a bot scan
  at 6 requests a second was made to slow the site, and DeepSeek rejected
  it, rightly. Only errors that affect everyone should drive shared latency.
- Plant the ground truth, write it in `generate.py`'s docstring, fix
  `random.seed`, and check that the report names the planted cause.
- Add at least one decoy, a real and tempting wrong suspect, and make each
  incident need a different data source to solve. Why: that shows the tool
  reasons, instead of echoing the only signal it was given.
- Never cut evidence to a top-N without checking what got cut. In the mock,
  a top-10 cap hid the 4 key log lines and the LLM got that incident wrong.
- "Slow = 3x the median" breaks when the portal is slow for most of the
  data: the median becomes the slow speed. Use a fixed target (pages over
  1 s) unless the PS gives one.
- A given dataset may hold several cases on the same timestamps and an
  answer column (the mock's `scenario`). Split it into one folder per case,
  write the answer only to `answer.txt`, and never let it reach the LLM.
  Show it on the page behind a click, so the judges can score the result.
- Show trends, not only "before vs during" averages. A memory leak is a
  climb while load stays flat; the mock's evidence uses four windows
  (30-15 and 15-0 minutes before, first and last 10 minutes of the incident).
- Make every script take a case folder (`data/sessions/<name>/`) from the
  start. Bolting this on later touched every file in the mock.
- One DeepSeek call with thinking on took 1–2 minutes. Precompute
  `report.md`, and have the UI show the cached report instantly; re-running
  is optional.

## DeepSeek (default LLM)

At 0:00, confirm the key works and see which models exist. Models change:
on 2026-10-29 they were `deepseek-flash` and `deepseek-v4-pro`.

```bash
set -a; . ./.env; set +a
curl -s https://api.deepseek.com/models -H "Authorization: Bearer $DEEPSEEK_API_KEY"
```

Call it with `urllib`, no SDK. This worked in the mock:

```python
def ask_deepseek(text):
    body = {
        "model": MODEL,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT},
                     {"role": "user", "content": text}],
        "thinking": {"type": "enabled"},
        "stream": False,
    }
    request = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.load(response)["choices"][0]["message"]["content"]
```

A system prompt for the LLM says, in this order: who the model is and what
system it is looking at; what the evidence contains; the report sections
required; and "Use only the evidence given. If the evidence does not settle
something, say so."

## UI (FastAPI + one HTML page)

- `app.py`: `GET /` serves `static/index.html`; `GET /api/timeline` returns
  the chart data as JSON; `GET /api/report` returns the cached `report.md`;
  `POST /api/analyze` reruns the analysis.
- `static/index.html`: plain HTML and JavaScript, Chart.js for the timeline
  with incidents shaded, marked.js to render the report. Load both from
  files in `static/`, not from a CDN. Why: venue Wi-Fi.
- One small chart per metric, grouped by data source, never one chart with
  two y-axes. Force every y-axis to the same width
  (`afterFit: (scale) => { scale.width = 50; }`) so the minutes line up.
- Add one zoom button per incident. Over a whole day an incident is a
  sliver; zoomed in, the judges can see which line moves first.
- Check the page by looking at it: take a headless screenshot and Read the
  PNG. A 200 status does not show that the chart drew.
  `~/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome --headless=new --no-sandbox --window-size=1200,1400 --virtual-time-budget=5000 --screenshot=page.png http://127.0.0.1:8000/`
- The mock's `app.py` and `static/index.html` are a working starting point:
  copy them, then change the series and labels.

## Demo and judges

- The demo takes 3 minutes: the problem in one sentence, then the timeline
  with the incidents, then the report: root cause, ruled-out suspects, fix
  and prevention.
- `README.md` has a "Defend" section of likely judge questions, each with a
  one-line answer. Start with: Why is the data synthetic? Why an LLM rather
  than rules? What if the API is down? What would you build next?

## Before Saturday (for the user, not Claude)

- [ ] An empty repo with this file copied in as `CLAUDE.md`
- [ ] `.venv` made with `uv venv .venv && uv pip install --python .venv fastapi uvicorn`
      (`python3 -m venv` fails on this laptop because Ubuntu leaves out pip)
- [ ] `.env` with `DEEPSEEK_API_KEY`, and the curl above lists models
- [ ] `static/chart.umd.js` (Chart.js 4.4.1) and `static/marked.min.js`
      (marked 12.0.2), copied from the mock repo
- [x] The mock repo has a working `app.py` and `static/index.html` (2026-10-29)
