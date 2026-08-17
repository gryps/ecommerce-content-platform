import { CheckCircle2, Clapperboard, ExternalLink, History, LoaderCircle, Play, Plus, Radio, RefreshCw, Upload, WandSparkles } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ConfirmDeleteDialog } from "../../components/ConfirmDeleteDialog";
import type { DeleteConfirmation } from "../../types";
import { useAiVideoProductionController } from "./useAiVideoProductionController";
import type { GenerationTask } from "./types";

const assetKinds = [
  ["product", "商品图"],
  ["character", "人物三视图"],
  ["environment", "环境图"],
  ["prop", "道具图"],
  ["keyframe", "关键帧"],
  ["reference", "风格参考"],
];

type Controller = ReturnType<typeof useAiVideoProductionController>;

export function AiVideoProduction({ onError, onNotice }: { onError: (value: string) => void; onNotice: (value: string) => void }) {
  const controller = useAiVideoProductionController();

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
    <div className="human-metrics">
      <article><b>{controller.store.projects.length}</b><span>宣传片项目</span></article>
      <article><b>{controller.selectedAssets.length}</b><span>业务资产</span></article>
      <article><b>{controller.selectedShots.length}</b><span>导演分镜</span></article>
      <article><b>{controller.selectedTasks.length}</b><span>生成任务</span></article>
    </div>
    <div className="ai-video-console-grid">
      <section className="ai-video-main">
        <ProjectCreator controller={controller} />
        <Assets controller={controller} />
        <DirectorAndShots controller={controller} />
        <TaskDispatcher controller={controller} />
        <TaskList controller={controller} />
      </section>
      <aside className="ai-video-side">
        <ProjectPicker controller={controller} />
        <BusinessHandoff controller={controller} />
      </aside>
    </div>
  </section>;
}

function ComfyUiBridge({ controller }: { controller: Controller }) {
  const comfyUrl = `${window.location.protocol}//${window.location.hostname}:8188/`;
  return <section className="human-card ai-comfy-bridge">
    <div>
      <small>ComfyUI 生产引擎</small>
      <h2>AI宣传片控制台</h2>
      <p>平台保留商品、资产、分镜、任务和输出记录；节点画布和 workflow 编排在 ComfyUI 中完成。</p>
    </div>
    <div className="ai-comfy-actions">
      <button type="button" onClick={controller.checkComfyUI} disabled={controller.loading}><Radio />检测连接</button>
      <button type="button" onClick={() => window.open(comfyUrl, "_blank", "noopener,noreferrer")}><ExternalLink />打开ComfyUI</button>
    </div>
    <span className="ai-comfy-status">{controller.loading ? "正在同步" : controller.message}</span>
  </section>;
}

function ProjectCreator({ controller }: { controller: Controller }) {
  const [form, setForm] = useState({ name: "", product_name: "", selling_points: "", audience: "", tone: "高质感、可信、适合电商投放" });
  const duplicateName = controller.store.projects.some(project => project.name.trim().toLowerCase() === form.name.trim().toLowerCase());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (duplicateName) return;
    await controller.createProject(form);
    setForm({ ...form, name: "", product_name: "", selling_points: "", audience: "" });
  }

  return <form className="human-card ai-project-form" onSubmit={submit}>
    <div className="human-card-title"><h2>新建宣传片项目</h2><span>平台侧业务上下文，不替代 ComfyUI workflow</span></div>
    <label>项目名<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />{duplicateName && <small className="ai-form-warning">项目名已存在</small>}</label>
    <label>商品名<input value={form.product_name} onChange={event => setForm({ ...form, product_name: event.target.value })} /></label>
    <label>目标人群<input value={form.audience} onChange={event => setForm({ ...form, audience: event.target.value })} /></label>
    <label className="wide">核心卖点<textarea value={form.selling_points} onChange={event => setForm({ ...form, selling_points: event.target.value })} /></label>
    <label className="wide">视觉调性<input value={form.tone} onChange={event => setForm({ ...form, tone: event.target.value })} /></label>
    <button type="submit" disabled={controller.loading || duplicateName}><Plus />创建项目</button>
  </form>;
}

function ProjectPicker({ controller }: { controller: Controller }) {
  const [confirmation, setConfirmation] = useState<DeleteConfirmation | null>(null);

  return <section className="human-card">
    <div className="human-card-title"><h2>当前项目</h2><span>{controller.selectedProject?.id || "尚未创建"}</span></div>
    <div className="ai-project-list">
      {controller.store.projects.map(project => <article key={project.id} className={project.id === controller.selectedProject?.id ? "active" : ""}>
        <button type="button" onClick={() => controller.setSelectedProjectId(project.id)}><b>{project.name}</b><span>{project.product_name || "未填写商品名"}</span></button>
        <button type="button" className="human-danger compact" disabled={controller.loading} onClick={() => setConfirmation({ title: `删除项目“${project.name}”？`, message: "将删除项目下的资产、分镜、任务和事件记录，无法恢复。", onConfirm: () => controller.deleteProject(project.id) })}>删除</button>
      </article>)}
      {!controller.store.projects.length && <p className="human-note">先创建项目，再登记资产和调度 ComfyUI。</p>}
    </div>
    <ConfirmDeleteDialog confirmation={confirmation} close={() => setConfirmation(null)} />
  </section>;
}

function Assets({ controller }: { controller: Controller }) {
  const [kind, setKind] = useState("product");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    if (next && !name.trim()) setName(next.name);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file) {
      await controller.uploadAsset(kind, name || file.name, notes, file);
    } else {
      await controller.addAsset(kind, name, notes);
    }
    setName("");
    setNotes("");
    setFile(null);
    event.currentTarget.reset();
  }

  return <section className="human-card">
    <div className="human-card-title"><h2>业务资产</h2><span>资产保存在平台，作为 ComfyUI 和厂商 API 的输入</span></div>
    <form className="ai-asset-form" onSubmit={submit}>
      <label>类型<select value={kind} onChange={event => setKind(event.target.value)}>{assetKinds.map(item => <option key={item[0]} value={item[0]}>{item[1]}</option>)}</select></label>
      <label>名称<input required value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="wide">资产文件<input type="file" accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx" onChange={chooseFile} /></label>
      <label className="wide">备注<textarea value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <button type="submit" disabled={!controller.selectedProject || controller.loading}><Upload />{file ? "上传资产" : "登记资产"}</button>
    </form>
    <div className="ai-asset-grid">
      {controller.selectedAssets.map(asset => <article key={asset.id}><b>{asset.name}</b><span>{asset.kind}</span><p>{asset.notes || asset.file_path || "待补充文件和说明"}</p></article>)}
      {!controller.selectedAssets.length && <p className="human-note">当前项目暂无资产。</p>}
    </div>
  </section>;
}

function DirectorAndShots({ controller }: { controller: Controller }) {
  return <section className="human-card">
    <div className="human-card-title"><h2>导演分镜</h2><span>把商品目标转成可复制到 ComfyUI 的镜头提示词</span></div>
    <div className="ai-director-panel inline">
      <div><small>AI Director</small><p>平台生成业务分镜草稿，人工确认后再进入 ComfyUI workflow 或厂商视频 API。</p></div>
      <button type="button" onClick={controller.draftShots} disabled={controller.loading || !controller.selectedProject}><WandSparkles />生成分镜</button>
    </div>
    <div className="ai-shot-list">
      {controller.selectedShots.map(shot => <article key={shot.id}><i>{shot.order}</i><div><b>{shot.title}<small>{shot.duration_seconds}s</small></b><p>{shot.visual_goal}</p><span>{shot.camera}</span><textarea readOnly value={shot.prompt} /></div></article>)}
      {!controller.selectedShots.length && <p className="human-note">暂无分镜，可先创建项目并生成导演分镜。</p>}
    </div>
  </section>;
}

function TaskDispatcher({ controller }: { controller: Controller }) {
  const firstWorkflow = controller.workflows[0];
  const [workflowName, setWorkflowName] = useState(firstWorkflow?.name || "text_to_video");
  const [submitAfterCreate, setSubmitAfterCreate] = useState(true);
  const selectedWorkflow = controller.workflows.find(item => item.name === workflowName);
  const syncPayload = buildBusinessPrompt(controller.selectedProject, controller.selectedShots);

  useEffect(() => {
    if (firstWorkflow && !controller.workflows.some(item => item.name === workflowName)) {
      setWorkflowName(firstWorkflow.name);
    }
  }, [controller.workflows, firstWorkflow, workflowName]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await controller.createTask(workflowName, syncPayload, selectedWorkflow?.default_engine || "vendor_video", submitAfterCreate);
  }

  return <form className="human-card ai-task-dispatcher" onSubmit={submit}>
    <div className="human-card-title"><h2>同步到生产画布</h2><span>平台只提交业务输入，节点参数留在 ComfyUI</span></div>
    <label>工作流<select value={workflowName} onChange={event => setWorkflowName(event.target.value)}>{controller.workflows.map(item => <option key={item.name} value={item.name}>{item.label}</option>)}</select></label>
    {selectedWorkflow && <div className="ai-workflow-template-note"><b>{selectedWorkflow.mode}</b><span>{selectedWorkflow.description} · 执行：{selectedWorkflow.default_engine === "comfyui" ? "ComfyUI" : "厂商视频API"}</span>{selectedWorkflow.availability_note && <small>{selectedWorkflow.availability_note}</small>}</div>}
    <label className="wide">同步内容预览<textarea readOnly value={syncPayload} /></label>
    <label className="ai-inline-check"><input type="checkbox" checked={submitAfterCreate} onChange={event => setSubmitAfterCreate(event.target.checked)} />创建后立即提交</label>
    <button type="submit" disabled={controller.loading || !controller.selectedProject || !syncPayload.trim()}><Clapperboard />创建任务</button>
  </form>;
}

function buildBusinessPrompt(project: Controller["selectedProject"], shots: Controller["selectedShots"]) {
  if (!project) return "先创建项目，系统会把商品名、卖点、人群、视觉调性和分镜整理成同步内容。";
  const shotLines = shots.length
    ? shots.map(shot => [
      `${shot.order}. ${shot.title} / ${shot.duration_seconds}s`,
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
    `分镜：\n${shotLines}`,
  ].filter(Boolean).join("\n");
}

function TaskList({ controller }: { controller: Controller }) {
  return <section className="human-card">
    <div className="human-card-title"><h2>任务与结果</h2><span>平台保留任务 ID、状态、错误和本地输出路径</span></div>
    <div className="ai-task-list">
      {controller.selectedTasks.map(task => <TaskCard key={task.id} task={task} controller={controller} />)}
      {!controller.selectedTasks.length && <p className="human-note">暂无生成任务。</p>}
    </div>
  </section>;
}

function TaskCard({ task, controller }: { task: GenerationTask; controller: Controller }) {
  const [eventsOpen, setEventsOpen] = useState(false);
  const canSubmit = task.status === "queued" || task.status === "failed";
  const canRefresh = Boolean(task.provider_task_id) || task.status === "running" || task.status === "queued";
  const events = controller.taskEvents[task.id] || [];

  async function toggleEvents() {
    const nextOpen = !eventsOpen;
    setEventsOpen(nextOpen);
    if (nextOpen) await controller.loadTaskEvents(task.id);
  }

  return <article>
    <b>{task.workflow_name}</b>
    <span>{task.engine} · {task.status}{task.provider_task_id ? ` · ${task.provider_task_id}` : ""}</span>
    <p>{task.error || task.prompt}</p>
    {task.output_paths.map(path => <small key={path}>{path}</small>)}
    <div className="ai-task-actions">
      <button type="button" disabled={controller.loading || !canSubmit} onClick={() => controller.submitTask(task.id)}><Play />提交</button>
      <button type="button" disabled={controller.loading || !canRefresh} onClick={() => controller.refreshTask(task.id)}><RefreshCw />刷新</button>
      <button type="button" disabled={controller.loading} onClick={toggleEvents}><History />事件</button>
    </div>
    {eventsOpen && <div className="ai-task-events">
      {events.map(event => <p key={event.id}><b>{event.event_type}</b><span>{event.message || event.created_at}</span></p>)}
      {!events.length && <p><span>暂无事件记录</span></p>}
    </div>}
  </article>;
}

function BusinessHandoff({ controller }: { controller: Controller }) {
  const stages = useMemo(() => [
    ["平台资产", controller.selectedAssets.length ? "ready" : "empty", "商品图、人物、环境、参考图仍在平台管理。"],
    ["ComfyUI画布", "external", "打开 ComfyUI 编排节点，平台只保存业务输入和任务记录。"],
    ["厂商生成", controller.selectedTasks.length ? "ready" : "empty", "文生视频、图生视频通过模型 API 执行，不依赖本地显卡。"],
    ["结果回收", controller.selectedTasks.some(task => task.output_paths.length) ? "ready" : "empty", "成功输出下载到小主机运行态目录，后续进入审核和导出。"],
  ], [controller.selectedAssets.length, controller.selectedTasks]);

  return <section className="human-card ai-handoff-card">
    <div className="human-card-title"><h2>职责边界</h2><span>平台是业务中台，ComfyUI 是生产画布</span></div>
    {stages.map(([title, state, text], index) => <article key={title} className={state}><i>{index + 1}</i><div><b>{title}</b><span>{text}</span></div></article>)}
    {controller.loading && <LoaderCircle className="spin" />}
    <CheckCircle2 className="ai-handoff-mark" />
  </section>;
}
