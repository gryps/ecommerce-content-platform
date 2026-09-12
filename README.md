# 电商内容平台

当前版本：3.0.0

本项目只承载电商内容生产中心，不再承担店铺运营、投流、客服、仓储、财务或经营复盘职责。上述能力统一归入“抖店管理平台”。

## 当前范围

- `ops-workbench/`：可运行的内容生产应用。
- `commerce-image-workbench/`：图片生产业务文档。
- `commerce-video-workbench/`：视频生产、AI 视频与 ComfyUI 业务文档。
- `docs/`：开发协作和小主机部署说明。

平台当前保留四个入口：图片生产、视频生产、AI 视频、模型配置。模型配置属于内容生产的基础支撑能力。

历史运营功能已从应用入口、API 和当前业务文档中移除。旧数据库表不做破坏性删除，以保证现有运行库可以安全升级和回滚；它们不再暴露业务接口。

## 运行与验证

实际运行目录和命令见 [ops-workbench/README.md](ops-workbench/README.md)。

当前小主机仍沿用兼容性服务名 `product-video-automation.service` 和代码路径 `ecommerce-ops-platform`，本次只调整产品名称和功能边界，不直接迁移生产路径。
