FROM python:3.11-slim

WORKDIR /app

ENV TZ=UTC
RUN apt-get update && apt-get install -y \
    tzdata \
    postgresql-client \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Create non-root user
RUN useradd -m -u 1000 medwaste && chown -R medwaste:medwaste /app
USER medwaste

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
