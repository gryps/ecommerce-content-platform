# Docker 部署

本项目提供单容器镜像和 Compose 配置，镜像内包含 FastAPI、前端静态资源、FFmpeg 与数据库迁移代码。数据库、上传素材、生成媒体和凭据始终位于宿主持久化目录，不写入镜像。

## 文件

- `compose.yaml`：构建、运行、健康检查与持久化挂载。
- `.env.docker.example`：Compose 环境变量示例。
- `ops-workbench/Dockerfile`：多阶段前端/后端镜像。
- `ops-workbench/.dockerignore`：排除运行数据、密钥、缓存和测试产物。

## 构建

```bash
cp .env.docker.example .env
docker compose build
docker image inspect ecommerce-content-platform:3.1.0
```

`.env` 不得提交到 Git。Linux 可使用绝对目录，Windows Docker Desktop 使用正斜线形式，例如：

```dotenv
ECOMMERCE_CONTENT_DATA_DIR=D:/docker-data/ecommerce-content-platform/runtime
```

## 启动和验证

```bash
docker compose up -d
docker compose ps
docker compose logs --tail 100 platform
curl http://127.0.0.1:8000/api/health
```

打开 `http://<host>:8000/workbench/`。

容器启动时，FastAPI lifespan 会为全新数据库建立当前有效模型并标记 Alembic 版本；已有数据库继续执行 Alembic 增量升级。迁移现有实例前必须先备份完整运行目录；镜像升级不得删除或覆盖该目录。

## 兼容现有数据

容器内部继续使用历史绝对路径：

```text
/home/gryps/apps/ecommerce-ops-platform/ops-workbench-runtime
```

这样，现有 SQLite 记录中的素材路径迁移到 Docker 后仍可解析。宿主实际路径由 `ECOMMERCE_CONTENT_DATA_DIR` 控制。

## ComfyUI

默认通过 `http://host.docker.internal:8188` 访问宿主机 ComfyUI。如果 ComfyUI 位于其他主机，请在 `.env` 中设置 `PVA_COMFYUI_BASE_URL`。未配置或服务不可达时，视频生产及非 ComfyUI 功能仍可使用，但 ComfyUI 工作流无法执行。

## 回滚

```bash
docker compose down
```

回滚到旧镜像前，应先停止当前容器并恢复与旧版本匹配的运行目录备份。不要让旧服务与 Docker 容器同时写入同一份 SQLite 数据。
