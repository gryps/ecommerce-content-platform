import {
  BookOpenText,
  Boxes,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Music2,
  Play,
  Settings,
  Upload,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ImageView, PlatformModule, View } from "../../types";

export type ModuleNavKey = PlatformModule;
export type SecondaryNavItem<Key extends string> = [Key, string, LucideIcon];
export type ModuleNavItem = {
  key: ModuleNavKey;
  label: string;
  Icon: LucideIcon;
  children?: Array<SecondaryNavItem<PlatformModule>>;
};

export const videoNav: Array<SecondaryNavItem<View>> = [
  ["flow", "生产总览", Film],
  ["materials", "素材归类", Boxes],
  ["copy", "内容文库", BookOpenText],
  ["music", "背景音乐", Music2],
  ["production", "剪映草稿", Play],
];

export const imageNav: Array<SecondaryNavItem<ImageView>> = [
  ["overview", "生产总览", Film],
  ["batches", "拍摄分组", Boxes],
  ["products", "产品资料", BookOpenText],
  ["plans", "出图方案", WandSparkles],
  ["review", "结果审核", CheckCircle2],
  ["delivery", "导出上传", Upload],
];

export const moduleGroups: Array<{ title: string; items: ModuleNavItem[] }> = [
  {
    title: "内容生产中心",
    items: [
      { key: "images", label: "图片生产", Icon: ImageIcon },
      { key: "video", label: "视频生产", Icon: Film },
      { key: "aiVideo", label: "AI视频", Icon: WandSparkles },
    ],
  },
  { title: "系统配置", items: [{ key: "models", label: "模型配置", Icon: Settings }] },
];

export const validExpandedModules: ModuleNavKey[] = ["video", "images"];

export function getExpandedModule(value: PlatformModule): ModuleNavKey | "" {
  if (value === "video" || value === "images") return value;
  return "";
}

export function getActiveTitle(module: PlatformModule, view: View, imageView: ImageView) {
  if (module === "video") return videoNav.find(([key]) => key === view)?.[1];
  if (module === "aiVideo") return "AI视频";
  if (module === "images") return imageNav.find(([key]) => key === imageView)?.[1];
  return "模型配置";
}

export function getHeaderSubtitle(module: PlatformModule) {
  if (module === "video") return "电商内容平台 · 视频生产";
  if (module === "aiVideo") return "电商内容平台 · AI视频生产";
  if (module === "images") return "电商内容平台 · 图片生产";
  return "电商内容平台 · 模型配置";
}
