import { Boxes, CheckCircle2, Clapperboard, Download, Film, LayoutDashboard, LoaderCircle, Minus, Play, Plus, Radio, Share2, Upload, WandSparkles } from "lucide-react";
import { ChangeEvent, FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAiVideoProductionController } from "./useAiVideoProductionController";
import type { WorkbenchView } from "./types";

const views: Array<[WorkbenchView, string, typeof Film]> = [
  ["overview", "总览", LayoutDashboard],
  ["canvas", "画布", Share2],
  ["assets", "资产", Upload],
  ["director", "导演", WandSparkles],
  ["shots", "分镜", Film],
  ["review", "任务", CheckCircle2],
  ["export", "导出", Download],
];

const assetKinds = [
  ["product", "商品图"],
  ["character", "人物三视图"],
  ["environment", "环境图"],
  ["prop", "道具图"],
  ["keyframe", "关键帧"],
  ["reference", "风格参考"],
];

type Controller = ReturnType<typeof useAiVideoProductionController>;

export function AiVideoProduction({ onError }: { onError: (value: string) => void; onNotice: (value: string) => void }) {
  const controller = useAiVideoProductionController();

  useEffect(() => {
    if (controller.error) onError(controller.error);
  }, [controller.error, onError]);

  return <section className="human-page ai-video-page">
    {controller.loading && <p className="human-note">正在同步 AI 视频数据</p>}
    <WorkflowCanvas controller={controller} />
  </section>;
}

function Overview({ controller }: { controller: Controller }) {
  return <>
    <ProjectCreator controller={controller} />
    <div className="human-metrics">
      <article><b>{controller.store.projects.length}</b><span>项目</span></article>
      <article><b>{controller.selectedAssets.length}</b><span>资产</span></article>
      <article><b>{controller.selectedShots.length}</b><span>分镜</span></article>
      <article><b>{controller.selectedTasks.length}</b><span>任务</span></article>
    </div>
    <div className="ai-video-grid">
      <WorkflowCanvas controller={controller} compact />
      <ProjectPicker controller={controller} />
    </div>
  </>;
}

function WorkflowCanvas({ controller, compact = false }: { controller: Controller; compact?: boolean }) {
  const [selectedNodeKey, setSelectedNodeKey] = useState("project");
  const [zoom, setZoom] = useState(1);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ key: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [projectForm, setProjectForm] = useState({ name: "", product_name: "", selling_points: "", audience: "", tone: "高质感、可信、适合电商投放" });
  const [assetForm, setAssetForm] = useState({ kind: "product", name: "", notes: "" });
  const [taskForm, setTaskForm] = useState({ keyframePrompt: "", videoPrompt: "" });
  const projectReady = Boolean(controller.selectedProject);
  const assetsReady = controller.selectedAssets.length > 0;
  const shotsReady = controller.selectedShots.length > 0;
  const keyframeTasks = controller.selectedTasks.filter(task => task.workflow_name.includes("keyframe"));
  const videoTasks = controller.selectedTasks.filter(task => task.workflow_name.includes("video"));
  const reviewReady = controller.selectedTasks.some(task => task.status === "succeeded" || task.output_paths.length > 0);
  const nextStep = !projectReady ? "先新建宣传片项目，补齐商品名、卖点和目标人群。" : !assetsReady ? "上传商品图、人物三视图、环境图和风格参考。" : !shotsReady ? "进入导演页生成分镜，把业务目标转成镜头脚本。" : !keyframeTasks.length ? "在分镜列表里发起关键帧任务。" : !videoTasks.length ? "关键帧通过后创建图生视频或片段合成任务。" : "进入任务页审核版本，再汇总到导出页。";
  const nodes = useMemo(() => [
    { key: "project", title: "总览标签", stage: "项目字段", meta: controller.selectedProject?.name || "未选择项目", Icon: LayoutDashboard, state: projectReady ? "ready" : "empty", detail: "填写项目名、商品名、卖点、人群和视觉调性，创建后成为整条链路上下文。", output: "总览 / 项目", rows: [["项目ID", controller.selectedProject?.id || "empty"], ["商品名", controller.selectedProject?.product_name || "未填写"], ["视觉调性", controller.selectedProject?.tone || "默认投放质感"]] },
    { key: "assets", title: "资产标签", stage: "资产字段", meta: `${controller.selectedAssets.length} 个资产`, Icon: Boxes, state: assetsReady ? "ready" : "empty", detail: "登记商品图、人物三视图、环境图、道具图、关键帧和风格参考。", output: "资产", rows: [["商品图", `${controller.selectedAssets.filter(asset => asset.kind === "product").length}`], ["人物图", `${controller.selectedAssets.filter(asset => asset.kind === "character").length}`], ["风格参考", `${controller.selectedAssets.filter(asset => asset.kind === "reference").length}`]] },
    { key: "director", title: "导演标签", stage: "导演字段", meta: `${controller.selectedShots.length} 条分镜`, Icon: WandSparkles, state: shotsReady ? "ready" : assetsReady ? "pending" : "empty", detail: "根据总览字段和资产生成导演分镜。", output: "导演", rows: [["核心卖点", controller.selectedProject?.selling_points || "等待卖点"], ["目标人群", controller.selectedProject?.audience || "等待人群"], ["分镜数", `${controller.selectedShots.length}`]] },
    { key: "shots", title: "分镜标签", stage: "分镜字段", meta: controller.selectedShots[0]?.title || "暂无分镜", Icon: Film, state: shotsReady ? "ready" : assetsReady ? "pending" : "empty", detail: "查看导演分镜，并可把分镜提示词直接送入关键帧任务。", output: "分镜", rows: [["分镜数", `${controller.selectedShots.length}`], ["首条时长", controller.selectedShots[0] ? `${controller.selectedShots[0].duration_seconds}s` : "0s"], ["状态", shotsReady ? "已生成" : "待生成"]] },
    { key: "review", title: "任务标签", stage: "任务字段", meta: `${controller.selectedTasks.length} 个任务`, Icon: CheckCircle2, state: controller.selectedTasks.length ? "running" : shotsReady ? "pending" : "empty", detail: "创建关键帧、图生视频和片段合成任务，并查看任务版本状态。", output: "任务", rows: [["关键帧任务", `${keyframeTasks.length}`], ["视频任务", `${videoTasks.length}`], ["审核状态", reviewReady ? "可审核" : "等待生成"]] },
    { key: "export", title: "导出标签", stage: "导出字段", meta: reviewReady ? "可整理交付" : "等待审核", Icon: Download, state: reviewReady ? "ready" : controller.selectedTasks.length ? "pending" : "empty", detail: "聚合片段、字幕、音乐和品牌检查，后续接入剪映草稿或平台素材包导出。", output: "导出", rows: [["版本数", `${controller.selectedTasks.length}`], ["导出目标", "剪映/平台素材"], ["状态", reviewReady ? "可导出" : "未就绪"]] },
  ], [assetsReady, controller.selectedAssets, controller.selectedProject, controller.selectedShots.length, controller.selectedTasks, keyframeTasks.length, projectReady, reviewReady, shotsReady, videoTasks.length]);
  const [nodeInputs, setNodeInputs] = useState<Record<string, string>>({});
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [boardSize, setBoardSize] = useState({ width: 1220, height: 620 });
  const boardNodes = nodes.map(node => ({ ...node, note: nodeInputs[node.key] ?? node.detail, x: positions[node.key]?.x ?? 48, y: positions[node.key]?.y ?? 48 }));
  const selectedNode = nodes.find(node => node.key === selectedNodeKey) || nodes[0];
  const selectedNote = nodeInputs[selectedNode.key] ?? selectedNode.detail;
  const statusLabel = { ready: "已就绪", running: "生成中", pending: "待执行", empty: "缺输入" }[selectedNode.state];
  const links = [["project", "assets"], ["assets", "director"], ["director", "shots"], ["shots", "review"], ["review", "export"]];

  useEffect(() => {
    if (!controller.selectedProject) return;
    setProjectForm({
      name: controller.selectedProject.name,
      product_name: controller.selectedProject.product_name,
      selling_points: controller.selectedProject.selling_points,
      audience: controller.selectedProject.audience,
      tone: controller.selectedProject.tone || "高质感、可信、适合电商投放",
    });
  }, [controller.selectedProject]);

  async function createCanvasProject() {
    if (!projectForm.name.trim()) return;
    await controller.createProject(projectForm);
  }

  async function addCanvasAsset() {
    if (!assetForm.name.trim()) return;
    await controller.addAsset(assetForm.kind, assetForm.name, assetForm.notes);
    setAssetForm({ ...assetForm, name: "", notes: "" });
  }

  async function createCanvasTask(workflowName: string, prompt: string) {
    if (!prompt.trim()) return;
    const isVideo = workflowName.includes("video");
    await controller.createTask(workflowName, prompt, isVideo ? "vendor_video" : "comfyui", isVideo);
  }

  function stopCanvasInput(event: { stopPropagation: () => void }) {
    event.stopPropagation();
  }

  function tileNodes(width = stageRef.current?.clientWidth || 1220) {
    const nodeWidth = 276;
    const nodeHeight = 330;
    const gapX = 54;
    const gapY = 42;
    const padding = 34;
    const availableWidth = Math.max(320, width - 28);
    const columns = Math.max(1, Math.floor((availableWidth - padding) / (nodeWidth + gapX)));
    const nextPositions = Object.fromEntries(nodes.map((node, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return [node.key, { x: padding + column * (nodeWidth + gapX), y: 58 + row * (nodeHeight + gapY) }];
    }));
    const rows = Math.ceil(nodes.length / columns);
    setPositions(nextPositions);
    setBoardSize({ width: Math.max(availableWidth, padding * 2 + columns * nodeWidth + (columns - 1) * gapX), height: Math.max(640, 70 + rows * nodeHeight + (rows - 1) * gapY) });
  }

  useEffect(() => {
    tileNodes();
    const stage = stageRef.current;
    if (!stage) return undefined;
    const observer = new ResizeObserver(entries => tileNodes(entries[0].contentRect.width));
    observer.observe(stage);
    return () => observer.disconnect();
  }, [nodes.length]);

  function startDrag(event: PointerEvent<HTMLElement>, key: string) {
    const position = positions[key];
    if (!position) return;
    dragRef.current = { key, startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedNodeKey(key);
  }

  function dragNode(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const nextX = Math.max(18, drag.originX + (event.clientX - drag.startX) / zoom);
    const nextY = Math.max(44, drag.originY + (event.clientY - drag.startY) / zoom);
    setPositions(value => ({ ...value, [drag.key]: { x: nextX, y: nextY } }));
    setBoardSize(value => ({ width: Math.max(value.width, nextX + 320), height: Math.max(value.height, nextY + 370) }));
  }

  function stopDrag(event: PointerEvent<HTMLElement>) {
    if (dragRef.current) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  }

  function linkPath(fromKey: string, toKey: string) {
    const from = boardNodes.find(node => node.key === fromKey);
    const to = boardNodes.find(node => node.key === toKey);
    if (!from || !to) return "";
    const startX = from.x + 276;
    const startY = from.y + 165;
    const endX = to.x;
    const endY = to.y + 165;
    const bend = Math.max(46, Math.abs(endX - startX) * .45);
    return `M${startX} ${startY} C${startX + bend} ${startY} ${endX - bend} ${endY} ${endX} ${endY}`;
  }

  return <section className={`human-card ai-workflow-canvas-card${compact ? " compact" : ""}`}>
    <div className="human-card-title">
      <h2>AI宣传片业务画布</h2>
      <span>{controller.selectedProject?.name || "从业务资产到 ComfyUI 执行链路"}</span>
    </div>
    <div className="ai-workflow-canvas">
      <div className="ai-workflow-stage" ref={stageRef} aria-label="AI宣传片业务画布">
        <div className="ai-workflow-controls" aria-label="画布缩放">
          <button type="button" onClick={() => setZoom(value => Math.max(.75, Number((value - .1).toFixed(2))))} title="缩小"><Minus /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom(value => Math.min(1.25, Number((value + .1).toFixed(2))))} title="放大"><Plus /></button>
          <button type="button" onClick={() => tileNodes()} title="自动平铺"><Boxes /></button>
        </div>
        <div className="ai-workflow-board" style={{ width: boardSize.width, height: boardSize.height, transform: `scale(${zoom})` }}>
          <svg className="ai-workflow-lines" viewBox={`0 0 ${boardSize.width} ${boardSize.height}`} aria-hidden="true">
            {links.map(([from, to]) => <path key={`${from}-${to}`} d={linkPath(from, to)} />)}
          </svg>
          {boardNodes.map(node => <article key={node.key} className={`ai-workflow-node ${node.state} ${selectedNode.key === node.key ? "selected" : ""}`} style={{ left: node.x, top: node.y }} onClick={() => setSelectedNodeKey(node.key)}>
            <span className="ai-node-port input" />
            <span className="ai-node-port output" />
            <div className="ai-node-title" onPointerDown={event => startDrag(event, node.key)} onPointerMove={dragNode} onPointerUp={stopDrag} onPointerCancel={stopDrag}><node.Icon /><b>{node.title}</b></div>
            <div className="ai-node-body">
              <small>{node.stage}</small>
              <span className="ai-node-meta">{node.meta}</span>
              {node.rows.map(([label, value]) => <div className="ai-node-row" key={label}><span>{label}</span><em>{value}</em></div>)}
              {node.key === "project" && <div className="ai-node-fields" onClick={stopCanvasInput}>
                <input placeholder="项目名" value={projectForm.name} onChange={event => setProjectForm(value => ({ ...value, name: event.target.value }))} />
                <input placeholder="商品名" value={projectForm.product_name} onChange={event => setProjectForm(value => ({ ...value, product_name: event.target.value }))} />
                <textarea placeholder="核心卖点" value={projectForm.selling_points} onChange={event => setProjectForm(value => ({ ...value, selling_points: event.target.value }))} />
                <input placeholder="目标人群" value={projectForm.audience} onChange={event => setProjectForm(value => ({ ...value, audience: event.target.value }))} />
                <input placeholder="视觉调性" value={projectForm.tone} onChange={event => setProjectForm(value => ({ ...value, tone: event.target.value }))} />
                <button type="button" disabled={controller.loading || !projectForm.name.trim()} onClick={createCanvasProject}><Plus />创建项目</button>
              </div>}
              {node.key === "assets" && <div className="ai-node-fields" onClick={stopCanvasInput}>
                <select value={assetForm.kind} onChange={event => setAssetForm(value => ({ ...value, kind: event.target.value }))}>{assetKinds.map(item => <option key={item[0]} value={item[0]}>{item[1]}</option>)}</select>
                <input placeholder="资产名称" value={assetForm.name} onChange={event => setAssetForm(value => ({ ...value, name: event.target.value }))} />
                <textarea placeholder="资产备注" value={assetForm.notes} onChange={event => setAssetForm(value => ({ ...value, notes: event.target.value }))} />
                <button type="button" disabled={controller.loading || !controller.selectedProject || !assetForm.name.trim()} onClick={addCanvasAsset}><Upload />登记资产</button>
              </div>}
              {node.key === "director" && <div className="ai-node-fields" onClick={stopCanvasInput}>
                <textarea readOnly value={`${controller.selectedProject?.selling_points || "核心卖点未填写"}\n${controller.selectedProject?.audience || "目标人群未填写"}`} />
                <button type="button" disabled={controller.loading || !controller.selectedProject} onClick={controller.draftShots}><WandSparkles />生成导演分镜</button>
              </div>}
              {node.key === "shots" && <div className="ai-node-fields" onClick={stopCanvasInput}>
                <select value={taskForm.keyframePrompt} onChange={event => setTaskForm(value => ({ ...value, keyframePrompt: event.target.value }))}>
                  <option value="">选择分镜提示词</option>
                  {controller.selectedShots.map(shot => <option key={shot.id} value={shot.prompt}>{shot.order}. {shot.title}</option>)}
                </select>
                <textarea placeholder="关键帧提示词" value={taskForm.keyframePrompt} onChange={event => setTaskForm(value => ({ ...value, keyframePrompt: event.target.value }))} />
                <button type="button" disabled={controller.loading || !taskForm.keyframePrompt.trim()} onClick={() => createCanvasTask("product_keyframe", taskForm.keyframePrompt)}><Play />生成关键帧</button>
              </div>}
              {node.key === "review" && <div className="ai-node-fields" onClick={stopCanvasInput}>
                <textarea placeholder="图生视频/片段合成提示词" value={taskForm.videoPrompt} onChange={event => setTaskForm(value => ({ ...value, videoPrompt: event.target.value }))} />
                <button type="button" disabled={controller.loading || !taskForm.videoPrompt.trim()} onClick={() => createCanvasTask("image_to_video", taskForm.videoPrompt)}><Clapperboard />生成视频片段</button>
              </div>}
              {node.key === "export" && <label className="ai-node-input">导出备注<textarea value={node.note} onChange={event => setNodeInputs(value => ({ ...value, [node.key]: event.target.value }))} onClick={event => event.stopPropagation()} /></label>}
            </div>
            <div className="ai-node-output"><i />{node.output}</div>
          </article>)}
        </div>
        <div className="ai-workflow-minimap" aria-hidden="true">
          {boardNodes.map(node => <i key={node.key} style={{ left: `${(node.x / boardSize.width) * 100}%`, top: `${(node.y / boardSize.height) * 100}%` }} />)}
        </div>
      </div>
      <aside className="ai-workflow-inspector">
        <small>节点详情</small>
        <b>{selectedNode.title}</b>
        <span className={`ai-workflow-status ${selectedNode.state}`}>{statusLabel}</span>
        <textarea value={selectedNote} onChange={event => setNodeInputs(value => ({ ...value, [selectedNode.key]: event.target.value }))} />
        <strong>下一步</strong>
        <p>{nextStep}</p>
        <dl>
          <div><dt>业务资产</dt><dd>{controller.selectedAssets.length}</dd></div>
          <div><dt>导演分镜</dt><dd>{controller.selectedShots.length}</dd></div>
          <div><dt>生成任务</dt><dd>{controller.selectedTasks.length}</dd></div>
        </dl>
      </aside>
    </div>
  </section>;
}

function ProjectCreator({ controller }: { controller: Controller }) {
  const [form, setForm] = useState({ name: "", product_name: "", selling_points: "", audience: "", tone: "高质感、可信、适合电商投放" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await controller.createProject(form);
    setForm({ ...form, name: "", product_name: "", selling_points: "", audience: "" });
  }
  return <form className="human-card ai-project-form" onSubmit={submit}>
    <div className="human-card-title"><h2>新建宣传片项目</h2><span>先建立商品和导演上下文</span></div>
    <label>项目名<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
    <label>商品名<input value={form.product_name} onChange={event => setForm({ ...form, product_name: event.target.value })} /></label>
    <label>目标人群<input value={form.audience} onChange={event => setForm({ ...form, audience: event.target.value })} /></label>
    <label className="wide">核心卖点<textarea value={form.selling_points} onChange={event => setForm({ ...form, selling_points: event.target.value })} /></label>
    <label className="wide">视觉调性<input value={form.tone} onChange={event => setForm({ ...form, tone: event.target.value })} /></label>
    <button type="submit"><Plus />创建项目</button>
  </form>;
}

function ProjectPicker({ controller }: { controller: Controller }) {
  return <section className="human-card">
    <div className="human-card-title"><h2>当前项目</h2><span>{controller.selectedProject?.id || "尚未创建"}</span></div>
    <div className="ai-project-list">
      {controller.store.projects.map(project => <button key={project.id} type="button" className={project.id === controller.selectedProject?.id ? "active" : ""} onClick={() => controller.setSelectedProjectId(project.id)}><b>{project.name}</b><span>{project.product_name || "未填写商品名"}</span></button>)}
      {!controller.store.projects.length && <p className="human-note">先创建项目，再生产资产和分镜。</p>}
    </div>
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
  return <>
    <div className="ai-video-grid">
      <form className="human-card ai-asset-form" onSubmit={submit}>
        <div className="human-card-title"><h2>上传资产</h2><span>商品图、人物三视图、环境图、道具图</span></div>
        <label>类型<select value={kind} onChange={event => setKind(event.target.value)}>{assetKinds.map(item => <option key={item[0]} value={item[0]}>{item[1]}</option>)}</select></label>
        <label>名称<input required value={name} onChange={event => setName(event.target.value)} /></label>
        <label className="wide">资产文件<input type="file" accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx" onChange={chooseFile} /></label>
        <label className="wide">备注<textarea value={notes} onChange={event => setNotes(event.target.value)} /></label>
        <button type="submit" disabled={!controller.selectedProject || controller.loading}><Upload />{file ? "上传资产" : "登记资产"}</button>
      </form>
      <ProjectPicker controller={controller} />
    </div>
    <section className="human-card"><div className="human-card-title"><h2>资产清单</h2><span>{controller.selectedProject?.name || "未选择项目"}</span></div><div className="ai-asset-grid">{controller.selectedAssets.map(asset => <article key={asset.id}><b>{asset.name}</b><span>{asset.kind}</span><p>{asset.notes || asset.file_path || "待补充文件和说明"}</p></article>)}</div></section>
  </>;
}

function Director({ controller }: { controller: Controller }) {
  return <>
    <section className="human-card ai-director-panel"><div><small>AI Director</small><h2>生成商品广告片分镜</h2><p>第一版使用可控模板输出四段式结构，后续替换为供应商大模型 API。</p></div><button type="button" onClick={controller.draftShots} disabled={!controller.selectedProject}><WandSparkles />生成导演分镜</button></section>
    <Shots controller={controller} />
  </>;
}

function Shots({ controller }: { controller: Controller }) {
  return <section className="human-card"><div className="human-card-title"><h2>分镜列表</h2><span>用于关键帧和图生视频</span></div><div className="ai-shot-list">{controller.selectedShots.map(shot => <article key={shot.id}><i>{shot.order}</i><div><b>{shot.title}<small>{shot.duration_seconds}s</small></b><p>{shot.visual_goal}</p><span>{shot.camera}</span><textarea readOnly value={shot.prompt} /><button type="button" onClick={() => controller.createTask("product_keyframe", shot.prompt)}><Play />生成关键帧任务</button></div></article>)}{!controller.selectedShots.length && <p className="human-note">暂无分镜，可在导演页生成。</p>}</div></section>;
}

function Review({ controller }: { controller: Controller }) {
  return <section className="human-card"><div className="human-card-title"><h2>任务与版本</h2><span>记录厂商任务 ID、错误和输出路径</span></div><div className="ai-task-list">{controller.selectedTasks.map(task => <article key={task.id}><b>{task.workflow_name}</b><span>{task.engine} · {task.status}{task.provider_task_id ? ` · ${task.provider_task_id}` : ""}</span><p>{task.error || task.prompt}</p>{task.output_paths.map(path => <small key={path}>{path}</small>)}</article>)}{!controller.selectedTasks.length && <p className="human-note">暂无生成任务。</p>}</div></section>;
}

function Export({ controller }: { controller: Controller }) {
  return <section className="human-card ai-export-panel"><Download /><b>成片导出</b><span>这里会聚合片段、字幕、音乐和品牌安全检查。等视频生成适配器接入后实现打包。</span>{controller.loading && <LoaderCircle className="spin" />}</section>;
}
