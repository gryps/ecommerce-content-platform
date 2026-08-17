import {
  Boxes,
  CheckCircle2,
  Download,
  Film,
  LayoutDashboard,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  Radio,
  ScrollText,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useAiVideoProductionController } from "./useAiVideoProductionController";
import type { WorkbenchView } from "./types";

const nav: Array<[WorkbenchView, string, typeof Film]> = [
  ["overview", "生产总览", LayoutDashboard],
  ["assets", "资产库", Boxes],
  ["director", "AI导演", WandSparkles],
  ["shots", "分镜任务", Film],
  ["review", "版本审片", CheckCircle2],
  ["export", "成片导出", Download],
];

const assetKinds = [
  ["product", "商品图"],
  ["character", "人物三视图"],
  ["environment", "环境图"],
  ["prop", "道具图"],
  ["keyframe", "关键帧"],
  ["reference", "风格参考"],
];

export function AiVideoWorkbench() {
  const controller = useAiVideoProductionController();
  const [view, setView] = useState<WorkbenchView>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const activeTitle = nav.find(item => item[0] === view)?.[1] || "生产总览";
  const statusTone = controller.error ? "error" : controller.loading ? "busy" : "idle";

  return (
    <div className={`human-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside>
        <div className="human-brand">
          <Film />
          <span>
            AI宣传片工作台
            <small>AI Video Workbench</small>
          </span>
        </div>
        <button type="button" className="human-sidebar-toggle" onClick={() => setCollapsed(value => !value)} title="折叠菜单">
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </button>
        <div className="platform-module-switch">
          <button type="button" className="active" title={collapsed ? "商品宣传片" : undefined}>
            <Sparkles />
            <span>商品宣传片</span>
          </button>
        </div>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <button key={key} type="button" className={view === key ? "active" : ""} onClick={() => setView(key)} title={collapsed ? label : undefined}>
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main>
        <header>
          <div className="human-title-block">
            <small>电商运营平台 · AI视频生产</small>
            <h1>{activeTitle}</h1>
          </div>
          <div className={`human-operation-status ${statusTone}`} role={controller.error ? "alert" : "status"}>
            <b>操作状态</b>
            <span>{controller.error || (controller.loading ? "正在同步数据" : controller.message)}</span>
          </div>
          <button type="button" className="human-user-summary" onClick={controller.checkComfyUI}>
            <Radio />
            <span>检测ComfyUI</span>
          </button>
        </header>
        {view === "overview" && <Overview controller={controller} />}
        {view === "assets" && <Assets controller={controller} />}
        {view === "director" && <Director controller={controller} />}
        {view === "shots" && <Shots controller={controller} />}
        {view === "review" && <Review controller={controller} />}
        {view === "export" && <Export controller={controller} />}
      </main>
    </div>
  );
}

function Overview({ controller }: { controller: ReturnType<typeof useAiVideoProductionController> }) {
  return (
    <section className="human-page ai-video-page">
      <ProjectCreator controller={controller} />
      <div className="human-metrics">
        <article><b>{controller.store.projects.length}</b><span>项目</span></article>
        <article><b>{controller.selectedAssets.length}</b><span>当前项目资产</span></article>
        <article><b>{controller.selectedShots.length}</b><span>导演分镜</span></article>
        <article><b>{controller.selectedTasks.length}</b><span>生成任务</span></article>
      </div>
      <div className="ai-video-grid">
        <section className="human-card">
          <div className="human-card-title"><h2>生产链路</h2><span>本地资产 + ComfyUI + 厂商视频API</span></div>
          <div className="human-flow">
            {["商品资料", "人物/环境/道具", "导演分镜", "关键帧", "视频生成", "审片导出"].map((label, index) => (
              <article key={label}><i>{index + 1}</i><div><b>{label}</b><span>每一步都沉淀为可复用资产和任务记录。</span></div></article>
            ))}
          </div>
        </section>
        <ProjectPicker controller={controller} />
      </div>
    </section>
  );
}

function ProjectCreator({ controller }: { controller: ReturnType<typeof useAiVideoProductionController> }) {
  const [form, setForm] = useState({ name: "", product_name: "", selling_points: "", audience: "", tone: "高质感、可信、适合电商投放" });
  async function submit(event: FormEvent) {
    event.preventDefault();
    await controller.createProject(form);
    setForm({ ...form, name: "", product_name: "", selling_points: "", audience: "" });
  }
  return (
    <form className="human-card ai-project-form" onSubmit={submit}>
      <div className="human-card-title"><h2>新建宣传片项目</h2><span>先建立商品和导演上下文</span></div>
      <label>项目名<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
      <label>商品名<input value={form.product_name} onChange={event => setForm({ ...form, product_name: event.target.value })} /></label>
      <label>目标人群<input value={form.audience} onChange={event => setForm({ ...form, audience: event.target.value })} /></label>
      <label className="wide">核心卖点<textarea value={form.selling_points} onChange={event => setForm({ ...form, selling_points: event.target.value })} /></label>
      <label className="wide">视觉调性<input value={form.tone} onChange={event => setForm({ ...form, tone: event.target.value })} /></label>
      <button type="submit"><Plus />创建项目</button>
    </form>
  );
}

function ProjectPicker({ controller }: { controller: ReturnType<typeof useAiVideoProductionController> }) {
  return (
    <section className="human-card">
      <div className="human-card-title"><h2>当前项目</h2><span>{controller.selectedProject?.id || "尚未创建"}</span></div>
      <div className="ai-project-list">
        {controller.store.projects.map(project => (
          <button key={project.id} type="button" className={project.id === controller.selectedProject?.id ? "active" : ""} onClick={() => controller.setSelectedProjectId(project.id)}>
            <b>{project.name}</b>
            <span>{project.product_name || "未填写商品名"}</span>
          </button>
        ))}
        {!controller.store.projects.length && <p className="human-note">先创建一个项目，再进入资产和分镜生产。</p>}
      </div>
    </section>
  );
}

function Assets({ controller }: { controller: ReturnType<typeof useAiVideoProductionController> }) {
  const [kind, setKind] = useState("product");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    await controller.addAsset(kind, name, notes);
    setName("");
    setNotes("");
  }
  return (
    <section className="human-page ai-video-page">
      <div className="ai-video-grid">
        <form className="human-card ai-asset-form" onSubmit={submit}>
          <div className="human-card-title"><h2>登记资产</h2><span>图片上传接口已预留，当前先登记资产槽位</span></div>
          <label>资产类型<select value={kind} onChange={event => setKind(event.target.value)}>{assetKinds.map(item => <option key={item[0]} value={item[0]}>{item[1]}</option>)}</select></label>
          <label>资产名称<input required value={name} onChange={event => setName(event.target.value)} /></label>
          <label className="wide">备注<textarea value={notes} onChange={event => setNotes(event.target.value)} /></label>
          <button type="submit"><Upload />登记资产</button>
        </form>
        <ProjectPicker controller={controller} />
      </div>
      <section className="human-card">
        <div className="human-card-title"><h2>资产清单</h2><span>{controller.selectedProject?.name || "未选择项目"}</span></div>
        <div className="ai-asset-grid">
          {controller.selectedAssets.map(asset => <article key={asset.id}><b>{asset.name}</b><span>{asset.kind}</span><p>{asset.notes || asset.file_path || "待补充文件和说明"}</p></article>)}
        </div>
      </section>
    </section>
  );
}

function Director({ controller }: { controller: ReturnType<typeof useAiVideoProductionController> }) {
  return (
    <section className="human-page ai-video-page">
      <section className="human-card ai-director-panel">
        <div>
          <small>AI Director</small>
          <h2>根据商品资料生成广告片分镜</h2>
          <p>第一版使用可控模板生成四段式商品宣传片结构，后续接入大模型后替换为供应商 API。</p>
        </div>
        <button type="button" onClick={controller.draftShots} disabled={!controller.selectedProject}>
          <WandSparkles />生成导演分镜
        </button>
      </section>
      <Shots controller={controller} compact />
    </section>
  );
}

function Shots({ controller, compact = false }: { controller: ReturnType<typeof useAiVideoProductionController>; compact?: boolean }) {
  return (
    <section className={compact ? "" : "human-page ai-video-page"}>
      <section className="human-card">
        <div className="human-card-title"><h2>分镜列表</h2><span>用于关键帧和图生视频</span></div>
        <div className="ai-shot-list">
          {controller.selectedShots.map(shot => (
            <article key={shot.id}>
              <i>{shot.order}</i>
              <div>
                <b>{shot.title}<small>{shot.duration_seconds}s</small></b>
                <p>{shot.visual_goal}</p>
                <span>{shot.camera}</span>
                <textarea readOnly value={shot.prompt} />
                <button type="button" onClick={() => controller.createTask("product_keyframe", shot.prompt)}><Play />生成关键帧任务</button>
              </div>
            </article>
          ))}
          {!controller.selectedShots.length && <p className="human-note">暂无分镜，可在 AI导演 页面生成。</p>}
        </div>
      </section>
    </section>
  );
}

function Review({ controller }: { controller: ReturnType<typeof useAiVideoProductionController> }) {
  return (
    <section className="human-page ai-video-page">
      <section className="human-card">
        <div className="human-card-title"><h2>任务与版本</h2><span>后续会接入轮询、预览和重生成</span></div>
        <div className="ai-task-list">
          {controller.selectedTasks.map(task => <article key={task.id}><b>{task.workflow_name}</b><span>{task.engine} · {task.status}</span><p>{task.prompt}</p></article>)}
          {!controller.selectedTasks.length && <p className="human-note">暂无生成任务。</p>}
        </div>
      </section>
    </section>
  );
}

function Export({ controller }: { controller: ReturnType<typeof useAiVideoProductionController> }) {
  return (
    <section className="human-page ai-video-page">
      <section className="human-card ai-export-panel">
        <Download />
        <b>成片导出</b>
        <span>这里会聚合片段、字幕、音乐和品牌安全检查。第一版先保留出口，等视频生成适配器接入后实现打包。</span>
        {controller.loading && <LoaderCircle className="spin" />}
      </section>
    </section>
  );
}

