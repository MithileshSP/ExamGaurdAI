# ExamGuard AI frontend

React + Vite. It started as a design with sample data; every number now comes from
the FastAPI backend in the repo root (`app.py`), through `src/api.js`.

    npm ci            # once
    npm run build     # writes dist/, which uvicorn serves at http://127.0.0.1:8000
    npm run dev       # live-reloading dev server on :5173, sends /api to uvicorn on :8000

Structure: `src/api.js` (all API calls) · `src/context/AppContext.jsx` (session, data, time range) ·
`src/pages` (routes) · `src/components/{layout,common,dashboard,incidents}` · `src/utils` · `src/styles`.
