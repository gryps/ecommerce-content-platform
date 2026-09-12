# 电商内容平台运行目录

`ops-workbench` 是当前可运行代码目录，只承载图片生产、视频生产、AI 视频和内容生产所需的模型配置。

当前版本：3.0.0

业务文档：

- 视频与 AI 视频：`../commerce-video-workbench/`
- 图片生产：`../commerce-image-workbench/`
- 运行代码模块上下文：`docs/modules/`
- 小主机部署交接：`../docs/SMALL_HOST_HANDOFF.md`

## 功能边界

店铺经营看板、直播运营、投流、订单退款、客服、仓储、财务和日报周报不属于本项目，统一在“抖店管理平台”的“运营数据”模块建设。

为避免破坏现有数据库，历史运营表暂不执行删表迁移；应用不再注册运营 API，也不再显示运营入口。

## 运行数据目录

数据库、上传素材、AI 结果、缓存和临时工作文件默认放在同级目录：

```text
../ops-workbench-runtime/
```

可通过兼容性环境变量覆盖：

```bash
PVA_RUNTIME_DIR=/home/gryps/apps/ecommerce-ops-platform/ops-workbench-runtime
PVA_WORKSPACE_DIR=/home/gryps/apps/ecommerce-ops-platform/ops-workbench-runtime/workspace
PVA_STATIC_DIR=/home/gryps/apps/ecommerce-ops-platform/ops-workbench-runtime/static-workbench
PVA_WORKBENCH_DATABASE_URL=sqlite:////home/gryps/apps/ecommerce-ops-platform/ops-workbench-runtime/databases/workbench.db
```

## 本地运行

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
npm --prefix frontend run build
bash scripts/run_dev.sh
```

打开 `http://127.0.0.1:8000/workbench/`，健康检查为 `http://127.0.0.1:8000/api/health`。

## 常用验证

```bash
python -m compileall app
npm --prefix frontend run build
python -m pytest -q
```

不得把运行数据、API Key、厂商凭据或生成媒体提交到 Git。不得在未得到用户明确确认时触发付费视频生成。
