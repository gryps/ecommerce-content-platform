# 当前任务

> 更新时间：2026-08-17（Asia/Shanghai）

## 已确认待开发

下一阶段围绕 ComfyUI 制作文生视频、图生视频，先做一个最小闭环。当前小主机已作为直接开发环境，AI 宣传片原型 JSON 数据已迁入 SQLite，后端已有任务事件和 ComfyUI 提交边界。

```text
模块：AI 宣传片 / ComfyUI 视频工作流
范围：文生视频或图生视频二选一；平台 adapter、workflow 配置、任务轮询、结果回收和前端任务状态
目标：平台录入参数 -> ComfyUI/API 提交任务 -> 回收结果 -> 平台展示任务状态和结果
禁止：不下载本地大模型；不把 API Key 写入 workflow JSON；不改运营中心、图片生产和导航
验收：用一个真实模型 API 跑通一次任务，记录输入、输出、厂商任务 ID、错误原因和耗时
执行：先接一个真实模型 API adapter，再接 ComfyUI workflow 和页面；不要先扩大 UI
```

## 当前环境

```text
小主机：gryps@192.168.31.24
电商运营平台：http://192.168.31.24:8000/workbench/
ComfyUI：http://192.168.31.24:8188/
服务：product-video-automation、comfyui 均为用户级 systemd 服务
详细交接：docs/SMALL_HOST_HANDOFF.md
当前数据库：SQLite，Alembic head 为 n06g8h0i3j47
固定验证：cd ops-workbench && ../.venv/bin/python -m pytest -q && npm --prefix frontend run build && scripts/verify_deploy.sh
```

## 已完成工程化收口

- 小主机源码已初始化 Git，并添加 `.gitignore` 与 `VERSION`。
- 部署 service 模板已去掉 WSL 写死路径。
- 新增 `scripts/verify_deploy.sh` 和 `scripts/write_deploy_manifest.py`。
- 远端开发测试依赖已安装，当前测试 `36 passed`，前端生产构建通过。
- AI 宣传片新增 SQLite 表和任务事件表，旧 JSON 数据已导入数据库。
- 新增 `/ai-video/generation/tasks/{task_id}/submit` 和 `/events` 后端边界。
- 前端平台壳层已拆分到 `frontend/src/components/shell/`，导航配置在 `moduleNavigation.ts`，壳层样式在 `frontend/src/styles/`；后续改导航、账号弹窗或顶部状态栏不要再堆回 `HumanApp.tsx`。

## 仍需后续完成但本阶段不处理

经营看板、运营中心、采后中心、主播控场、投流计划、客服售后、仓库管理、财务管理、项目中心、图片生产、视频生产和模型配置仍会继续完善，但当前不要混入 ComfyUI 视频工作流的首个闭环任务。
