FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY mt5_bridge.py .

# Expose port (will be set by Railway)
EXPOSE ${PORT:-8000}

# Run the FastAPI application with dynamic port
CMD sh -c "uvicorn mt5_bridge:app --host 0.0.0.0 --port ${PORT:-8000}"
