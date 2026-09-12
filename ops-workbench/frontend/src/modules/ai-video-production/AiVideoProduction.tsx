import { Clapperboard, Download, ExternalLink, History, LoaderCircle, Play, Radio, RefreshCw, Save, Trash2, Upload, WandSparkles } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { apiBlob } from "../../api/client";
import { ConfirmDeleteDialog } from "../../components/ConfirmDeleteDialog";
import type { DeleteConfirmation } from "../../types";
import { useAiVideoProductionController } from "./useAiVideoProductionController";
import type { Asset, GenerationTask, Shot } from "./types";

const assetKinds = [
  ["product", "商品图"],
];

type Controller = ReturnType<typeof useAiVideoProductionController>;
type AiVideoTab = "assets" | "brief" | "style" | "shots" | "tasks";
type GenerationSettings = {
  resolution: string;
  secondsPerShot: number;
  shotCount: number;
  pricePerSecond: number;
};
type StoredGenerationSettings = {
  workflowName?: string;
  submitAfterCreate?: boolean;
  resolution?: string;
  secondsPerShot?: number;
  plannedShotCount?: number;
};
type NoticeDialogState = { title: string; message: string } | null;
type PromptPhrase = { english: string; chinese: string };
const generationSettingsKey = "ai_video_generation_task_settings:v1";

const aiVideoTabs: Array<{ id: AiVideoTab; index: number; title: string; detail: string }> = [
  { id: "assets", index: 1, title: "商品图", detail: "8 张输入图" },
  { id: "brief", index: 2, title: "商品与宣传", detail: "人工填写卖点" },
  { id: "style", index: 3, title: "用途与风格", detail: "平台、比例、调性" },
  { id: "shots", index: 4, title: "分镜脚本", detail: "生成并修改镜头" },
  { id: "tasks", index: 5, title: "生成任务", detail: "提交与查看结果" },
];

function mediaUrl(value: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
}

function apiImagePath(value: string) {
  const url = mediaUrl(value);
  if (!url) return "";
  let path = url;
  if (/^https?:\/\//i.test(url)) {
    const parsed = new URL(url);
    if (parsed.origin !== window.location.origin) return url;
    path = `${parsed.pathname}${parsed.search}`;
  }
  return path.startsWith("/api/v1") ? path.slice("/api/v1".length) : path;
}

function assetPreviewUrl(asset: Asset) {
  return mediaUrl(asset.preview_url || `/api/v1/ai-video/assets/${asset.id}/file`);
}

function shortAssetNote(asset: Asset) {
  return asset.notes || "本地上传商品图";
}

function AuthenticatedImage({ url, alt }: { url: string; alt: string }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    let objectUrl = "";
    let cancelled = false;
    setSrc("");
    setFailed(false);
    const path = apiImagePath(url);
    if (/^https?:\/\//i.test(path)) {
      setSrc(path);
      return;
    }
    apiBlob(path)
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (failed) return <div className="ai-image-placeholder">图片无法读取</div>;
  if (!src) return <div className="ai-image-placeholder">Loading...</div>;
  return <img src={src} alt={alt} loading="lazy" />;
}

function loadGenerationSettings(): StoredGenerationSettings {
  try {
    return JSON.parse(localStorage.getItem(generationSettingsKey) || "{}") as StoredGenerationSettings;
  } catch {
    return {};
  }
}

function outputApiPath(taskId: string, outputIndex: number) {
  return `/ai-video/generation/tasks/${taskId}/outputs/${outputIndex}/file`;
}

function TaskOutputVideo({ taskId, outputIndex }: { taskId: string; outputIndex: number }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;
    setSrc("");
    setFailed(false);
    apiBlob(outputApiPath(taskId, outputIndex))
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [taskId, outputIndex]);

  if (failed) return <div className="ai-video-output-placeholder">视频暂不可读取</div>;
  if (!src) return <div className="ai-video-output-placeholder">Loading...</div>;
  return <video controls preload="metadata" src={src} />;
}

function NoticeDialog({ notice, close }: { notice: NoticeDialogState; close: () => void }) {
  if (!notice) return null;
  return <div className="confirm-dialog-backdrop" role="presentation">
    <section className="confirm-dialog notice-dialog" role="alertdialog" aria-modal="true" aria-labelledby="notice-dialog-title">
      <div className="confirm-dialog-body">
        <b id="notice-dialog-title">{notice.title}</b>
        <span>{notice.message}</span>
      </div>
      <div className="confirm-dialog-actions">
        <button type="button" onClick={close}>我知道了</button>
      </div>
    </section>
  </div>;
}

export function AiVideoProduction({ onError, onNotice }: { onError: (value: string) => void; onNotice: (value: string) => void }) {
  const controller = useAiVideoProductionController();
  const [activeTab, setActiveTab] = useState<AiVideoTab>("assets");

  useEffect(() => {
    if (controller.error) onError(controller.error);
  }, [controller.error, onError]);

  useEffect(() => {
    if (!controller.error && controller.message && controller.message !== "空闲") onNotice(controller.message);
  }, [controller.error, controller.message, onNotice]);

  const pollingTasks = useMemo(
    () => controller.selectedTasks.filter(task => task.status === "running" && task.provider_task_id).map(task => task.id).join("|"),
    [controller.selectedTasks],
  );

  useEffect(() => {
    if (!pollingTasks) return;
    const timer = window.setInterval(() => {
      pollingTasks.split("|").filter(Boolean).forEach(taskId => controller.refreshTask(taskId, { silent: true }));
    }, 10000);
    return () => window.clearInterval(timer);
  }, [pollingTasks]);

  return <section className="human-page ai-video-page">
    <ComfyUiBridge controller={controller} />
    <WorkflowTabs controller={controller} activeTab={activeTab} setActiveTab={setActiveTab} />
    <div className="ai-video-tab-panel">
      {activeTab === "assets" && <Assets controller={controller} onAdvance={() => setActiveTab("brief")} />}
      {activeTab === "brief" && <ProjectInfoForm controller={controller} onAdvance={() => setActiveTab("style")} />}
      {activeTab === "style" && <VideoStyleForm controller={controller} onAdvance={() => setActiveTab("shots")} />}
      {activeTab === "shots" && <DirectorAndShots controller={controller} onAdvance={() => setActiveTab("tasks")} />}
      {activeTab === "tasks" && <div className="ai-video-final-step">
        <TaskDispatcher controller={controller} />
        <TaskList controller={controller} />
      </div>}
    </div>
  </section>;
}

function WorkflowTabs({ controller, activeTab, setActiveTab }: { controller: Controller; activeTab: AiVideoTab; setActiveTab: (value: AiVideoTab) => void }) {
  return <div className="material-tabs ai-video-step-tabs full" role="tablist" aria-label="AI视频流程">
    {aiVideoTabs.map(tab => <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
      {tab.index}. {tab.title}
    </button>)}
  </div>;
}

function ComfyUiBridge({ controller }: { controller: Controller }) {
  const comfyUrl = `${window.location.protocol}//${window.location.hostname}:8188/`;
  return <section className="human-card ai-comfy-bridge">
    <div><small>ComfyUI 生产引擎</small><b>{controller.loading ? "正在同步" : controller.message}</b></div>
    <div className="ai-comfy-actions">
      <button type="button" onClick={controller.checkComfyUI} disabled={controller.loading}><Radio />检测连接</button>
      <button type="button" onClick={() => window.open(comfyUrl, "_blank", "noopener,noreferrer")}><ExternalLink />打开ComfyUI</button>
    </div>
  </section>;
}

function ProjectInfoForm({ controller, onAdvance }: { controller: Controller; onAdvance: () => void }) {
  const [form, setForm] = useState({ name: "", product_name: "", selling_points: "", audience: "", tone: "高质感、可信、适合电商投放" });
  const currentId = controller.selectedProject?.id || "";
  const duplicateName = controller.store.projects.some(project => project.id !== currentId && project.name.trim().toLowerCase() === form.name.trim().toLowerCase());

  useEffect(() => {
    if (!controller.selectedProject) return;
    setForm({
      name: controller.selectedProject.name,
      product_name: controller.selectedProject.product_name,
      selling_points: controller.selectedProject.selling_points,
      audience: controller.selectedProject.audience,
      tone: controller.selectedProject.tone || "高质感、可信、适合电商投放",
    });
  }, [controller.selectedProject]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (duplicateName) return;
    if (controller.selectedProject) {
      await controller.updateProject(controller.selectedProject.id, { ...form, status: controller.selectedProject.status });
    } else {
      await controller.createProject(form);
    }
    onAdvance();
  }

  return <section className="ai-project-step">
    <form className="human-card ai-project-form" onSubmit={submit}>
      <div className="human-card-title"><h2>2 商品与宣传</h2><span>人工填写商品事实、卖点和目标人群</span></div>
      <label>项目名<input required placeholder="例如：保温杯 8 图视频" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />{duplicateName && <small className="ai-form-warning">项目名已存在</small>}</label>
      <label>商品名<input value={form.product_name} onChange={event => setForm({ ...form, product_name: event.target.value })} /></label>
      <label>目标人群<input value={form.audience} onChange={event => setForm({ ...form, audience: event.target.value })} /></label>
      <label className="wide">核心卖点<textarea value={form.selling_points} onChange={event => setForm({ ...form, selling_points: event.target.value })} /></label>
      <button type="submit" className="ai-project-submit" disabled={controller.loading || duplicateName}><Save />保存并进入风格</button>
    </form>
    <ProjectPicker controller={controller} />
  </section>;
}

function VideoStyleForm({ controller, onAdvance }: { controller: Controller; onAdvance: () => void }) {
  const [form, setForm] = useState({ platform: "抖音/短视频投放", ratio: "9:16 竖屏", duration: "15-30 秒", rhythm: "前三秒强吸引，节奏紧凑", tone: "高质感、可信、适合电商投放" });

  useEffect(() => {
    if (!controller.selectedProject?.tone) return;
    const [platform = "抖音/短视频投放", ratio = "9:16 竖屏", duration = "15-30 秒", rhythm = "前三秒强吸引，节奏紧凑", tone = controller.selectedProject.tone] = controller.selectedProject.tone.split("；");
    setForm({ platform, ratio, duration, rhythm, tone });
  }, [controller.selectedProject?.tone]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!controller.selectedProject) return;
    await controller.updateProject(controller.selectedProject.id, {
      name: controller.selectedProject.name,
      product_name: controller.selectedProject.product_name,
      selling_points: controller.selectedProject.selling_points,
      audience: controller.selectedProject.audience,
      tone: [form.platform, form.ratio, form.duration, form.rhythm, form.tone].filter(Boolean).join("；"),
      status: controller.selectedProject.status,
    });
    onAdvance();
  }

  return <form className="human-card ai-style-form" onSubmit={submit}>
    <div className="human-card-title"><h2>3 用途与风格</h2><span>决定视频投放平台、画幅、时长和视觉调性</span></div>
    <label>投放平台<select value={form.platform} onChange={event => setForm({ ...form, platform: event.target.value })}>
      <option>抖音/短视频投放</option>
      <option>淘宝详情页</option>
      <option>小红书种草</option>
      <option>亚马逊商品视频</option>
      <option>独立站商品页</option>
    </select></label>
    <label>视频比例<select value={form.ratio} onChange={event => setForm({ ...form, ratio: event.target.value })}>
      <option>9:16 竖屏</option>
      <option>16:9 横屏</option>
      <option>1:1 方屏</option>
    </select></label>
    <label>视频时长<select value={form.duration} onChange={event => setForm({ ...form, duration: event.target.value })}>
      <option>15-30 秒</option>
      <option>30-45 秒</option>
      <option>45-60 秒</option>
    </select></label>
    <label>节奏<input value={form.rhythm} onChange={event => setForm({ ...form, rhythm: event.target.value })} /></label>
    <label className="wide">视觉风格<textarea value={form.tone} onChange={event => setForm({ ...form, tone: event.target.value })} /></label>
    <button type="submit" disabled={controller.loading || !controller.selectedProject}><Save />保存并进入分镜</button>
    {!controller.selectedProject && <p className="human-note">请先在第 1 步上传商品图，系统会自动创建草稿项目。</p>}
  </form>;
}

function ProjectPicker({ controller }: { controller: Controller }) {
  const [confirmation, setConfirmation] = useState<DeleteConfirmation | null>(null);

  return <section className="ai-project-picker">
    <div className="human-card-title"><h2>项目列表</h2><span>{controller.selectedProject?.id || "尚未创建"}</span></div>
    <div className="ai-project-list">
      {controller.store.projects.map(project => <article key={project.id} className={project.id === controller.selectedProject?.id ? "active" : ""}>
        <button type="button" onClick={() => controller.setSelectedProjectId(project.id)}><b>{project.name}</b><span>{project.product_name || "未填写商品名"}</span></button>
        <button type="button" className="human-danger compact" disabled={controller.loading} onClick={() => setConfirmation({ title: `删除项目“${project.name}”？`, message: "将删除项目下的商品图、分镜、任务和事件记录，无法恢复。", onConfirm: () => controller.deleteProject(project.id) })}>删除</button>
      </article>)}
      {!controller.store.projects.length && <p className="human-note">先创建项目，再上传商品图和调度 ComfyUI。</p>}
    </div>
    <ConfirmDeleteDialog confirmation={confirmation} close={() => setConfirmation(null)} />
  </section>;
}

function Assets({ controller, onAdvance }: { controller: Controller; onAdvance: () => void }) {
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files || []));
  }

  async function ensureProject() {
    if (controller.selectedProject) return controller.selectedProject;
    const projectName = `AI视频草稿 ${new Date().toLocaleString("zh-CN", { hour12: false })}`;
    return controller.createProject({
      name: projectName,
      product_name: "",
      selling_points: "",
      audience: "",
      tone: "高质感、可信、适合电商投放",
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) return;
    const project = await ensureProject();
    if (!project) return;
    for (const file of files) {
      await controller.uploadAsset("product", file.name, notes, file, project.id);
    }
    setNotes("");
    setFiles([]);
    event.currentTarget.reset();
  }

  return <section className="human-card ai-assets-section">
    <div className="human-card-title"><h2>1 商品图</h2><span>先准备 8 张商品图，再补文案和风格</span></div>
    <div className="ai-assets-layout">
      <form className="ai-asset-form" onSubmit={submit}>
        <div className="ai-section-subtitle"><b>上传商品图</b><span>{files.length ? `已选择 ${files.length} 张` : "可一次选择多张图片"}</span></div>
        <label>商品图片<input type="file" accept="image/*" multiple onChange={chooseFile} /></label>
        <label>备注<textarea placeholder="可写角度、材质、颜色或不可改变的商品细节" value={notes} onChange={event => setNotes(event.target.value)} /></label>
        {!!files.length && <div className="ai-selected-files">
          {files.map(file => <span key={`${file.name}-${file.lastModified}`}>{file.name}</span>)}
        </div>}
        <button type="submit" disabled={controller.loading || !files.length}><Upload />上传{files.length > 1 ? `${files.length}张` : "商品图"}</button>
      </form>
    </div>
    {!!controller.selectedProductAssets.length && <div className="ai-current-assets">
      <div className="ai-section-subtitle"><b>已选商品图</b><span>{controller.selectedProductAssets.length}/8 张</span></div>
      <div className="ai-asset-grid">
        {controller.selectedProductAssets.map((asset, index) => <article key={asset.id} className="ai-asset-thumb-card">
          <figure><AuthenticatedImage url={assetPreviewUrl(asset)} alt={asset.name} /></figure>
          <div>
            <b>{index + 1}. {asset.name}</b>
            <span>商品图</span>
            <p>{shortAssetNote(asset)}</p>
          </div>
        </article>)}
      </div>
      <button type="button" className="human-secondary ai-next-step" onClick={onAdvance}>下一步：填写商品与宣传</button>
    </div>}
  </section>;
}

function DirectorAndShots({ controller, onAdvance }: { controller: Controller; onAdvance: () => void }) {
  const [shotCount, setShotCount] = useState(5);
  const [drafting, setDrafting] = useState(false);
  const [notice, setNotice] = useState<NoticeDialogState>(null);

  async function generateShots() {
    setDrafting(true);
    try {
      await controller.draftShots(shotCount);
    } catch (reason) {
      setNotice({
        title: "分镜脚本需要先配置模型",
        message: reason instanceof Error ? reason.message : "请先在模型配置中完整配置“文案生成”模型，再生成分镜脚本。",
      });
    } finally {
      setDrafting(false);
    }
  }

  const visibleShots = drafting
    ? Array.from({ length: shotCount }, (_, index) => ({
      id: `loading-${index + 1}`,
      order: index + 1,
      title: `分镜 ${index + 1}`,
      duration_seconds: 3,
      visual_goal: "Loading...",
      camera: "Loading...",
      prompt: "Loading...",
      negative_prompt: "",
    }))
    : controller.selectedShots;

  return <section className="human-card ai-director-card">
    <div className="human-card-title"><h2>4 分镜脚本</h2><span>把商品图、卖点和风格转成镜头提示词</span></div>
    <div className="ai-director-panel inline">
      <div><small>文案模型生成</small><p>根据商品图说明、卖点、人群和风格，生成可修改的分镜脚本。</p></div>
      <label className="ai-shot-count">分镜数量<input type="number" min={3} max={8} value={shotCount} onChange={event => setShotCount(Math.max(3, Math.min(8, Number(event.target.value) || 5)))} /></label>
      <button type="button" onClick={generateShots} disabled={drafting || controller.loading || !controller.selectedProject}><WandSparkles />{drafting ? "生成中" : "生成分镜"}</button>
    </div>
    <div className="ai-shot-list">
      {visibleShots.map(shot => <ShotEditor key={shot.id} shot={shot as Shot} controller={controller} drafting={drafting} onNotice={setNotice} />)}
      {!visibleShots.length && <p className="human-note">暂无分镜，可先创建项目并生成导演分镜。</p>}
    </div>
    <button type="button" className="human-secondary ai-next-step" disabled={drafting || !controller.selectedShots.length} onClick={onAdvance}>下一步：生成任务</button>
    <NoticeDialog notice={notice} close={() => setNotice(null)} />
  </section>;
}

function ShotEditor({ shot, controller, drafting, onNotice }: { shot: Shot; controller: Controller; drafting: boolean; onNotice: (notice: NoticeDialogState) => void }) {
  const [prompt, setPrompt] = useState(shot.prompt);
  const [phrases, setPhrases] = useState<PromptPhrase[]>([]);
  const [translationStatus, setTranslationStatus] = useState<"idle" | "translating" | "ready" | "failed">("idle");
  const [activePhrase, setActivePhrase] = useState<number | null>(null);

  useEffect(() => {
    setPrompt(shot.prompt);
    setActivePhrase(null);
  }, [shot.id, shot.prompt]);

  useEffect(() => {
    const cleanPrompt = prompt.trim();
    setActivePhrase(null);
    if (drafting || !cleanPrompt) {
      setPhrases([]);
      setTranslationStatus("idle");
      return;
    }
    let cancelled = false;
    setPhrases([]);
    setTranslationStatus("translating");
    const timer = window.setTimeout(() => {
      controller.translatePrompt(cleanPrompt)
        .then(result => {
          if (cancelled) return;
          setPhrases(result?.phrases || []);
          setTranslationStatus("ready");
        })
        .catch(reason => {
          if (cancelled) return;
          setPhrases([]);
          setTranslationStatus("failed");
          onNotice({
            title: "提示词翻译需要先配置模型",
            message: reason instanceof Error ? reason.message : "请先在模型配置中完整配置“文案生成”模型，再查看中文翻译。",
          });
        });
    }, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [drafting, onNotice, prompt, shot.id]);

  async function savePrompt() {
    await controller.updateShot({ ...shot, prompt });
  }

  function activatePhrase(index: number) {
    setActivePhrase(index);
  }

  return <article className={drafting ? "loading" : ""}>
    <i>{shot.order}</i>
    <div>
      <b>{drafting ? "Loading..." : shot.title}<small>{shot.duration_seconds}s</small></b>
      <p><strong>中文分镜：</strong>{shot.visual_goal}</p>
      <span><strong>运镜：</strong>{shot.camera}</span>
      <div className="ai-shot-textarea-wrap">
        <small>模型 Prompt（英文，可手动修改）</small>
        <textarea value={prompt} disabled={drafting || controller.loading} onChange={event => setPrompt(event.target.value)} />
        {drafting && <div className="ai-shot-loading-mask">Loading...</div>}
      </div>
      {!drafting && <div className="ai-prompt-translation-panel">
        <div className="ai-prompt-translation-title">
          <b>英文高亮对照</b>
          <button type="button" className="human-secondary compact" disabled={controller.loading || prompt === shot.prompt} onClick={savePrompt}><Save />保存提示词</button>
        </div>
        <div className="ai-prompt-phrase-row english" aria-label="英文提示词高亮对照">
          {phrases.map((phrase, index) => <span key={`${phrase.english}-${index}`} className={activePhrase === index ? "active" : ""}>{phrase.english}</span>)}
          {translationStatus === "translating" && <span className="loading"><LoaderCircle className="spin" />Loading...</span>}
          {translationStatus === "failed" && <span className="loading">翻译失败，请检查模型配置</span>}
        </div>
        <div className="ai-prompt-translation-title"><b>中文翻译</b><span>模型翻译完成后，选中或点选中文短语可高亮对应英文</span></div>
        <div className="ai-prompt-phrase-row chinese" aria-label="中文实时翻译">
          {phrases.map((phrase, index) => <span key={`${phrase.chinese}-${index}`} className={activePhrase === index ? "active" : ""} onMouseUp={() => activatePhrase(index)} onClick={() => activatePhrase(index)}>{phrase.chinese}</span>)}
          {translationStatus === "translating" && <span className="loading"><LoaderCircle className="spin" />Loading...</span>}
          {translationStatus === "failed" && <span className="loading">翻译失败，请检查模型配置</span>}
        </div>
      </div>}
      {!!shot.negative_prompt && <span><strong>负向 Prompt：</strong>{shot.negative_prompt}</span>}
    </div>
  </article>;
}

function TaskDispatcher({ controller }: { controller: Controller }) {
  const firstWorkflow = controller.workflows[0];
  const [storedSettings] = useState(loadGenerationSettings);
  const [workflowName, setWorkflowName] = useState(storedSettings.workflowName || firstWorkflow?.name || "text_to_video");
  const [submitAfterCreate, setSubmitAfterCreate] = useState(storedSettings.submitAfterCreate ?? true);
  const [resolution, setResolution] = useState(storedSettings.resolution || "720p");
  const [secondsPerShot, setSecondsPerShot] = useState(storedSettings.secondsPerShot || 5);
  const [plannedShotCount, setPlannedShotCount] = useState(storedSettings.plannedShotCount || Math.max(1, controller.selectedShots.length || 1));
  const selectedWorkflow = controller.workflows.find(item => item.name === workflowName);
  const pricePerSecond = 0.6;
  const normalizedSeconds = Math.max(1, Math.min(30, Number(secondsPerShot) || 1));
  const normalizedShotCount = Math.max(1, Math.min(20, Number(plannedShotCount) || 1));
  const totalSeconds = normalizedSeconds * normalizedShotCount;
  const estimatedCost = totalSeconds * pricePerSecond;
  const selectedBatchShots = controller.selectedShots.slice(0, normalizedShotCount);
  const syncPayload = buildBusinessPrompt(controller.selectedProject, selectedBatchShots, {
    resolution,
    secondsPerShot: normalizedSeconds,
    shotCount: normalizedShotCount,
    pricePerSecond,
  });
  const trialPayload = buildBusinessPrompt(controller.selectedProject, controller.selectedShots.slice(0, 1), {
    resolution,
    secondsPerShot: normalizedSeconds,
    shotCount: 1,
    pricePerSecond,
  });
  const missingAssetKinds = useMemo(
    () => (selectedWorkflow?.required_asset_kinds || []).filter(kind => !controller.selectedAssets.some(asset => asset.kind === kind)),
    [controller.selectedAssets, selectedWorkflow],
  );
  const workflowBlockedReason = selectedWorkflow && !selectedWorkflow.available
    ? selectedWorkflow.availability_note || "当前工作流模板不可用"
    : missingAssetKinds.length
      ? `缺少必需资产：${missingAssetKinds.map(labelAssetKind).join("、")}`
      : "";
  const taskBlockedReason = !controller.selectedProject
    ? "缺少项目"
    : !selectedWorkflow
      ? "缺少工作流"
      : workflowBlockedReason
        ? workflowBlockedReason
        : !syncPayload.trim()
          ? "缺少同步内容"
          : "";

  useEffect(() => {
    if (firstWorkflow && !controller.workflows.some(item => item.name === workflowName)) {
      setWorkflowName(firstWorkflow.name);
    }
  }, [controller.workflows, firstWorkflow, workflowName]);

  useEffect(() => {
    localStorage.setItem(generationSettingsKey, JSON.stringify({
      workflowName,
      submitAfterCreate,
      resolution,
      secondsPerShot: normalizedSeconds,
      plannedShotCount: normalizedShotCount,
    }));
  }, [workflowName, submitAfterCreate, resolution, normalizedSeconds, normalizedShotCount]);

  useEffect(() => {
    if (controller.selectedShots.length) {
      setPlannedShotCount(count => Math.min(Math.max(1, count), controller.selectedShots.length));
    }
  }, [controller.selectedShots.length]);

  async function createGenerationTask(mode: "trial" | "batch") {
    const engine = selectedWorkflow?.default_engine || "vendor_video";
    const productAssets = controller.selectedProductAssets;
    const taskOptions = {
      durationSeconds: normalizedSeconds,
      aspectRatio: "9:16",
      resolution,
    };
    if (mode === "trial") {
      await controller.createTask(workflowName, trialPayload, engine, submitAfterCreate, {
        ...taskOptions,
        inputAssetIds: productAssets.slice(0, 1).map(asset => asset.id),
      });
      return;
    }
    for (const [index, shot] of selectedBatchShots.entries()) {
      const asset = productAssets[index % Math.max(1, productAssets.length)];
      const payload = buildBusinessPrompt(controller.selectedProject, [shot], {
        resolution,
        secondsPerShot: normalizedSeconds,
        shotCount: 1,
        pricePerSecond,
      });
      await controller.createTask(workflowName, payload, engine, submitAfterCreate, {
        ...taskOptions,
        inputAssetIds: asset ? [asset.id] : productAssets.map(item => item.id),
      });
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return <form className="human-card ai-task-dispatcher" onSubmit={submit}>
    <div className="human-card-title"><h2>5 生成任务</h2><span>选择工作流并提交生产</span></div>
    <div className="ai-dispatch-section">
      <div className="ai-section-subtitle"><b>生产设置</b><span>{selectedWorkflow?.default_engine === "comfyui" ? "ComfyUI" : "厂商视频API"}</span></div>
      <label>工作流模板<select value={workflowName} onChange={event => setWorkflowName(event.target.value)}>{controller.workflows.map(item => <option key={item.name} value={item.name}>{item.label}{item.available ? "" : "（未配置）"}</option>)}</select></label>
      {selectedWorkflow && <div className="ai-workflow-template-note">
        <b>{selectedWorkflow.mode}</b>
        <span>{selectedWorkflow.description}</span>
        {!!selectedWorkflow.required_asset_kinds.length && <small>必需资产：{selectedWorkflow.required_asset_kinds.map(labelAssetKind).join("、")}</small>}
        {workflowBlockedReason && <small>{workflowBlockedReason}</small>}
      </div>}
      <div className="ai-workflow-template-note">
        <b>推荐：图生视频</b>
        <span>你已经提交 8 张商品图，优先用图生视频保留商品外观、颜色、包装和细节；文生视频更适合无图试创意，首尾帧视频适合需要精确控制镜头起止状态，ComfyUI业务工作流适合后续把多节点流程固定成自动化生产线。</span>
      </div>
      <div className="ai-workflow-template-note">
        <b>提交前配置</b>
        <span>文生视频、图生视频、首尾帧视频创建任务草稿不需要模型；如果勾选“创建后立即提交”，需要先在模型配置中完成“AI 视频生成”的接口地址、模型和 API Key。ComfyUI业务工作流则需要真实 ComfyUI workflow 文件。</span>
      </div>
    </div>
    <div className="ai-dispatch-section">
      <div className="ai-section-subtitle"><b>费用预估</b><span>按 0.6 元/秒估算</span></div>
      <div className="ai-cost-grid">
        <label>分辨率<select value={resolution} onChange={event => setResolution(event.target.value)}>
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
        </select></label>
        <label>单镜头秒数<input type="number" min={1} max={30} value={secondsPerShot} onChange={event => setSecondsPerShot(Number(event.target.value))} /></label>
        <label>分镜数量<input type="number" min={1} max={Math.max(1, controller.selectedShots.length)} value={plannedShotCount} onChange={event => setPlannedShotCount(Number(event.target.value))} /></label>
      </div>
      <div className="ai-cost-summary">
        <b>预计费用：¥{estimatedCost.toFixed(2)}</b>
        <span>{normalizedShotCount} 个分镜 × {normalizedSeconds} 秒 × ¥{pricePerSecond.toFixed(2)}/秒 = {totalSeconds} 秒</span>
        <small>试跑一个镜头预计 ¥{(normalizedSeconds * pricePerSecond).toFixed(2)}；批量生成按当前分镜数量估算，实际扣费以模型平台返回为准。</small>
      </div>
    </div>
    <div className="ai-dispatch-section">
      <div className="ai-section-subtitle"><b>输入检查</b><span>{taskBlockedReason || "可创建"}</span></div>
      <div className="ai-task-readiness">
        <span className={controller.selectedProject ? "ready" : ""}>项目</span>
        <span className={controller.selectedProductAssets.length ? "ready" : ""}>商品图</span>
        <span className={controller.selectedShots.length ? "ready" : ""}>分镜</span>
        <span className={!workflowBlockedReason && selectedWorkflow ? "ready" : ""}>工作流</span>
      </div>
      <label className="ai-inline-check"><input type="checkbox" checked={submitAfterCreate} onChange={event => setSubmitAfterCreate(event.target.checked)} />创建后立即提交</label>
    </div>
    <details className="ai-dispatch-preview">
      <summary>同步内容预览</summary>
      <textarea readOnly value={syncPayload} />
    </details>
    <div className="ai-task-submit-actions">
      <button type="button" className="human-secondary" disabled={controller.loading || !!taskBlockedReason || !controller.selectedShots.length} onClick={() => createGenerationTask("trial")}><Play />先试跑一个镜头</button>
      <button type="button" disabled={controller.loading || !!taskBlockedReason} onClick={() => createGenerationTask("batch")}><Clapperboard />批量生成</button>
    </div>
  </form>;
}

function labelAssetKind(kind: string) {
  return assetKinds.find(item => item[0] === kind)?.[1] || kind;
}

function buildBusinessPrompt(project: Controller["selectedProject"], shots: Controller["selectedShots"], settings?: GenerationSettings) {
  if (!project) return "先创建项目，系统会把商品名、卖点、人群、视觉调性和分镜整理成同步内容。";
  const plannedCost = settings ? settings.secondsPerShot * settings.shotCount * settings.pricePerSecond : 0;
  const shotLines = shots.length
    ? shots.map(shot => [
      `${shot.order}. ${shot.title} / ${settings?.secondsPerShot || shot.duration_seconds}s`,
      shot.visual_goal ? `视觉：${shot.visual_goal}` : "",
      shot.camera ? `运镜：${shot.camera}` : "",
      shot.prompt ? `提示词：${shot.prompt}` : "",
      shot.negative_prompt ? `负向：${shot.negative_prompt}` : "",
    ].filter(Boolean).join("\n   ")).join("\n")
    : "尚未生成分镜";
  return [
    `项目：${project.name}`,
    `商品：${project.product_name || "未填写"}`,
    `核心卖点：${project.selling_points || "未填写"}`,
    `目标人群：${project.audience || "未填写"}`,
    `视觉调性：${project.tone || "未填写"}`,
    "用户提供：商品图",
    "模型生成：场景图、关键帧、风格参考图、过渡画面和最终视频",
    settings ? `生成设置：${settings.resolution}；${settings.shotCount} 个分镜；每镜头 ${settings.secondsPerShot} 秒；按 ¥${settings.pricePerSecond.toFixed(2)}/秒预估 ¥${plannedCost.toFixed(2)}` : "",
    `分镜：\n${shotLines}`,
  ].filter(Boolean).join("\n");
}

function TaskList({ controller }: { controller: Controller }) {
  return <section className="human-card ai-task-section">
    <div className="human-card-title"><h2>任务与结果</h2><span>横向排列任务卡片，可预览、下载和删除</span></div>
    <div className="ai-task-list">
      {controller.selectedTasks.map(task => <TaskCard key={task.id} task={task} controller={controller} />)}
      {!controller.selectedTasks.length && <p className="human-note">暂无生成任务。</p>}
    </div>
  </section>;
}

function TaskCard({ task, controller }: { task: GenerationTask; controller: Controller }) {
  const [eventsOpen, setEventsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<DeleteConfirmation | null>(null);
  const canSubmit = task.status === "queued" || task.status === "failed";
  const canRefresh = Boolean(task.provider_task_id) || task.status === "running" || task.status === "queued";
  const events = controller.taskEvents[task.id] || [];

  async function toggleEvents() {
    const nextOpen = !eventsOpen;
    setEventsOpen(nextOpen);
    if (nextOpen) await controller.loadTaskEvents(task.id);
  }

  async function downloadOutput(outputIndex: number) {
    const blob = await apiBlob(outputApiPath(task.id, outputIndex));
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-video-${task.id}-${outputIndex + 1}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return <article>
    <b>{task.workflow_name}</b>
    <span>{task.engine} · {task.status}{task.provider_task_id ? ` · ${task.provider_task_id}` : ""}</span>
    <p>{task.error || task.prompt}</p>
    {!!task.output_paths.length && <div className="ai-task-output-list">
      {task.output_paths.map((path, index) => <div className="ai-task-output" key={path}>
        <TaskOutputVideo taskId={task.id} outputIndex={index} />
        <button type="button" className="human-secondary compact" disabled={controller.loading} onClick={() => downloadOutput(index)}><Download />下载视频</button>
      </div>)}
    </div>}
    <div className="ai-task-actions">
      <button type="button" disabled={controller.loading || !canSubmit} onClick={() => controller.submitTask(task.id)}><Play />提交</button>
      <button type="button" disabled={controller.loading || !canRefresh} onClick={() => controller.refreshTask(task.id)}><RefreshCw />刷新</button>
      <button type="button" disabled={controller.loading} onClick={toggleEvents}><History />事件</button>
      <button type="button" className="human-secondary danger" disabled={controller.loading} onClick={() => setConfirmation({ title: "删除这个生成任务？", message: "将删除任务记录和事件记录；已下载到服务器磁盘的视频文件会保留。", onConfirm: () => controller.deleteTask(task.id) })}><Trash2 />删除</button>
    </div>
    {eventsOpen && <div className="ai-task-events">
      {events.map(event => <p key={event.id}><b>{event.event_type}</b><span>{event.message || event.created_at}</span></p>)}
      {!events.length && <p><span>暂无事件记录</span></p>}
    </div>}
    <ConfirmDeleteDialog confirmation={confirmation} close={() => setConfirmation(null)} />
  </article>;
}
