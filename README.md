# 电商内容平台

[中文](README.md) | [English](README_EN.md)

电商内容平台是一套面向短视频电商团队的内容生产工作台，聚焦从素材整理、文案与配音，到剪映草稿和 AI 视频生成的完整生产流程。

当前版本：`3.1.0`

## 核心模块

### 视频生产

- 素材归类：从浏览器所在电脑批量选择并上传视频，按产品和标签归档。
- 内容文库：管理参考文案、生成候选文案并记录采用结果。
- 配音与音乐：管理旁白、字幕时间轴、音色和背景音乐资源。
- 剪映草稿：组合素材、文案、配音和音乐，生成可继续编辑的草稿。

### AI 视频

- 管理商品图、产品卖点、目标人群和投放风格。
- 生成和人工调整分镜脚本及视频提示词。
- 支持图生视频、文生视频、首尾帧视频和 ComfyUI 工作流。
- 记录生成任务、厂商任务编号、执行状态、错误和输出文件。

模型配置仍作为后台支撑能力保留，但不作为独立业务模块展示。

## 项目边界

本仓库只承载内容生产，不负责店铺经营、直播数据、投流、订单退款、客服、仓储、财务或经营复盘；这些能力统一归入“抖店管理平台”。图片生产模块也已从当前前端、API 和服务代码中移除。

为保证现有运行库可安全升级和回滚，历史数据库表与 Alembic 迁移链暂不做破坏性删除，但不再暴露已停用业务接口。

## 目录结构

- `ops-workbench/`：FastAPI 后端、React 前端、测试和部署脚本。
- `commerce-video-workbench/`：视频生产、AI 视频和 ComfyUI 业务文档。
- `docs/`：开发协作、项目上下文和小主机部署说明。
- `ops-workbench/workflows/`：ComfyUI 工作流定义与示例。

## 技术栈

- 后端：Python、FastAPI、SQLAlchemy、Alembic、SQLite。
- 前端：React、TypeScript、Vite。
- 媒体处理：FFmpeg、ffprobe、剪映草稿生成。
- AI 编排：厂商视频 API 适配层与 ComfyUI。
- 部署：Linux、systemd 用户服务。

## 运行与验证

详细环境变量、安装命令和验证方式见 [ops-workbench/README.md](ops-workbench/README.md)。

```bash
cd ops-workbench
python -m compileall app
python -m pytest -q
npm --prefix frontend run build
```

## Docker 部署

仓库根目录提供 `compose.yaml`，镜像包含后端、前端静态资源和 FFmpeg，运行数据库、上传素材与生成媒体通过宿主目录持久化。详细说明见 [Docker 部署文档](docs/DOCKER_DEPLOYMENT.md)。

```bash
cp .env.docker.example .env
docker compose up -d --build
```

数据库、上传素材、生成媒体、缓存、API Key 和厂商凭据均属于运行数据，不应提交到 Git。
