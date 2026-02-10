FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
# Note: Using CPU-only PyTorch to reduce image size
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data for chatbot
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('wordnet'); nltk.download('punkt_tab')"

# Copy application code
COPY . .

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    mkdir -p /app/data && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Use gunicorn with 2 uvicorn workers for production
# 2 workers: one can handle health checks/status while the other runs a simulation
CMD ["gunicorn", "main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "--timeout", "300", "--graceful-timeout", "120"]
