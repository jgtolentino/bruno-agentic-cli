FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV DASH_ENV=production
CMD ["gunicorn", "app:server", "--bind", "0.0.0.0:8080", "--workers", "2"]