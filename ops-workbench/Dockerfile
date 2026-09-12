# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS frontend-build

WORKDIR /src/ops-workbench/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


FROM python:3.12-slim-bookworm AS runtime

ARG APP_VERSION=dev

LABEL org.opencontainers.image.title="Ecommerce Content Platform" \
      org.opencontainers.image.description="Video production and AI video workbench for ecommerce teams" \
      org.opencontainers.image.version="${APP_VERSION}"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PVA_RUNTIME_DIR=/home/gryps/apps/ecommerce-ops-platform/ops-workbench-runtime \
    PVA_WORKSPACE_DIR=/home/gryps/apps/ecommerce-ops-platform/ops-workbench-runtime/workspace \
    PVA_STATIC_DIR=/app/static-workbench \
    PVA_MOUNT_ROOTS='["/home/gryps/apps/ecommerce-ops-platform/ops-workbench-runtime"]' \
    PVA_COMFYUI_BASE_URL=http://host.docker.internal:8188

RUN apt-get update \
    && apt-get install --no-install-recommends -y ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --create-home --shell /usr/sbin/nologin app

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=app:app alembic.ini ./
COPY --chown=app:app app ./app
COPY --chown=app:app migrations ./migrations
COPY --chown=app:app workflows ./workflows
COPY --from=frontend-build --chown=app:app /src/ops-workbench-runtime/static-workbench ./static-workbench

USER app

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
