import { LoaderCircle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, clearToken, storedToken } from "./api";
import { Auth } from "./components/Auth";
import { AccountDialog } from "./components/shell/AccountDialog";
import { AppHeader } from "./components/shell/AppHeader";
import { SidebarNav } from "./components/shell/SidebarNav";
import {
  getActiveTitle,
  getExpandedModule,
  getHeaderSubtitle,
  getRoleModuleTitle,
  roleModules,
  validExpandedModules,
  type ModuleNavItem,
  type ModuleNavKey,
} from "./components/shell/moduleNavigation";
import { AiVideoProduction } from "./modules/ai-video-production/AiVideoProduction";
import { ImageProduction } from "./modules/image-production/ImageProduction";
import { BusinessModelSettings } from "./modules/model-config/BusinessModelSettings";
import { OperationsCenter } from "./modules/operations/OperationsCenter";
import { RoleCenter } from "./modules/role-centers/RoleCenter";
import { CopyLibrary, DraftProduction, Flow, Materials, MusicLibrary } from "./modules/video-production/VideoProduction";
import type {
  ClassifiedMaterial,
  CopyItem,
  ImageView,
  JianyingDraft,
  MusicResource,
  Narration,
  OperationView,
  PlatformModule,
  Product,
  User,
  View,
} from "./types";

const storedPlatformModule = (): PlatformModule => {
  const stored = localStorage.getItem("platform_module");
  const validModules: PlatformModule[] = [
    "operations",
    "procurement",
    "hostControl",
    "adPlanning",
    "customerService",
    "warehouse",
    "finance",
    "project",
    "images",
    "aiVideo",
    "models",
    "video",
  ];
  return validModules.includes(stored as PlatformModule) ? stored as PlatformModule : "video";
};

const storedExpandedModules = (module: PlatformModule): ModuleNavKey[] => {
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
};

export default function HumanApp() {
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [module, setModule] = useState<PlatformModule>(storedPlatformModule);
  const [view, setView] = useState<View>("flow");
  const [imageView, setImageView] = useState<ImageView>("overview");
  const [operationView, setOperationView] = useState<OperationView>("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<ClassifiedMaterial[]>([]);
  const [copies, setCopies] = useState<CopyItem[]>([]);
  const [narrations, setNarrations] = useState<Narration[]>([]);
  const [music, setMusic] = useState<MusicResource[]>([]);
  const [drafts, setDrafts] = useState<JianyingDraft[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
  const [expandedModules, setExpandedModules] = useState<ModuleNavKey[]>(() => storedExpandedModules(module));
  const [selectedSecondaryOwner, setSelectedSecondaryOwner] = useState<ModuleNavKey | "">("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [me, productRows, materialRows, copyRows, narrationRows, musicRows, draftRows] = await Promise.all([
        api<User>("/auth/me"),
        api<Product[]>("/products"),
        api<ClassifiedMaterial[]>("/human/classified-materials"),
        api<{ items: CopyItem[] }>("/human/copies/library?limit=200"),
        api<Narration[]>("/human/narrations"),
        api<MusicResource[]>("/music-resources"),
        api<JianyingDraft[]>("/human/jianying-drafts"),
      ]);
      setUser(me);
      setProducts(productRows);
      setMaterials(materialRows);
      setCopies(copyRows.items);
      setNarrations(narrationRows);
      setMusic(musicRows);
      setDrafts(draftRows);
    } catch (reason) {
      if (!storedToken()) setUser(null);
      else setError(reason instanceof Error ? reason.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api<{ initialized: boolean }>("/auth/status", {}, false).then(value => {
      setInitialized(value.initialized);
      if (value.initialized && storedToken()) refresh();
    }).catch(() => setInitialized(false));
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.display_name || user.username);
    setProfilePhone(user.phone || "");
  }, [user]);

  useEffect(() => {
    localStorage.setItem("human_sidebar_collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem("platform_module", module);
  }, [module]);

  useEffect(() => {
    localStorage.setItem("platform_expanded_modules", JSON.stringify(expandedModules));
  }, [expandedModules]);

  const act = async (work: () => Promise<unknown>, success: string) => {
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(success);
      await refresh();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败");
      return false;
    }
  };

  async function saveAccountProfile(event: FormEvent) {
    event.preventDefault();
    setAccountBusy(true);
    setAccountError("");
    setAccountMessage("");
    setError("");
    setNotice("");
    try {
      const updated = await api<User>("/auth/me", { method: "PATCH", body: JSON.stringify({ display_name: profileName, phone: profilePhone }) });
      setUser(updated);
      setAccountMessage("用户信息已更新");
      setNotice("用户信息已更新");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "用户信息保存失败";
      setAccountError(message);
      setError(message);
    } finally {
      setAccountBusy(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordBusy(true);
    setAccountError("");
    setAccountMessage("");
    setError("");
    setNotice("");
    if (newPassword !== confirmPassword) {
      setAccountError("两次输入的新密码不一致");
      setPasswordBusy(false);
      return;
    }
    try {
      await api("/auth/me/password", { method: "POST", body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setAccountMessage("密码已更新");
      setNotice("密码已更新");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "密码修改失败";
      setAccountError(message);
      setError(message);
    } finally {
      setPasswordBusy(false);
    }
  }

  if (initialized === null) return <main className="human-loading"><LoaderCircle className="spin" /> 正在启动</main>;
  if (!user) return <Auth initialized={initialized} done={value => { setUser(value); refresh(); }} />;

  const roleModuleTitle = getRoleModuleTitle(module);
  const activeTitle = getActiveTitle(module, view, imageView, operationView);
  const headerSubtitle = getHeaderSubtitle(module);
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

  return <div className={`human-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
    <SidebarNav
      sidebarCollapsed={sidebarCollapsed}
      module={module}
      view={view}
      imageView={imageView}
      operationView={operationView}
      roleModuleTitle={roleModuleTitle}
      expandedModules={expandedModules}
      selectedSecondaryOwner={selectedSecondaryOwner}
      username={user.username}
      onToggleSidebar={() => setSidebarCollapsed(value => !value)}
      onPrimaryModuleClick={handlePrimaryModuleClick}
      onSelectRoleModule={(owner, key) => { setSelectedSecondaryOwner(owner); setModule(key); }}
      onSelectOperationView={(owner, key) => { setSelectedSecondaryOwner(owner); setModule("operations"); setOperationView(key); }}
      onSelectVideoView={(owner, key) => { setSelectedSecondaryOwner(owner); setModule("video"); setView(key); }}
      onSelectImageView={(owner, key) => { setSelectedSecondaryOwner(owner); setModule("images"); setImageView(key); }}
      onLogout={() => { clearToken(); setUser(null); }}
    />
    <main>
      <AppHeader
        subtitle={headerSubtitle}
        title={activeTitle ?? "模型配置"}
        operationMessage={operationMessage}
        operationTone={operationTone}
        userDisplayName={userDisplayName}
        onOpenAccount={() => { setAccountOpen(true); setAccountError(""); setAccountMessage(""); }}
      />
      {accountOpen && <AccountDialog
        user={user}
        profileName={profileName}
        profilePhone={profilePhone}
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        accountBusy={accountBusy}
        passwordBusy={passwordBusy}
        accountMessage={accountMessage}
        accountError={accountError}
        onClose={() => setAccountOpen(false)}
        onProfileNameChange={setProfileName}
        onProfilePhoneChange={setProfilePhone}
        onCurrentPasswordChange={setCurrentPassword}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSaveProfile={saveAccountProfile}
        onSavePassword={savePassword}
      />}
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
