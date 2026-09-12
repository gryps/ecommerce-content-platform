from __future__ import annotations

import time
import base64
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx

from app.ai import load_model_profiles, openai_authorization
from app.models import ModelProfile
from app.services.model_call_logs import record_business_model_call


VIDEO_PROFILE_STAGE = "ai_video_generation"


@dataclass(frozen=True)
class VideoInputFile:
    role: str
    path: str = ""
    url: str = ""


@dataclass(frozen=True)
class StandardVideoRequest:
    mode: str
    prompt: str
    negative_prompt: str = ""
    input_files: list[VideoInputFile] = field(default_factory=list)
    duration: int = 5
    aspect_ratio: str = "9:16"
    resolution: str = "720p"
    seed: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class StandardSubmitResult:
    provider: str
    provider_task_id: str
    status: str
    raw_response: dict[str, Any]


@dataclass(frozen=True)
class StandardTaskStatus:
    provider: str
    provider_task_id: str
    status: str
    output_paths: list[str] = field(default_factory=list)
    error: str = ""
    raw_response: dict[str, Any] = field(default_factory=dict)


class VideoProviderAdapter:
    provider_name = "video_provider"

    async def submit(self, request: StandardVideoRequest) -> StandardSubmitResult:
        raise NotImplementedError

    async def get_status(self, provider_task_id: str) -> StandardTaskStatus:
        raise NotImplementedError


def load_video_model_profile() -> ModelProfile:
    profile = next(
        (item for item in load_model_profiles(include_api_key=True) if item.stage == VIDEO_PROFILE_STAGE),
        None,
    )
    if profile is None or not profile.base_url.strip() or not profile.model.strip() or not profile.api_key.strip():
        raise RuntimeError("AI 视频生成模型配置不完整，请先在模型配置中填写接口地址、模型和 API Key")
    return profile


def _video_submit_endpoint(base_url: str) -> str:
    clean = base_url.rstrip("/")
    if clean.endswith("/video/generations"):
        return clean
    return f"{clean}/video/generations" if clean.endswith("/v1") else f"{clean}/v1/video/generations"


def _video_status_endpoint(base_url: str, provider_task_id: str) -> str:
    clean = base_url.rstrip("/")
    if clean.endswith("/video/generations"):
        return f"{clean}/{provider_task_id}"
    return f"{clean}/video/generations/{provider_task_id}" if clean.endswith("/v1") else f"{clean}/v1/video/generations/{provider_task_id}"


def _normal_status(value: str) -> str:
    clean = value.strip().casefold()
    if clean in {"queued", "pending", "submitted", "created"}:
        return "queued"
    if clean in {"running", "processing", "in_progress"}:
        return "running"
    if clean in {"succeeded", "success", "completed", "complete", "done"}:
        return "succeeded"
    if clean in {"failed", "failure", "error", "cancelled", "canceled"}:
        return "failed"
    return "running" if clean else "running"


def _first_text(value: Any, keys: tuple[str, ...]) -> str:
    if not isinstance(value, dict):
        return ""
    for key in keys:
        item = value.get(key)
        if isinstance(item, str) and item.strip():
            return item.strip()
    return ""


def _output_paths(data: dict[str, Any]) -> list[str]:
    rows = data.get("output_paths") or data.get("outputs") or data.get("data") or []
    if isinstance(rows, dict):
        rows = [rows]
    paths: list[str] = []
    if isinstance(rows, list):
        for item in rows:
            if isinstance(item, str) and item.strip():
                paths.append(item.strip())
            elif isinstance(item, dict):
                url = _first_text(item, ("url", "video_url", "file_url", "path"))
                if url:
                    paths.append(url)
    single = _first_text(data, ("url", "video_url", "file_url", "output_url"))
    if single:
        paths.append(single)
    return list(dict.fromkeys(paths))


def _kling_base_url(base_url: str) -> str:
    clean = base_url.rstrip("/")
    if clean.endswith("/v1"):
        return clean
    return f"{clean}/v1"


def _kling_submit_endpoint(base_url: str, mode: str) -> str:
    endpoint = "image2video" if mode in {"i2v", "first_last_frame"} else "text2video"
    return f"{_kling_base_url(base_url)}/videos/{endpoint}"


def _kling_status_endpoint(base_url: str, provider_task_id: str, mode: str = "i2v") -> str:
    endpoint = "image2video" if mode in {"i2v", "first_last_frame"} else "text2video"
    return f"{_kling_base_url(base_url)}/videos/{endpoint}/{provider_task_id}"


def _file_as_base64(path: str) -> str:
    file_path = Path(path)
    return base64.b64encode(file_path.read_bytes()).decode("ascii")


def _kling_image_value(file: VideoInputFile) -> str:
    if file.url and file.url.startswith(("http://", "https://")):
        return file.url
    if file.path:
        return _file_as_base64(file.path)
    return file.url


def _unwrap_kling_data(data: dict[str, Any]) -> dict[str, Any]:
    nested = data.get("data")
    return nested if isinstance(nested, dict) else data


def _http_error_payload(response: httpx.Response) -> dict[str, Any]:
    try:
        body: Any = response.json()
    except ValueError:
        body = response.text[:2000]
    return {
        "status_code": response.status_code,
        "url": str(response.request.url),
        "body": body,
    }


def _raise_for_status_with_body(response: httpx.Response) -> None:
    if response.is_error:
        payload = _http_error_payload(response)
        raise RuntimeError(f"视频 API HTTP {payload['status_code']}: {payload['body']}")


def _kling_model_name(model: str) -> str:
    clean = model.strip()
    normalized = clean.casefold().replace("_", "-").replace(" ", "-")
    aliases = {
        "kling-3.0": "kling-v3",
        "kling-3": "kling-v3",
        "kling-v3.0": "kling-v3",
        "可灵-3.0": "kling-v3",
        "可灵3.0": "kling-v3",
        "可灵3": "kling-v3",
    }
    return aliases.get(normalized, clean)


class OpenAICompatibleVideoAdapter(VideoProviderAdapter):
    provider_name = "openai_compatible_video"

    def __init__(self, profile: ModelProfile | None = None) -> None:
        self.profile = profile or load_video_model_profile()

    async def submit(self, request: StandardVideoRequest) -> StandardSubmitResult:
        payload = {
            "model": self.profile.model,
            "mode": request.mode,
            "prompt": request.prompt,
            "negative_prompt": request.negative_prompt,
            "input_files": [item.__dict__ for item in request.input_files],
            "duration": request.duration,
            "aspect_ratio": request.aspect_ratio,
            "resolution": request.resolution,
            "seed": request.seed,
            "metadata": request.metadata,
        }
        started = time.monotonic()
        data: dict[str, Any] = {}
        try:
            async with httpx.AsyncClient(timeout=60, proxy=self.profile.proxy_url.strip() or None) as client:
                response = await client.post(
                    _video_submit_endpoint(self.profile.base_url),
                    json=payload,
                    headers={
                        "Authorization": openai_authorization(self.profile.api_key),
                        "Content-Type": "application/json",
                    },
                )
                _raise_for_status_with_body(response)
                data = response.json()
            provider_task_id = _first_text(data, ("id", "task_id", "provider_task_id", "request_id"))
            if not provider_task_id:
                raise RuntimeError("视频 API 未返回任务 ID")
            record_business_model_call(
                stage=VIDEO_PROFILE_STAGE,
                label=self.profile.label,
                provider=self.provider_name,
                model=self.profile.model,
                input_payload=payload,
                output_payload=data,
                success=True,
                duration_ms=int((time.monotonic() - started) * 1000),
                business_step="ai_video_submit",
                business_objects=[{"type": "ai_video_task", "id": request.metadata.get("task_id", "")}],
            )
            return StandardSubmitResult(
                provider=self.provider_name,
                provider_task_id=provider_task_id,
                status=_normal_status(str(data.get("status") or "submitted")),
                raw_response=data,
            )
        except Exception as exc:
            record_business_model_call(
                stage=VIDEO_PROFILE_STAGE,
                label=self.profile.label,
                provider=self.provider_name,
                model=self.profile.model,
                input_payload=payload,
                output_payload=data or {"error": str(exc)},
                success=False,
                duration_ms=int((time.monotonic() - started) * 1000),
                business_step="ai_video_submit",
                business_objects=[{"type": "ai_video_task", "id": request.metadata.get("task_id", "")}],
            )
            raise

    async def get_status(self, provider_task_id: str) -> StandardTaskStatus:
        started = time.monotonic()
        data: dict[str, Any] = {}
        try:
            async with httpx.AsyncClient(timeout=30, proxy=self.profile.proxy_url.strip() or None) as client:
                response = await client.get(
                    _video_status_endpoint(self.profile.base_url, provider_task_id),
                    headers={"Authorization": openai_authorization(self.profile.api_key)},
                )
                _raise_for_status_with_body(response)
                data = response.json()
            status = _normal_status(str(data.get("status") or data.get("state") or "running"))
            error = _first_text(data, ("error", "error_message", "message")) if status == "failed" else ""
            record_business_model_call(
                stage=VIDEO_PROFILE_STAGE,
                label=self.profile.label,
                provider=self.provider_name,
                model=self.profile.model,
                input_payload={"provider_task_id": provider_task_id},
                output_payload=data,
                success=status != "failed",
                duration_ms=int((time.monotonic() - started) * 1000),
                business_step="ai_video_status",
                business_objects=[{"type": "provider_task", "id": provider_task_id}],
            )
            return StandardTaskStatus(
                provider=self.provider_name,
                provider_task_id=provider_task_id,
                status=status,
                output_paths=_output_paths(data),
                error=error,
                raw_response=data,
            )
        except Exception as exc:
            record_business_model_call(
                stage=VIDEO_PROFILE_STAGE,
                label=self.profile.label,
                provider=self.provider_name,
                model=self.profile.model,
                input_payload={"provider_task_id": provider_task_id},
                output_payload=data or {"error": str(exc)},
                success=False,
                duration_ms=int((time.monotonic() - started) * 1000),
                business_step="ai_video_status",
                business_objects=[{"type": "provider_task", "id": provider_task_id}],
            )
            raise


class KlingVideoAdapter(VideoProviderAdapter):
    provider_name = "kling_video"

    def __init__(self, profile: ModelProfile | None = None) -> None:
        self.profile = profile or load_video_model_profile()

    def _payload(self, request: StandardVideoRequest) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model_name": _kling_model_name(self.profile.model),
            "prompt": request.prompt,
            "duration": str(request.duration),
            "aspect_ratio": request.aspect_ratio,
            "mode": "std",
        }
        if request.negative_prompt:
            payload["negative_prompt"] = request.negative_prompt
        if request.seed is not None:
            payload["seed"] = request.seed
        if request.mode in {"i2v", "first_last_frame"}:
            start_image = next((item for item in request.input_files if item.role in {"start_image", "product"}), None)
            if start_image is not None:
                payload["image"] = _kling_image_value(start_image)
            end_image = next((item for item in request.input_files if item.role == "end_image"), None)
            if end_image is not None:
                payload["image_tail"] = _kling_image_value(end_image)
        return payload

    async def submit(self, request: StandardVideoRequest) -> StandardSubmitResult:
        payload = self._payload(request)
        started = time.monotonic()
        data: dict[str, Any] = {}
        try:
            async with httpx.AsyncClient(timeout=60, proxy=self.profile.proxy_url.strip() or None) as client:
                response = await client.post(
                    _kling_submit_endpoint(self.profile.base_url, request.mode),
                    json=payload,
                    headers={
                        "Authorization": openai_authorization(self.profile.api_key),
                        "Content-Type": "application/json",
                    },
                )
                _raise_for_status_with_body(response)
                data = response.json()
            task_data = _unwrap_kling_data(data)
            provider_task_id = _first_text(task_data, ("task_id", "id", "provider_task_id", "request_id"))
            if not provider_task_id:
                raise RuntimeError("可灵视频 API 未返回任务 ID")
            record_business_model_call(
                stage=VIDEO_PROFILE_STAGE,
                label=self.profile.label,
                provider=self.provider_name,
                model=self.profile.model,
                input_payload={**payload, "image": "[image omitted]" if "image" in payload else None},
                output_payload=data,
                success=True,
                duration_ms=int((time.monotonic() - started) * 1000),
                business_step="ai_video_submit",
                business_objects=[{"type": "ai_video_task", "id": request.metadata.get("task_id", "")}],
            )
            return StandardSubmitResult(
                provider=self.provider_name,
                provider_task_id=provider_task_id,
                status=_normal_status(str(task_data.get("task_status") or task_data.get("status") or "submitted")),
                raw_response=data,
            )
        except Exception as exc:
            record_business_model_call(
                stage=VIDEO_PROFILE_STAGE,
                label=self.profile.label,
                provider=self.provider_name,
                model=self.profile.model,
                input_payload={**payload, "image": "[image omitted]" if "image" in payload else None},
                output_payload=data or {"error": str(exc)},
                success=False,
                duration_ms=int((time.monotonic() - started) * 1000),
                business_step="ai_video_submit",
                business_objects=[{"type": "ai_video_task", "id": request.metadata.get("task_id", "")}],
            )
            raise

    async def get_status(self, provider_task_id: str) -> StandardTaskStatus:
        started = time.monotonic()
        data: dict[str, Any] = {}
        try:
            async with httpx.AsyncClient(timeout=30, proxy=self.profile.proxy_url.strip() or None) as client:
                headers = {"Authorization": openai_authorization(self.profile.api_key)}
                response = await client.get(_kling_status_endpoint(self.profile.base_url, provider_task_id, "i2v"), headers=headers)
                if response.status_code == 404:
                    response = await client.get(_kling_status_endpoint(self.profile.base_url, provider_task_id, "t2v"), headers=headers)
                _raise_for_status_with_body(response)
                data = response.json()
            task_data = _unwrap_kling_data(data)
            status = _normal_status(str(task_data.get("task_status") or task_data.get("status") or "running"))
            error = _first_text(task_data, ("task_status_msg", "error", "error_message", "message")) if status == "failed" else ""
            videos = task_data.get("task_result", {}).get("videos", []) if isinstance(task_data.get("task_result"), dict) else []
            output_paths = _output_paths({"data": videos}) or _output_paths(task_data)
            record_business_model_call(
                stage=VIDEO_PROFILE_STAGE,
                label=self.profile.label,
                provider=self.provider_name,
                model=self.profile.model,
                input_payload={"provider_task_id": provider_task_id},
                output_payload=data,
                success=status != "failed",
                duration_ms=int((time.monotonic() - started) * 1000),
                business_step="ai_video_status",
                business_objects=[{"type": "provider_task", "id": provider_task_id}],
            )
            return StandardTaskStatus(
                provider=self.provider_name,
                provider_task_id=provider_task_id,
                status=status,
                output_paths=output_paths,
                error=error,
                raw_response=data,
            )
        except Exception as exc:
            record_business_model_call(
                stage=VIDEO_PROFILE_STAGE,
                label=self.profile.label,
                provider=self.provider_name,
                model=self.profile.model,
                input_payload={"provider_task_id": provider_task_id},
                output_payload=data or {"error": str(exc)},
                success=False,
                duration_ms=int((time.monotonic() - started) * 1000),
                business_step="ai_video_status",
                business_objects=[{"type": "provider_task", "id": provider_task_id}],
            )
            raise


def default_video_adapter(profile: ModelProfile | None = None) -> VideoProviderAdapter:
    loaded = profile or load_video_model_profile()
    if "klingai.com" in loaded.base_url.casefold():
        return KlingVideoAdapter(loaded)
    return OpenAICompatibleVideoAdapter(loaded)


def task_mode_from_workflow(workflow_name: str) -> str:
    name = Path(workflow_name).stem.casefold()
    if "image_to_video" in name or "i2v" in name:
        return "i2v"
    if "first_last" in name:
        return "first_last_frame"
    return "t2v"
