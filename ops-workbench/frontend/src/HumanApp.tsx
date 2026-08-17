import {
  BookOpenText,
  Boxes,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Film,
  Image as ImageIcon,
  KeyRound,
  LoaderCircle,
  LogOut,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Settings,
  ShoppingBag,
  Workflow,
  Upload,
  UserCircle,
  WandSparkles,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, clearToken, storedToken } from "./api";
import { Auth } from "./components/Auth";
import { BusinessModelSettings } from "./modules/model-config/BusinessModelSettings";
import { ImageProduction } from "./modules/image-production/ImageProduction";
import { AiVideoProduction } from "./modules/ai-video-production/AiVideoProduction";
import { OperationsCenter } from "./modules/operations/OperationsCenter";
import { RoleCenter } from "./modules/role-centers/RoleCenter";
import { Flow, Materials, CopyLibrary, MusicLibrary, DraftProduction } from "./modules/video-production/VideoProduction";
import type {
  ClassifiedMaterial,
  CopyItem,
  ImageView,
  JianyingDraft,
  MusicResource,
  OperationView,
  Narration,
  PlatformModule,
  Product,
  User,
  View,
} from "./types";

export default function HumanApp() {
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [module, setModule] = useState<PlatformModule>(() => {
    const stored = localStorage.getItem("platform_module");
    return stored === "operations" || stored === "procurement" || stored === "hostControl" || stored === "adPlanning" || stored === "customerService" || stored === "warehouse" || stored === "finance" || stored === "project" || stored === "images" || stored === "aiVideo" || stored === "models" ? stored : "video";
  });
  const [view, setView] = useState<View>("flow");
  const [imageView, setImageView] = useState<ImageView>("overview");
  const [operationView, setOperationView] = useState<OperationView>("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<ClassifiedMaterial[]>([]);
  const [copies, setCopies] = useState<CopyItem[]>([]);
  const [narrations, setNarrations] = useState<Narration[]>([]);
  const [music, setMusic] = useState<MusicResource[]>([]);
  const [drafts, setDrafts] = useState<JianyingDraft[]>([]);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("human_sidebar_collapsed") === "1");
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  type ModuleNavKey = PlatformModule | "operationsCenter";
  const roleModuleKeys: PlatformModule[] = ["procurement", "hostControl", "adPlanning", "customerService", "warehouse", "finance", "project"];
  const getExpandedModule = (value: PlatformModule): ModuleNavKey | "" => {
    if (value === "operations" || value === "video" || value === "images") return value;
    if (roleModuleKeys.includes(value)) return "operationsCenter";
    return "";
  };
  const validExpandedModules: ModuleNavKey[] = ["operations", "operationsCenter", "video", "images"];
  const [expandedModules, setExpandedModules] = useState<ModuleNavKey[]>(() => {
    const stored = localStorage.getItem("platform_expanded_modules");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.filter((key): key is ModuleNavKey => validExpandedModules.includes(key));
      } catch {
        localStorage.removeItem("platform_expanded_modules");
      }
    }
    const initial = getExpandedModule(module);
    return initial ? [initial] : [];
  });
  const [selectedSecondaryOwner, setSelectedSecondaryOwner] = useState<ModuleNavKey | "">("");

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [me, productRows, materialRows, copyRows, narrationRows, musicRows, draftRows] = await Promise.all([
        api<User>("/auth/me"), api<Product[]>("/products"),
        api<ClassifiedMaterial[]>("/human/classified-materials"),
        api<{ items: CopyItem[] }>("/human/copies/library?limit=200"), api<Narration[]>("/human/narrations"),
        api<MusicResource[]>("/music-resources"), api<JianyingDraft[]>("/human/jianying-drafts"),
      ]);
      setUser(me); setProducts(productRows); setMaterials(materialRows);
      setCopies(copyRows.items); setNarrations(narrationRows); setMusic(musicRows); setDrafts(draftRows);
    } catch (reason) {
      if (!storedToken()) setUser(null);
      else setError(reason instanceof Error ? reason.message : "加载失败");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    api<{ initialized: boolean }>("/auth/status", {}, false).then(value => {
      setInitialized(value.initialized); if (value.initialized && storedToken()) refresh();
    }).catch(() => setInitialized(false));
  }, [refresh]);
  useEffect(() => {
    if (!user) return;
    setProfileName(user.display_name || user.username);
    setProfilePhone(user.phone || "");
  }, [user]);
  useEffect(() => { localStorage.setItem("human_sidebar_collapsed", sidebarCollapsed ? "1" : "0"); }, [sidebarCollapsed]);
  useEffect(() => { localStorage.setItem("platform_module", module); }, [module]);
  useEffect(() => { localStorage.setItem("platform_expanded_modules", JSON.stringify(expandedModules)); }, [expandedModules]);
  const act = async (work: () => Promise<unknown>, success: string) => {
    setError(""); setNotice("");
    try { await work(); setNotice(success); await refresh(); return true; }
    catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败"); return false; }
  };
  async function saveAccountProfile(event: FormEvent) {
    event.preventDefault();
    setAccountBusy(true); setAccountError(""); setAccountMessage(""); setError(""); setNotice("");
    try {
      const updated = await api<User>("/auth/me", { method: "PATCH", body: JSON.stringify({ display_name: profileName, phone: profilePhone }) });
      setUser(updated);
      setAccountMessage("用户信息已更新");
      setNotice("用户信息已更新");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "用户信息保存失败";
      setAccountError(message); setError(message);
    } finally { setAccountBusy(false); }
  }
  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordBusy(true); setAccountError(""); setAccountMessage(""); setError(""); setNotice("");
    if (newPassword !== confirmPassword) {
      setAccountError("两次输入的新密码不一致");
      setPasswordBusy(false);
      return;
    }
    try {
      await api("/auth/me/password", { method: "POST", body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setAccountMessage("密码已更新");
      setNotice("密码已更新");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "密码修改失败";
      setAccountError(message); setError(message);
    } finally { setPasswordBusy(false); }
  }

  if (initialized === null) return <main className="human-loading"><LoaderCircle className="spin" /> 正在启动</main>;
  if (!user) return <Auth initialized={initialized} done={value => { setUser(value); refresh(); }} />;
  const nav: Array<[View, string, typeof Film]> = [
    ["flow", "生产总览", Film], ["materials", "素材归类", Boxes],
    ["copy", "内容文库", BookOpenText], ["music", "背景音乐", Music2], ["production", "剪映草稿", Play],
  ];
  const imageNav: Array<[ImageView, string, typeof Film]> = [
    ["overview", "生产总览", Film], ["batches", "拍摄分组", Boxes],
    ["products", "产品资料", BookOpenText], ["plans", "出图方案", WandSparkles],
    ["review", "结果审核", CheckCircle2], ["delivery", "导出上传", Upload],
  ];
  const operationNav: Array<[OperationView, string, typeof Film]> = [
    ["overview", "运营总览", BarChart3], ["topology", "业务拓扑", Workflow], ["products", "商品库", ShoppingBag],
    ["live", "直播运营", Play], ["ads", "投流复盘", ClipboardList],
    ["finance", "库存利润", Boxes], ["reports", "日报周报", BookOpenText],
  ];
  const roleModules: Array<[PlatformModule, string, typeof Film]> = [
    ["procurement", "采后中心", ShoppingBag],
    ["hostControl", "主播控场", Play],
    ["adPlanning", "投流计划", ClipboardList],
    ["customerService", "客服售后", BookOpenText],
    ["warehouse", "仓库管理", Boxes],
    ["finance", "财务管理", BarChart3],
    ["project", "项目中心", Workflow],
  ];
  type ModuleNavItem = { key: ModuleNavKey; label: string; Icon: typeof Film; children?: Array<[PlatformModule, string, typeof Film]> };
  const moduleGroups: Array<{ title: string; items: ModuleNavItem[] }> = [
    {
      title: "经营中枢",
      items: [
        { key: "operations", label: "经营看板", Icon: BarChart3 },
        { key: "operationsCenter", label: "运营中心", Icon: Workflow, children: roleModules },
      ],
    },
    {
      title: "内容生产中心",
      items: [
        { key: "images", label: "图片生产", Icon: ImageIcon },
        { key: "video", label: "视频生产", Icon: Film },
        { key: "aiVideo", label: "AI宣传片", Icon: WandSparkles },
      ],
    },
    { title: "系统配置", items: [{ key: "models", label: "模型配置", Icon: Settings }] },
  ];
  const roleModuleTitle = roleModules.find(item => item[0] === module)?.[1];
  const activeTitle = module === "operations" ? operationNav.find(item => item[0] === operationView)?.[1] : module === "video" ? nav.find(item => item[0] === view)?.[1] : module === "aiVideo" ? "AI宣传片" : module === "images" ? imageNav.find(item => item[0] === imageView)?.[1] : roleModuleTitle ?? "模型配置";
  const headerSubtitle = module === "operations" ? "电商运营平台 · 经营看板" : module === "video" ? "电商运营平台 · 视频生产" : module === "aiVideo" ? "电商运营平台 · AI视频生产" : module === "images" ? "电商运营平台 · 图片生产" : module === "models" ? "电商运营平台 · 模型配置" : `电商运营平台 · 运营中心 · ${roleModuleTitle}`;
  const operationMessage = error || notice || (loading ? "正在刷新数据" : "空闲");
  const operationTone = error ? "error" : loading ? "busy" : notice ? "success" : "idle";
  const userDisplayName = user.display_name || user.username;
  const handlePrimaryModuleClick = (item: ModuleNavItem) => {
    const hasSecondaryNav = item.key === "operationsCenter" || item.key === "operations" || item.key === "video" || item.key === "images";
    if (hasSecondaryNav) {
      setExpandedModules(current => current.includes(item.key) ? current.filter(key => key !== item.key) : [...current, item.key]);
    } else {
      setExpandedModules([]);
    }
    setSelectedSecondaryOwner("");
    setModule(item.key === "operationsCenter" ? roleModules[0][0] : item.key);
  };
  const renderSecondaryNav = (owner: ModuleNavItem) => {
    if (!expandedModules.includes(owner.key)) return null;
    if (owner.key === "operationsCenter" && owner.children) {
      return <nav className="platform-secondary-nav">{owner.children.map(([key, label, Icon]) => <button key={key} title={sidebarCollapsed ? label : undefined} className={selectedSecondaryOwner === owner.key && module === key ? "active" : ""} onClick={() => { setSelectedSecondaryOwner(owner.key); setModule(key); }}><Icon /><span>{label}</span></button>)}</nav>;
    }
    if (owner.key === "operations") {
      return <nav className="platform-secondary-nav">{operationNav.map(([key, label, Icon]) => <button key={key} title={sidebarCollapsed ? label : undefined} className={selectedSecondaryOwner === owner.key && operationView === key ? "active" : ""} onClick={() => { setSelectedSecondaryOwner(owner.key); setModule("operations"); setOperationView(key); }}><Icon /><span>{label}</span></button>)}</nav>;
    }
    if (owner.key === "video") {
      return <nav className="platform-secondary-nav">{nav.map(([key, label, Icon]) => <button key={key} title={sidebarCollapsed ? label : undefined} className={selectedSecondaryOwner === owner.key && view === key ? "active" : ""} onClick={() => { setSelectedSecondaryOwner(owner.key); setModule("video"); setView(key); }}><Icon /><span>{label}</span></button>)}</nav>;
    }
    if (owner.key === "images") {
      return <nav className="platform-secondary-nav">{imageNav.map(([key, label, Icon]) => <button key={key} title={sidebarCollapsed ? label : undefined} className={selectedSecondaryOwner === owner.key && imageView === key ? "active" : ""} onClick={() => { setSelectedSecondaryOwner(owner.key); setModule("images"); setImageView(key); }}><Icon /><span>{label}</span></button>)}</nav>;
    }
    return null;
  };
  return <div className={`human-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
    <aside>
      <div className="human-brand"><ShoppingBag /><span>电商运营平台<small>Commerce Operations</small></span></div>
      <button type="button" className="human-sidebar-toggle" onClick={() => setSidebarCollapsed(value => !value)}>
        {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </button>
      <div className="platform-module-switch" aria-label="业务模块">
        {moduleGroups.map(group => <section className="platform-module-group" key={group.title}>
          <div className="platform-module-group-title">{group.title}</div>
          {group.items.map(item => <div className="platform-module-item" key={item.key}>
            <button type="button" title={sidebarCollapsed ? item.label : undefined} className={module === item.key || (item.key === "operationsCenter" && !!roleModuleTitle) ? "active" : ""} onClick={() => handlePrimaryModuleClick(item)}><item.Icon /><span>{item.label}</span></button>
            {renderSecondaryNav(item)}
          </div>)}
        </section>)}
      </div>
      <button className="human-logout" onClick={() => { clearToken(); setUser(null); }}><LogOut /><span>退出 {user.username}</span></button>
    </aside>
    <main>
      <header><div className="human-title-block"><small>{headerSubtitle}</small><h1>{activeTitle}</h1></div>
        <div className={`human-operation-status ${operationTone}`} role={error ? "alert" : "status"} aria-live="polite">
          <b>操作状态</b><span title={operationMessage}>{operationMessage}</span>
        </div>
        <button type="button" className="human-user-summary" onClick={() => { setAccountOpen(true); setAccountError(""); setAccountMessage(""); }}>
          <UserCircle /><span title={userDisplayName}>{userDisplayName}</span>
        </button>
      </header>
      {accountOpen && <div className="account-dialog-backdrop" role="presentation">
        <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
          <div className="account-dialog-title"><div><b id="account-dialog-title">当前用户</b><span>{user.username}</span></div><button type="button" className="human-secondary" onClick={() => setAccountOpen(false)}><X />关闭</button></div>
          <form className="account-form" onSubmit={saveAccountProfile}>
            <label>姓名<input value={profileName} onChange={event => setProfileName(event.target.value)} maxLength={80} placeholder={user.username} /></label>
            <label>手机号<input value={profilePhone} onChange={event => setProfilePhone(event.target.value)} maxLength={40} placeholder="未填写" /></label>
            <button type="submit" disabled={accountBusy}>{accountBusy && <LoaderCircle className="spin" />}保存用户信息</button>
          </form>
          <form className="account-form password" onSubmit={savePassword}>
            <div><KeyRound /><b>更改密码</b></div>
            <label>当前密码<input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></label>
            <label>新密码<input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} required minLength={10} /></label>
            <label>确认新密码<input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={10} /></label>
            <button type="submit" disabled={passwordBusy}>{passwordBusy && <LoaderCircle className="spin" />}确认修改密码</button>
          </form>
          {(accountError || accountMessage) && <p className={`account-dialog-message ${accountError ? "error" : ""}`}>{accountError || accountMessage}</p>}
        </section>
      </div>}
      {module === "video" && view === "flow" && <Flow materials={materials} copies={copies} music={music} drafts={drafts} />}
      {module === "video" && view === "materials" && <Materials products={products} act={act} />}
      {module === "video" && view === "copy" && <CopyLibrary copies={copies} narrations={narrations} act={act} reload={refresh} />}
      {module === "video" && view === "music" && <MusicLibrary music={music} act={act} />}
      {module === "video" && view === "production" && <DraftProduction copies={copies} narrations={narrations} music={music} drafts={drafts} act={act} />}
      {module === "aiVideo" && <AiVideoProduction onError={setError} onNotice={setNotice} />}
      {module === "operations" && <OperationsCenter view={operationView} onError={setError} onNotice={setNotice} />}
      {roleModuleTitle && <RoleCenter module={module} />}
      {module === "images" && <ImageProduction view={imageView} onError={setError} onNotice={setNotice} />}
      {module === "models" && <BusinessModelSettings onError={setError} onNotice={setNotice} />}
    </main>
  </div>;
}

