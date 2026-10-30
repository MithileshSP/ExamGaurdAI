# ==========================================
# Stage 1: Build the React Frontend
# Base Image: node:20-alpine
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy dependency manifests
COPY frontend/package.json frontend/package-lock.json ./

# Install frontend dependencies
RUN npm ci

# Copy source code
COPY frontend/ ./

# Build production bundle (outputs to /app/frontend/dist)
RUN npm run build

# ==========================================
# Stage 2: Python Backend & Application Server
# Base Image: python:3.11-slim
# ==========================================
FROM python:3.11-slim AS runner

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install curl for container healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files, static assets, and data directory explicitly into /app
COPY app.py analyze.py generate.py split_dataset.py db.py init.sql ./
COPY data/ /app/data/
COPY static/ /app/static/

# Copy compiled frontend from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose web server port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/sessions || exit 1

# Start Uvicorn serving both API and the React frontend
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

