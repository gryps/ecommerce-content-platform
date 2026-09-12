from tests.current_workflow_helpers import *


def test_openapi_exposes_only_current_workflow():
    paths = set(app.openapi()["paths"])
    assert "/api/v1/human/material-classifications" in paths
    assert "/api/v1/human/source-videos/upload" in paths
    assert "/api/v1/human/jianying-drafts" in paths
    assert "/api/v1/music-resources/upload" in paths
    assert "/api/v1/model-profiles" in paths
    assert "/api/v1/human/operation-status/{operation_id}" in paths
    assert "/api/v1/human/voice-preview" in paths
    assert "/api/v1/human/voice-catalog" in paths
    assert "/api/v1/human/voice-catalog/{sequence}" in paths
    assert "/api/v1/human/copies/audio-to-text" in paths
    assert not [path for path in paths if path.startswith("/api/v1/operations")]
    assert "/api/v1/human/narrations/human-voice" not in paths
    assert "/api/v1/human/voice-options" not in paths
    assert "/api/v1/human/source-directory/select" not in paths
    assert not [path for path in paths if path.startswith("/api/v1/images")]
    retired_fragments = (
        "rough-cut",
        "material-batches",
        "candidate-segments",
        "production-mixes",
        "production-templates",
        "music-beat-schemes",
        "hot-links",
        "similarity",
        "unattended",
        "framework",
    )
    assert not [path for path in paths if any(value in path for value in retired_fragments)]


def test_tracked_operation_reports_progress_and_rejects_duplicate():
    operation_id = uuid.uuid4().hex
    begin_operation(operation_id, "copy_generation")
    assert operation_status(operation_id, _admin=admin())["status"] == "processing"
    with pytest.raises(ValueError, match="已经提交"):
        begin_operation(operation_id, "copy_generation")
    finish_operation(operation_id, "completed", "已生成 5 条候选")
    result = operation_status(operation_id, _admin=admin())
    assert result["status"] == "completed"
    assert result["detail"] == "已生成 5 条候选"


def test_browser_video_upload_stages_selected_files(workbench_database, monkeypatch):
    monkeypatch.setattr(settings, "runtime_dir", workbench_database / "runtime")
    result = upload_source_videos(
        files=[
            UploadFile(filename="正面.mp4", file=io.BytesIO(b"first-video")),
            UploadFile(filename="侧面.mov", file=io.BytesIO(b"second-video")),
        ],
        _admin=admin(),
    )

    root = Path(result["path"])
    assert root.parent == workbench_database / "runtime" / "video-imports"
    assert [item["name"] for item in result["videos"]] == ["正面.mp4", "侧面.mov"]
    assert (root / "正面.mp4").read_bytes() == b"first-video"
    assert (root / "侧面.mov").read_bytes() == b"second-video"


def test_browser_video_upload_rejects_non_video(workbench_database, monkeypatch):
    monkeypatch.setattr(settings, "runtime_dir", workbench_database / "runtime")
    with pytest.raises(HTTPException) as error:
        upload_source_videos(
            files=[UploadFile(filename="说明.txt", file=io.BytesIO(b"not-video"))],
            _admin=admin(),
        )

    assert error.value.status_code == 400
    assert not list((workbench_database / "runtime" / "video-imports").glob("*"))
