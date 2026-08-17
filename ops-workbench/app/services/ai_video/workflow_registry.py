from __future__ import annotations

from pathlib import Path

from app.services.ai_video.models import WorkflowTemplate


_WORKFLOW_TEMPLATES = [
    WorkflowTemplate(
        name="text_to_video",
        label="文生视频",
        description="使用业务提示词直接生成宣传片片段，适合先跑创意方向。",
        default_engine="vendor_video",
        mode="t2v",
    ),
    WorkflowTemplate(
        name="image_to_video",
        label="图生视频",
        description="用商品图、场景图或关键帧驱动视频生成，适合电商商品展示。",
        default_engine="vendor_video",
        mode="i2v",
        required_asset_kinds=["product"],
    ),
    WorkflowTemplate(
        name="first_last_frame_video",
        label="首尾帧视频",
        description="用首帧和尾帧控制镜头起止状态，适合产品转场和动作闭环。",
        default_engine="vendor_video",
        mode="first_last_frame",
        required_asset_kinds=["keyframe"],
    ),
    WorkflowTemplate(
        name="comfyui_business_workflow",
        label="ComfyUI业务工作流",
        description="平台登记资产和任务，节点编排在 ComfyUI 画布里完成。",
        default_engine="comfyui",
        mode="workflow",
        required_asset_kinds=["product"],
    ),
]


def list_workflow_templates(workflows_dir: Path | None = None) -> list[WorkflowTemplate]:
    if workflows_dir is None:
        return [template.model_copy(deep=True) for template in _WORKFLOW_TEMPLATES]

    templates: list[WorkflowTemplate] = []
    for template in _WORKFLOW_TEMPLATES:
        item = template.model_copy(deep=True)
        if item.default_engine == "comfyui":
            workflow_file = workflows_dir / f"{item.name}.json"
            example_file = workflows_dir / f"{item.name}.example.json"
            item.available = workflow_file.exists()
            if not item.available:
                item.availability_note = "尚未配置真实 ComfyUI workflow 文件"
                if example_file.exists():
                    item.availability_note += "，当前仅有 example 占位文件"
        templates.append(item)
    return templates
