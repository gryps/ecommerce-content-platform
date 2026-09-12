import { Film, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ImageView, PlatformModule, View } from "../../types";
import {
  imageNav,
  moduleGroups,
  videoNav,
  type ModuleNavItem,
  type ModuleNavKey,
} from "./moduleNavigation";

type SidebarNavProps = {
  sidebarCollapsed: boolean;
  module: PlatformModule;
  view: View;
  imageView: ImageView;
  expandedModules: ModuleNavKey[];
  selectedSecondaryOwner: ModuleNavKey | "";
  username: string;
  onToggleSidebar: () => void;
  onPrimaryModuleClick: (item: ModuleNavItem) => void;
  onSelectVideoView: (owner: ModuleNavKey, key: View) => void;
  onSelectImageView: (owner: ModuleNavKey, key: ImageView) => void;
  onLogout: () => void;
};

export function SidebarNav({
  sidebarCollapsed,
  module,
  view,
  imageView,
  expandedModules,
  selectedSecondaryOwner,
  username,
  onToggleSidebar,
  onPrimaryModuleClick,
  onSelectVideoView,
  onSelectImageView,
  onLogout,
}: SidebarNavProps) {
  const renderSecondaryNav = (owner: ModuleNavItem) => {
    if (!expandedModules.includes(owner.key)) return null;
    if (owner.key === "video") {
      return <nav className="platform-secondary-nav">{videoNav.map(([key, label, Icon]) => (
        <button key={key} title={sidebarCollapsed ? label : undefined} className={selectedSecondaryOwner === owner.key && view === key ? "active" : ""} onClick={() => onSelectVideoView(owner.key, key)}>
          <Icon /><span>{label}</span>
        </button>
      ))}</nav>;
    }
    if (owner.key === "images") {
      return <nav className="platform-secondary-nav">{imageNav.map(([key, label, Icon]) => (
        <button key={key} title={sidebarCollapsed ? label : undefined} className={selectedSecondaryOwner === owner.key && imageView === key ? "active" : ""} onClick={() => onSelectImageView(owner.key, key)}>
          <Icon /><span>{label}</span>
        </button>
      ))}</nav>;
    }
    return null;
  };

  return <aside>
    <div className="human-brand"><Film /><span>电商内容平台<small>Commerce Content</small></span></div>
    <button type="button" className="human-sidebar-toggle" onClick={onToggleSidebar}>
      {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
    </button>
    <div className="platform-module-switch" aria-label="业务模块">
      {moduleGroups.map(group => <section className="platform-module-group" key={group.title}>
        <div className="platform-module-group-title">{group.title}</div>
        {group.items.map(item => <div className="platform-module-item" key={item.key}>
          <button type="button" title={sidebarCollapsed ? item.label : undefined} className={module === item.key ? "active" : ""} onClick={() => onPrimaryModuleClick(item)}>
            <item.Icon /><span>{item.label}</span>
          </button>
          {renderSecondaryNav(item)}
        </div>)}
      </section>)}
    </div>
    <button className="human-logout" onClick={onLogout}><LogOut /><span>退出 {username}</span></button>
  </aside>;
}
