from __future__ import annotations

from typing import Any

from app.ai import load_model_profiles, request_openai_chat
from app.services.ai_video.models import Asset, ProductProject, Shot


def _template_shots(project: ProductProject, shot_count: int = 5) -> list[Shot]:
    product = project.product_name or project.name
    selling_points = project.selling_points or "核心卖点清晰呈现"
    tone = project.tone or "真实、高级、适合电商投放"
    audience = project.audience or "目标消费者"
    base = [
        Shot(
            project_id=project.id,
            order=1,
            title="产品建立",
            duration_seconds=2.5,
            visual_goal=f"用干净画面建立 {product} 的第一印象。",
            camera="低机位慢推，产品居中，浅景深。",
            prompt=f"{product} product hero shot, {tone}, clean ecommerce studio lighting, premium commercial video keyframe",
            required_asset_kinds=["product", "reference"],
        ),
        Shot(
            project_id=project.id,
            order=2,
            title="卖点证明",
            duration_seconds=3.0,
            visual_goal=f"用细节镜头证明：{selling_points}",
            camera="微距切换到中景，局部高光扫过材质。",
            prompt=f"macro detail shot of {product}, show selling points: {selling_points}, believable product advertising, high texture",
            required_asset_kinds=["product", "prop"],
        ),
        Shot(
            project_id=project.id,
            order=3,
            title="场景转化",
            duration_seconds=3.5,
            visual_goal=f"让 {audience} 看到真实使用场景和情绪价值。",
            camera="人物手部或半身入镜，环境自然运动，镜头轻微跟随。",
            prompt=f"{product} used by target audience {audience}, lifestyle scene, {tone}, cinematic ecommerce advertising",
            required_asset_kinds=["character", "environment", "product"],
        ),
        Shot(
            project_id=project.id,
            order=4,
            title="收束成片",
            duration_seconds=2.0,
            visual_goal="回到产品和品牌利益点，形成可投放的结尾画面。",
            camera="俯拍到正面定格，留出字幕和价格利益点区域。",
            prompt=f"{product} final packshot, clean background, commercial end frame, room for Chinese subtitles and CTA, {tone}",
            required_asset_kinds=["product", "keyframe"],
        ),
    ]
    while len(base) < shot_count:
        index = len(base) + 1
        base.append(
            Shot(
                project_id=project.id,
                order=index,
                title=f"补充卖点 {index}",
                duration_seconds=3.0,
                visual_goal=f"继续围绕 {product} 展示可信的商品细节和使用理由。",
                camera="中近景平移，保持商品主体清晰，动作自然。",
                prompt=f"{product} ecommerce product video shot, additional selling detail, believable lifestyle commercial, {tone}",
                required_asset_kinds=["product"],
            )
        )
    for index, shot in enumerate(base[:shot_count], start=1):
        shot.order = index
    return base[:shot_count]


def _profile():
    profile = next(
        (item for item in load_model_profiles(include_api_key=True) if item.stage == "copywriting"),
        None,
    )
    if not profile or not profile.base_url or not profile.model or not profile.api_key:
        raise ValueError("请先在模型配置中完整配置“文案生成”模型")
    return profile


def _asset_context(assets: list[Asset]) -> str:
    rows = []
    for index, asset in enumerate(assets[:8], start=1):
        note = asset.notes.strip() or "无备注"
        rows.append(f"{index}. {asset.name}；说明：{note}")
    return "\n".join(rows) or "暂无商品图说明"


def _coerce_required_kinds(raw: Any) -> list[str]:
    allowed = {"product", "character", "environment", "prop", "keyframe", "reference"}
    if not isinstance(raw, list):
        return ["product"]
    result = [str(item).strip() for item in raw if str(item).strip() in allowed]
    return result or ["product"]


def _model_shots(project: ProductProject, assets: list[Asset], shot_count: int) -> list[Shot]:
    product = project.product_name or project.name
    parsed = request_openai_chat(
        _profile(),
        [
            {
                "role": "system",
                "content": (
                    "你是电商商品 AI 视频导演。根据商品事实、目标人群、风格和商品图说明，生成可执行的短视频分镜。"
                    "不得编造用户没有提供的产品事实。每个镜头必须能指导图生视频或文生视频模型。"
                    "只返回JSON，结构为："
                    '{"shots":[{"order":1,"title":"","duration_seconds":3,'
                    '"visual_goal":"","camera":"","prompt":"","negative_prompt":"",'
                    '"required_asset_kinds":["product"]}]}。'
                    f"必须正好生成 {shot_count} 个镜头。"
                    "title、visual_goal、camera 必须使用简洁中文，供运营人员审核。"
                    "prompt 和 negative_prompt 使用英文，供视频模型执行；negative_prompt 可为空。"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"项目名：{project.name}\n商品名：{product}\n核心卖点：{project.selling_points or '未填写'}\n"
                    f"目标人群：{project.audience or '未填写'}\n用途与风格：{project.tone or '未填写'}\n"
                    f"商品图说明：\n{_asset_context(assets)}"
                ),
            },
        ],
        stage="copywriting",
        force_json=True,
        business_step="AI视频分镜脚本",
        timeout_seconds=90,
    )
    rows = parsed.get("shots") if isinstance(parsed, dict) else None
    if not isinstance(rows, list):
        raise RuntimeError("分镜模型返回结果无效：缺少 shots")
    shots: list[Shot] = []
    for index, row in enumerate(rows[:shot_count], start=1):
        if not isinstance(row, dict):
            continue
        title = str(row.get("title") or "").strip()
        visual_goal = str(row.get("visual_goal") or "").strip()
        prompt = str(row.get("prompt") or "").strip()
        if not title or not visual_goal or not prompt:
            continue
        try:
            duration_seconds = float(row.get("duration_seconds") or 3)
        except (TypeError, ValueError):
            duration_seconds = 3
        shots.append(
            Shot(
                project_id=project.id,
                order=index,
                title=title[:80],
                duration_seconds=max(1.0, min(duration_seconds, 8.0)),
                visual_goal=visual_goal[:1000],
                camera=str(row.get("camera") or "").strip()[:1000],
                prompt=prompt[:3000],
                negative_prompt=str(row.get("negative_prompt") or "").strip()[:1000],
                required_asset_kinds=_coerce_required_kinds(row.get("required_asset_kinds")),
            )
        )
    if len(shots) != shot_count:
        raise RuntimeError("分镜模型返回结果无效：有效镜头不足")
    return shots


def translate_prompt(prompt: str) -> list[dict[str, str]]:
    prompt = prompt.strip()
    if not prompt:
        return []
    parsed = request_openai_chat(
        _profile(),
        [
            {
                "role": "system",
                "content": (
                    "你是电商AI视频提示词翻译专家。把英文视频模型提示词翻译成准确中文，供运营人员逐段核对。"
                    "不要扩写，不要删减，不要把不存在的产品事实翻译出来。"
                    "按英文中的逗号、分号或语义短语切分，每段保留英文原文和对应中文。"
                    "只返回JSON，结构为："
                    '{"phrases":[{"english":"","chinese":""}]}。'
                ),
            },
            {
                "role": "user",
                "content": f"请翻译以下英文视频提示词，并保持短语级对应：\n{prompt}",
            },
        ],
        stage="copywriting",
        force_json=True,
        business_step="AI视频提示词翻译",
        timeout_seconds=90,
    )
    rows = parsed.get("phrases") if isinstance(parsed, dict) else None
    if not isinstance(rows, list):
        raise RuntimeError("提示词翻译模型返回结果无效：缺少 phrases")
    phrases: list[dict[str, str]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        english = str(row.get("english") or "").strip()
        chinese = str(row.get("chinese") or "").strip()
        if english and chinese:
            phrases.append({"english": english[:1000], "chinese": chinese[:1000]})
    if not phrases:
        raise RuntimeError("提示词翻译模型返回结果无效：没有可用译文")
    return phrases


def draft_shots(project: ProductProject, assets: list[Asset] | None = None, shot_count: int = 5) -> list[Shot]:
    shot_count = max(3, min(shot_count, 8))
    scoped_assets = [asset for asset in (assets or []) if asset.project_id == project.id]
    return _model_shots(project, scoped_assets, shot_count)
