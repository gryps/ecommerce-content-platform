# 05 视频厂商适配层

## 目标

不同厂商的视频 API 在参数、价格、状态、回调、失败处理上都不同。业务层不能直接依赖厂商细节，必须通过统一 Adapter 调用。

## 标准能力

```text
t2v
i2v
first_last_frame
reference_to_video
video_extend
upscale
```

MVP 只要求：

- `t2v`
- `i2v`
- `first_last_frame` 可选

## 标准请求

```json
{
  "mode": "i2v",
  "prompt": "structured prompt rendered to provider format",
  "negative_prompt": "optional",
  "input_files": [
    {
      "role": "start_image",
      "path": "local/path/image.png",
      "url": "https://..."
    }
  ],
  "duration": 5,
  "aspect_ratio": "9:16",
  "resolution": "720p",
  "seed": null,
  "metadata": {
    "project_id": "project_id",
    "shot_id": "shot_id"
  }
}
```

## 标准响应

```json
{
  "provider": "vidu",
  "provider_task_id": "remote_task_id",
  "status": "submitted",
  "estimated_cost": 1.875,
  "raw_response": {}
}
```

## Adapter 接口

```python
class VideoProviderAdapter:
    provider_name: str

    def submit(self, request: StandardVideoRequest) -> StandardSubmitResult:
        ...

    def get_status(self, provider_task_id: str) -> StandardTaskStatus:
        ...

    def download_outputs(self, provider_task_id: str, output_dir: str) -> list[OutputFile]:
        ...

    def estimate_cost(self, request: StandardVideoRequest) -> CostEstimate:
        ...
```

## 厂商配置

```json
{
  "provider": "vidu",
  "base_url": "https://platform.vidu.cn",
  "api_key_env": "VIDU_API_KEY",
  "models": [
    {
      "name": "viduq3-turbo",
      "modes": ["t2v", "i2v", "first_last_frame"],
      "resolutions": ["540p", "720p", "1080p"],
      "duration_range": [1, 16],
      "price": {
        "unit": "credit_per_second",
        "credit_rmb": 0.03125,
        "rates": {
          "720p": 12,
          "1080p": 13
        }
      }
    }
  ]
}
```

## 首批厂商策略

### Vidu

适合：

- 电商图生视频。
- 产品特写。
- 批量生成。
- 性价比优先。

### MiniMax

适合：

- 综合质量。
- 提示词理解。
- Hailuo/H3 方向的视频生成。

### Kling

适合：

- 人物动作。
- 运镜。
- 更强动态表现。

### Seedance

适合：

- 广告感。
- 镜头叙事。
- 商业成片风格。

## 错误处理

所有厂商错误统一映射：

```text
auth_failed
quota_insufficient
content_rejected
rate_limited
provider_timeout
generation_failed
download_failed
unknown_error
```

失败任务必须保存：

- 厂商原始错误。
- 标准错误码。
- 是否扣费。
- 是否可重试。

