from .human_common import *

router = APIRouter()

MAX_SOURCE_VIDEOS = 100
MAX_SOURCE_VIDEO_BYTES = 4 * 1024 * 1024 * 1024


@router.post('/source-videos/upload', status_code=status.HTTP_201_CREATED)
def upload_source_videos(
    files: list[UploadFile] = File(...),
    _admin: AdminUser = Depends(require_admin),
) -> dict[str, Any]:
    if not files or len(files) > MAX_SOURCE_VIDEOS:
        raise HTTPException(status_code=400, detail=f'一次请选择 1 到 {MAX_SOURCE_VIDEOS} 个视频')
    staging_dir = settings.runtime_dir / 'video-imports' / uuid.uuid4().hex
    staging_dir.mkdir(parents=True, exist_ok=False)
    uploaded: list[dict[str, str]] = []
    try:
        for upload in files:
            filename = Path(upload.filename or '').name
            if not filename or Path(filename).suffix.casefold() not in VIDEO_EXTENSIONS:
                raise HTTPException(status_code=400, detail=f'视频格式不受支持：{filename or "未命名文件"}')
            target = staging_dir / filename
            sequence = 2
            while target.exists():
                target = staging_dir / f'{Path(filename).stem}-{sequence}{Path(filename).suffix.casefold()}'
                sequence += 1
            size = 0
            with target.open('wb') as output:
                while chunk := upload.file.read(4 * 1024 * 1024):
                    size += len(chunk)
                    if size > MAX_SOURCE_VIDEO_BYTES:
                        raise HTTPException(status_code=413, detail=f'单个视频不能超过 4 GB：{filename}')
                    output.write(chunk)
            if size == 0:
                raise HTTPException(status_code=400, detail=f'视频文件为空：{filename}')
            uploaded.append({'name': target.name, 'relative_path': target.name, 'path': str(target)})
    except Exception:
        shutil.rmtree(staging_dir, ignore_errors=True)
        raise
    return {'path': str(staging_dir), 'videos': uploaded}
