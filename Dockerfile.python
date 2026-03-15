FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY mt5_bridge.py .
COPY .env .env
COPY user_mt5_credentials.json user_mt5_credentials.json

# Expose port (FastAPI default)
EXPOSE 8000

# Run the FastAPI application
CMD ["uvicorn", "mt5_bridge:app", "--host", "0.0.0.0", "--port", "8000"]
