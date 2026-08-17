import { LoaderCircle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, clearToken, storedToken } from "./api";
import { Auth } from "./components/Auth";
import { AccountDialog } from "./components/shell/AccountDialog";
import { AppHeader } from "./components/shell/AppHeader";
import { SidebarNav } from "./components/shell/SidebarNav";
import { useNavigationState } from "./components/shell/useNavigationState";
import { AiVideoProduction } from "./modules/ai-video-production/AiVideoProduction";
import { ImageProduction } from "./modules/image-production/ImageProduction";
import { BusinessModelSettings } from "./modules/model-config/BusinessModelSettings";
import { OperationsCenter } from "./modules/operations/OperationsCenter";
import { RoleCenter } from "./modules/role-centers/RoleCenter";
import { CopyLibrary, DraftProduction, Flow, Materials, MusicLibrary } from "./modules/video-production/VideoProduction";
import type {
  ClassifiedMaterial,
  CopyItem,
  JianyingDraft,
  MusicResource,
  Narration,
  Product,
  User,
} from "./types";

export default function HumanApp() {
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
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
  const navigation = useNavigationState();

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

  const operationMessage = error || notice || (loading ? "正在刷新数据" : "空闲");
  const operationTone = error ? "error" : loading ? "busy" : notice ? "success" : "idle";
  const userDisplayName = user.display_name || user.username;

  return <div className={`human-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
    <SidebarNav
      sidebarCollapsed={sidebarCollapsed}
      module={navigation.module}
      view={navigation.view}
      imageView={navigation.imageView}
      operationView={navigation.operationView}
      roleModuleTitle={navigation.roleModuleTitle}
      expandedModules={navigation.expandedModules}
      selectedSecondaryOwner={navigation.selectedSecondaryOwner}
      username={user.username}
      onToggleSidebar={() => setSidebarCollapsed(value => !value)}
      onPrimaryModuleClick={navigation.handlePrimaryModuleClick}
      onSelectRoleModule={navigation.selectRoleModule}
      onSelectOperationView={navigation.selectOperationView}
      onSelectVideoView={navigation.selectVideoView}
      onSelectImageView={navigation.selectImageView}
      onLogout={() => { clearToken(); setUser(null); }}
    />
    <main>
      <AppHeader
        subtitle={navigation.headerSubtitle}
        title={navigation.activeTitle ?? "模型配置"}
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
      {navigation.module === "video" && navigation.view === "flow" && <Flow materials={materials} copies={copies} music={music} drafts={drafts} />}
      {navigation.module === "video" && navigation.view === "materials" && <Materials products={products} act={act} />}
      {navigation.module === "video" && navigation.view === "copy" && <CopyLibrary copies={copies} narrations={narrations} act={act} reload={refresh} />}
      {navigation.module === "video" && navigation.view === "music" && <MusicLibrary music={music} act={act} />}
      {navigation.module === "video" && navigation.view === "production" && <DraftProduction copies={copies} narrations={narrations} music={music} drafts={drafts} act={act} />}
      {navigation.module === "aiVideo" && <AiVideoProduction onError={setError} onNotice={setNotice} />}
      {navigation.module === "operations" && <OperationsCenter view={navigation.operationView} onError={setError} onNotice={setNotice} />}
      {navigation.roleModuleTitle && <RoleCenter module={navigation.module} />}
      {navigation.module === "images" && <ImageProduction view={navigation.imageView} onError={setError} onNotice={setNotice} />}
      {navigation.module === "models" && <BusinessModelSettings onError={setError} onNotice={setNotice} />}
    </main>
  </div>;
}
