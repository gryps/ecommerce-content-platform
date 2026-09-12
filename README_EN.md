# Ecommerce Content Platform

[中文](README.md) | [English](README_EN.md)

Ecommerce Content Platform is a production workbench for short-video commerce teams. It covers the workflow from media organization, copywriting, voice-over, and music to Jianying draft assembly and AI video generation.

Current version: `3.1.0`

## Core Modules

### Video Production

- Media classification: select and upload videos from the browser user's computer, then organize them by product and tags.
- Copy library: manage reference copy, generate candidates, and record adoption decisions.
- Voice and music: manage narration, subtitle timelines, voice presets, and background music.
- Jianying drafts: combine media, copy, narration, and music into editable drafts.

### AI Video

- Manage product images, selling points, target audiences, and campaign styles.
- Generate and manually refine shot lists and video prompts.
- Support text-to-video, image-to-video, first/last-frame video, and ComfyUI workflows.
- Track generation jobs, provider task IDs, execution states, errors, and output files.

Model configuration remains available as a supporting backend capability, but it is no longer presented as a standalone business module.

## Scope

This repository focuses exclusively on content production. Store operations, live-commerce analytics, ad spending, orders and refunds, customer service, warehousing, finance, and operational reviews belong to the separate Douyin Store Management Platform. The former image-production module has also been removed from the current frontend, API, and service code.

Historical database tables and the Alembic migration chain are retained to support safe upgrades and rollback of existing installations. Retired business APIs are not exposed.

## Repository Layout

- `ops-workbench/`: FastAPI backend, React frontend, tests, and deployment scripts.
- `commerce-video-workbench/`: product and engineering documentation for video production, AI video, and ComfyUI.
- `docs/`: collaboration guides, project context, and small-host deployment notes.
- `ops-workbench/workflows/`: ComfyUI workflow definitions and examples.

## Technology

- Backend: Python, FastAPI, SQLAlchemy, Alembic, and SQLite.
- Frontend: React, TypeScript, and Vite.
- Media: FFmpeg, ffprobe, and Jianying draft generation.
- AI orchestration: vendor video API adapters and ComfyUI.
- Deployment: Linux and systemd user services.

## Run and Verify

See [ops-workbench/README.md](ops-workbench/README.md) for environment variables, installation, and deployment details.

```bash
cd ops-workbench
python -m compileall app
python -m pytest -q
npm --prefix frontend run build
```

## Docker Deployment

The repository-level `compose.yaml` builds an image containing the backend, frontend static assets, and FFmpeg. Databases, uploads, and generated media remain in a persistent host directory. See the [Docker deployment guide](docs/DOCKER_DEPLOYMENT.md) for details.

```bash
cp .env.docker.example .env
docker compose up -d --build
```

Runtime databases, uploaded assets, generated media, caches, API keys, and provider credentials must not be committed to Git.
