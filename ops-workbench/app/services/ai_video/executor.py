from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.services.ai_video.comfyui_client import ComfyUIClient
from app.services.ai_video.models import GenerationTask
from app.services.ai_video.store import repository


WORKFLOW_ROOT = Path(__file__).resolve().parents[3] / "workflows" / "comfyui"


def workflow_path(workflow_name: str) -> Path:
    safe_name = Path(workflow_name).name
    path = WORKFLOW_ROOT / f"{safe_name}.json"
    if path.exists():
        return path
    return WORKFLOW_ROOT / f"{safe_name}.example.json"


def load_workflow(workflow_name: str, task: GenerationTask) -> dict[str, Any]:
    path = workflow_path(workflow_name)
    if not path.exists():
        raise FileNotFoundError(f"未找到 ComfyUI workflow：{workflow_name}")
    raw = path.read_text(encoding="utf-8")
    rendered = (
        raw.replace("{{positive_prompt}}", task.prompt)
        .replace("{{negative_prompt}}", "")
        .replace("{{image_path}}", "")
        .replace("{{seed}}", "0")
    )
    workflow = json.loads(rendered)
    if "description" in workflow and "placeholder" in str(workflow["description"]).casefold():
        raise ValueError("当前 workflow 仍是占位文件，请先从 ComfyUI 导出 API 格式 workflow")
    return workflow


async def submit_generation_task(task_id: str, client: ComfyUIClient | None = None) -> GenerationTask:
    task = repository.get_task(task_id)
    if task.engine != "comfyui":
        return repository.update_task_status(
            task_id,
            status="failed",
            error="当前仅配置 ComfyUI 任务提交，厂商视频 API adapter 尚未绑定",
            event_type="adapter_missing",
            message="厂商视频 API adapter 尚未绑定",
            payload={"engine": task.engine},
        )
    try:
        workflow = load_workflow(task.workflow_name, task)
        queued = await (client or ComfyUIClient()).queue_prompt(workflow)
        return repository.update_task_status(
            task_id,
            status="running",
            provider_task_id=str(queued.get("prompt_id") or ""),
            event_type="submitted",
            message="任务已提交到 ComfyUI",
            payload=queued,
        )
    except Exception as exc:
        return repository.update_task_status(
            task_id,
            status="failed",
            error=str(exc),
            event_type="submit_failed",
            message="任务提交失败",
            payload={"error": str(exc), "workflow_name": task.workflow_name},
        )
