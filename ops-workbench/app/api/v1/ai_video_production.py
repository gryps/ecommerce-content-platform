from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.domain.models import AdminUser
from app.services.ai_video.comfyui_client import ComfyUIClient
from app.services.ai_video.director import draft_shots
from app.services.ai_video.executor import submit_generation_task
from app.services.ai_video.models import Asset, GenerationTask, ProductProject, Shot, TaskEvent, WorkbenchStore
from app.services.ai_video.store import repository
from app.services.auth import require_admin


router = APIRouter(prefix="/ai-video", tags=["ai-video-production"])


@router.get("/workbench", response_model=WorkbenchStore)
def get_workbench(_admin: AdminUser = Depends(require_admin)) -> WorkbenchStore:
    return repository.load()


@router.post("/projects", response_model=ProductProject, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProductProject, _admin: AdminUser = Depends(require_admin)) -> ProductProject:
    project = ProductProject(**payload.model_dump(exclude={"id", "created_at", "updated_at"}))
    return repository.add_project(project)


@router.post("/assets", response_model=Asset, status_code=status.HTTP_201_CREATED)
def create_asset(payload: Asset, _admin: AdminUser = Depends(require_admin)) -> Asset:
    asset = Asset(**payload.model_dump(exclude={"id", "created_at", "updated_at"}))
    try:
        return repository.add_asset(asset)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/assets/upload", response_model=Asset, status_code=status.HTTP_201_CREATED)
def upload_asset(
    project_id: str = Form(...),
    kind: str = Form(...),
    name: str = Form(""),
    notes: str = Form(""),
    file: UploadFile = File(...),
    _admin: AdminUser = Depends(require_admin),
) -> Asset:
    store = repository.load()
    if not any(project.id == project_id for project in store.projects):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI视频项目不存在")
    filename = Path(file.filename or "asset.bin").name
    asset_id = Asset(project_id=project_id, kind=kind, name=name or filename, notes=notes).id
    storage_dir = repository.storage_root / "uploads" / project_id / asset_id
    storage_dir.mkdir(parents=True, exist_ok=True)
    target = storage_dir / filename
    with target.open("wb") as output:
        shutil.copyfileobj(file.file, output)
    asset = Asset(project_id=project_id, id=asset_id, kind=kind, name=name or filename, notes=notes, file_path=str(target))
    return repository.add_asset(asset)


@router.post("/director/draft-shots", response_model=list[Shot])
def create_director_shots(payload: dict[str, str], _admin: AdminUser = Depends(require_admin)) -> list[Shot]:
    project_id = payload.get("project_id", "")
    store = repository.load()
    project = next((item for item in store.projects if item.id == project_id), None)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI视频项目不存在")
    return repository.replace_project_shots(project.id, draft_shots(project))


@router.post("/generation/tasks", response_model=GenerationTask, status_code=status.HTTP_201_CREATED)
def create_generation_task(payload: GenerationTask, _admin: AdminUser = Depends(require_admin)) -> GenerationTask:
    task = GenerationTask(**payload.model_dump(exclude={"id", "status", "created_at", "updated_at"}), status="queued")
    try:
        return repository.add_task(task)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/generation/tasks/{task_id}/submit", response_model=GenerationTask)
async def submit_task(task_id: str, _admin: AdminUser = Depends(require_admin)) -> GenerationTask:
    try:
        return await submit_generation_task(task_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/generation/tasks/{task_id}/events", response_model=list[TaskEvent])
def list_task_events(task_id: str, _admin: AdminUser = Depends(require_admin)) -> list[TaskEvent]:
    try:
        return repository.task_events(task_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/comfyui/health")
async def comfyui_health(_admin: AdminUser = Depends(require_admin)) -> dict:
    return await ComfyUIClient().health()
