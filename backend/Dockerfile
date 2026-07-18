FROM python:3.11-slim

# Install LibreOffice for doc to docx conversion & system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-common \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create directory for uploads if not exists
RUN mkdir -p app/uploaded_qbs templates

# Expose port
EXPOSE 8000

# Start Uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
